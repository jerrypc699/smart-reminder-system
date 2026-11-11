import type { TaskAttachment } from '../types';
import { vercelCloudSync } from './vercelCloudSync';
import { NativeAlarmService } from './nativeAlarmService';
import { VideoAlarm } from './videoAlarmPlugin';

const FILES_DB_NAME = 'SmartReminderTaskFilesDB_v1';
const FILES_STORE = 'task_files';

function inferMimeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

export function formatAttachmentSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 بايت';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result?.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

class TaskAttachmentService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private urlCache = new Map<string, string>();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = window.indexedDB.open(FILES_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  public async saveAttachment(
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<TaskAttachment> {
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const mimeType = file.type || inferMimeFromName(file.name);

    // 1. Store offline in IndexedDB
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FILES_STORE, 'readwrite');
        const store = tx.objectStore(FILES_STORE);
        const putReq = store.put({
          id,
          name: file.name,
          size: file.size,
          type: mimeType,
          blob: file,
          createdAt: new Date().toISOString(),
        });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    } catch (e) {
      console.warn('IndexedDB task file save warning:', e);
    }

    // 2. Upload directly to Vercel Blob Cloud so PC & Mobile stay synced
    let cloudUrl: string | undefined;
    try {
      cloudUrl = await vercelCloudSync.uploadMediaFile(
        file,
        file.name,
        onProgress,
        'attachments'
      );
    } catch (e) {
      console.warn('Cloud upload warning for task file, kept locally:', e);
    }

    return {
      id,
      name: file.name,
      size: file.size,
      type: mimeType,
      createdAt: new Date().toISOString(),
      cloudUrl,
    };
  }

  public async getAttachmentBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return await new Promise<Blob | null>((resolve) => {
        const tx = db.transaction(FILES_STORE, 'readonly');
        const req = tx.objectStore(FILES_STORE).get(id);
        req.onsuccess = () => resolve(req.result?.blob || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async getAttachmentUrl(att: TaskAttachment): Promise<string | null> {
    if (this.urlCache.has(att.id)) {
      return this.urlCache.get(att.id)!;
    }
    const blob = await this.getAttachmentBlob(att.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      this.urlCache.set(att.id, url);
      return url;
    }
    if (att.cloudUrl) {
      return att.cloudUrl;
    }
    return null;
  }

  public async deleteAttachment(id: string): Promise<void> {
    this.urlCache.delete(id);
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(FILES_STORE, 'readwrite');
        tx.objectStore(FILES_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  /**
   * Open or download a task attachment reliably across Android Native & Web Browsers.
   */
  public async openAttachment(
    att: TaskAttachment,
    onImagePreview?: (url: string, title: string) => void
  ): Promise<void> {
    const isImage = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name);
    const localBlob = await this.getAttachmentBlob(att.id);
    const url = localBlob ? URL.createObjectURL(localBlob) : att.cloudUrl;

    if (!url) {
      alert('تعذر العثور على هذا الملف محلياً أو في السحابة.');
      return;
    }

    if (isImage && onImagePreview) {
      onImagePreview(url, att.name);
      return;
    }

    // Native Android: export via FileProvider & MediaStore Downloads and open with system viewer
    if (NativeAlarmService.isAndroidNative()) {
      try {
        let blobToSave = localBlob;
        if (!blobToSave && att.cloudUrl) {
          const resp = await fetch(att.cloudUrl);
          blobToSave = await resp.blob();
        }
        if (blobToSave) {
          const base64 = await blobToBase64(blobToSave);
          await VideoAlarm.saveAndOpenFile({
            base64,
            fileName: att.name,
            mimeType: att.type || inferMimeFromName(att.name),
          });
          return;
        }
      } catch (e) {
        console.warn('Native Android attachment open fallback:', e);
      }
    }

    // Standard Web / iOS Safari fallback
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (!att.cloudUrl && localBlob) {
      link.download = att.name;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const taskAttachmentService = new TaskAttachmentService();

