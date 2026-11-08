import { AthkarItem } from '../types';
import { ATHKAR_DATA } from '../data/athkar';

export interface FloatingDhikrSettings {
  enabled: boolean;
  intervalMinutes: number;
  durationSeconds: number;
  soundEnabled: boolean;
  position: 'bottom-right' | 'top-center' | 'bottom-center';
}

const DEFAULT_FLOATING_SETTINGS: FloatingDhikrSettings = {
  enabled: true,
  intervalMinutes: 15,
  durationSeconds: 10,
  soundEnabled: false,
  position: 'bottom-right',
};

class AthkarStorageService {
  private readonly CUSTOM_ATHKAR_KEY = 'dr_abdelaziz_custom_athkar';
  private readonly FAVORITES_KEY = 'dr_abdelaziz_favorite_athkar';
  private readonly TOTAL_TASBEEH_KEY = 'dr_abdelaziz_total_tasbeeh';
  private readonly DAILY_TASBEEH_KEY = 'dr_abdelaziz_daily_tasbeeh';
  private readonly CUSTOM_PRESETS_KEY = 'dr_abdelaziz_custom_tasbeeh_presets';
  private readonly PROGRESS_KEY = 'dr_abdelaziz_athkar_progress';
  private readonly FLOATING_SETTINGS_KEY = 'dr_abdelaziz_floating_dhikr_settings';

  // 1. Get Combined Athkar (Built-in + Custom)
  public getAllAthkar(): AthkarItem[] {
    const custom = this.getCustomAthkar();
    return [...ATHKAR_DATA, ...custom];
  }

  // 2. Custom Athkar CRUD
  public getCustomAthkar(): AthkarItem[] {
    try {
      const data = localStorage.getItem(this.CUSTOM_ATHKAR_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveCustomDhikr(item: Omit<AthkarItem, 'id' | 'isCustom'>): AthkarItem {
    const newItem: AthkarItem = {
      ...item,
      id: `custom-dhikr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: 'custom',
      isCustom: true,
    };
    const list = this.getCustomAthkar();
    list.unshift(newItem);
    try {
      localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed saving custom dhikr:', e);
    }
    return newItem;
  }

  public deleteCustomDhikr(id: string): void {
    const list = this.getCustomAthkar().filter((item) => item.id !== id);
    try {
      localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed deleting custom dhikr:', e);
    }
  }

  // 3. Favorites Management
  public getFavorites(): string[] {
    try {
      const data = localStorage.getItem(this.FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public isFavorite(id: string): boolean {
    return this.getFavorites().includes(id);
  }

  public toggleFavorite(id: string): boolean {
    const favs = this.getFavorites();
    const index = favs.indexOf(id);
    let isNowFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
      isNowFav = false;
    } else {
      favs.push(id);
      isNowFav = true;
    }
    try {
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favs));
    } catch {}
    return isNowFav;
  }

  // 4. Misbaha / Tasbeeh Storage
  public getTotalTasbeeh(): number {
    try {
      return parseInt(localStorage.getItem(this.TOTAL_TASBEEH_KEY) || '0', 10);
    } catch {
      return 0;
    }
  }

  public incrementTotalTasbeeh(amount: number = 1): number {
    const current = this.getTotalTasbeeh();
    const next = current + amount;
    try {
      localStorage.setItem(this.TOTAL_TASBEEH_KEY, next.toString());
    } catch {}
    return next;
  }

  public getDailyTasbeeh(): { count: number; date: string } {
    const today = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem(this.DAILY_TASBEEH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) return parsed;
      }
    } catch {}
    return { count: 0, date: today };
  }

  public incrementDailyTasbeeh(amount: number = 1): number {
    const today = new Date().toISOString().split('T')[0];
    const daily = this.getDailyTasbeeh();
    const newCount = (daily.date === today ? daily.count : 0) + amount;
    try {
      localStorage.setItem(this.DAILY_TASBEEH_KEY, JSON.stringify({ count: newCount, date: today }));
    } catch {}
    return newCount;
  }

  public getCustomTasbeehPresets(): string[] {
    try {
      const raw = localStorage.getItem(this.CUSTOM_PRESETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public addCustomTasbeehPreset(text: string): string[] {
    const presets = this.getCustomTasbeehPresets();
    if (!presets.includes(text.trim())) {
      presets.push(text.trim());
      try {
        localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
      } catch {}
    }
    return presets;
  }

  // 5. Counters / Progress
  public getProgress(): Record<string, number> {
    try {
      const raw = localStorage.getItem(this.PROGRESS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public saveProgress(progress: Record<string, number>): void {
    try {
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }

  public resetProgressForCategory(category: string, items: AthkarItem[]): Record<string, number> {
    const progress = this.getProgress();
    items.forEach((item) => {
      if (category === 'all' || item.category === category) {
        progress[item.id] = item.count;
      }
    });
    this.saveProgress(progress);
    return progress;
  }

  // 6. Floating On-Screen Dhikr Settings
  public getFloatingSettings(): FloatingDhikrSettings {
    try {
      const raw = localStorage.getItem(this.FLOATING_SETTINGS_KEY);
      return raw ? { ...DEFAULT_FLOATING_SETTINGS, ...JSON.parse(raw) } : DEFAULT_FLOATING_SETTINGS;
    } catch {
      return DEFAULT_FLOATING_SETTINGS;
    }
  }

  public saveFloatingSettings(settings: Partial<FloatingDhikrSettings>): FloatingDhikrSettings {
    const current = this.getFloatingSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(this.FLOATING_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  }
}

export const athkarStorageService = new AthkarStorageService();
