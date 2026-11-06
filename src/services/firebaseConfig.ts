import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfigData {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const CONFIG_STORAGE_KEY = 'smart_reminder_firebase_config_v1';

class FirebaseManager {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initFromSaved();
  }

  public getConfig(): FirebaseConfigData | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }

    // Fallback to Vite environment variables if available
    const envConfig: FirebaseConfigData = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    if (envConfig.apiKey && envConfig.projectId) {
      return envConfig;
    }

    return null;
  }

  public saveConfig(config: FirebaseConfigData): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      return this.initApp(config);
    } catch (err) {
      console.warn('Failed to save Firebase config:', err);
      return false;
    }
  }

  public clearConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    this.app = null;
    this.db = null;
    this.storage = null;
    this.isConnected = false;
  }

  private initFromSaved(): boolean {
    const config = this.getConfig();
    if (config && config.apiKey && config.projectId) {
      return this.initApp(config);
    }
    return false;
  }

  public initApp(config: FirebaseConfigData): boolean {
    try {
      if (getApps().length > 0) {
        this.app = getApp();
      } else {
        this.app = initializeApp(config);
      }

      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);
      this.isConnected = true;
      return true;
    } catch (err) {
      console.warn('Firebase initialization error:', err);
      this.isConnected = false;
      return false;
    }
  }

  public getDb(): Firestore | null {
    if (!this.db) {
      this.initFromSaved();
    }
    return this.db;
  }

  public getStorage(): FirebaseStorage | null {
    if (!this.storage) {
      this.initFromSaved();
    }
    return this.storage;
  }

  public getIsConnected(): boolean {
    return this.isConnected && !!this.db;
  }
}

export const firebaseManager = new FirebaseManager();

