import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, put } from '@vercel/blob';
import { setVapidDetails, sendNotification } from 'web-push';

const BLOB_FILENAME = 'dr-abdelaziz/push-subscriptions.json';

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY || 'BOw1BHKZUA1YRgFIf13ZVhMXk-P8OBZvOR2xrlL2Ft7XqE1IrK8zI85Jtf8H-mcuda3WBi8g20RlT60QgAK_Lmo';
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || 'VpCdm7Es4IMmayIusohh8ZVlAlC5VNZpjYLehBezq8Q';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:dr.abdelaziz@smart-reminder.app';

try {
  setVapidDetails(VAPID_SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
} catch (e) {
  console.warn('Vapid setup warning:', e);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const payload = req.body || {};
    const type = payload.type || 'azan';
    const prayerId = payload.prayerId || 'now';
    const taskId = payload.taskId;
    const title = payload.title || (type === 'azan' ? 'حان الآن موعد الأذان والصلاة 🕌' : 'يا دكتور عبد العزيز: تذكير بمهمة 📋');
    const body = payload.body || (type === 'azan' ? 'يا دكتور عبد العزيز، حان الآن موعد الصلاة حسب توقيت القاهرة. اضغط لسماع الأذان.' : 'تذكير بمهمة عمل مستحقة الآن.');

    // Determine destination URL and sound based on notification type
    const defaultUrl = type === 'task' 
      ? `/?play_task=${taskId || ''}` 
      : (type === 'pre_azan' ? `/?play_pre_azan=true&prayer=${prayerId}` : `/?play_azan=true&prayer=${prayerId}`);
    const defaultSound = type === 'task' 
      ? '/audio/dr_abdelaziz_task_alert.mp3' 
      : (type === 'pre_azan' ? '/audio/dr_abdelaziz_pre_azan.mp3' : '/audio/mishary.mp3');

    // Retrieve subscriptions from Vercel Blob
    let subscriptions: any[] = [];
    try {
      const { blobs } = await list({ prefix: BLOB_FILENAME });
      const existingBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);
      if (existingBlob) {
        const resp = await fetch(`${existingBlob.url}?t=${Date.now()}`);
        if (resp.ok) {
          subscriptions = await resp.json();
        }
      }
    } catch (err) {
      console.warn('Could not list subscriptions:', err);
    }

    if (subscriptions.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'لا يوجد أجهزة هاتف مشتركة في الإشعارات بعد. يرجى تفعيل الإشعارات من الهاتف أولاً.',
      });
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      type,
      prayerId,
      taskId,
      url: payload.url || defaultUrl,
      sound: payload.sound || defaultSound,
      audioUrl: payload.audioUrl || '',
      voiceMessage: payload.voiceMessage || '',
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendNotification(sub, notificationPayload, {
          urgency: 'high',
          TTL: 3600,
        })
      )
    );

    // Filter out expired or invalid subscriptions (HTTP 410 / 404)
    const validSubscriptions = subscriptions.filter((_, idx) => {
      const outcome = results[idx];
      if (outcome.status === 'rejected') {
        const statusCode = outcome.reason?.statusCode;
        return statusCode !== 410 && statusCode !== 404;
      }
      return true;
    });

    if (validSubscriptions.length !== subscriptions.length) {
      await put(BLOB_FILENAME, JSON.stringify(validSubscriptions), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    }

    const successfulCount = results.filter((r) => r.status === 'fulfilled').length;

    return res.status(200).json({
      success: true,
      message: `تم إرسال إشعار الأذان الفوري إلى ${successfulCount} جهاز هاتف بنجاح!`,
      sentCount: successfulCount,
      totalCount: subscriptions.length,
    });
  } catch (err: any) {
    console.error('Push broadcast error:', err);
    return res.status(500).json({ error: err.message || 'Push notification failed' });
  }
}
