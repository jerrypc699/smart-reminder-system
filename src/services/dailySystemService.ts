import { Task } from '../types';

export interface DailyPrayers {
  [key: string]: number;
  fajr: number; // 0 = none, 1 = late, 2 = on time
  duha: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  qiyam: number;
  witr: number;
  sunan: number;
}

export interface DailyAdhkar {
  [key: string]: boolean;
  sabah: boolean;
  masaa: boolean;
  nawm: boolean;
  dua: boolean;
}

export interface DailyHabitTask {
  id?: string;
  t: string; // task title
  d: boolean; // is completed
  sourceTaskId?: string; // linked Work Task ID if auto-imported
  scheduledTime?: string; // HH:mm format, e.g. "14:30"
  enableVoiceAlert?: boolean;
  voiceMessage?: string;
}

export interface DailyNotes {
  good: string; // إيه اللي نجح النهارده؟
  block: string; // إيه اللي عطّلني؟
  tomorrow: string; // أهم حاجة لازم أعملها بكرة
}

export interface CustomWorshipItem {
  id: string;
  label: string;
  points: number;
  scheduledTime?: string; // HH:mm format
  enableVoiceAlert?: boolean;
  voiceMessage?: string;
}

export interface CustomHabitDef {
  id: string;
  label: string;
  kind: 'toggle' | 'counter';
  target: number;
  step: number;
  unit: string;
  points: number;
  scheduledTime?: string; // HH:mm format
  enableVoiceAlert?: boolean;
  voiceMessage?: string;
  reminderMinutesBefore?: number;
}

export interface BuiltInItemSchedule {
  scheduledTime?: string; // HH:mm format
  enableVoiceAlert?: boolean;
  voiceMessage?: string;
}

export interface HabitSubTaskDef {
  id: string;
  title: string; // e.g. "الكوب الأول", "قراءة سورة الملك", "تمرين المشي"
  scheduledTime?: string; // "HH:mm" (24h)
  enableVoiceAlert?: boolean;
  voiceMessage?: string;
  order?: number;
}

export interface ScheduledDailyItem {
  id: string;
  type: 'habit' | 'prayer' | 'adhkar' | 'task' | 'builtin';
  title: string;
  scheduledTime: string; // "HH:mm" (24h)
  enableVoiceAlert: boolean;
  voiceMessage: string;
  isCompleted: boolean;
  sourceId?: string;
  points?: number;
}

export interface CustomNotePrompt {
  id: string;
  label: string;
  placeholder?: string;
}

export interface SportVideoItem {
  id: string;
  name: string;
  mediaId?: string; // linked to audioStorageService ID
  cloudUrl?: string;
  duration?: number;
  size?: number;
  thumbnail?: string;
  createdAt: string;
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
  tasks: DailyHabitTask[]; // Unlimited daily tasks
  dismissedTaskIds?: string[]; // sourceTaskIds deleted by user on this day
  notes: DailyNotes;
  customValues?: Record<string, number>;
  customNotes?: Record<string, string>;
  habitSubTaskCompletions?: Record<string, Record<string, boolean>>;
}

export interface DailySettings {
  quran: number; // Target pages, default 5
  sport: number; // Target minutes, default 30
  study: number; // Target minutes, default 60
  sleep: number; // Target hours, default 7
  water: number; // Target cups, default 8
  autoImportTasks: boolean; // Automatically sync work tasks into Daily System
  autoImportIncludePendingPrevious: boolean; // Also pull overdue pending tasks onto today
  hiddenBuiltIns?: string[]; // Deleted/hidden built-in items or cards
  customPrayers?: CustomWorshipItem[];
  customAdhkar?: CustomWorshipItem[];
  customHabits?: CustomHabitDef[];
  customNotePrompts?: CustomNotePrompt[];
  builtInSchedules?: Record<string, BuiltInItemSchedule>;
  habitSubTasks?: Record<string, HabitSubTaskDef[]>;
  sportVideos?: SportVideoItem[];
}

export interface MonthlyReview {
  wins: string;
  lesson: string;
  change: string;
  goal: string;
}

export interface DayScoreResult {
  c: Record<string, number>;
  maxByCat: Record<string, number>;
  total: number;
}

export const PRAYERS_LIST: [string, string][] = [
  ['fajr', 'صلاة الفجر'],
  ['duha', 'صلاة الضحى'],
  ['dhuhr', 'صلاة الظهر'],
  ['asr', 'صلاة العصر'],
  ['maghrib', 'صلاة المغرب'],
  ['isha', 'صلاة العشاء'],
  ['qiyam', 'قيام الليل'],
  ['witr', 'صلاة الوتر'],
  ['sunan', 'السنن الرواتب'],
];

export const ADHKAR_LIST: ['sabah' | 'masaa' | 'nawm' | 'dua', string, number][] = [
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
  autoImportTasks: true,
  autoImportIncludePendingPrevious: true,
  hiddenBuiltIns: [],
  customPrayers: [],
  customAdhkar: [],
  customHabits: [],
  customNotePrompts: [],
  builtInSchedules: {},
  habitSubTasks: {},
  sportVideos: [],
};

