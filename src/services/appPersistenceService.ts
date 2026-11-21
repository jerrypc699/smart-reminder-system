import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { APP_VERSION } from '../constants/version';
import {
  Task,
  Employee,
  ScheduledMedia,
  StoredMediaMeta,
  WhatsAppGlobalSettings,
  PrayerSettings,
  AudioSettings,
} from '../types';

export interface MasterVault {
  version: string;
  appVersion: string;
  timestamp: string;
  sourcePlatform: string;
  tasks: Task[];
  employees: Employee[];
  dailySystem: any;
  scheduledMedia: ScheduledMedia[];
  mediaLibrary: StoredMediaMeta[];
  athkar: any;
  whatsappSettings?: WhatsAppGlobalSettings;
  prayerSettings?: PrayerSettings;
  audioSettings?: AudioSettings;
  tombstones?: {
    taskIds: string[];
    employeeIds: string[];
    scheduledIds: string[];
    mediaIds: string[];
    habitIds: string[];
  };
}

class AppPersistenceService {
  private readonly VAULT_LOCAL_KEY = 'dr_abdelaziz_master_vault_v1';
  private readonly VAULT_FILE_NAME = 'dr_abdelaziz_master_vault.json';
  private saveDebounceTimer: any = null;
  private isRestoring = false;
  private isInitialized = false;

