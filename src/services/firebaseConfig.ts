import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfigData {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigData = {
  apiKey: "AIzaSyCQAfiG5qBAf53lfWto0xgS2kjnp1rW-gg",
  authDomain: "abdelaziz-66501.firebaseapp.com",
  projectId: "abdelaziz-66501",
  storageBucket: "abdelaziz-66501.firebasestorage.app",
  messagingSenderId: "92028880228",
  appId: "1:92028880228:web:f6c8b7aa78e7504041e671",
};

const CONFIG_STORAGE_KEY = 'smart_reminder_firebase_config_v1';

class FirebaseManager {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initFromSaved();
  }

  public getConfig(): FirebaseConfigData {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }

    return DEFAULT_FIREBASE_CONFIG;
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