export const STORAGE_KEY = 'dr_abdelaziz_daily_system_v1';
export const DELETED_HABITS_KEY = 'dr_abdelaziz_deleted_habits_v1';

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
    prayers: { fajr: 0, duha: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, qiyam: 0, witr: 0, sunan: 0 },
    adhkar: { sabah: false, masaa: false, nawm: false, dua: false },
    quran: 0,
    sport: 0,
    study: 0,
    sleep: 0,
    water: 0,
    food: false,
    weight: '',
    tasks: [],
    dismissedTaskIds: [],
    notes: { good: '', block: '', tomorrow: '' },
    customValues: {},
    customNotes: {},
    habitSubTaskCompletions: {},
  };
}

export function normalizeDayRecord(raw: any, date: string): DailyRecord {
  const blank = createBlankDay(date);
  if (!raw) return blank;

  const rawTasks: DailyHabitTask[] = Array.isArray(raw.tasks)
    ? raw.tasks.map((item: any, idx: number) => ({
        id: item?.id || `dt_${date}_${idx}`,
        t: typeof item?.t === 'string' ? item.t : '',
        d: Boolean(item?.d),
        sourceTaskId: item?.sourceTaskId,
        scheduledTime: typeof item?.scheduledTime === 'string' ? item.scheduledTime : undefined,
        enableVoiceAlert: item?.enableVoiceAlert !== undefined ? Boolean(item.enableVoiceAlert) : undefined,
        voiceMessage: typeof item?.voiceMessage === 'string' ? item.voiceMessage : undefined,
      }))
    : [];

  return {
    ...blank,
    ...raw,
    date,
    prayers: { ...blank.prayers, ...(raw.prayers || {}) },
    adhkar: { ...blank.adhkar, ...(raw.adhkar || {}) },
    notes: { ...blank.notes, ...(raw.notes || {}) },
    tasks: rawTasks,
    dismissedTaskIds: Array.isArray(raw.dismissedTaskIds) ? raw.dismissedTaskIds : [],
    customValues: raw.customValues && typeof raw.customValues === 'object' ? raw.customValues : {},
    customNotes: raw.customNotes && typeof raw.customNotes === 'object' ? raw.customNotes : {},
    habitSubTaskCompletions:
      raw.habitSubTaskCompletions && typeof raw.habitSubTaskCompletions === 'object'
        ? raw.habitSubTaskCompletions
        : {},
  };
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function calculateScore(d: DailyRecord, S: DailySettings): DayScoreResult {
  const hidden = new Set(S.hiddenBuiltIns || []);
  const c: Record<string, number> = {};
  const maxByCat: Record<string, number> = {};

  // 1. Prayers (+ custom worship items)
  if (hidden.has('card_prayer')) {
    c.prayer = 0;
    maxByCat.prayer = 0;
  } else {
    let pEarned = 0;
    let pMax = 0;
    PRAYERS_LIST.forEach(([k]) => {
      if (!hidden.has(`prayer_${k}`)) {
        pMax += 5;
        const val = d.prayers[k] || 0;
        pEarned += val === 2 ? 5 : val === 1 ? 2 : 0;
      }
    });
    (S.customPrayers || []).forEach((cp) => {
      pMax += cp.points || 3;
      const val = d.prayers[cp.id] || 0;
      pEarned += val === 2 ? cp.points || 3 : val === 1 ? Math.round((cp.points || 3) / 2) : 0;
    });
    c.prayer = pEarned;
    maxByCat.prayer = pMax;
  }

  // 2. Adhkar (+ custom adhkar)
  if (hidden.has('card_adhkar')) {
    c.adhkar = 0;
    maxByCat.adhkar = 0;
  } else {
    let aEarned = 0;
    let aMax = 0;
    ADHKAR_LIST.forEach(([k, , pts]) => {
      if (!hidden.has(`adhkar_${k}`)) {
        aMax += pts;
        if (d.adhkar[k]) aEarned += pts;
      }
    });
    (S.customAdhkar || []).forEach((ca) => {
      aMax += ca.points || 2;
      if (d.adhkar[ca.id]) aEarned += ca.points || 2;
    });
    c.adhkar = aEarned;
    maxByCat.adhkar = aMax;
  }

  // 3. Quran, Sport, Study
  const hideQss = hidden.has('card_qss');
  if (hideQss || hidden.has('item_quran')) {
    c.quran = 0;
    maxByCat.quran = 0;
  } else {
    maxByCat.quran = 10;
    c.quran = 10 * clamp01(d.quran / (S.quran || 1));
  }

  if (hideQss || hidden.has('item_sport')) {
    c.sport = 0;
    maxByCat.sport = 0;
  } else {
    maxByCat.sport = 10;
    c.sport = 10 * clamp01(d.sport / (S.sport || 1));
  }

  if (hideQss || hidden.has('item_study')) {
    c.study = 0;
    maxByCat.study = 0;
  } else {
    maxByCat.study = 15;
    c.study = 15 * clamp01(d.study / (S.study || 1));
  }

  // 4. Health
  if (hidden.has('card_health')) {
    c.health = 0;
    maxByCat.health = 0;
  } else {
    let hEarned = 0;
    let hMax = 0;
    if (!hidden.has('item_sleep')) {
      hMax += 4;
      hEarned += 4 * clamp01(d.sleep / (S.sleep || 1));
    }
    if (!hidden.has('item_water')) {
      hMax += 3;
      hEarned += 3 * clamp01(d.water / (S.water || 1));
    }
    if (!hidden.has('item_food')) {
      hMax += 3;
      if (d.food) hEarned += 3;
    }
    c.health = hEarned;
    maxByCat.health = hMax;
  }

  // 5. Work tasks (dynamic count!)
  if (hidden.has('card_work')) {
    c.work = 0;
    maxByCat.work = 0;
  } else {
    maxByCat.work = 20;
    const validTasks = d.tasks.filter((t) => t.t.trim().length > 0 || t.d);
    if (validTasks.length > 0) {
      c.work = (20 * validTasks.filter((t) => t.d).length) / validTasks.length;
    } else {
      c.work = 0;
    }
  }

  // 6. Custom habits (user-added toggles or counters)
  const customHabits = S.customHabits || [];
  let customEarned = 0;
  let customMax = 0;
  const customVals = d.customValues || {};
  customHabits.forEach((h) => {
    const pts = h.points || 5;
    customMax += pts;
    const val = customVals[h.id] || 0;
    if (h.kind === 'toggle') {
      if (val > 0) customEarned += pts;
    } else {
      customEarned += pts * clamp01(val / (h.target || 1));
    }
  });
  if (customMax > 0) {
    c.custom = customEarned;
    maxByCat.custom = customMax;
  }

  const totalMax = Object.values(maxByCat).reduce((a, b) => a + b, 0);
  const totalEarned = Object.values(c).reduce((a, b) => a + b, 0);

  let total = 0;
  if (totalMax > 0) {
    total = totalMax === 100
      ? Math.round(totalEarned)
      : Math.min(100, Math.round((totalEarned / totalMax) * 100));
  }

  return { c, maxByCat, total };
}

export function isMinDay(d: DailyRecord, S: DailySettings = DEFAULT_DAILY_SETTINGS): boolean {
  const hidden = new Set(S.hiddenBuiltIns || []);
  const fardKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const activePrayers = fardKeys.filter((k) => !hidden.has('card_prayer') && !hidden.has(`prayer_${k}`));
  const prayersOk = activePrayers.every((k) => (d.prayers[k] || 0) > 0);
  const sabahOk = hidden.has('card_adhkar') || hidden.has('adhkar_sabah') || !!d.adhkar.sabah;
  const masaaOk = hidden.has('card_adhkar') || hidden.has('adhkar_masaa') || !!d.adhkar.masaa;
  const quranOk = hidden.has('card_qss') || hidden.has('item_quran') || d.quran >= 1;
  const sportOk = hidden.has('card_qss') || hidden.has('item_sport') || d.sport >= 10;
  return prayersOk && sabahOk && masaaOk && quranOk && sportOk;
}

export function hasData(d: DailyRecord): boolean {
  return (
    Object.values(d.prayers || {}).some((v) => v > 0) ||
    Object.values(d.adhkar || {}).some(Boolean) ||
    d.quran > 0 ||
    d.sport > 0 ||
    d.sleep > 0 ||
    d.water > 0 ||
    d.food ||
    d.study > 0 ||
    d.tasks.some((t) => t.d || t.t.trim().length > 0) ||
    Object.values(d.customValues || {}).some((v) => v > 0) ||
    Object.values(d.notes || {}).some((v) => (v || '').trim().length > 0) ||
    Object.values(d.customNotes || {}).some((v) => (v || '').trim().length > 0)
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
  if (score === null) return 'rgba(30, 41, 59, 0.6)';
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#0d9488';
  if (score >= 40) return '#d97706';
  return '#e11d48';
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
    tasksAll: 0,
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
    const denom = logged[0]?.s.maxByCat?.[key] ?? max;
    result.cats[key] = denom > 0
      ? (logged.reduce((a, x) => a + (x.s.c[key] || 0), 0) / n / denom) * 100
      : 0;
  });

  let pOn = 0;
  let pAny = 0;
  const fardKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  logged.forEach(({ d }) =>
    fardKeys.forEach((k) => {
      if (d.prayers[k] === 2) pOn++;
      if (d.prayers[k] > 0) pAny++;
    })
  );

  result.onTime = (pOn / (n * fardKeys.length)) * 100;
  result.prayed = (pAny / (n * fardKeys.length)) * 100;
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
  result.tasksAll = logged.reduce(
    (a, { d }) => a + d.tasks.filter((t) => t.t.trim().length > 0 || t.d).length,
    0
  );
  result.minDays = logged.filter(({ d }) => isMinDay(d, S)).length;

  let bestStreak = 0;
  let currentStreak = 0;
  ids.forEach((id) => {
    const d = days[id] ? normalizeDayRecord(days[id], id) : null;
    if (d && isMinDay(d, S)) {
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

export function getDateKeysInRange(startKey: string, endKey: string): string[] {
  let sKey = startKey;
  let eKey = endKey;
  if (sKey > eKey) {
    sKey = endKey;
    eKey = startKey;
  }
  const startDate = parseDateKey(sKey);
  const endDate = parseDateKey(eKey);
  const keys: string[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    keys.push(formatDateKey(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return keys;
}

export interface PeriodStats {
  startDate: string;
  endDate: string;
  totalDays: number;
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
  water: number;
  tasks: number;
  tasksAll: number;
  minDays: number;
  best?: { id: string; d: DailyRecord; s: DayScoreResult };
  worst?: { id: string; d: DailyRecord; s: DayScoreResult };
  blocks: { id: string; t: string }[];
}

export function calculatePeriodStats(
  startKey: string,
  endKey: string,
  days: Record<string, DailyRecord>,
  S: DailySettings
): PeriodStats {
  const ids = getDateKeysInRange(startKey, endKey);
  const totalDays = ids.length;
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
  const result: PeriodStats = {
    startDate: startKey <= endKey ? startKey : endKey,
    endDate: startKey <= endKey ? endKey : startKey,
    totalDays,
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
    water: 0,
    tasks: 0,
    tasksAll: 0,
    minDays: 0,
    blocks: [],
  };

  if (!n) return result;

  result.avg = logged.reduce((a, x) => a + x.s.total, 0) / n;
  CATEGORIES_LIST.forEach(({ key, max }) => {
    const denom = logged[0]?.s.maxByCat?.[key] ?? max;
    result.cats[key] =
      denom > 0
        ? (logged.reduce((a, x) => a + (x.s.c[key] || 0), 0) / n / denom) * 100
        : 0;
  });

  let pOn = 0;
  let pAny = 0;
  const fardKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  logged.forEach(({ d }) =>
    fardKeys.forEach((k) => {
      if (d.prayers[k] === 2) pOn++;
      if (d.prayers[k] > 0) pAny++;
    })
  );

  result.onTime = (pOn / (n * fardKeys.length)) * 100;
  result.prayed = (pAny / (n * fardKeys.length)) * 100;
  result.adhkarPct =
    (logged.reduce((a, { d }) => a + (d.adhkar.sabah ? 1 : 0) + (d.adhkar.masaa ? 1 : 0), 0) /
      (n * 2)) *
    100;
  result.quran = logged.reduce((a, { d }) => a + d.quran, 0);
  result.sportDays = logged.filter(({ d }) => d.sport >= (S.sport || 10)).length;
  result.sportMin = logged.reduce((a, { d }) => a + d.sport, 0);
  result.studyH = logged.reduce((a, { d }) => a + d.study, 0) / 60;

  const sl = logged.filter(({ d }) => d.sleep > 0);
  result.sleep = sl.length ? sl.reduce((a, { d }) => a + d.sleep, 0) / sl.length : 0;

  const wt = logged.filter(({ d }) => (d.water || 0) > 0);
  result.water = wt.length ? wt.reduce((a, { d }) => a + (d.water || 0), 0) / wt.length : 0;

  result.tasks = logged.reduce((a, { d }) => a + d.tasks.filter((t) => t.d).length, 0);
  result.tasksAll = logged.reduce(
    (a, { d }) => a + d.tasks.filter((t) => t.t.trim().length > 0 || t.d).length,
    0
  );
  result.minDays = logged.filter(({ d }) => isMinDay(d, S)).length;

  const sorted = [...logged].sort((a, b) => b.s.total - a.s.total);
  result.best = sorted[0];
  result.worst = sorted[sorted.length - 1];

  result.blocks = logged
    .filter(({ d }) => d.notes.block && d.notes.block.trim().length > 0)
    .slice(-10)
    .map(({ id, d }) => ({ id, t: d.notes.block.trim() }));

  return result;
}

function doesWorkTaskApplyToDate(task: Task, dateKey: string, todayKey: string, includePendingPrevious: boolean): boolean {
  if (task.status === 'completed' || Boolean(task.isArchived)) return false;
  if (task.dueDate === dateKey) return true;
  if (task.repeat === 'daily') return true;
  const targetDate = parseDateKey(dateKey);
  const dow = targetDate.getDay();
  if (task.repeat === 'workdays' && dow >= 0 && dow <= 4) return true;
  if (task.repeat === 'weekly' && task.dueDate) {
    const origDow = parseDateKey(task.dueDate).getDay();
    if (origDow === dow) return true;
  }
  if (
    includePendingPrevious &&
    dateKey === todayKey &&
    task.dueDate &&
    task.dueDate < dateKey
  ) {
    return true;
  }
  return false;
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
        vercelCloudSync.pushCurrentState({
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
      import('./appPersistenceService').then(({ appPersistenceService }) => {
        appPersistenceService.triggerSave('daily_system');
      }).catch(() => {});
    } catch (e) {
      console.warn('Failed to save daily system to storage:', e);
    }
  }

  public getDay(dateKey: string): DailyRecord {
    return normalizeDayRecord(this.days[dateKey], dateKey);
  }

  public setDay(record: DailyRecord, skipCloud = false) {
    this.days[record.date] = record;
    this.saveToStorage();
    this.notify();
    if (!skipCloud) {
      this.triggerCloudSync();
    }
  }

  public clearDay(dateKey: string) {
    delete this.days[dateKey];
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  public getAllDays(): Record<string, DailyRecord> {
    return { ...this.days };
  }

  public getSettings(): DailySettings {
    return {
      ...DEFAULT_DAILY_SETTINGS,
      ...this.settings,
      hiddenBuiltIns: [...(this.settings.hiddenBuiltIns || [])],
      customPrayers: [...(this.settings.customPrayers || [])],
      customAdhkar: [...(this.settings.customAdhkar || [])],
      customHabits: [...(this.settings.customHabits || [])],
      customNotePrompts: [...(this.settings.customNotePrompts || [])],
      builtInSchedules: { ...(this.settings.builtInSchedules || {}) },
      sportVideos: [...(this.settings.sportVideos || [])],
    };
  }

  public getSportVideos(): SportVideoItem[] {
    return this.settings.sportVideos || [];
  }

  public addSportVideo(
    video: Omit<SportVideoItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): SportVideoItem {
    const newVideo: SportVideoItem = {
      id: video.id || `sport_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: video.name,
      mediaId: video.mediaId,
      cloudUrl: video.cloudUrl,
      duration: video.duration,
      size: video.size,
      thumbnail: video.thumbnail,
      createdAt: video.createdAt || new Date().toISOString(),
    };
    const list = [...(this.settings.sportVideos || []), newVideo];
    this.updateSettings({ sportVideos: list });
    return newVideo;
  }

  public updateSportVideo(id: string, updates: Partial<SportVideoItem>): void {
    const list = (this.settings.sportVideos || []).map((v) =>
      v.id === id ? { ...v, ...updates } : v
    );
    this.updateSettings({ sportVideos: list });
  }

  public deleteSportVideo(id: string): void {
    const list = (this.settings.sportVideos || []).filter((v) => v.id !== id);
    this.updateSettings({ sportVideos: list });
  }

  public updateSettings(newSettings: Partial<DailySettings>) {
    this.settings = { ...DEFAULT_DAILY_SETTINGS, ...this.settings, ...newSettings };
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  public hideBuiltInItem(key: string) {
    const curr = new Set(this.settings.hiddenBuiltIns || []);
    curr.add(key);
    this.updateSettings({ hiddenBuiltIns: Array.from(curr) });
  }

  public restoreBuiltInItem(key: string) {
    const curr = (this.settings.hiddenBuiltIns || []).filter((k) => k !== key);
    this.updateSettings({ hiddenBuiltIns: curr });
  }

  public restoreAllBuiltIns() {
    this.updateSettings({ hiddenBuiltIns: [] });
  }

  public addCustomPrayer(
    label: string,
    points = 3,
    options?: { scheduledTime?: string; enableVoiceAlert?: boolean; voiceMessage?: string }
  ) {
    const item: CustomWorshipItem = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: label.trim(),
      points,
      scheduledTime: options?.scheduledTime,
      enableVoiceAlert: options?.enableVoiceAlert,
      voiceMessage: options?.voiceMessage,
    };
    this.updateSettings({
      customPrayers: [...(this.settings.customPrayers || []), item],
    });
  }

  public updateCustomPrayer(id: string, updates: Partial<CustomWorshipItem>) {
    this.updateSettings({
      customPrayers: (this.settings.customPrayers || []).map((cp) => (cp.id === id ? { ...cp, ...updates } : cp)),
    });
  }

  // --- Habit Deletion Tombstones ---
  public getDeletedHabitIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DELETED_HABITS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public markHabitDeleted(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const current = new Set(this.getDeletedHabitIds());
      current.add(id);
      localStorage.setItem(DELETED_HABITS_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {
      console.warn('Failed to mark habit as deleted:', e);
    }
  }

  public markMultipleHabitsDeleted(ids: string[]): void {
    if (typeof window === 'undefined' || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const current = new Set(this.getDeletedHabitIds());
      let changed = false;
      ids.forEach((id) => {
        if (id && !current.has(id)) {
          current.add(id);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(DELETED_HABITS_KEY, JSON.stringify(Array.from(current)));
      }
    } catch (e) {
      console.warn('Failed to mark multiple habits as deleted:', e);
    }
  }

  public isHabitDeleted(id: string): boolean {
    if (typeof window === 'undefined' || !id) return false;
    return this.getDeletedHabitIds().includes(id);
  }

  public removeCustomPrayer(id: string) {
    this.markHabitDeleted(id);
    this.updateSettings({
      customPrayers: (this.settings.customPrayers || []).filter((i) => i.id !== id),
    });
  }

  public addCustomAdhkar(
    label: string,
    points = 2,
    options?: { scheduledTime?: string; enableVoiceAlert?: boolean; voiceMessage?: string }
  ) {
    const item: CustomWorshipItem = {
      id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: label.trim(),
      points,
      scheduledTime: options?.scheduledTime,
      enableVoiceAlert: options?.enableVoiceAlert,
      voiceMessage: options?.voiceMessage,
    };
    this.updateSettings({
      customAdhkar: [...(this.settings.customAdhkar || []), item],
    });
  }

  public updateCustomAdhkar(id: string, updates: Partial<CustomWorshipItem>) {
    this.updateSettings({
      customAdhkar: (this.settings.customAdhkar || []).map((ca) => (ca.id === id ? { ...ca, ...updates } : ca)),
    });
  }

  public removeCustomAdhkar(id: string) {
    this.markHabitDeleted(id);
    this.updateSettings({
      customAdhkar: (this.settings.customAdhkar || []).filter((i) => i.id !== id),
    });
  }

  public addCustomHabit(def: Omit<CustomHabitDef, 'id'>) {
    const habit: CustomHabitDef = {
      ...def,
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.updateSettings({
      customHabits: [...(this.settings.customHabits || []), habit],
    });
  }

  public updateCustomHabit(id: string, updates: Partial<CustomHabitDef>) {
    this.updateSettings({
      customHabits: (this.settings.customHabits || []).map((h) => (h.id === id ? { ...h, ...updates } : h)),
    });
  }

  public removeCustomHabit(id: string) {
    this.markHabitDeleted(id);
    this.updateSettings({
      customHabits: (this.settings.customHabits || []).filter((h) => h.id !== id),
    });
  }

  public setBuiltInSchedule(itemKey: string, schedule: BuiltInItemSchedule | null) {
    const current = { ...(this.settings.builtInSchedules || {}) };
    if (!schedule || (!schedule.scheduledTime && !schedule.voiceMessage)) {
      delete current[itemKey];
    } else {
      current[itemKey] = schedule;
    }
    this.updateSettings({ builtInSchedules: current });
  }

  public getBuiltInSchedule(itemKey: string): BuiltInItemSchedule | undefined {
    return (this.settings.builtInSchedules || {})[itemKey];
  }

  // ─────────────────────────────────────────────────────────────
  // Habit Sub-Tasks & Internal Scheduled Tasks (مهام العادات الداخلية والمواعيد المخصصة)
  // ─────────────────────────────────────────────────────────────

  public getSubTasksForHabit(habitKey: string): HabitSubTaskDef[] {
    const list = (this.settings.habitSubTasks || {})[habitKey];
    if (Array.isArray(list) && list.length > 0) {
      return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    // If water and not initialized, auto-generate default 8 cups
    if (habitKey === 'item_water') {
      const defs = this.generateDefaultWaterSchedule(this.settings.water || 8);
      this.setSubTasksForHabit('item_water', defs);
      return defs;
    }
    return [];
  }

  public setSubTasksForHabit(habitKey: string, subTasks: HabitSubTaskDef[]): void {
    const current = { ...(this.settings.habitSubTasks || {}) };
    current[habitKey] = subTasks.map((st, idx) => ({ ...st, order: st.order ?? idx }));
    this.updateSettings({ habitSubTasks: current });
  }

  public addSubTaskToHabit(habitKey: string, def: Omit<HabitSubTaskDef, 'id'>): HabitSubTaskDef {
    const current = this.getSubTasksForHabit(habitKey);
    const newSubTask: HabitSubTaskDef = {
      ...def,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: current.length,
    };
    this.setSubTasksForHabit(habitKey, [...current, newSubTask]);
    return newSubTask;
  }

  public updateSubTaskInHabit(habitKey: string, subTaskId: string, updates: Partial<HabitSubTaskDef>): void {
    const current = this.getSubTasksForHabit(habitKey);
    const updated = current.map((st) => (st.id === subTaskId ? { ...st, ...updates } : st));
    this.setSubTasksForHabit(habitKey, updated);
  }

  public deleteSubTaskFromHabit(habitKey: string, subTaskId: string): void {
    const current = this.getSubTasksForHabit(habitKey);
    const filtered = current.filter((st) => st.id !== subTaskId);
    this.setSubTasksForHabit(habitKey, filtered);
  }

  public isSubTaskCompleted(dateKey: string, habitKey: string, subTaskId: string): boolean {
    const day = this.getDay(dateKey);
    return Boolean(day.habitSubTaskCompletions?.[habitKey]?.[subTaskId]);
  }

  public toggleSubTaskCompletion(dateKey: string, habitKey: string, subTaskId: string): boolean {
    const day = this.getDay(dateKey);
    const comps = { ...(day.habitSubTaskCompletions || {}) };
    const habitComps = { ...(comps[habitKey] || {}) };
    const nextState = !habitComps[subTaskId];
    habitComps[subTaskId] = nextState;
    comps[habitKey] = habitComps;

    const updates: Partial<DailyRecord> = { habitSubTaskCompletions: comps };

    // If it's water, auto-sync completed count with day.water
    if (habitKey === 'item_water') {
      const completedCups = Object.values(habitComps).filter(Boolean).length;
      updates.water = completedCups;
    }

    this.setDay({ ...day, ...updates });
    return nextState;
  }

  public generateDefaultWaterSchedule(
    targetCups: number = 8,
    startHour: number = 7,
    endHour: number = 22
  ): HabitSubTaskDef[] {
    const cups: HabitSubTaskDef[] = [];
    const count = Math.max(1, Math.min(20, targetCups));
    const stepHours = (endHour - startHour) / Math.max(1, count - 1);

    const cupDescriptions = [
      'عند الاستيقاظ والصباح الباكر',
      'منتصف الصباح وبدء العمل',
      'قبل صلاة الظهر والعيادة',
      'بعد الظهر والغداء',
      'فترة العصر وتجديد النشاط',
      'قبل المساء والمغرب',
      'بعد صلاة العشاء',
      'قبل النوم والراحة',
    ];

    for (let i = 0; i < count; i++) {
      const totalMinutes = Math.round(startHour * 60 + i * stepHours * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const desc = cupDescriptions[i] || `الكوب رقم ${i + 1}`;

      cups.push({
        id: `water_cup_${i + 1}`,
        title: `كوب ${i + 1} (${desc})`,
        scheduledTime: timeStr,
        enableVoiceAlert: true,
        voiceMessage: `يا دكتور عبد العزيز، تذكير بشرب كوب الماء ${i + 1} للحفاظ على ترطيب ونشاط جسمك.`,
        order: i,
      });
    }

    return cups;
  }

  public getScheduledDailyItems(dateKey?: string): ScheduledDailyItem[] {
    const targetDateKey = dateKey || formatDateKey(new Date());
    const day = this.getDay(targetDateKey);
    const items: ScheduledDailyItem[] = [];

    // 1. Custom Habits
    (this.settings.customHabits || []).forEach((h) => {
      if (h.scheduledTime && h.enableVoiceAlert !== false) {
        const val = (day.customValues || {})[h.id] || 0;
        const isCompleted = h.kind === 'toggle' ? val > 0 : val >= (h.target || 1);
        const voiceMessage =
          h.voiceMessage?.trim() || `يا دكتور عبد العزيز، حان الآن وقت ممارسة عادة ${h.label}.`;
        items.push({
          id: h.id,
          type: 'habit',
          title: h.label,
          scheduledTime: h.scheduledTime,
          enableVoiceAlert: true,
          voiceMessage,
          isCompleted,
          sourceId: h.id,
          points: h.points,
        });
      }
    });

    // 2. Custom Prayers
    (this.settings.customPrayers || []).forEach((cp) => {
      if (cp.scheduledTime && cp.enableVoiceAlert !== false) {
        const isCompleted = (day.prayers?.[cp.id] || 0) > 0;
        const voiceMessage =
          cp.voiceMessage?.trim() || `يا دكتور عبد العزيز، حان الآن موعد ${cp.label}. تقبل الله طاعتكم.`;
        items.push({
          id: cp.id,
          type: 'prayer',
          title: cp.label,
          scheduledTime: cp.scheduledTime,
          enableVoiceAlert: true,
          voiceMessage,
          isCompleted,
          sourceId: cp.id,
          points: cp.points,
        });
      }
    });

    // 3. Custom Adhkar
    (this.settings.customAdhkar || []).forEach((ca) => {
      if (ca.scheduledTime && ca.enableVoiceAlert !== false) {
        const isCompleted = Boolean(day.adhkar?.[ca.id]);
        const voiceMessage =
          ca.voiceMessage?.trim() || `يا دكتور عبد العزيز، حان الآن وقت ذكر ${ca.label}.`;
        items.push({
          id: ca.id,
          type: 'adhkar',
          title: ca.label,
          scheduledTime: ca.scheduledTime,
          enableVoiceAlert: true,
          voiceMessage,
          isCompleted,
          sourceId: ca.id,
          points: ca.points,
        });
      }
    });

    // 4. Built-in Items with Schedules
    const builtInLabels: Record<string, string> = {
      item_quran: 'ورد القرآن الكريم',
      item_sport: 'الرياضة والحركة',
      item_study: 'التعلّم والمذاكرة',
      item_sleep: 'موعد النوم والراحة',
      item_water: 'شرب الماء والترطيب',
      item_food: 'تناول الغذاء الصحي',
      adhkar_sabah: 'أذكار الصباح',
      adhkar_masaa: 'أذكار المساء',
      adhkar_nawm: 'أذكار النوم',
      adhkar_dua: 'ورد الدعاء',
    };

    const schedules = this.settings.builtInSchedules || {};
    Object.entries(schedules).forEach(([itemKey, sched]) => {
      if (sched && sched.scheduledTime && sched.enableVoiceAlert !== false) {
        let isCompleted = false;
        if (itemKey === 'item_quran') isCompleted = day.quran >= (this.settings.quran || 1);
        else if (itemKey === 'item_sport') isCompleted = day.sport >= (this.settings.sport || 1);
        else if (itemKey === 'item_study') isCompleted = day.study >= (this.settings.study || 1);
        else if (itemKey === 'item_sleep') isCompleted = day.sleep > 0;
        else if (itemKey === 'item_water') isCompleted = day.water >= (this.settings.water || 1);
        else if (itemKey === 'item_food') isCompleted = Boolean(day.food);
        else if (itemKey === 'adhkar_sabah') isCompleted = Boolean(day.adhkar?.sabah);
        else if (itemKey === 'adhkar_masaa') isCompleted = Boolean(day.adhkar?.masaa);
        else if (itemKey === 'adhkar_nawm') isCompleted = Boolean(day.adhkar?.nawm);
        else if (itemKey === 'adhkar_dua') isCompleted = Boolean(day.adhkar?.dua);

        const title = builtInLabels[itemKey] || itemKey;
        const voiceMessage = sched.voiceMessage?.trim() || `يا دكتور عبد العزيز، حان الآن موعد ${title}.`;
        items.push({
          id: `builtin_${itemKey}`,
          type: 'builtin',
          title,
          scheduledTime: sched.scheduledTime,
          enableVoiceAlert: true,
          voiceMessage,
          isCompleted,
          sourceId: itemKey,
        });
      }
    });

    // 5. Daily Tasks
    (day.tasks || []).forEach((t, idx) => {
      if (t.scheduledTime && t.enableVoiceAlert !== false) {
        const isCompleted = Boolean(t.d);
        const voiceMessage =
          t.voiceMessage?.trim() || `يا دكتور عبد العزيز، حان الآن موعد تنفيذ مهمة ${t.t}.`;
        items.push({
          id: t.id || `task_${targetDateKey}_${idx}`,
          type: 'task',
          title: t.t,
          scheduledTime: t.scheduledTime,
          enableVoiceAlert: true,
          voiceMessage,
          isCompleted,
          sourceId: t.id,
        });
      }
    });

    // 6. Habit Sub-Tasks & Internal Scheduled Tasks (مهام العادات الداخلية)
    const habitSubTasks = this.settings.habitSubTasks || {};
    const habitCompletions = day.habitSubTaskCompletions || {};
    const parentCategoryLabels: Record<string, string> = {
      item_quran: 'القرآن الكريم',
      item_sport: 'الرياضة والحركة',
      item_study: 'التعلّم والمذاكرة',
      item_sleep: 'النوم والراحة',
      item_water: 'شرب الماء',
      item_food: 'الغذاء الصحي',
      ...builtInLabels,
    };

    Object.entries(habitSubTasks).forEach(([habitKey, subList]) => {
      if (Array.isArray(subList)) {
        subList.forEach((sub) => {
          if (sub.scheduledTime && sub.enableVoiceAlert !== false) {
            const isCompleted = Boolean(habitCompletions[habitKey]?.[sub.id]);
            const pLabel = parentCategoryLabels[habitKey] || habitKey;
            const voiceMessage =
              sub.voiceMessage?.trim() ||
              `يا دكتور عبد العزيز، حان الآن موعد ${pLabel} - ${sub.title}.`;
            items.push({
              id: `sub_${habitKey}_${sub.id}`,
              type: 'habit',
              title: `${pLabel}: ${sub.title}`,
              scheduledTime: sub.scheduledTime,
              enableVoiceAlert: true,
              voiceMessage,
              isCompleted,
              sourceId: `${habitKey}:${sub.id}`,
            });
          }
        });
      }
    });

    return items;
  }

  public addCustomNotePrompt(label: string, placeholder?: string) {
    const prompt: CustomNotePrompt = {
      id: `cn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: label.trim(),
      placeholder,
    };
    this.updateSettings({
      customNotePrompts: [...(this.settings.customNotePrompts || []), prompt],
    });
  }

  public removeCustomNotePrompt(id: string) {
    this.updateSettings({
      customNotePrompts: (this.settings.customNotePrompts || []).filter((p) => p.id !== id),
    });
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

  public getPeriodStats(startKey: string, endKey: string): PeriodStats {
    return calculatePeriodStats(startKey, endKey, this.days, this.settings);
  }

  public setMonthReview(month: string, review: MonthlyReview) {
    this.months[month] = review;
    this.saveToStorage();
    this.notify();
    this.triggerCloudSync();
  }

  /**
   * Automatically synchronize matching Work Tasks into Daily System for `dateKey`.
   * Respects manually added tasks AND explicitly deleted/dismissed tasks (`dismissedTaskIds`).
   * Passing `forceRestore = true` ignores `dismissedTaskIds` (used by manual "Re-import All" button).
   */
  public autoSyncWorkTasksForDay(
    tasks: Task[],
    dateKey: string,
    forceRestore = false
  ): boolean {
    if (!forceRestore && !this.settings.autoImportTasks) return false;

    const todayKey = formatDateKey(new Date());
    const day = this.getDay(dateKey);
    const dismissed = forceRestore ? new Set<string>() : new Set(day.dismissedTaskIds || []);

    const matchingWorkTasks = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        !t.isArchived &&
        !dismissed.has(t.id) &&
        doesWorkTaskApplyToDate(
          t,
          dateKey,
          todayKey,
          this.settings.autoImportIncludePendingPrevious !== false
        )
    );

    const matchingById = new Map<string, Task>();
    matchingWorkTasks.forEach((wt) => matchingById.set(wt.id, wt));

    // Keep manual items (no sourceTaskId) AND still-valid linked items, updating titles/statuses
    const nextTasks: DailyHabitTask[] = [];
    const seenLinkedIds = new Set<string>();

    for (const existing of day.tasks) {
      if (existing.sourceTaskId) {
        const wt = matchingById.get(existing.sourceTaskId);
        if (wt && wt.status !== 'completed' && !wt.isArchived) {
          seenLinkedIds.add(wt.id);
          nextTasks.push({
            ...existing,
            t: wt.title,
            d: false,
          });
        }
      } else if (existing.t.trim().length > 0) {
        nextTasks.push(existing);
      }
    }

    // Append newly discovered matching Work Tasks
    for (const wt of matchingWorkTasks) {
      if (!seenLinkedIds.has(wt.id) && wt.status !== 'completed' && !wt.isArchived) {
        nextTasks.push({
          id: `imp_${wt.id}_${dateKey}`,
          t: wt.title,
          d: false,
          sourceTaskId: wt.id,
        });
      }
    }

    const updatedDismissed = forceRestore ? [] : day.dismissedTaskIds || [];
    const prevJson = JSON.stringify({ t: day.tasks, d: day.dismissedTaskIds || [] });
    const nextJson = JSON.stringify({ t: nextTasks, d: updatedDismissed });
    if (prevJson === nextJson) return false;

    day.tasks = nextTasks;
    day.dismissedTaskIds = updatedDismissed;
    this.setDay(day, true);
    return true;
  }

  /**
   * Backward-compatible manual import trigger (force-imports matching tasks & restores dismissed ones).
   */
  public importTasksFromWorkList(tasks: Task[], dateKey: string) {
    this.autoSyncWorkTasksForDay(tasks, dateKey, true);
    this.triggerCloudSync();
  }

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
      const deletedHabits = new Set(this.getDeletedHabitIds());
      const rawHabits = cloudData.settings.customHabits || this.settings.customHabits || [];
      const rawPrayers = cloudData.settings.customPrayers || this.settings.customPrayers || [];
      const rawAdhkar = cloudData.settings.customAdhkar || this.settings.customAdhkar || [];

      this.settings = {
        ...DEFAULT_DAILY_SETTINGS,
        ...this.settings,
        ...cloudData.settings,
        customHabits: rawHabits.filter((h) => h && h.id && !deletedHabits.has(h.id)),
        customPrayers: rawPrayers.filter((p) => p && p.id && !deletedHabits.has(p.id)),
        customAdhkar: rawAdhkar.filter((a) => a && a.id && !deletedHabits.has(a.id)),
        builtInSchedules: {
          ...(this.settings.builtInSchedules || {}),
          ...(cloudData.settings.builtInSchedules || {}),
        },
      };
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
