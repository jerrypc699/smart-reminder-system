/**
 * Windows Native Background Daemon for Dr. Abdelaziz Smart Reminder System
 * Runs 24/7 in background even when browser is closed.
 * Plays Azan and Task voice alerts directly via Windows audio and shows balloon notifications.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Coordinates, CalculationMethod, PrayerTimes } = require('adhan');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT_DIR, 'daemon.log');
const STATUS_FILE = path.join(ROOT_DIR, 'daemon-status.json');
const SCRIPT_NOTIFIER = path.join(ROOT_DIR, 'scripts', 'notify-alert.ps1');
const AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');

// Cairo coordinates
const CAIRO_COORDS = new Coordinates(30.0444, 31.2357);
const PARAMS = CalculationMethod.Egyptian();

// Keep track of triggered alerts to avoid re-triggering within the same window
const triggeredPrayers = new Set();
const triggeredTasks = new Set();
let cachedTasks = [];
let cachedScheduledMedia = [];
let cachedWhatsAppSettings = null;
let lastSyncTime = 0;

function log(msg) {
  const line = `[${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch { }
  console.log(line.trim());
}

function updateStatus(status) {
  try {
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify(
        {
          pid: process.pid,
          running: true,
          lastHeartbeat: new Date().toISOString(),
          status,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch { }
}

/**
 * Execute PowerShell notifier to display balloon notification and play MP3 audio
 */
function playAudioAndNotify(audioFile, title, message, durationSec = 0) {
  const audioPath = audioFile ? (path.isAbsolute(audioFile) ? audioFile : path.join(ROOT_DIR, audioFile)) : '';

  log(`[تنبيه صوتي] ${title} - ${message}`);

  const child = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      SCRIPT_NOTIFIER,
      '-AudioFile',
      audioPath,
      '-Title',
      title,
      '-Message',
      message,
      '-DurationSec',
      durationSec.toString(),
    ],
    {
      windowsHide: true,
      stdio: 'ignore',
      detached: true,
    }
  );

  child.unref();
}

/**
 * Sync tasks & scheduled items from cloud
 */
async function syncFromCloud() {
  try {
    const fetchUrl = `https://smart-reminder-system-nu.vercel.app/api/sync?t=${Date.now()}`;
    const res = await fetch(fetchUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        cachedTasks = data.tasks;
      }
      if (Array.isArray(data.scheduledMedia)) {
        cachedScheduledMedia = data.scheduledMedia;
      }
      if (data.whatsappSettings) {
        cachedWhatsAppSettings = data.whatsappSettings;
      }
      lastSyncTime = Date.now();
    }
  } catch (err) {
    // offline or network error, silently ignore and retry next cycle
  }
}

/**
 * Check Cairo Prayer Times
 */