  /**
   * Request Persistent Storage from the browser/WebView.
   * This guarantees that Android Chrome WebView, iOS Safari WebKit, and Desktop browsers
   * will NEVER evict or clear local storage/IndexedDB during updates, low storage, or cache cleanups.
   */
  public async requestStoragePersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const alreadyPersisted = await navigator.storage.persisted();
        if (alreadyPersisted) return true;
        const granted = await navigator.storage.persist();
        console.log('[Persistence] Permanent storage granted by browser/WebView:', granted);
        return granted;
      } catch (e) {
        console.warn('[Persistence] Storage persist error:', e);
      }
    }
    return false;
  }

  public async isStoragePersisted(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Initialize persistence service at startup.
   * Restores any missing data from Native Filesystem or Local Vault if needed,
   * then requests browser persistent storage and hooks auto-save listeners.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Request OS-level storage persistence (Android WebView, iOS Safari WebKit, Desktop)
    this.requestStoragePersistence().catch(console.warn);

    // 2. Check if local storage needs hydration from native filesystem
    await this.verifyAndRestoreFromFilesystemIfNeeded();

    // 3. Save initial fresh snapshot after initial load
    setTimeout(() => {
      this.saveMasterVault('app_init');
    }, 2500);
  }

  /**
   * If local storage has 0 tasks or 0 days, check native device filesystem (Directory.Data / Documents)
   * which survives app updates and reinstalls!
   */
  private async verifyAndRestoreFromFilesystemIfNeeded(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const { taskService } = await import('./taskService');
      const { dailySystemService } = await import('./dailySystemService');

      const localTasks = taskService.getTasks();
      const localDays = dailySystemService.getAllDays();
      const hasLocalData = localTasks.length > 0 || Object.keys(localDays).length > 0;

      // Even if local data exists, check if native filesystem vault exists and has newer/more data
      if (Capacitor.isNativePlatform()) {
        try {
          const fileRes = await Filesystem.readFile({
            path: this.VAULT_FILE_NAME,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          });

          if (fileRes && fileRes.data) {
            const raw = typeof fileRes.data === 'string' ? fileRes.data : JSON.stringify(fileRes.data);
            const vault: MasterVault = JSON.parse(raw);
            if (vault && (vault.tasks?.length || Object.keys(vault.dailySystem?.days || {}).length)) {
              if (!hasLocalData || (vault.tasks?.length > localTasks.length)) {
                console.log('[Persistence] Restoring from native filesystem vault...');
                await this.applyVaultToLocalStorage(vault);
                return true;
              }
            }
          }
        } catch (fsErr) {
          // File may not exist on brand new installation, which is normal
        }
      }

      // Check LocalStorage Master Vault backup as fallback
      if (!hasLocalData) {
        const vaultRaw = localStorage.getItem(this.VAULT_LOCAL_KEY);
        if (vaultRaw) {
          const vault: MasterVault = JSON.parse(vaultRaw);
          await this.applyVaultToLocalStorage(vault);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Persistence] verifyAndRestore error:', err);
    }
    return false;
  }

  /**
   * Gather full application state from all local services into a comprehensive MasterVault.
   */
  public async generateMasterVault(): Promise<MasterVault> {
    const { taskService } = await import('./taskService');
    const { dailySystemService } = await import('./dailySystemService');
    const { audioStorageService } = await import('./audioStorageService');
    const { athkarStorageService } = await import('./athkarStorageService');
    const { whatsappService } = await import('./whatsappService');

    let prayerSettings: PrayerSettings | undefined;
    let audioSettings: AudioSettings | undefined;
    try {
      const pRaw = localStorage.getItem('smart_reminder_prayer_settings_v1');
      if (pRaw) prayerSettings = JSON.parse(pRaw);
      const aRaw = localStorage.getItem('smart_reminder_audio_settings_v1');
      if (aRaw) audioSettings = JSON.parse(aRaw);
    } catch {}

    const tasks = taskService.getTasks();
    const employees = taskService.getEmployees();
    const dailySystem = dailySystemService.exportForCloud();
    const scheduledMedia = audioStorageService.getScheduledMedias();
    const mediaLibrary = audioStorageService.getMetaRegistry();
    const athkar = athkarStorageService.exportState();
    const whatsappSettings = whatsappService.getSettings();

    const tombstones = {
      taskIds: taskService.getDeletedTaskIds(),
      employeeIds: taskService.getDeletedEmployeeIds(),
      scheduledIds: audioStorageService.getDeletedScheduledIds(),
      mediaIds: audioStorageService.getDeletedMediaIds(),
      habitIds: dailySystemService.getDeletedHabitIds(),
    };

    return {
      version: '2.0',
      appVersion: APP_VERSION,
      timestamp: new Date().toISOString(),
      sourcePlatform: Capacitor.getPlatform(),
      tasks,
      employees,
      dailySystem,
      scheduledMedia,
      mediaLibrary,
      athkar,
      whatsappSettings,
      prayerSettings,
      audioSettings,
      tombstones,
    };
  }

  /**
   * Save the Master Vault to both LocalStorage AND Native Device Filesystem (Directory.Data & Directory.Documents).
   */
  public triggerSave(reason = 'change'): void {
    if (this.isRestoring) return;
    clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      this.saveMasterVault(reason).catch(console.warn);
    }, 800);
  }

  public async saveMasterVault(reason = 'manual'): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const vault = await this.generateMasterVault();
      const json = JSON.stringify(vault);

      // 1. Save to LocalStorage Master Vault
      localStorage.setItem(this.VAULT_LOCAL_KEY, json);

      // 2. If running natively (Android/iOS), save to permanent filesystem
      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.writeFile({
            path: this.VAULT_FILE_NAME,
            data: json,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          });
          // Also duplicate to Documents directory for external survival
          await Filesystem.writeFile({
            path: this.VAULT_FILE_NAME,
            data: json,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          }).catch(() => {});
        } catch (fsWriteErr) {
          console.warn('[Persistence] Filesystem write error:', fsWriteErr);
        }
      }

      return true;
    } catch (err) {
      console.warn('[Persistence] saveMasterVault error:', err);
      return false;
    }
  }

  /**
   * Apply a MasterVault to all local services and storage keys
   */
  public async applyVaultToLocalStorage(vault: MasterVault): Promise<boolean> {
    if (!vault) return false;
    this.isRestoring = true;

    try {
      const { taskService } = await import('./taskService');
      const { dailySystemService } = await import('./dailySystemService');
      const { audioStorageService } = await import('./audioStorageService');
      const { athkarStorageService } = await import('./athkarStorageService');
      const { whatsappService } = await import('./whatsappService');

      // 1. Restore tombstones first
      if (vault.tombstones) {
        if (Array.isArray(vault.tombstones.taskIds)) taskService.markMultipleTasksDeleted(vault.tombstones.taskIds);
        if (Array.isArray(vault.tombstones.employeeIds)) taskService.markMultipleEmployeesDeleted(vault.tombstones.employeeIds);
        if (Array.isArray(vault.tombstones.scheduledIds)) audioStorageService.markMultipleScheduledDeleted(vault.tombstones.scheduledIds);
        if (Array.isArray(vault.tombstones.mediaIds)) audioStorageService.markMultipleMediaDeleted(vault.tombstones.mediaIds);
        if (Array.isArray(vault.tombstones.habitIds)) dailySystemService.markMultipleHabitsDeleted(vault.tombstones.habitIds);
      }

      // 2. Restore Tasks
      if (Array.isArray(vault.tasks)) {
        taskService.saveTasks(vault.tasks, true);
      }

      // 3. Restore Employees
      if (Array.isArray(vault.employees)) {
        taskService.saveEmployees(vault.employees, true);
      }

      // 4. Restore Daily System
      if (vault.dailySystem) {
        dailySystemService.mergeFromCloud(vault.dailySystem);
      }

      // 5. Restore Scheduled Media & Library
      if (Array.isArray(vault.scheduledMedia)) {
        audioStorageService.saveScheduledMedias(vault.scheduledMedia);
      }
      if (Array.isArray(vault.mediaLibrary)) {
        audioStorageService.syncRemoteMetaList(vault.mediaLibrary);
      }

      // 6. Restore Athkar
      if (vault.athkar) {
        athkarStorageService.importState(vault.athkar);
      }

      // 7. Restore WhatsApp Settings
      if (vault.whatsappSettings) {
        whatsappService.saveSettings(vault.whatsappSettings);
      }

      // 8. Restore Prayer & Audio Settings
      if (vault.prayerSettings) {
        try {
          localStorage.setItem('smart_reminder_prayer_settings_v1', JSON.stringify(vault.prayerSettings));
        } catch {}
      }
      if (vault.audioSettings) {
        try {
          localStorage.setItem('smart_reminder_audio_settings_v1', JSON.stringify(vault.audioSettings));
        } catch {}
      }

      // Update LocalStorage Master Vault
      localStorage.setItem(this.VAULT_LOCAL_KEY, JSON.stringify(vault));
      this.isRestoring = false;
      return true;
    } catch (err) {
      console.warn('[Persistence] applyVaultToLocalStorage error:', err);
      this.isRestoring = false;
      return false;
    }
  }

  /**
   * Export full backup JSON file for manual safety download
   */
  public async exportBackupFile(): Promise<void> {
    const vault = await this.generateMasterVault();
    const jsonStr = JSON.stringify(vault, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `DrAbdelaziz-DataBackup-${dateStr}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } catch (err) {
        console.warn('Native backup export write error:', err);
      }
    }

    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Import backup from JSON string
   */
  public async importBackupFile(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || (!parsed.tasks && !parsed.dailySystem)) {
        throw new Error('ملف النسخة الاحتياطية غير متوافق');
      }
      const success = await this.applyVaultToLocalStorage(parsed);
      if (success) {
        // Also sync to cloud
        const { vercelCloudSync } = await import('./vercelCloudSync');
        vercelCloudSync.pushCurrentState().catch(console.warn);
      }
      return success;
    } catch (e: any) {
      console.error('Failed importing backup file:', e);
      throw e;
    }
  }
}

export const appPersistenceService = new AppPersistenceService();
