import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, put } from '@vercel/blob';
import { setVapidDetails, sendNotification } from 'web-push';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

const SUB_FILENAME = 'dr-abdelaziz/push-subscriptions.json';
const HISTORY_FILENAME = 'dr-abdelaziz/last-prayer-history.json';

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY || 'BOw1BHKZUA1YRgFIf13ZVhMXk-P8OBZvOR2xrlL2Ft7XqE1IrK8zI85Jtf8H-mcuda3WBi8g20RlT60QgAK_Lmo';
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || 'VpCdm7Es4IMmayIusohh8ZVlAlC5VNZpjYLehBezq8Q';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:dr.abdelaziz@smart-reminder.app';

try {
  setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
} catch (e) {
  console.warn('Vapid setup warning:', e);
}

// Cairo Coordinates
const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  try {
    const coordinates = new Coordinates(CAIRO_LAT, CAIRO_LNG);
    const params = CalculationMethod.Egyptian();
    const date = new Date();
    const prayerTimes = new PrayerTimes(coordinates, date, params);

    const now = date.getTime();
    const prayers = [
      { id: 'fajr', name: 'الفجر', time: prayerTimes.fajr.getTime() },
      { id: 'dhuhr', name: 'الظهر', time: prayerTimes.dhuhr.getTime() },
      { id: 'asr', name: 'العصر', time: prayerTimes.asr.getTime() },
      { id: 'maghrib', name: 'المغرب', time: prayerTimes.maghrib.getTime() },
      { id: 'isha', name: 'العشاء', time: prayerTimes.isha.getTime() },
    ];

    // Find any prayer within +/- 6 minutes of now
    const currentPrayer = prayers.find((p) => Math.abs(now - p.time) <= 6 * 60 * 1000);

    if (!currentPrayer && req.query.force !== 'true') {
      return res.status(200).json({
        status: 'no_prayer_now',
        time: date.toISOString(),
      });
    }

    const prayerToAlert = currentPrayer || { id: 'test', name: 'الأذان (تجربة)', time: now };
    const todayStr = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const alertKey = `${todayStr}-${prayerToAlert.id}`;

    // Read history to avoid duplicate alerts within the same prayer
    let history: string[] = [];
    try {
      const { blobs } = await list({ prefix: HISTORY_FILENAME });
      const histBlob = blobs.find((b) => b.pathname === HISTORY_FILENAME);
      if (histBlob) {
        const histRes = await fetch(`${histBlob.url}?t=${Date.now()}`);
        if (histRes.ok) history = await histRes.json();
      }
    } catch {}

    if (history.includes(alertKey) && req.query.force !== 'true') {
      return res.status(200).json({
        status: 'already_sent_today',
        prayer: prayerToAlert.name,
        key: alertKey,
      });
    }

    // Fetch subscriptions
    let subscriptions: any[] = [];
    try {
      const { blobs } = await list({ prefix: SUB_FILENAME });
      const existingBlob = blobs.find((b) => b.pathname === SUB_FILENAME);
      if (existingBlob) {
        const resp = await fetch(`${existingBlob.url}?t=${Date.now()}`);
        if (resp.ok) {
          subscriptions = await resp.json();
        }
      }
    } catch (e) {
      console.warn('Subscriptions read failed:', e);
    }

    if (subscriptions.length === 0) {
      return res.status(200).json({ status: 'no_subscribers' });
    }

    const notificationPayload = JSON.stringify({
      title: `حان الآن موعد أذان ${prayerToAlert.name} 🕌`,
      body: `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${prayerToAlert.name} حسب توقيت القاهرة.`,
      type: 'azan',
      prayerId: prayerToAlert.id,
      url: `/?play_azan=true&prayer=${prayerToAlert.id}`,
      sound: '/audio/mishary.mp3',
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendNotification(sub, notificationPayload, {
          urgency: 'high',
          TTL: 1800,
        })
      )
    );

    // Save alert history
    history.push(alertKey);
    if (history.length > 50) history = history.slice(-50);
    try {
      await put(HISTORY_FILENAME, JSON.stringify(history), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch {}

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;

    return res.status(200).json({
      status: 'sent',
      prayer: prayerToAlert.name,
      sentCount,
      totalCount: subscriptions.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
