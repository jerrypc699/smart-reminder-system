import { AthkarItem, AthkarVideoItem } from '../types';
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
  private readonly ATHKAR_VIDEOS_KEY = 'dr_abdelaziz_athkar_videos';
  private readonly ATHKAR_OVERRIDES_KEY = 'dr_abdelaziz_athkar_overrides';
  private readonly HIDDEN_ATHKAR_KEY = 'dr_abdelaziz_hidden_athkar_ids';
  private readonly CATEGORY_TITLES_KEY = 'dr_abdelaziz_athkar_category_titles';

  // 1. Get Combined Athkar (Built-in with overrides & hidden filtered + Custom)
  public getAllAthkar(): AthkarItem[] {
    const custom = this.getCustomAthkar();
    const overrides = this.getAthkarOverrides();
    const hiddenSet = new Set(this.getHiddenAthkarIds());
    const builtIn = ATHKAR_DATA
      .filter((item) => !hiddenSet.has(item.id))
      .map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item));
    return [...builtIn, ...custom];
  }

  // 1b. Built-in Athkar Overrides, Hiding & Category Titles
  public getAthkarOverrides(): Record<string, Partial<AthkarItem>> {
    try {
      const raw = localStorage.getItem(this.ATHKAR_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public isBuiltInModified(id: string): boolean {
    return Boolean(this.getAthkarOverrides()[id]);
  }

  public getHiddenAthkarIds(): string[] {
    try {
      const raw = localStorage.getItem(this.HIDDEN_ATHKAR_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public updateAnyDhikr(id: string, updates: Partial<AthkarItem>): boolean {
    // Check if it's a custom dhikr first
    const customList = this.getCustomAthkar();
    const customIdx = customList.findIndex((item) => item.id === id);
    if (customIdx !== -1) {
      return this.updateCustomDhikr(id, updates);
    }
    // Otherwise save as an override for a built-in dhikr
    const overrides = this.getAthkarOverrides();
    overrides[id] = { ...(overrides[id] || {}), ...updates };
    try {
      localStorage.setItem(this.ATHKAR_OVERRIDES_KEY, JSON.stringify(overrides));
      this.triggerCloudSync();
      return true;
    } catch (e) {
      console.warn('Failed updating built-in dhikr override:', e);
      return false;
    }
  }

  public deleteOrHideDhikr(id: string): void {
    const customList = this.getCustomAthkar();
    if (customList.some((item) => item.id === id)) {
      this.deleteCustomDhikr(id);
      return;
    }
    const hidden = this.getHiddenAthkarIds();
    if (!hidden.includes(id)) {
      hidden.push(id);
      try {
        localStorage.setItem(this.HIDDEN_ATHKAR_KEY, JSON.stringify(hidden));
      } catch (e) {
        console.warn('Failed hiding built-in dhikr:', e);
      }
      this.triggerCloudSync();
    }
  }

  public resetBuiltInDhikr(id: string): void {
    const overrides = this.getAthkarOverrides();
    if (overrides[id]) {
      delete overrides[id];
      try {
        localStorage.setItem(this.ATHKAR_OVERRIDES_KEY, JSON.stringify(overrides));
      } catch { }
      this.triggerCloudSync();
    }
  }

  public getCategoryTitles(): Record<string, string> {
    try {
      const raw = localStorage.getItem(this.CATEGORY_TITLES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public updateCategoryTitle(categoryId: string, newTitle: string): Record<string, string> {
    const titles = this.getCategoryTitles();
    const trimmed = newTitle.trim();
    if (trimmed) {
      titles[categoryId] = trimmed;
    } else {
      delete titles[categoryId];
    }
    try {
      localStorage.setItem(this.CATEGORY_TITLES_KEY, JSON.stringify(titles));
    } catch { }
    this.triggerCloudSync();
    return titles;
  }

  public resetCategoryTitle(categoryId: string): Record<string, string> {
    const titles = this.getCategoryTitles();
    delete titles[categoryId];
    try {
      localStorage.setItem(this.CATEGORY_TITLES_KEY, JSON.stringify(titles));
    } catch { }
    this.triggerCloudSync();
    return titles;
  }

  // 1c. Athkar Videos Studio CRUD
  public getAthkarVideos(): AthkarVideoItem[] {
    try {
      const raw = localStorage.getItem(this.ATHKAR_VIDEOS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public addAthkarVideo(video: AthkarVideoItem): AthkarVideoItem {
    const list = this.getAthkarVideos();
    list.unshift(video);
    try {
      localStorage.setItem(this.ATHKAR_VIDEOS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed saving athkar video:', e);
    }
    this.triggerCloudSync();
    return video;
  }

  public updateAthkarVideo(id: string, updates: Partial<AthkarVideoItem>): void {
    const list = this.getAthkarVideos().map((v) => (v.id === id ? { ...v, ...updates } : v));
    try {
      localStorage.setItem(this.ATHKAR_VIDEOS_KEY, JSON.stringify(list));
    } catch { }
    this.triggerCloudSync();
  }

  public deleteAthkarVideo(id: string): void {
    const list = this.getAthkarVideos().filter((v) => v.id !== id);
    try {
      localStorage.setItem(this.ATHKAR_VIDEOS_KEY, JSON.stringify(list));
    } catch { }
    this.triggerCloudSync();
  }

  // 2. Custom Athkar CRUD
  private readonly DEFAULT_CUSTOM_ATHKAR: AthkarItem[] = [
    {
      id: 'custom-seed-1',
      category: 'custom',
      title: 'دعاء ذي النون لتفريج الكرب والهم',
      text: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ.',
      count: 40,
      reward: 'لم يدعُ به رجل مسلم في شيء قط إلا استجاب الله له وفرج همه.',
      reference: 'سورة الأنبياء: 87 / سنن الترمذي وصححه الألباني',
      mood: 'distress',
      isCustom: true,
    },
    {
      id: 'custom-seed-2',
      category: 'custom',
      title: 'الصلاة الإبراهيمية المباركة على النبي ﷺ',
      text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.',
      count: 10,
      reward: 'تكفى همك ويغفر ذنبك ويصلي الله عليك بها عشراً ويرفعك بها عشر درجات.',
      reference: 'صحيح البخاري ومسلم',
      mood: 'guidance',
      isCustom: true,
    },
    {
      id: 'custom-seed-3',
      category: 'custom',
      title: 'دعاء الرزق والعلم والعمل المتقبل',
      text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلاً مُتَقَبَّلاً.',
      count: 7,
      reward: 'دعاء جامع للبركة في الرزق والعلم والتوفيق الإلهي في جميع الأعمال.',
      reference: 'سنن ابن ماجه وصححه الألباني',
      mood: 'gratitude',
      isCustom: true,
    },
  ];

  public getCustomAthkar(): AthkarItem[] {
    try {
      const data = localStorage.getItem(this.CUSTOM_ATHKAR_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Seed default custom athkar so Dr. Abdelaziz immediately sees custom door in action
      localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(this.DEFAULT_CUSTOM_ATHKAR));
      return this.DEFAULT_CUSTOM_ATHKAR;
    } catch {
      return this.DEFAULT_CUSTOM_ATHKAR;
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
    this.triggerCloudSync();
    return newItem;
  }

  public deleteCustomDhikr(id: string): void {
    const list = this.getCustomAthkar().filter((item) => item.id !== id);
    try {
      localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed deleting custom dhikr:', e);
    }
    this.triggerCloudSync();
  }

  public updateCustomDhikr(id: string, updates: Partial<AthkarItem>): boolean {
    const list = this.getCustomAthkar();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;
    list[index] = { ...list[index], ...updates };
    try {
      localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(list));
      this.triggerCloudSync();
      return true;
    } catch (e) {
      console.warn('Failed updating custom dhikr:', e);
      return false;
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
    } catch { }
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
    } catch { }
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
    } catch { }
    return { count: 0, date: today };
  }

  public incrementDailyTasbeeh(amount: number = 1): number {
    const today = new Date().toISOString().split('T')[0];
    const daily = this.getDailyTasbeeh();
    const newCount = (daily.date === today ? daily.count : 0) + amount;
    try {
      localStorage.setItem(this.DAILY_TASBEEH_KEY, JSON.stringify({ count: newCount, date: today }));
    } catch { }
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
      } catch { }
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
    } catch { }
  }

  public resetProgressForCategory(category: string, items: AthkarItem[]): Record<string, number> {
    const progress = this.getProgress();
    items.forEach((item) => {
      if (category === 'all' || item.category === category || (category === 'custom' && item.isCustom)) {
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
    } catch { }
    this.triggerCloudSync();
    return updated;
  }

  private syncTimer: any = null;
  public triggerCloudSync(): void {
    if (typeof window === 'undefined') return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(async () => {
      try {
        const { vercelCloudSync } = await import('./vercelCloudSync');
        vercelCloudSync.pushCurrentState({ athkar: this.exportState() }).catch(console.warn);
        const { appPersistenceService } = await import('./appPersistenceService');
        appPersistenceService.triggerSave('athkar_change');
      } catch (err) {
        console.warn('Athkar sync error:', err);
      }
    }, 1000);
  }

  public exportState(): {
    customAthkar: AthkarItem[];
    favorites: string[];
    totalTasbeeh: number;
    dailyTasbeeh: { count: number; date: string };
    customPresets: string[];
    progress: Record<string, number>;
    floatingSettings: FloatingDhikrSettings;
    athkarVideos: AthkarVideoItem[];
    athkarOverrides: Record<string, Partial<AthkarItem>>;
    hiddenAthkarIds: string[];
    categoryTitles: Record<string, string>;
  } {
    return {
      customAthkar: this.getCustomAthkar(),
      favorites: this.getFavorites(),
      totalTasbeeh: this.getTotalTasbeeh(),
      dailyTasbeeh: this.getDailyTasbeeh(),
      customPresets: this.getCustomTasbeehPresets(),
      progress: this.getProgress(),
      floatingSettings: this.getFloatingSettings(),
      athkarVideos: this.getAthkarVideos(),
      athkarOverrides: this.getAthkarOverrides(),
      hiddenAthkarIds: this.getHiddenAthkarIds(),
      categoryTitles: this.getCategoryTitles(),
    };
  }

  public importState(data: any): void {
    if (!data) return;
    try {
      if (Array.isArray(data.customAthkar)) {
        const existing = this.getCustomAthkar();
        const map = new Map<string, AthkarItem>();
        existing.forEach((item) => map.set(item.id, item));
        data.customAthkar.forEach((item: AthkarItem) => {
          if (item && item.id) map.set(item.id, item);
        });
        localStorage.setItem(this.CUSTOM_ATHKAR_KEY, JSON.stringify(Array.from(map.values())));
      }
      if (Array.isArray(data.favorites)) {
        const mergedFavs = Array.from(new Set([...this.getFavorites(), ...data.favorites]));
        localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(mergedFavs));
      }
      if (typeof data.totalTasbeeh === 'number' && data.totalTasbeeh > this.getTotalTasbeeh()) {
        localStorage.setItem(this.TOTAL_TASBEEH_KEY, data.totalTasbeeh.toString());
      }
      if (data.dailyTasbeeh && typeof data.dailyTasbeeh.count === 'number') {
        const currentDaily = this.getDailyTasbeeh();
        if (data.dailyTasbeeh.date === currentDaily.date && data.dailyTasbeeh.count > currentDaily.count) {
          localStorage.setItem(this.DAILY_TASBEEH_KEY, JSON.stringify(data.dailyTasbeeh));
        }
      }
      if (Array.isArray(data.customPresets)) {
        const mergedPresets = Array.from(new Set([...this.getCustomTasbeehPresets(), ...data.customPresets]));
        localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(mergedPresets));
      }
      if (data.progress && typeof data.progress === 'object') {
        const currentProgress = this.getProgress();
        const mergedProgress = { ...currentProgress, ...data.progress };
        this.saveProgress(mergedProgress);
      }
      if (data.floatingSettings) {
        this.saveFloatingSettings(data.floatingSettings);
      }
      if (Array.isArray(data.athkarVideos)) {
        const existingVideos = this.getAthkarVideos();
        const vMap = new Map<string, AthkarVideoItem>();
        existingVideos.forEach((v) => vMap.set(v.id, v));
        data.athkarVideos.forEach((v: AthkarVideoItem) => {
          if (v && v.id) vMap.set(v.id, v);
        });
        localStorage.setItem(this.ATHKAR_VIDEOS_KEY, JSON.stringify(Array.from(vMap.values())));
      }
      if (data.athkarOverrides && typeof data.athkarOverrides === 'object') {
        const mergedOverrides = { ...this.getAthkarOverrides(), ...data.athkarOverrides };
        localStorage.setItem(this.ATHKAR_OVERRIDES_KEY, JSON.stringify(mergedOverrides));
      }
      if (Array.isArray(data.hiddenAthkarIds)) {
        const mergedHidden = Array.from(new Set([...this.getHiddenAthkarIds(), ...data.hiddenAthkarIds]));
        localStorage.setItem(this.HIDDEN_ATHKAR_KEY, JSON.stringify(mergedHidden));
      }
      if (data.categoryTitles && typeof data.categoryTitles === 'object') {
        const mergedTitles = { ...this.getCategoryTitles(), ...data.categoryTitles };
        localStorage.setItem(this.CATEGORY_TITLES_KEY, JSON.stringify(mergedTitles));
      }
    } catch (e) {
      console.warn('Failed importing athkar state:', e);
    }
  }
}

export const athkarStorageService = new AthkarStorageService();

