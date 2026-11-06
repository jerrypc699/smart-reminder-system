import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { firebaseManager } from './firebaseConfig';
import { Task, ScheduledMedia, PrayerSettings, AudioSettings } from '../types';

class CloudSyncService {
  private unsubscribeTasks: (() => void) | null = null;
  private unsubscribeMedia: (() => void) | null = null;
  private unsubscribePrayer: (() => void) | null = null;

  public isAvailable(): boolean {
    return firebaseManager.getIsConnected();
  }

  // ==================== REALTIME TASKS SYNC ====================
  public subscribeTasks(
    onTasksUpdated: (tasks: Task[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const db = firebaseManager.getDb();
    if (!db) {
      return () => {};
    }

    if (this.unsubscribeTasks) {
      this.unsubscribeTasks();
    }

    try {
      const tasksCol = collection(db, 'dr_abdelaziz_tasks');
      const q = query(tasksCol);

      this.unsubscribeTasks = onSnapshot(
        q,
        (snapshot) => {
          const tasks: Task[] = [];
          snapshot.forEach((docSnap) => {
            tasks.push(docSnap.data() as Task);
          });
          onTasksUpdated(tasks);
        },
        (error) => {
          console.warn('Firestore tasks subscription error:', error);
          onError?.(error);
        }
      );

      return () => {
        if (this.unsubscribeTasks) {
          this.unsubscribeTasks();
          this.unsubscribeTasks = null;
        }
      };
    } catch (err) {
      console.warn('Failed to subscribe to tasks:', err);
      return () => {};
    }
  }

  public async syncTask(task: Task): Promise<void> {
    const db = firebaseManager.getDb();
    if (!db) return;

    try {
      const taskRef = doc(db, 'dr_abdelaziz_tasks', task.id);
      await setDoc(taskRef, task, { merge: true });
    } catch (err) {
      console.warn('Failed to sync task to Firestore:', err);
    }
  }

  public async deleteTask(taskId: string): Promise<void> {
    const db = firebaseManager.getDb();
    if (!db) return;

    try {
      const taskRef = doc(db, 'dr_abdelaziz_tasks', taskId);
      await deleteDoc(taskRef);
    } catch (err) {
      console.warn('Failed to delete task from Firestore:', err);
    }
  }

  // ==================== REALTIME SCHEDULED MEDIA SYNC ====================
  public subscribeScheduledMedia(
    onMediaUpdated: (items: ScheduledMedia[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const db = firebaseManager.getDb();
    if (!db) {
      return () => {};
    }

    if (this.unsubscribeMedia) {
      this.unsubscribeMedia();
    }

    try {
      const mediaCol = collection(db, 'dr_abdelaziz_scheduled_media');
      const q = query(mediaCol);

      this.unsubscribeMedia = onSnapshot(
        q,
        (snapshot) => {
          const items: ScheduledMedia[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data() as ScheduledMedia);
          });
          onMediaUpdated(items);
        },
        (error) => {
          console.warn('Firestore media subscription error:', error);
          onError?.(error);
        }
      );

      return () => {
        if (this.unsubscribeMedia) {
          this.unsubscribeMedia();
          this.unsubscribeMedia = null;
        }
      };
    } catch (err) {
      console.warn('Failed to subscribe to scheduled media:', err);
      return () => {};
    }
  }

  public async syncScheduledMedia(item: ScheduledMedia): Promise<void> {
    const db = firebaseManager.getDb();
    if (!db) return;

    try {
      const itemRef = doc(db, 'dr_abdelaziz_scheduled_media', item.id);
      await setDoc(itemRef, item, { merge: true });
    } catch (err) {
      console.warn('Failed to sync media schedule to Firestore:', err);
    }
  }

  public async deleteScheduledMedia(itemId: string): Promise<void> {
    const db = firebaseManager.getDb();
    if (!db) return;

    try {
      const itemRef = doc(db, 'dr_abdelaziz_scheduled_media', itemId);
      await deleteDoc(itemRef);
    } catch (err) {
      console.warn('Failed to delete media schedule from Firestore:', err);
    }
  }

  // ==================== CLOUD STORAGE FOR VIDEOS & AUDIOS ====================
  public async uploadMediaFile(
    file: File | Blob,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const storage = firebaseManager.getStorage();
    if (!storage) {
      throw new Error('Firebase Storage is not configured.');
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `dr_abdelaziz_media/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(Math.round(progress));
        },
        (error) => {
          console.warn('Cloud upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  // ==================== PRAYER & AUDIO SETTINGS SYNC ====================
  public async syncPrayerSettings(settings: PrayerSettings): Promise<void> {
    const db = firebaseManager.getDb();
    if (!db) return;
    try {
      const docRef = doc(db, 'dr_abdelaziz_settings', 'prayer');
      await setDoc(docRef, settings, { merge: true });
    } catch (err) {
      console.warn('Failed to sync prayer settings:', err);
    }
  }

  public subscribePrayerSettings(
    onUpdated: (settings: PrayerSettings) => void
  ): () => void {
    const db = firebaseManager.getDb();
    if (!db) return () => {};

    try {
      const docRef = doc(db, 'dr_abdelaziz_settings', 'prayer');
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          onUpdated(docSnap.data() as PrayerSettings);
        }
      });
    } catch {
      return () => {};
    }
  }
}

export const cloudSyncService = new CloudSyncService();