function checkPrayers() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const prayerTimes = new PrayerTimes(CAIRO_COORDS, now, PARAMS);

  const prayers = [
    { id: 'fajr', name: 'الفجر', date: prayerTimes.fajr },
    { id: 'dhuhr', name: 'الظهر', date: prayerTimes.dhuhr },
    { id: 'asr', name: 'العصر', date: prayerTimes.asr },
    { id: 'maghrib', name: 'المغرب', date: prayerTimes.maghrib },
    { id: 'isha', name: 'العشاء', date: prayerTimes.isha },
  ];

  const nowMs = now.getTime();

  for (const prayer of prayers) {
    const prayerMs = prayer.date.getTime();
    const diffSeconds = (nowMs - prayerMs) / 1000;

    // 1. Azan Exact Time (within 0 to 60 seconds after prayer starts)
    const azanKey = `${todayKey}-${prayer.id}-azan`;
    if (diffSeconds >= 0 && diffSeconds <= 70 && !triggeredPrayers.has(azanKey)) {
      triggeredPrayers.add(azanKey);

      log(`حان موعد أذان ${prayer.name} الآن`);

      const azanAudio = path.join(AUDIO_DIR, 'mishary.mp3');
      playAudioAndNotify(
        azanAudio,
        `حان الآن موعد أذان ${prayer.name} 🕌`,
        `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${prayer.name} حسب توقيت القاهرة.`,
        0 // play full azan
      );

      // Broadcast Web Push to mobile devices via cloud API
      try {
        fetch('https://smart-reminder-system-nu.vercel.app/api/push-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `حان الآن موعد أذان ${prayer.name} 🕌`,
            body: `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${prayer.name} حسب توقيت القاهرة.`,
            type: 'azan',
            prayerId: prayer.id,
          }),
        }).catch((err) => log(`خطأ إرسال إشعار الهاتف: ${err.message}`));
      } catch (err) { }
    }

    // 2. Pre-Azan Alert (5 minutes before prayer, diff is between -310s and -270s)
    const preAzanKey = `${todayKey}-${prayer.id}-pre`;
    const secondsUntil = (prayerMs - nowMs) / 1000;
    if (secondsUntil >= 270 && secondsUntil <= 310 && !triggeredPrayers.has(preAzanKey)) {
      triggeredPrayers.add(preAzanKey);

      const preAudio = path.join(AUDIO_DIR, 'dr_abdelaziz_pre_azan.mp3');
      playAudioAndNotify(
        preAudio,
        `اقترب موعد صلاة ${prayer.name} ⏳`,
        `يا دكتور عبد العزيز، باقي 5 دقائق على موعد أذان ${prayer.name}.`,
        15
      );

      // Broadcast pre-azan notification to mobile
      try {
        fetch('https://smart-reminder-system-nu.vercel.app/api/push-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `اقترب موعد صلاة ${prayer.name} ⏳`,
            body: `يا دكتور عبد العزيز، باقي 5 دقائق على موعد أذان ${prayer.name}.`,
            type: 'pre_azan',
            sound: '/audio/dr_abdelaziz_pre_azan.mp3',
            prayerId: prayer.id,
            url: `/?play_pre_azan=true&prayer=${prayer.id}`,
          }),
        }).catch(() => { });
      } catch (err) { }
    }
  }

  // Clear memory keys older than 2 days
  if (triggeredPrayers.size > 50) {
    triggeredPrayers.clear();
  }
}

/**
 * Check Tasks & Scheduled Items
 */
