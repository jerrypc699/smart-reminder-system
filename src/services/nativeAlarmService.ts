import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

export class NativeAlarmService {
  private static isInitialized = false;

  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public static async initAndSchedulePrayers(): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      // 1. Request permissions
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('LocalNotifications permission denied');
          return false;
        }
      }

      // 2. Create high priority notification channels with Azan sound
      await LocalNotifications.createChannel({
        id: 'azan_channel',
        name: 'أذان الصلاة (د. عبد العزيز)',
        description: 'إطلاق صوت الأذان في مواعيد الصلاة حتى لو كان الهاتف مقفلاً',
        importance: 5, // Max importance (heads-up / alarm)
        visibility: 1, // Public
        sound: 'mishary.mp3',
        vibration: true,
        lights: true,
        lightColor: '#D4AF37'
      });

      await LocalNotifications.createChannel({
        id: 'task_channel',
        name: 'تنبيهات المهام والعيادة',
        description: 'تنبيهات مهام العمل للدكتور عبد العزيز',
        importance: 4,
        visibility: 1,
        sound: 'dr_abdelaziz_task_alert.mp3',
        vibration: true,
        lights: true
      });

      // 3. Clear old scheduled notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id }))
        });
      }

      // 4. Schedule 5 prayers for the next 3 days
      const coordinates = new Coordinates(CAIRO_LAT, CAIRO_LNG);
      const params = CalculationMethod.Egyptian();
      const notificationsToSchedule: any[] = [];
      const now = new Date();

      let notifId = 1000;

      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);

        const prayerTimes = new PrayerTimes(coordinates, targetDate, params);

        const prayers = [
          { name: 'الفجر', date: prayerTimes.fajr },
          { name: 'الظهر', date: prayerTimes.dhuhr },
          { name: 'العصر', date: prayerTimes.asr },
          { name: 'المغرب', date: prayerTimes.maghrib },
          { name: 'العشاء', date: prayerTimes.isha }
        ];

        for (const p of prayers) {
          if (p.date.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              id: notifId++,
              title: `حان الآن موعد أذان ${p.name} 🕌`,
              body: `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${p.name} حسب توقيت القاهرة.`,
              schedule: {
                at: p.date,
                allowWhileIdle: true
              },
              sound: 'mishary.mp3',
              channelId: 'azan_channel',
              actionTypeId: 'AZAN_ACTION',
              extra: {
                prayer: p.name,
                type: 'azan'
              }
            });
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} prayer alerts natively.`);
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('[NativeAlarmService] Scheduling error:', err);
      return false;
    }
  }
}

