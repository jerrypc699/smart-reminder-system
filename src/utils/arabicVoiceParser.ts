import type { TaskPriority, TaskCategory } from '../types';

export interface ParsedVoiceTask {
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  priority: TaskPriority;
  category: TaskCategory;
  voiceMessage: string;
  rawTranscript: string;
}

const ARABIC_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const ARABIC_WORD_HOURS: Record<string, number> = {
  'واحد': 1, 'واحدة': 1, 'الواحدة': 1, 'واحده': 1, 'الواحده': 1,
  'اتنين': 2, 'اثنين': 2, 'الثانية': 2, 'التانية': 2, 'الثانيه': 2, 'التانيه': 2,
  'تلاتة': 3, 'ثلاثة': 3, 'الثالثة': 3, 'تلاته': 3, 'ثلاثه': 3, 'الثالثه': 3, 'التالته': 3,
  'اربعة': 4, 'أربعة': 4, 'الرابعة': 4, 'اربعه': 4, 'أربعه': 4, 'الرابعه': 4,
  'خمسة': 5, 'الخامسة': 5, 'خمسه': 5, 'الخامسه': 5,
  'ستة': 6, 'السادسة': 6, 'سته': 6, 'السادسه': 6,
  'سبعة': 7, 'السابعة': 7, 'سبعه': 7, 'السابعه': 7,
  'تمانية': 8, 'ثمانية': 8, 'الثامنة': 8, 'تمانيه': 8, 'ثمانيه': 8, 'الثامنه': 8, 'التامنه': 8,
  'تسعة': 9, 'التاسعة': 9, 'تسعه': 9, 'التاسعه': 9,
  'عشرة': 10, 'العاشرة': 10, 'عشره': 10, 'العاشره': 10,
  'حداشر': 11, 'احداشر': 11, 'إحدى عشر': 11, 'الحادية عشر': 11, 'الحادية عشرة': 11, 'احدى عشر': 11, 'الحاديه عشر': 11, 'الحداشر': 11,
  'اتناشر': 12, 'اثنا عشر': 12, 'الثانية عشر': 12, 'الثانية عشرة': 12, 'الثانيه عشر': 12, 'الاتناشر': 12,
};

const WEEKDAYS_MAP: Record<string, number> = {
  'الاحد': 0, 'الأحد': 0, 'الحد': 0,
  'الاثنين': 1, 'الإثنين': 1, 'الاتنين': 1,
  'الثلاثاء': 2, 'التلات': 2, 'الثلاثا': 2,
  'الاربعاء': 3, 'الأربعاء': 3, 'الاربع': 3,
  'الخميس': 4,
  'الجمعة': 5, 'الجمعه': 5,
  'السبت': 6,
};

function normalizeArabicText(text: string): string {
  let s = text.trim();
  // Remove diacritics / tashkeel & tatweel
  s = s.replace(/[\u064B-\u065F\u0670]/g, '');
  s = s.replace(/\u0640/g, '');
  // Normalize eastern arabic numbers to western
  for (const [ar, en] of Object.entries(ARABIC_NUMERALS)) {
    s = s.split(ar).join(en);
  }
  // Normalize alefs
  s = s.replace(/[إأآ]/g, 'ا');
  // Normalize taa marbuta to haa for comparison
  s = s.replace(/ة/g, 'ه');
  // Normalize dotted yaa
  s = s.replace(/ى/g, 'ي');
  return s;
}

