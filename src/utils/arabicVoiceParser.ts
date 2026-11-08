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
  'واحد': 1, 'واحدة': 1, 'الواحدة': 1,
  'اتنين': 2, 'اثنين': 2, 'الثانية': 2,
  'تلاتة': 3, 'ثلاثة': 3, 'الثالثة': 3,
  'اربعة': 4, 'أربعة': 4, 'الرابعة': 4,
  'خمسة': 5, 'الخامسة': 5,
  'ستة': 6, 'السادسة': 6,
  'سبعة': 7, 'السابعة': 7,
  'تمانية': 8, 'ثمانية': 8, 'الثامنة': 8,
  'تسعة': 9, 'التاسعة': 9,
  'عشرة': 10, 'العاشرة': 10,
  'حداشر': 11, 'احداشر': 11, 'إحدى عشر': 11, 'الحادية عشر': 11, 'الحادية عشرة': 11,
  'اتناشر': 12, 'اثنا عشر': 12, 'الثانية عشر': 12, 'الثانية عشرة': 12,
};

const WEEKDAYS_MAP: Record<string, number> = {
  'الاحد': 0, 'الأحد': 0,
  'الاثنين': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الاربعاء': 3, 'الأربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6,
};

function normalizeArabicText(text: string): string {
  let s = text.trim();
  // Normalize eastern arabic numbers to western
  for (const [ar, en] of Object.entries(ARABIC_NUMERALS)) {
    s = s.split(ar).join(en);
  }
  return s;
}

export function parseArabicVoiceTask(transcript: string): ParsedVoiceTask {
  const norm = normalizeArabicText(transcript);
  const now = new Date();
  const targetDate = new Date();

  let priority: TaskPriority = 'medium';
  let category: TaskCategory = 'work';

  // 1. Priority Detection
  if (/عاجل|طارئ|ضروري|مهم جداً|مهم جدا/.test(norm)) {
    priority = 'urgent';
  } else if (/مهم|هام|أولوية/.test(norm)) {
    priority = 'high';
  }

  // 2. Category Detection
  if (/عيادة|كشف|مرضى|مريض|عملية|جراحة|دواء|مستشفى/.test(norm)) {
    category = 'clinic';
  } else if (/اجتماع|مقابلة|زووم|جلسة|لقاء|مؤتمر/.test(norm)) {
    category = 'meeting';
  } else if (/برمجة|تطوير|سيستم|كود|تطبيق|نظام/.test(norm)) {
    category = 'dev';
  } else if (/بيت|منزل|عائلة|أسرة|شخصي/.test(norm)) {
    category = 'personal';
  }

  // 3. Date Detection
  if (/بعد (بكرة|بكره|غد|غداً)/.test(norm)) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/(غد[اً]?|بكر[ةه])/.test(norm)) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    // Check weekday mentions
    for (const [dayName, dayIndex] of Object.entries(WEEKDAYS_MAP)) {
      if (new RegExp(`(يوم\\s+)?${dayName}`).test(norm)) {
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

  // Pattern A: "الساعة 5:30" or "الساعة 5" or "الساعة خمسة"
  const timeRegex = /الساعة\s+([0-9]{1,2}(?::[0-9]{2})?|[^\s]+(?:\s+[^\s]+)?)/;
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
        if (rawTimePart.includes(word)) {
          targetHour = val;
          break;
        }
      }
    }
  }

  // Fractional modifiers
  if (/ونصف|ونص/.test(norm)) {
    targetMin = 30;
  } else if (/وربع/.test(norm)) {
    targetMin = 15;
  } else if (/وثلث|وتلت/.test(norm)) {
    targetMin = 20;
  } else if (/إلا ربع|الا ربع/.test(norm)) {
    targetMin = 45;
    if (targetHour > 0) targetHour -= 1;
  } else if (/إلا ثلث|الا تلت/.test(norm)) {
    targetMin = 40;
    if (targetHour > 0) targetHour -= 1;
  }

  const isPM = /مساء[اً]?|عصر[اً]?|بالليل|المغرب|العشا/.test(norm);
  const isAM = /صباح[اً]?|الصبح|الفجر/.test(norm);

  if (targetHour !== -1) {
    if (isPM && targetHour < 12) {
      targetHour += 12;
    } else if (!isAM && !isPM && targetHour >= 1 && targetHour <= 7) {
      targetHour += 12; // Business hours default: 5 is 17:00
    }
  } else {
    // Default time: next hour or 11:00
    const nextHour = now.getHours() + 1;
    targetHour = nextHour < 24 ? nextHour : 11;
    targetMin = 0;
  }

  // 5. Clean Title Extraction
  let title = norm
    // Remove command greetings and starters
    .replace(/^(يا\s+دكتور\s+عبد\s+العزيز\s+|يا\s+دكتور\s+)/gi, '')
    .replace(/^(تذكير\s+بـ?|فكرني\s+بـ?|ضيف\s+مهمة\s+|سجل\s+مهمة\s+|أضف\s+مهمة\s+|اعمل\s+تذكير\s+بـ?|عايز\s+تذكير\s+بـ?|عندي\s+)/gi, '')
    // Remove time clauses
    .replace(/الساعة\s+.*$/, '')
    // Remove date keywords
    .replace(/\b(اليوم|غداً|غدا|بكرة|بكره|بعد غد|بعد بكرة|بعد بكره)\b/gi, '')
    .replace(/\b(يوم\s+)?(الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الاربعاء|الأربعاء|الخميس|الجمعة|السبت)\b/gi, '')
    // Remove priority words
    .replace(/\b(عاجل|عاجلة|طارئ|ضروري|مهم جداً|مهم جدا|مهم|أولوية)\b/gi, '')
    // Remove extra trailing/leading prepositions
    .replace(/^بـ?/, '')
    .trim();

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
