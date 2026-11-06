import { Task, ScheduledMedia, PrayerSettings, AudioSettings } from '../types';

export interface CloudSyncPayload {
  tasks: Task[];
  scheduledMedia: ScheduledMedia[];
  prayerSettings?: PrayerSettings;
  audioSettings?: AudioSettings;
  updatedAt?: string;
  sourceDevice?: string;
}

class VercelCloudSyncService {
  private lastKnownUpdate: string = '';
  private pollingInterval: any = null;
  private isSyncing: boolean = false;
  private listeners: Set<(payload: CloudSyncPayload) => void> = new Set();

  /**
   * Always available in production Vercel deployment, and falls back gracefully
   */
  public isAvailable(): boolean {
    return true;
  }

  /**
   * Subscribe to background cloud updates (polls every 10 seconds)
   */
  public subscribe(callback: (payload: CloudSyncPayload) => void): () => void {
    this.listeners.add(callback);

    if (!this.pollingInterval && typeof window !== 'undefined') {
      // Immediate fetch on mount
      this.fetchFromCloud();

      // Periodic check for cross-device changes (PC <-> Mobile)
      this.pollingInterval = setInterval(() => {
        this.fetchFromCloud();
      }, 10000);
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
   * Fetch current cloud state from Vercel Blob
   */
  public async fetchFromCloud(): Promise<CloudSyncPayload | null> {
    if (this.isSyncing) return null;

    try {
      const res = await fetch('/api/sync', {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) return null;

      const data: CloudSyncPayload = await res.json();

      if (data.updatedAt && data.updatedAt !== this.lastKnownUpdate) {
        this.lastKnownUpdate = data.updatedAt;
        this.listeners.forEach((cb) => cb(data));
      }

      return data;
    } catch (err) {
      // Quiet fail if offline
      return null;
    }
  }

  /**
   * Push current state to Vercel Blob Cloud
   */
  public async pushToCloud(payload: Omit<CloudSyncPayload, 'updatedAt'>): Promise<boolean> {
    this.isSyncing = true;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
   * Upload video or audio to Vercel Blob Cloud Storage
   */
  public async uploadMediaFile(file: File | Blob, filename: string): Promise<string> {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(filename),
        },
        body: file,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (err: any) {
      console.warn('Media cloud upload failed:', err);
      throw err;
    }
  }
}

export const vercelCloudSync = new VercelCloudSyncService();