export function parseArabicVoiceTask(transcript: string): ParsedVoiceTask {
  const norm = normalizeArabicText(transcript);
  const now = new Date();
  const targetDate = new Date();

  let priority: TaskPriority = 'medium';
  let category: TaskCategory = 'work';

  // 1. Priority Detection
  if (/عاجل|طارئ|ضروري|مهم جدا/.test(norm)) {
    priority = 'urgent';
  } else if (/مهم|هام|اولويه/.test(norm)) {
    priority = 'high';
  }

  // 2. Category Detection
  if (/عياد[ةه]|كشف|مرضي|مريض|عملي[ةه]|جراح[ةه]|دواء|مستشفي/.test(norm)) {
    category = 'clinic';
  } else if (/اجتماع|مقابل[ةه]|زووم|جلس[ةه]|لقاء|مؤتمر/.test(norm)) {
    category = 'meeting';
  } else if (/برمج[ةه]|تطوير|سيستم|كود|تطبيق|نظام/.test(norm)) {
    category = 'dev';
  } else if (/بيت|منزل|عائل[ةه]|اسر[ةه]|شخصي/.test(norm)) {
    category = 'personal';
  }

  // 3. Date Detection
  if (/بعد\s+(?:بكر[ةه]|غد)/.test(norm)) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/(?:غد|بكر[ةه])/.test(norm)) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    // Check weekday mentions
    for (const [dayName, dayIndex] of Object.entries(WEEKDAYS_MAP)) {
      const normDay = normalizeArabicText(dayName);
      if (new RegExp(`(?:يوم\\s+)?${normDay}`).test(norm)) {
        const currentDay = now.getDay();
        let daysUntil = (dayIndex - currentDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7; // Next week's day
        targetDate.setDate(targetDate.getDate() + daysUntil);
        break;
      }
    }
  }

  // 4. Time Detection
  let targetHour = -1;
  let targetMin = 0;

  // Pattern A: "الساعة 5:30" or "الساعة 3" or "الساعه 3" or "ساعة 3" or "عالساعة 3" or "في تمام الساعة 3"
  const timeRegex = /(?:في\s+تمام\s+الساع[ةه]|ع?الساع[ةه]|ساع[ةه]|علي\s+الساع[ةه]|على\s+الساع[ةه])\s*([0-9]{1,2}(?::[0-9]{2})?|[^\s]+)/i;
  const match = norm.match(timeRegex);

  if (match) {
    const rawTimePart = match[1];

    if (rawTimePart.includes(':')) {
      const parts = rawTimePart.split(':');
      targetHour = parseInt(parts[0], 10);
      targetMin = parseInt(parts[1], 10);
    } else if (/^[0-9]{1,2}$/.test(rawTimePart)) {
      targetHour = parseInt(rawTimePart, 10);
    } else {
      // Look up in arabic words
      for (const [word, val] of Object.entries(ARABIC_WORD_HOURS)) {
        const normWord = normalizeArabicText(word);
        if (rawTimePart === normWord || rawTimePart.includes(normWord)) {
          targetHour = val;
          break;
        }
      }
    }
  }

  // Pattern B: standalone number followed by time indicator like "3 العصر" or "7 مساء"
  if (targetHour === -1) {
    const standaloneMatch = norm.match(/(?:^|\s)([0-9]{1,2})\s*(مساء|عصر|ظهر|ضهر|صبح|صباح|فجر|ليل|بالليل)/);
    if (standaloneMatch) {
      targetHour = parseInt(standaloneMatch[1], 10);
    }
  }

  // Fractional modifiers
  if (/ونصف|ونص/.test(norm)) {
    targetMin = 30;
  } else if (/وربع/.test(norm)) {
    targetMin = 15;
  } else if (/وثلث|وتلت/.test(norm)) {
    targetMin = 20;
  } else if (/وخمس[ةه]/.test(norm)) {
    targetMin = 5;
  } else if (/وعشر[ةه]/.test(norm)) {
    targetMin = 10;
  } else if (/إلا\s+ربع|الا\s+ربع/.test(norm)) {
    targetMin = 45;
    if (targetHour > 0) targetHour -= 1;
  } else if (/إلا\s+ثلث|الا\s+تلت/.test(norm)) {
    targetMin = 40;
    if (targetHour > 0) targetHour -= 1;
  }

  const isPM = /مساء|عصر|ظهر|ضهر|مغرب|عشا|بالليل|ليل/.test(norm);
  const isAM = /صباح|صبح|فجر/.test(norm);

  if (targetHour !== -1) {
    if (isPM && targetHour < 12) {
      targetHour += 12;
    } else if (!isAM && !isPM && targetHour >= 1 && targetHour <= 7) {
      targetHour += 12; // Business hours default: 3 is 15:00
    }
  } else {
    // Default time: next hour or 11:00
    const nextHour = now.getHours() + 1;
    targetHour = nextHour < 24 ? nextHour : 11;
    targetMin = 0;
  }

  // 5. Clean Title Extraction
  let title = norm;
  // Step A: Remove honorifics and starter command verbs
  title = title.replace(/^(?:يا\s+دكتور\s+(?:عبد\s+العزيز\s+)?)/g, '');
  title = title.replace(/^(?:فكرني|تذكير|سجل|ضيف|اضف|اعمل\s+تذكير|عايز\s+تذكير|عندي|ميعاد|معاد)\s+/g, '');

  // Step B: Remove date mentions
  title = title.replace(/(?:^|\s)(?:بعد\s+بكر[ةه]|بعد\s+غد|بكر[ةه]|غد|النهارده|اليوم)(?:\s|$)/g, ' ');

  // Step C: Remove time clauses and modifiers
  title = title.replace(/(?:في\s+تمام\s+الساع[ةه]|ع?الساع[ةه]|ساع[ةه]|علي\s+الساع[ةه]|على\s+الساع[ةه])\s*(?:[0-9]{1,2}(?::[0-9]{2})?|[^\s]+(?:\s+(?:مساء|صباحا|عصرا|الظهر))?)/g, ' ');
  title = title.replace(/(?:^|\s)(?:ونصف|ونص|وربع|وثلث|وتلت|وخمس[ةه]|وعشر[ةه]|الا\s+ربع|الا\s+تلت|الا\s+ثلث)(?:\s|$)/g, ' ');
  title = title.replace(/(?:^|\s)(?:مساء|عصر|صباح|بالليل|ليلا|الظهر|الضهر)(?:\s|$)/g, ' ');
  title = title.replace(/(?:^|\s)(?:عاجل|عاجل[ةه]|طارئ|ضروري|مهم\s+جدا|مهم|اولويه)(?:\s|$)/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();

  // Step D: Strip leading preposition 'ب' if remaining (e.g. 'باجتماع' -> 'اجتماع')
  if (/^ب[ا-ي]/.test(title) && !title.startsWith('برمجة') && !title.startsWith('بيت')) {
    title = title.replace(/^بـ?/, '');
  }

  if (!title) {
    title = transcript.trim() || 'مهمة عمل جديدة';
  }

  // Format YYYY-MM-DD
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dueDate = `${yyyy}-${mm}-${dd}`;

  // Format HH:mm
  const dueTime = `${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`;

  const voiceMessage = `يا دكتور عبد العزيز، ${title}`;

  return {
    title,
    dueDate,
    dueTime,
    priority,
    category,
    voiceMessage,
    rawTranscript: transcript.trim(),
  };
}
