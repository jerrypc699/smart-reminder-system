import { StoredMediaMeta, ScheduledMedia, MediaType } from '../types';
import { cloudSyncService } from './cloudSyncService';
import { vercelCloudSync } from './vercelCloudSync';

const DB_NAME = 'SmartReminderAudioDB_v1';
const DB_VERSION = 1;
const BLOB_STORE = 'audio_blobs';
const SCHEDULED_STORE = 'scheduled_audios';
const SCHEDULED_STORAGE_KEY = 'smart_reminder_scheduled_media_v2';
const LEGACY_STORAGE_KEY = 'smart_reminder_scheduled_audios_v1';
const MEDIA_META_STORAGE_KEY = 'smart_reminder_media_meta_v2';
const DELETED_SCHED_KEY = 'dr_abdelaziz_deleted_sched_v1';
const DELETED_MEDIA_KEY = 'dr_abdelaziz_deleted_media_v1';

class AudioStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private urlCache: Map<string, string> = new Map();
  private libraryListeners: Set<() => void> = new Set();

  public onLibraryChange(callback: () => void): () => void {
    this.libraryListeners.add(callback);
    return () => this.libraryListeners.delete(callback);
  }

  public notifyLibraryChange(): void {
    this.libraryListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Library listener error:', e);
      }
    });
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SCHEDULED_STORE)) {
          db.createObjectStore(SCHEDULED_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Calculate audio duration from a Blob
   */
  public async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      try {
        const tempUrl = URL.createObjectURL(blob);
        const audio = new Audio(tempUrl);
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          const duration = audio.duration;
          URL.revokeObjectURL(tempUrl);
          resolve(isFinite(duration) ? Math.round(duration) : 0);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(tempUrl);
          resolve(0);
        };
      } catch {
        resolve(0);
      }
    });
  }

  /**
   * Extract video duration and generate a video thumbnail using Canvas
   * With safety timeout to prevent hanging on mobile videos
   */
  public async getVideoMetadata(blob: Blob): Promise<{ duration: number; thumbnail?: string }> {
    return new Promise((resolve) => {
      try {
        const tempUrl = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = tempUrl;
        video.muted = true;
        video.playsInline = true;

        let isDone = false;
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            URL.revokeObjectURL(tempUrl);
            resolve({ duration: 0 });
          }
        }, 2500);

        video.onloadedmetadata = () => {
          const duration = Math.round(video.duration || 0);
          video.currentTime = Math.min(1, Math.max(0.1, duration / 3));
        };

        video.onseeked = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth || 320, 320);
            canvas.height = Math.min(video.videoHeight || 180, 180);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
              URL.revokeObjectURL(tempUrl);
              resolve({ duration: Math.round(video.duration || 0), thumbnail });
              return;
            }
          } catch {
            // ignore canvas error
          }
          URL.revokeObjectURL(tempUrl);
          resolve({ duration: Math.round(video.duration || 0) });
        };

        video.onerror = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);
          URL.revokeObjectURL(tempUrl);
          resolve({ duration: 0 });
        };
      } catch {
        resolve({ duration: 0 });
      }
    });
  }

  public getMetaRegistry(): StoredMediaMeta[] {
    if (typeof window === 'undefined') return [];
    try {
      const deleted = new Set(this.getDeletedMediaIds());
      const raw = localStorage.getItem(MEDIA_META_STORAGE_KEY);
      if (!raw) return [];
      const parsed: StoredMediaMeta[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((m) => m && m.id && !deleted.has(m.id)) : [];
    } catch {
      return [];
    }
  }

  public saveMetaToRegistry(meta: StoredMediaMeta): void {
    if (typeof window === 'undefined' || !meta || !meta.id) return;
    if (this.isMediaDeleted(meta.id)) return;
    try {
      const list = this.getMetaRegistry();
      const idx = list.findIndex((m) => m.id === meta.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...meta };
      } else {
        list.unshift(meta);
      }
      localStorage.setItem(MEDIA_META_STORAGE_KEY, JSON.stringify(list));
      this.notifyLibraryChange();
    } catch (e) {
      console.warn('Failed to update media meta registry in localStorage:', e);
    }
  }

  public syncRemoteMetaList(remoteList: StoredMediaMeta[]): void {
    if (!remoteList || !Array.isArray(remoteList)) return;
    try {
      const deletedMedia = new Set(this.getDeletedMediaIds());
      const local = this.getMetaRegistry().filter((item) => !deletedMedia.has(item.id));
      const map = new Map<string, StoredMediaMeta>();
      local.forEach((item) => map.set(item.id, item));
      remoteList.forEach((item) => {
        if (!item || !item.id || deletedMedia.has(item.id)) return;
        if (!map.has(item.id)) {
          map.set(item.id, item);
        } else {
          const existing = map.get(item.id)!;
          if (!existing.cloudUrl && item.cloudUrl) {
            map.set(item.id, { ...existing, cloudUrl: item.cloudUrl });
          }
        }
      });
      const merged = Array.from(map.values())
        .filter((m) => !deletedMedia.has(m.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      localStorage.setItem(MEDIA_META_STORAGE_KEY, JSON.stringify(merged));
      this.notifyLibraryChange();
    } catch (e) {
      console.warn('Failed to sync remote meta list:', e);
    }
  }

  /**
   * Save an uploaded audio or video Blob into IndexedDB
   */
  public async saveMediaFile(
    file: Blob | File,
    name: string,
    category: 'task' | 'azan' | 'scheduled' | 'custom' = 'custom',
    cloudUrl?: string
  ): Promise<StoredMediaMeta> {
    const isVideo = file.type.startsWith('video') ||
      /\.(mp4|webm|mkv|mov|avi|wmv)$/i.test(name) ||
      (file instanceof File && /\.(mp4|webm|mkv|mov|avi|wmv)$/i.test(file.name));

    const mediaType: MediaType = isVideo ? 'video' : 'audio';

    let duration = 0;
    let thumbnail: string | undefined = undefined;

    if (isVideo) {
      const meta = await this.getVideoMetadata(file);
      duration = meta.duration;
      thumbnail = meta.thumbnail;
    } else {
      duration = await this.getAudioDuration(file);
    }

    const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const meta: StoredMediaMeta = {
      id,
      name: name || `${isVideo ? 'مقطع فيديو' : 'ملف صوتي'} ${new Date().toLocaleTimeString('ar-EG')}`,
      size: file.size,
      type: file.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
      mediaType,
      duration,
      thumbnail,
      createdAt: new Date().toISOString(),
      category,
      cloudUrl,
    };

    // 1. Immediately save to localStorage registry so it's guaranteed to be available instantly
    this.saveMetaToRegistry(meta);

    // 2. Also save blob to IndexedDB for local offline playback
    try {
      const db = await this.getDB();
      const record = {
        ...meta,
        blob: file,
      };

      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = db.transaction(BLOB_STORE, 'readwrite');
          const store = transaction.objectStore(BLOB_STORE);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (txErr) {
          reject(txErr);
        }
      });
    } catch (idbErr) {
      console.warn('IndexedDB save blob warning (file saved in metadata registry):', idbErr);
    }

    return meta;
  }

  /**
   * Alias for backwards compatibility
   */
  public async saveAudioFile(
    file: Blob | File,
    name: string,
    category: 'task' | 'azan' | 'scheduled' | 'custom' = 'custom'
  ): Promise<StoredMediaMeta> {
    return this.saveMediaFile(file, name, category);
  }

  /**
   * Get Media Blob by ID
   */
  public async getMediaBlob(id: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(BLOB_STORE, 'readonly');
      const store = transaction.objectStore(BLOB_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  }

  public async getAudioBlob(id: string): Promise<Blob | null> {
    return this.getMediaBlob(id);
  }

  /**
   * Get playable Object URL for a media file (with local blob check & cloud URL fallback)
   */
  public async getMediaObjectUrl(id: string, fallbackCloudUrl?: string): Promise<string | null> {
    if (this.urlCache.has(id)) {
      return this.urlCache.get(id)!;
    }

    if (id && (id.startsWith('http://') || id.startsWith('https://'))) {
      this.urlCache.set(id, id);
      return id;
    }

    // 1. Direct ID lookup in local IndexedDB
    let blob = id ? await this.getMediaBlob(id) : null;

    // 2. If not found, look up scheduled items to resolve alternative mediaId/audioId or cloudUrl
    if (id) {
      const sched = this.getScheduledMedias().find(
        (s) => s.id === id || s.mediaId === id || s.audioId === id
      );
      if (sched) {
        if (!blob && sched.audioId && sched.audioId !== id) {
          blob = await this.getMediaBlob(sched.audioId);
        }
        if (!blob && sched.mediaId && sched.mediaId !== id) {
          blob = await this.getMediaBlob(sched.mediaId);
        }
        if (!fallbackCloudUrl && sched.cloudUrl) {
          fallbackCloudUrl = sched.cloudUrl;
        }
      }
    }

    // 3. If local blob is available, use object URL (instant local playback)
    if (blob) {
      const url = URL.createObjectURL(blob);
      this.urlCache.set(id, url);
      return url;
    }

    // 4. Fallback to streaming Cloud URL (for other devices)
    if (fallbackCloudUrl) {
      this.urlCache.set(id, fallbackCloudUrl);
      return fallbackCloudUrl;
    }

    return null;
  }

  public async getAudioObjectUrl(id: string, fallbackCloudUrl?: string): Promise<string | null> {
    return this.getMediaObjectUrl(id, fallbackCloudUrl);
  }

  /**
   * Retrieve list of all uploaded media files metadata
   * (Combines instant localStorage registry, IndexedDB records, and cloud items)
   */
  public async getAllMediaMeta(): Promise<StoredMediaMeta[]> {
    const deleted = new Set(this.getDeletedMediaIds());
    // 1. Instant synchronous read from localStorage registry (never fails, 0MB memory overhead)
    const map = new Map<string, StoredMediaMeta>();
    const registryItems = this.getMetaRegistry();
    registryItems.forEach((m) => {
      if (!deleted.has(m.id)) {
        map.set(m.id, m);
      }
    });

    // 2. Also try reading from local IndexedDB if available and merge
    try {
      const db = await this.getDB();
      const localItems: StoredMediaMeta[] = await new Promise((resolve) => {
        try {
          const transaction = db.transaction(BLOB_STORE, 'readonly');
          const store = transaction.objectStore(BLOB_STORE);
          const req = store.getAll();

          req.onsuccess = () => {
            const res: StoredMediaMeta[] = (req.result || []).map((r) => ({
              id: r.id,
              name: r.name,
              size: r.size,
              type: r.type,
              mediaType: r.mediaType || (r.type && r.type.startsWith('video') ? 'video' : 'audio'),
              duration: r.duration,
              thumbnail: r.thumbnail,
              createdAt: r.createdAt,
              category: r.category,
              cloudUrl: r.cloudUrl,
            }));
            resolve(res);
          };

          req.onerror = () => {
            resolve([]);
          };
        } catch {
          resolve([]);
        }
      });

      localItems.forEach((item) => {
        if (!deleted.has(item.id)) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
            this.saveMetaToRegistry(item);
          }
        }
      });
    } catch {
      // Local DB unavailable
    }

    // 3. Also include any media synced via cloud scheduled items if not in local list AND not deleted
    const scheduled = this.getScheduledMedias();
    scheduled.forEach((s) => {
      const mediaId = s.mediaId || s.id;
      if (!deleted.has(mediaId) && !map.has(mediaId)) {
        map.set(mediaId, {
          id: mediaId,
          name: s.mediaName,
          size: 0,
          type: s.mediaType === 'video' ? 'video/mp4' : 'audio/mpeg',
          mediaType: s.mediaType,
          duration: s.duration,
          thumbnail: s.thumbnail,
          createdAt: s.createdAt,
          category: 'scheduled',
          cloudUrl: s.cloudUrl,
        });
      }
    });

    return Array.from(map.values())
      .filter((m) => !deleted.has(m.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getAllAudioMeta(): Promise<StoredMediaMeta[]> {
    return this.getAllMediaMeta();
  }

  /**
   * Delete a media file permanently with tombstone tracking & dual-cloud synchronization
   */
  public async deleteMediaFile(id: string): Promise<void> {
    this.markMediaDeleted(id);
    const cachedUrl = this.urlCache.get(id);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      this.urlCache.delete(id);
    }

    // 1. Remove from localStorage registry
    if (typeof window !== 'undefined') {
      try {
        const list = this.getMetaRegistry().filter((m) => m.id !== id && !this.isMediaDeleted(m.id));
        localStorage.setItem(MEDIA_META_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    // 2. Remove from IndexedDB
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(BLOB_STORE, 'readwrite');
        const store = transaction.objectStore(BLOB_STORE);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    // 3. Remove any scheduled media referencing this media
    try {
      const scheduled = this.getScheduledMedias();
      const affected = scheduled.filter((s) => s.mediaId === id || s.id === id);
      affected.forEach((s) => this.deleteScheduledMedia(s.id));
    } catch {}

    // 4. Synchronize deletion immediately to cloud
    try {
      const cleanLibrary = this.getMetaRegistry().filter((m) => m.id !== id && !this.isMediaDeleted(m.id));
      const cleanScheduled = this.getScheduledMedias();
      vercelCloudSync.pushCurrentState({
        mediaLibrary: cleanLibrary,
        deletedMediaIds: this.getDeletedMediaIds(),
        scheduledMedia: cleanScheduled,
        deletedScheduledIds: this.getDeletedScheduledIds(),
      }).catch(console.warn);
    } catch {}

    this.notifyLibraryChange();
  }

  public async deleteAudioFile(id: string): Promise<void> {
    return this.deleteMediaFile(id);
  }

  // --- Media Library Deletion Tombstones ---
  public getDeletedMediaIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DELETED_MEDIA_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public markMediaDeleted(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const current = new Set(this.getDeletedMediaIds());
      current.add(id);
      localStorage.setItem(DELETED_MEDIA_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed to mark media as deleted:', e);
    }
  }

  public markMultipleMediaDeleted(ids: string[]): void {
    if (typeof window === 'undefined' || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const current = new Set(this.getDeletedMediaIds());
      let changed = false;
      ids.forEach((id) => {
        if (id && !current.has(id)) {
          current.add(id);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(DELETED_MEDIA_KEY, JSON.stringify(Array.from(current)));
      }
    } catch (e) {
      console.warn('Failed to mark multiple media as deleted:', e);
    }
  }

  public isMediaDeleted(id: string): boolean {
    if (typeof window === 'undefined' || !id) return false;
    return this.getDeletedMediaIds().includes(id);
  }

  // --- Scheduled Media Deletion Tombstones ---
  public getDeletedScheduledIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DELETED_SCHED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public markScheduledDeleted(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const current = new Set(this.getDeletedScheduledIds());
      current.add(id);
      localStorage.setItem(DELETED_SCHED_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed to mark scheduled media as deleted:', e);
    }
  }

  public markMultipleScheduledDeleted(ids: string[]): void {
    if (typeof window === 'undefined' || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const current = new Set(this.getDeletedScheduledIds());
      let changed = false;
      ids.forEach((id) => {
        if (id && !current.has(id)) {
          current.add(id);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(DELETED_SCHED_KEY, JSON.stringify(Array.from(current)));
      }
    } catch (e) {
      console.warn('Failed to mark multiple scheduled as deleted:', e);
    }
  }

  public isScheduledDeleted(id: string): boolean {
    if (typeof window === 'undefined' || !id) return false;
    return this.getDeletedScheduledIds().includes(id);
  }

  /**
   * Scheduled Media management
   */
  public getScheduledMedias(): ScheduledMedia[] {
    if (typeof window === 'undefined') return [];
    try {
      const deletedIds = new Set(this.getDeletedScheduledIds());
      const saved = localStorage.getItem(SCHEDULED_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!saved) return [];
      const parsed: ScheduledMedia[] = JSON.parse(saved);
      return parsed
        .filter((item) => item && item.id && !deletedIds.has(item.id))
        .map((item) => ({
          ...item,
          mediaId: item.mediaId || item.audioId || '',
          mediaName: item.mediaName || item.audioName || 'ملف وسائط',
          mediaType: item.mediaType || 'audio',
        }));
    } catch {
      return [];
    }
  }

  public getScheduledAudios(): ScheduledMedia[] {
    return this.getScheduledMedias();
  }

  public saveScheduledMedias(list: ScheduledMedia[]): void {
    if (typeof window === 'undefined') return;
    try {
      const deletedIds = new Set(this.getDeletedScheduledIds());
      const filtered = Array.isArray(list) ? list.filter((item) => item && item.id && !deletedIds.has(item.id)) : [];
      localStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to save scheduled medias', e);
    }
  }

  public saveScheduledAudios(list: ScheduledMedia[]): void {
    this.saveScheduledMedias(list);
  }

  public addScheduledMedia(
    data: Omit<ScheduledMedia, 'id' | 'createdAt'>
  ): ScheduledMedia {
    const list = this.getScheduledMedias();
    const newItem: ScheduledMedia = {
      ...data,
      id: `sched_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: data.mediaId || data.audioId || '',
      mediaName: data.mediaName || data.audioName || 'ملف وسائط',
      mediaType: data.mediaType || 'audio',
      createdAt: new Date().toISOString(),
    };
    list.unshift(newItem);
    this.saveScheduledMedias(list);

    // Automatic Vercel Cloud Storage upload for streaming to Mobile
    this.getMediaBlob(newItem.mediaId).then((blob) => {
      if (blob) {
        vercelCloudSync.uploadMediaFile(blob, newItem.mediaName).then((url) => {
          this.updateScheduledMedia(newItem.id, { cloudUrl: url });
        }).catch(console.warn);
      }
    }).catch(console.warn);

    // Sync state to Vercel Central Cloud
    vercelCloudSync.pushCurrentState({ scheduledMedia: list }).catch(console.warn);

    if (cloudSyncService.isAvailable()) {
      cloudSyncService.syncScheduledMedia(newItem);
      this.getMediaBlob(newItem.mediaId).then((blob) => {
        if (blob) {
          cloudSyncService.uploadMediaFile(blob, newItem.mediaName).then((url) => {
            this.updateScheduledMedia(newItem.id, { cloudUrl: url });
            cloudSyncService.syncScheduledMedia({ ...newItem, cloudUrl: url });
          }).catch(console.warn);
        }
      }).catch(console.warn);
    }

    return newItem;
  }

  public addScheduledAudio(data: Omit<ScheduledMedia, 'id' | 'createdAt'>): ScheduledMedia {
    return this.addScheduledMedia(data);
  }

  public updateScheduledMedia(
    id: string,
    updates: Partial<ScheduledMedia>
  ): ScheduledMedia[] {
    const list = this.getScheduledMedias().map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.saveScheduledMedias(list);

    // Sync state to Vercel Central Cloud
    vercelCloudSync.pushCurrentState({ scheduledMedia: list }).catch(console.warn);

    if (cloudSyncService.isAvailable()) {
      const updated = list.find((i) => i.id === id);
      if (updated) {
        cloudSyncService.syncScheduledMedia(updated);
      }
    }

    return list;
  }

  public updateScheduledAudio(id: string, updates: Partial<ScheduledMedia>): ScheduledMedia[] {
    return this.updateScheduledMedia(id, updates);
  }

  public deleteScheduledMedia(id: string): ScheduledMedia[] {
    this.markScheduledDeleted(id);
    const list = this.getScheduledMedias().filter((item) => item.id !== id);
    this.saveScheduledMedias(list);

    // Sync state to Vercel Central Cloud with all deleted scheduled IDs & media IDs
    vercelCloudSync.pushCurrentState({ 
      scheduledMedia: list, 
      deletedScheduledIds: this.getDeletedScheduledIds(),
      mediaLibrary: this.getMetaRegistry(),
      deletedMediaIds: this.getDeletedMediaIds(),
    }).catch(console.warn);

    // Also delete from Supabase if configured
    import('./supabaseService').then(({ supabaseService }) => {
      if (supabaseService.isConfigured()) {
        supabaseService.deleteScheduledMedia(id).catch(console.warn);
      }
    }).catch(console.warn);

    if (cloudSyncService.isAvailable()) {
      cloudSyncService.deleteScheduledMedia(id);
    }

    return list;
  }

  public deleteScheduledAudio(id: string): ScheduledMedia[] {
    return this.deleteScheduledMedia(id);
  }
}

export const audioStorageService = new AudioStorageService();
