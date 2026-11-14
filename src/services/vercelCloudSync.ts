import { Task, Employee, ScheduledMedia, PrayerSettings, AudioSettings, StoredMediaMeta, WhatsAppGlobalSettings } from '../types';
import { upload } from '@vercel/blob/client';
import { getApiUrl } from '../config/api';

export interface CloudSyncPayload {
  tasks: Task[];
  employees?: Employee[];
  scheduledMedia: ScheduledMedia[];
  mediaLibrary?: StoredMediaMeta[];
  prayerSettings?: PrayerSettings;
  audioSettings?: AudioSettings;
  whatsappSettings?: WhatsAppGlobalSettings;
  dailySystem?: any;
  updatedAt?: string;
  sourceDevice?: string;
  forceWipe?: boolean;
}

export interface SyncResult {
  success: boolean;
  uploadedMediaCount: number;
  tasksCount: number;
  employeesCount?: number;
  scheduledCount: number;
  error?: string;
}

class VercelCloudSyncService {
  private lastKnownUpdate: string = '';
  private lastPayload: CloudSyncPayload | null = null;
  private pollingInterval: any = null;
  private isSyncing: boolean = false;
  private hasFetchedOnce: boolean = false;
  private listeners: Set<(payload: CloudSyncPayload) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Instant check on tab focus or visibility change (0 ms latency)
      window.addEventListener('focus', () => this.fetchFromCloud());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.fetchFromCloud();
        }
      });
    }
  }

  public isAvailable(): boolean {
    return true;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public hasSyncedFromCloud(): boolean {
    return this.hasFetchedOnce;
  }

  public getLastKnownUpdate(): string {
    return this.lastKnownUpdate;
  }

  /**
   * Subscribe to ultra-fast real-time cloud updates (polls every 2.5 seconds for instant sync)
   */
  public subscribe(callback: (payload: CloudSyncPayload) => void): () => void {
    this.listeners.add(callback);

    // Deliver already cached cloud payload immediately to the new subscriber
    if (this.lastPayload) {
      try {
        callback(this.lastPayload);
      } catch (err) {
        console.warn('Initial subscriber callback error:', err);
      }
    }

    if (!this.pollingInterval && typeof window !== 'undefined') {
      // Immediate fetch on mount
      this.fetchFromCloud();

      // Fast 2.5s polling for instant sync between PC & Mobile
      this.pollingInterval = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          this.fetchFromCloud();
        }
      }, 2500);
    } else {
      this.fetchFromCloud();
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };
  }

  /**
   * Fetch current cloud state from Vercel Blob with cache-busting
   */
  public async fetchFromCloud(): Promise<CloudSyncPayload | null> {
    if (this.isSyncing) return null;

    try {
      const res = await fetch(getApiUrl(`/api/sync?t=${Date.now()}`), {
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });

      if (!res.ok) return null;

      const data: CloudSyncPayload = await res.json();
      this.lastPayload = data;
      this.hasFetchedOnce = true;

      if (data && data.updatedAt && data.updatedAt !== this.lastKnownUpdate) {
        this.lastKnownUpdate = data.updatedAt;
        this.listeners.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.warn('Error in cloud sync listener:', e);
          }
        });
      }

      return data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Push current state to Vercel Blob Cloud
   */
  public async pushToCloud(payload: Omit<CloudSyncPayload, 'updatedAt'>): Promise<boolean> {
    // Guard against fresh install blowing away cloud data before first pull
    if (!this.hasFetchedOnce && typeof window !== 'undefined') {
      try {
        await this.fetchFromCloud();
      } catch (e) {
        // continue
      }
    }

    this.isSyncing = true;
    try {
      const res = await fetch(getApiUrl('/api/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          ...payload,
          sourceDevice: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile') ? 'Mobile' : 'PC',
        }),
      });

      if (!res.ok) {
        this.isSyncing = false;
        return false;
      }

      const result = await res.json();
      if (result.updatedAt) {
        this.lastKnownUpdate = result.updatedAt;
      }

      this.isSyncing = false;
      return true;
    } catch (err) {
      console.warn('Vercel Cloud Push warning:', err);
      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Push the entire unified state (tasks, employees, scheduledMedia, dailySystem, etc.)
   * safely gathered from local stores, preventing any partial overwrite.
   */
  public async pushCurrentState(partial?: Partial<CloudSyncPayload>): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Guard: Always ensure cloud data has been loaded at least once before pushing
    if (!this.hasFetchedOnce) {
      await this.fetchFromCloud();
    }

    try {
      const { taskService } = await import('./taskService');
      const { audioStorageService } = await import('./audioStorageService');
      const { dailySystemService } = await import('./dailySystemService');
      const { whatsappService } = await import('./whatsappService');

      const tasks = partial?.tasks || taskService.getTasks();
      const employees = partial?.employees || taskService.getEmployees();
      const scheduledMedia = partial?.scheduledMedia || audioStorageService.getScheduledMedias();
      const mediaLibrary = partial?.mediaLibrary || audioStorageService.getMetaRegistry();
      const dailySystem = partial?.dailySystem || dailySystemService.exportForCloud();
      const whatsappSettings = partial?.whatsappSettings || whatsappService.getSettings();

      return await this.pushToCloud({
        tasks,
        employees,
        scheduledMedia,
        mediaLibrary,
        dailySystem,
        whatsappSettings,
        prayerSettings: partial?.prayerSettings,
        audioSettings: partial?.audioSettings,
        forceWipe: partial?.forceWipe,
      });
    } catch (err) {
      console.warn('pushCurrentState warning:', err);
      return false;
    }
  }

  /**
   * Upload any file (video, audio, PDF, image, Word, Excel, etc.) to Vercel Blob Cloud Storage.
   * Uses direct client-to-blob upload with no 4.5MB limit, with serverless fallback.
   */
  public async uploadMediaFile(
    file: File | Blob, 
    filename: string, 
    onProgress?: (percent: number) => void,
    folder: string = 'media'
  ): Promise<string> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const isVideo = file.type.startsWith('video') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
    const isAudio = file.type.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext);
    const fallbackExt = isVideo ? 'mp4' : isAudio ? 'mp3' : 'bin';
    const safeExt = ext || fallbackExt;
    const safeFilename = filename.includes('.') ? filename : `${filename}.${safeExt}`;

    // 1. First attempt: Direct Client Upload via @vercel/blob/client
    try {
      const newBlob = await upload(`dr-abdelaziz/${folder}/${Date.now()}_${safeFilename}`, file, {
        access: 'public',
        handleUploadUrl: getApiUrl('/api/blob-upload'),
        onUploadProgress: (progress) => {
          onProgress?.(Math.round(progress.percentage));
        },
      });
      return newBlob.url;
    } catch (directErr) {
      console.warn('Direct blob client upload failed, attempting serverless fallback...', directErr);
    }

    // 2. Second attempt: Serverless binary upload fallback
    try {
      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(safeFilename),
          'x-content-type': file.type || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'application/octet-stream'),
        },
        body: file,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل رفع الملف إلى السحابة');
      }

      const data = await res.json();
      return data.url;
    } catch (err: any) {
      console.warn('All upload methods failed:', err);
      throw err;
    }
  }

  /**
   * Full Synchronous Push of All Local Tasks, Employees and Media Blobs to Cloud
   */
  public async syncAllLocalToCloud(
    onStatus?: (msg: string) => void
  ): Promise<SyncResult> {
    if (typeof window === 'undefined') {
      return { success: false, uploadedMediaCount: 0, tasksCount: 0, scheduledCount: 0 };
    }

    // Always fetch latest cloud state first before syncing local changes
    if (!this.hasFetchedOnce) {
      await this.fetchFromCloud();
    }

    this.isSyncing = true;
    try {
      onStatus?.('جاري فحص البيانات المحلية...');

      const { audioStorageService } = await import('./audioStorageService');
      const { taskService } = await import('./taskService');

      const tasks = taskService.getTasks();
      const employees = taskService.getEmployees();
      const scheduledMedia = audioStorageService.getScheduledMedias();

      onStatus?.(`جاري فحص ملفات الوسائط (${scheduledMedia.length} مجدول)...`);
      let uploadedCount = 0;

      // Upload any scheduled media files that don't have cloudUrl yet
      for (let i = 0; i < scheduledMedia.length; i++) {
        const item = scheduledMedia[i];
        if (!item.cloudUrl) {
          onStatus?.(`جاري رفع الفيديو إلى السحابة: ${item.mediaName}...`);
          try {
            const blob = await audioStorageService.getMediaBlob(item.mediaId);
            if (blob) {
              const url = await this.uploadMediaFile(blob, item.mediaName);
              item.cloudUrl = url;
              uploadedCount++;
            }
          } catch (err) {
            console.warn(`Failed to upload ${item.mediaName}:`, err);
          }
        }
      }

      if (uploadedCount > 0) {
        audioStorageService.saveScheduledMedias(scheduledMedia);
      }

      // Also upload any task file attachments without cloudUrl yet
      const { taskAttachmentService } = await import('./taskAttachmentService');
      let uploadedTaskFilesCount = 0;
      for (const t of tasks) {
        if (t.attachments && t.attachments.length > 0) {
          for (const att of t.attachments) {
            if (!att.cloudUrl) {
              try {
                const blob = await taskAttachmentService.getAttachmentBlob(att.id);
                if (blob) {
                  att.cloudUrl = await this.uploadMediaFile(blob, att.name, undefined, 'attachments');
                  uploadedTaskFilesCount++;
                }
              } catch (err) {
                console.warn(`Failed to upload task attachment ${att.name}:`, err);
              }
            }
          }
        }
      }
      if (uploadedTaskFilesCount > 0) {
        taskService.saveTasks(tasks);
      }

      onStatus?.('جاري تحديث السحابة المركزية...');

      const mediaLibrary = audioStorageService.getMetaRegistry();
      const { whatsappService } = await import('./whatsappService');
      const { dailySystemService } = await import('./dailySystemService');

      const pushed = await this.pushToCloud({
        tasks,
        employees,
        scheduledMedia,
        mediaLibrary,
        whatsappSettings: whatsappService.getSettings(),
        dailySystem: dailySystemService.exportForCloud(),
      });

      this.isSyncing = false;

      if (pushed) {
        onStatus?.('تمت المزامنة بنجاح!');
        return {
          success: true,
          uploadedMediaCount: uploadedCount,
          tasksCount: tasks.length,
          employeesCount: employees.length,
          scheduledCount: scheduledMedia.length,
        };
      } else {
        throw new Error('فشل إرسال البيانات إلى السحابة');
      }
    } catch (err: any) {
      this.isSyncing = false;
      onStatus?.(`خطأ أثناء المزامنة: ${err.message}`);
      return {
        success: false,
        uploadedMediaCount: 0,
        tasksCount: 0,
        scheduledCount: 0,
        error: err.message,
      };
    }
  }
}

export const vercelCloudSync = new VercelCloudSyncService();
