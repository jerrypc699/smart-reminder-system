import { Task } from '../types';

export interface DailyPrayers {
  fajr: number; // 0 = none, 1 = late, 2 = on time
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface DailyAdhkar {
  sabah: boolean;
  masaa: boolean;
  nawm: boolean;
  dua: boolean;
}

export interface DailyHabitTask {
  t: string; // task title
  d: boolean; // is completed
}

export interface DailyNotes {
  good: string; // إيه اللي نجح النهارده؟
  block: string; // إيه اللي عطّلني؟
  tomorrow: string; // أهم حاجة لازم أعملها بكرة
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  prayers: DailyPrayers;
  adhkar: DailyAdhkar;
  quran: number; // pages
  sport: number; // minutes
  study: number; // minutes
  sleep: number; // hours
  water: number; // cups
  food: boolean; // clean/healthy eating
  weight: string; // optional weight in kg
  tasks: DailyHabitTask[]; // Top 3 tasks
  notes: DailyNotes;
}

export interface DailySettings {
  quran: number; // Target pages, default 5
  sport: number; // Target minutes, default 30
  study: number; // Target minutes, default 60
  sleep: number; // Target hours, default 7
  water: number; // Target cups, default 8
}

export interface MonthlyReview {
  wins: string; // أهم 3 إنجازات
  lesson: string; // الدرس المستفاد
  change: string; // تعديل واحد للشهر القادم
  goal: string; // هدف الشهر القادم
}

export interface DayScoreResult {
  c: Record<string, number>;
  total: number;
}

export const PRAYERS_LIST: [keyof DailyPrayers, string][] = [
  ['fajr', 'الفجر'],
  ['dhuhr', 'الظهر'],
  ['asr', 'العصر'],
  ['maghrib', 'المغرب'],
  ['isha', 'العشاء'],
];

export const ADHKAR_LIST: [keyof DailyAdhkar, string, number][] = [
  ['sabah', 'أذكار الصباح', 3],
  ['masaa', 'أذكار المساء', 3],
  ['nawm', 'أذكار النوم', 2],
  ['dua', 'دعاء / ورد أدعية', 2],
];

export const CATEGORIES_LIST = [
  { key: 'prayer', label: 'الصلاة', max: 25 },
  { key: 'work', label: 'الشغل', max: 20 },
  { key: 'study', label: 'التعلّم', max: 15 },
  { key: 'adhkar', label: 'الأذكار', max: 10 },
  { key: 'quran', label: 'القرآن', max: 10 },
  { key: 'sport', label: 'الرياضة', max: 10 },
  { key: 'health', label: 'الصحة', max: 10 },
];

export const DEFAULT_DAILY_SETTINGS: DailySettings = {
  quran: 5,
  sport: 30,
  study: 60,
  sleep: 7,
  water: 8,
};

export const STORAGE_KEY = 'dr_abdelaziz_daily_system_v1';

export function padZero(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function createBlankDay(date: string): DailyRecord {
  return {
    date,
    prayers: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    adhkar: { sabah: false, masaa: false, nawm: false, dua: false },
    quran: 0,
    sport: 0,
    study: 0,
    sleep: 0,
    water: 0,
    food: false,
    weight: '',
    tasks: [
      { t: '', d: false },
      { t: '', d: false },
      { t: '', d: false },
    ],
    notes: { good: '', block: '', tomorrow: '' },
  };
}

export function normalizeDayRecord(raw: any, date: string): DailyRecord {
  const blank = createBlankDay(date);
  if (!raw) return blank;

  return {
    ...blank,
    ...raw,
    date,
    prayers: { ...blank.prayers, ...(raw.prayers || {}) },
    adhkar: { ...blank.adhkar, ...(raw.adhkar || {}) },
    notes: { ...blank.notes, ...(raw.notes || {}) },
    tasks: Array.isArray(raw.tasks) && raw.tasks.length === 3 ? raw.tasks : blank.tasks,
  };
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function calculateScore(d: DailyRecord, S: DailySettings): DayScoreResult {
  const c: Record<string, number> = {};
  c.prayer = PRAYERS_LIST.reduce(
    (a, [k]) => a + (d.prayers[k] === 2 ? 5 : d.prayers[k] === 1 ? 2 : 0),
    0
  );
  c.adhkar = ADHKAR_LIST.reduce((a, [k, , p]) => a + (d.adhkar[k] ? p : 0), 0);
  c.quran = 10 * clamp01(d.quran / (S.quran || 1));
  c.sport = 10 * clamp01(d.sport / (S.sport || 1));
  c.health =
    4 * clamp01(d.sleep / (S.sleep || 1)) +
    3 * clamp01(d.water / (S.water || 1)) +
    (d.food ? 3 : 0);
  c.work = (20 * d.tasks.filter((t) => t.d).length) / 3;
  c.study = 15 * clamp01(d.study / (S.study || 1));

  const total = Object.values(c).reduce((a, b) => a + b, 0);
  return { c, total: Math.round(total) };
}

export function isMinDay(d: DailyRecord): boolean {
  return (
    PRAYERS_LIST.every(([k]) => d.prayers[k] > 0) &&
    d.adhkar.sabah &&
    d.adhkar.masaa &&
    d.quran >= 1 &&
    d.sport >= 10
  );
}

export function hasData(d: DailyRecord): boolean {
  return (
    PRAYERS_LIST.some(([k]) => d.prayers[k] > 0) ||
    Object.values(d.adhkar).some(Boolean) ||
    d.quran > 0 ||
    d.sport > 0 ||
    d.sleep > 0 ||
    d.water > 0 ||
    d.food ||
    d.study > 0 ||
    d.tasks.some((t) => t.d || t.t.trim().length > 0)
  );
}

export function getMonthDateKeys(yearMonth: string): string[] {
  const [y, mo] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const out: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    out.push(`${yearMonth}-${padZero(i)}`);
  }
  return out;
}

export function getHeatmapColor(score: number | null): string {
  if (score === null) return 'rgba(30, 41, 59, 0.6)'; // slate-800
  if (score >= 85) return '#10b981'; // emerald-500
  if (score >= 65) return '#0d9488'; // teal-600
  if (score >= 40) return '#d97706'; // amber-600
  return '#e11d48'; // rose-600
}

export interface MonthStats {
  n: number;
  ids: string[];
  logged: { id: string; d: DailyRecord; s: DayScoreResult }[];
  avg: number;
  cats: Record<string, number>;
  onTime: number;
  prayed: number;
  adhkarPct: number;
  quran: number;
  sportDays: number;
  sportMin: number;
  studyH: number;
  sleep: number;
  tasks: number;
  tasksAll: number;
  minDays: number;
  streak: number;
  best?: { id: string; d: DailyRecord; s: DayScoreResult };
  worst?: { id: string; d: DailyRecord; s: DayScoreResult };
  w0: number | null;
  w1: number | null;
  weeks: { k: string; avg: number; n: number }[];
  blocks: { id: string; t: string }[];
}

export function calculateMonthStats(
  month: string,
  days: Record<string, DailyRecord>,
  S: DailySettings
): MonthStats {
  const ids = getMonthDateKeys(month);
  const logged: { id: string; d: DailyRecord; s: DayScoreResult }[] = [];

  ids.forEach((id) => {
    if (days[id]) {
      const d = normalizeDayRecord(days[id], id);
      if (hasData(d)) {
        logged.push({ id, d, s: calculateScore(d, S) });
      }
    }
  });

  const n = logged.length;
  const result: MonthStats = {
    n,
    ids,
    logged,
    avg: 0,
    cats: {},
    onTime: 0,
    prayed: 0,
    adhkarPct: 0,
    quran: 0,
    sportDays: 0,
    sportMin: 0,
    studyH: 0,
    sleep: 0,
    tasks: 0,
    tasksAll: n * 3,
    minDays: 0,
    streak: 0,
    w0: null,
    w1: null,
    weeks: [],
    blocks: [],
  };

  if (!n) return result;

  result.avg = logged.reduce((a, x) => a + x.s.total, 0) / n;
  CATEGORIES_LIST.forEach(({ key, max }) => {
    result.cats[key] = (logged.reduce((a, x) => a + (x.s.c[key] || 0), 0) / n / max) * 100;
  });

  let pOn = 0;
  let pAny = 0;
  logged.forEach(({ d }) =>
    PRAYERS_LIST.forEach(([k]) => {
      if (d.prayers[k] === 2) pOn++;
      if (d.prayers[k] > 0) pAny++;
    })
  );

  result.onTime = (pOn / (n * 5)) * 100;
  result.prayed = (pAny / (n * 5)) * 100;
  result.adhkarPct =
    (logged.reduce((a, { d }) => a + (d.adhkar.sabah ? 1 : 0) + (d.adhkar.masaa ? 1 : 0), 0) /
      (n * 2)) *
    100;
  result.quran = logged.reduce((a, { d }) => a + d.quran, 0);
  result.sportDays = logged.filter(({ d }) => d.sport >= S.sport).length;
  result.sportMin = logged.reduce((a, { d }) => a + d.sport, 0);
  result.studyH = logged.reduce((a, { d }) => a + d.study, 0) / 60;

  const sl = logged.filter(({ d }) => d.sleep > 0);
  result.sleep = sl.length ? sl.reduce((a, { d }) => a + d.sleep, 0) / sl.length : 0;
  result.tasks = logged.reduce((a, { d }) => a + d.tasks.filter((t) => t.d).length, 0);
  result.minDays = logged.filter(({ d }) => isMinDay(d)).length;

  // Longest streak
  let bestStreak = 0;
  let currentStreak = 0;
  ids.forEach((id) => {
    const d = days[id] ? normalizeDayRecord(days[id], id) : null;
    if (d && isMinDay(d)) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  result.streak = bestStreak;

  const sorted = [...logged].sort((a, b) => b.s.total - a.s.total);
  result.best = sorted[0];
  result.worst = sorted[sorted.length - 1];

  const w = logged.filter(
    ({ d }) => d.weight !== '' && d.weight !== null && !isNaN(parseFloat(d.weight))
  );
  if (w.length) {
    result.w0 = parseFloat(w[0].d.weight);
    result.w1 = parseFloat(w[w.length - 1].d.weight);
  }

  // Weeks (Saturday start)
  const weeksMap: Record<string, number[]> = {};
  logged.forEach((x) => {
    const dt = parseDateKey(x.id);
    const off = (dt.getDay() + 1) % 7;
    const ws = addDaysToDateKey(x.id, -off);
    if (!weeksMap[ws]) weeksMap[ws] = [];
    weeksMap[ws].push(x.s.total);
  });

  result.weeks = Object.entries(weeksMap)
    .sort()
    .map(([k, v]) => ({
      k,
      avg: v.reduce((a, b) => a + b, 0) / v.length,
      n: v.length,
    }));

  result.blocks = logged
    .filter(({ d }) => d.notes.block && d.notes.block.trim().length > 0)
    .slice(-6)
    .map(({ id, d }) => ({ id, t: d.notes.block.trim() }));

  return result;
}

class DailySystemService {
  private days: Record<string, DailyRecord> = {};
  private months: Record<string, MonthlyReview> = {};
  private settings: DailySettings = { ...DEFAULT_DAILY_SETTINGS };
  private listeners: Set<() => void> = new Set();
  private cloudSyncTimer: any = null;

  constructor() {
    this.loadFromStorage();
  }

  public triggerCloudSync() {
    clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(async () => {
      try {
        const { vercelCloudSync } = await import('./vercelCloudSync');
        const { taskService } = await import('./taskService');
        const { audioStorageService } = await import('./audioStorageService');
        vercelCloudSync.pushToCloud({
          tasks: taskService.getTasks(),
          scheduledMedia: audioStorageService.getScheduledMedias(),
          dailySystem: this.exportForCloud(),
        });
      } catch (err) {
        console.warn('DailySystem cloud push error:', err);
      }
    }, 1200);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('DailySystemService listener error:', err);
      }
    });
  }

  public loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.days = parsed.days || {};
        this.months = parsed.months || {};
        this.settings = { ...DEFAULT_DAILY_SETTINGS, ...(parsed.settings || {}) };
      }
    } catch (e) {
      console.warn('Failed to load daily system from storage:', e);
    }
  }

  public saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          days: this.days,
          months: this.months,
          settings: this.settings,
        })
      );
    } catch (e) {
      console.warn('Failed to save daily system to storage:', e);
    }
  }

  public getDay(dateKey: string): DailyRecord {
    return normalizeDayRecord(this.days[dateKey], dateKey);
  }

  public setDay(record: DailyRecord) {
    this.days[record.date] = record;
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  public getAllDays(): Record<string, DailyRecord> {
    return { ...this.days };
  }

  public getSettings(): DailySettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<DailySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  public getMonthReview(month: string): MonthlyReview {
    return (
      this.months[month] || {
        wins: '',
        lesson: '',
        change: '',
        goal: '',
      }
    );
  }

  public setMonthReview(month: string, review: MonthlyReview) {
    this.months[month] = review;
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  /**
   * Import tasks from today's work task list into the 3 habit slots
   */
  public importTasksFromWorkList(tasks: Task[], dateKey: string) {
    const day = this.getDay(dateKey);
    const todayTasks = tasks.filter((t) => t.dueDate === dateKey || !t.dueDate);
    const candidateTasks = todayTasks.slice(0, 3);

    for (let i = 0; i < 3; i++) {
      if (candidateTasks[i]) {
        day.tasks[i] = {
          t: candidateTasks[i].title,
          d: candidateTasks[i].status === 'completed',
        };
      }
    }

    this.setDay(day);
  }

  /**
   * Merge state from cloud sync
   */
  public mergeFromCloud(cloudData: {
    days?: Record<string, DailyRecord>;
    months?: Record<string, MonthlyReview>;
    settings?: DailySettings;
  }) {
    if (!cloudData) return;
    let changed = false;

    if (cloudData.days) {
      this.days = { ...this.days, ...cloudData.days };
      changed = true;
    }
    if (cloudData.months) {
      this.months = { ...this.months, ...cloudData.months };
      changed = true;
    }
    if (cloudData.settings) {
      this.settings = { ...this.settings, ...cloudData.settings };
      changed = true;
    }

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  public exportForCloud() {
    return {
      days: this.days,
      months: this.months,
      settings: this.settings,
    };
  }
}

export const dailySystemService = new DailySystemService();