function checkTasks() {
  const now = new Date();
  const cairoTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const todayYMD = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }); // YYYY-MM-DD

  // Check tasks
  for (const task of cachedTasks) {
    if (task.completed || task.status === 'completed') continue;

    // Matches today and reminder time
    const taskDate = task.dueDate || todayYMD;
    const taskTime = task.dueTime || task.time;

    if (!taskTime) continue;

    // Subtract reminderMinutesBefore just like main app
    const formattedTaskTime = taskTime.substring(0, 5);
    let targetDateStr = taskDate;
    let targetTimeStr = formattedTaskTime;
    const remMins = Number(task.reminderMinutesBefore) || 0;
    if (remMins > 0 && /^\d{4}-\d{2}-\d{2}$/.test(taskDate) && /^\d{2}:\d{2}$/.test(formattedTaskTime)) {
      const [yy, mm, dd] = taskDate.split('-').map(Number);
      const [hh, mi] = formattedTaskTime.split(':').map(Number);
      const shifted = new Date(Date.UTC(yy, mm - 1, dd, hh, mi, 0, 0) - remMins * 60 * 1000);
      targetDateStr = shifted.toISOString().slice(0, 10);
      targetTimeStr = shifted.toISOString().slice(11, 16);
    }

    const taskKey = `${targetDateStr}-${targetTimeStr}-${task.id}`;

    if (targetDateStr === todayYMD && targetTimeStr === cairoTimeStr && !triggeredTasks.has(taskKey)) {
      triggeredTasks.add(taskKey);

      log(`تنبيه مهمة مستحقة: ${task.title}`);

      const bodyText = task.voiceMessage || `${task.title}${task.priority === 'urgent' ? ' (عاجل جداً)' : ''}`;
      const alertAudio = task.cloudUrl || path.join(AUDIO_DIR, 'dr_abdelaziz_task_alert.mp3');

      playAudioAndNotify(
        alertAudio,
        `يا دكتور عبد العزيز: تذكير بمهمة 📋`,
        bodyText,
        25
      );

      // Broadcast task notification to mobile
      try {
        fetch('https://smart-reminder-system-nu.vercel.app/api/push-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `يا دكتور عبد العزيز: تذكير بمهمة 📋`,
            body: bodyText,
            type: 'task',
            taskId: task.id,
            voiceMessage: task.voiceMessage || '',
            audioUrl: task.cloudUrl || '',
            url: `/?play_task=${task.id}`,
          }),
        }).catch(() => { });
      } catch (err) { }

      // Trigger automatic WhatsApp dispatch if configured on task and gateway
      if (
        task.whatsapp?.enabled &&
        task.whatsapp.phoneNumber &&
        cachedWhatsAppSettings?.provider &&
        cachedWhatsAppSettings.provider !== 'none'
      ) {
        try {
          const customMsg = (task.whatsapp.customMessage || '').trim();
          const waMessage = customMsg
            ? customMsg
            : `📋 *تذكير مهمة: ${task.title}*\n⏰ الموعد: ${task.dueDate || ''} — الساعة ${task.dueTime || ''}${task.description ? `\n📝 التفاصيل: ${task.description}` : ''}\n\n— مرسل تلقائياً من نظام د. عبد العزيز الذكي`;

          fetch('https://smart-reminder-system-nu.vercel.app/api/whatsapp-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              phone: task.whatsapp.phoneNumber,
              message: waMessage,
              recipientName: task.whatsapp.recipientName || '',
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDate,
              dueTime: task.dueTime,
              dedupeKey: `${task.id}-${task.dueDate || 'any'}-${task.dueTime || 'now'}`,
              gateway: cachedWhatsAppSettings,
            }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res?.success) {
                log(`✅ تم إرسال المهمة تلقائياً على واتساب إلى ${task.whatsapp.phoneNumber}`);
              }
            })
            .catch(() => { });
        } catch { }
      }
    }
  }

  // Clean triggered tasks memory
  if (triggeredTasks.size > 100) {
    triggeredTasks.clear();
  }
}

// Process Error Guards
process.on('uncaughtException', (err) => {
  log(`[Uncaught Exception]: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[Unhandled Rejection]: ${reason}`);
});

// Startup Welcome
log('تم بدء تشغيل حارس الخلفية لنظام د. عبد العزيز بنجاح.');
updateStatus('active');

const welcomeAudio = path.join(AUDIO_DIR, 'dr_abdelaziz_welcome.mp3');
playAudioAndNotify(
  welcomeAudio,
  'نظام د. عبد العزيز الذكي 🌟',
  'النظام يعمل الآن في خلفية ويندوز 24/7 للتنبيه بمواقيت الصلاة ومهام العمل حتى لو تم إغلاق المتصفح.',
  6
);

// Initial cloud sync
syncFromCloud();

let tickCount = 0;

// Main loop every 15 seconds
setInterval(() => {
  try {
    checkPrayers();
    checkTasks();
    updateStatus('active');

    tickCount++;
    if (tickCount % 20 === 0) { // every 5 minutes
      log('نبضة الحارس: النظام نشط ويراقب مواقيت الصلاة والمهام في الخلفية.');
    }
  } catch (e) {
    log(`خطأ في الدورة الدورية: ${e.message}`);
  }
}, 15 * 1000);

// Sync tasks from cloud every 45 seconds
setInterval(() => {
  syncFromCloud();
}, 45 * 1000);

// Graceful exit
process.on('SIGINT', () => {
  log('تم إيقاف حارس الخلفية.');
  updateStatus('stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('تم إيقاف حارس الخلفية.');
  updateStatus('stopped');
  process.exit(0);
});
