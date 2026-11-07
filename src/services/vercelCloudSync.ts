import { Task, ScheduledMedia, PrayerSettings, AudioSettings } from '../types';
import { upload } from '@vercel/blob/client';
import { getApiUrl } from '../config/api';

export interface CloudSyncPayload {
  tasks: Task[];
  scheduledMedia: ScheduledMedia[];
  prayerSettings?: PrayerSettings;
  audioSettings?: AudioSettings;
  updatedAt?: string;
  sourceDevice?: string;
}

export interface SyncResult {
  success: boolean;
  uploadedMediaCount: number;
  tasksCount: number;
  scheduledCount: number;
  error?: string;
}

class VercelCloudSyncService {
  private lastKnownUpdate: string = '';
  private lastPayload: CloudSyncPayload | null = null;
  private pollingInterval: any = null;
  private isSyncing: boolean = false;
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

      if (data && data.updatedAt && data.updatedAt !== this.lastKnownUpdate) {
        this.lastKnownUpdate = data.updatedAt;
        this.listeners.forEach((cb) => cb(data));
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
    this.isSyncing = true;
    try {
      const res = await fetch(getApiUrl('/api/sync'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          ...payload,
          sourceDevice: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'PC',
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
   * Upload video or audio file directly to Vercel Blob Cloud Storage
   * (Uses direct client-to-blob upload with no size limit, and fallback to /api/upload)
   */
  public async uploadMediaFile(
    file: File | Blob, 
    filename: string, 
    onProgress?: (percent: number) => void
  ): Promise<string> {
    // Ensure filename has proper extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const isVideo = file.type.startsWith('video') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext);
    const safeExt = ext || (isVideo ? 'mp4' : 'mp3');
    const safeFilename = filename.includes('.') ? filename : `${filename}.${safeExt}`;

    // 1. First attempt: Direct Client Upload via @vercel/blob/client (No 4.5MB limit, supports large phone videos)
    try {
      const newBlob = await upload(`dr-abdelaziz/media/${Date.now()}_${safeFilename}`, file, {
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
          'x-content-type': file.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
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
   * Full Synchronous Push of All Local Tasks and Media Blobs to Cloud
   */
  public async syncAllLocalToCloud(
    onStatus?: (msg: string) => void
  ): Promise<SyncResult> {
    if (typeof window === 'undefined') {
      return { success: false, uploadedMediaCount: 0, tasksCount: 0, scheduledCount: 0 };
    }

    this.isSyncing = true;
    try {
      onStatus?.('جاري فحص البيانات المحلية...');

      const { audioStorageService } = await import('./audioStorageService');
      const { taskService } = await import('./taskService');

      const tasks = taskService.getTasks();
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

      onStatus?.('جاري تحديث السحابة...');

      const pushed = await this.pushToCloud({
        tasks,
        scheduledMedia,
      });

      this.isSyncing = false;

      if (pushed) {
        onStatus?.('تمت المزامنة بنجاح!');
        return {
          success: true,
          uploadedMediaCount: uploadedCount,
          tasksCount: tasks.length,
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
