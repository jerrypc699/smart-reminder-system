import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import type { Task } from '../types';

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

export class NativeAlarmService {
  private static isInitialized = false;

  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize notification channels (Azan & Tasks)
   */
  public static async initChannels(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[NativeAlarmService] Notification permissions not granted');
          return false;
        }
      }

      // 1. Azan High-Priority Channel with Mishary sound
      await LocalNotifications.createChannel({
        id: 'azan_channel',
        name: 'أذان الصلاة (د. عبد العزيز)',
        description: 'إطلاق صوت الأذان كاملاً في مواعيد الصلاة حتى لو كان الهاتف مقفلاً',
        importance: 5, // Max importance (heads-up / alarm)
        visibility: 1,
        sound: 'mishary.mp3',
        vibration: true,
        lights: true,
        lightColor: '#D4AF37'
      });

      // 2. Task High-Priority Channel with Doctor voice sound
      await LocalNotifications.createChannel({
        id: 'task_channel',
        name: 'تنبيهات المهام والعيادة (د. عبد العزيز)',
        description: 'تنبيهات صوتية فورية لمهام العمل والعيادة بصوت الدكتور عبد العزيز',
        importance: 5, // Max importance (alarm sound & vibration)
        visibility: 1,
        sound: 'dr_abdelaziz_task_alert.mp3',
        vibration: true,
        lights: true,
        lightColor: '#10B981'
      });

      if (!this.isInitialized) {
        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          console.log('[NativeAlarmService] Notification tapped:', notificationAction);
          // Broadcast to window if needed
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('native_notification_tapped', {
              detail: notificationAction.notification.extra
            }));
          }
        });
        this.isInitialized = true;
      }

      return true;
    } catch (err) {
      console.error('[NativeAlarmService] initChannels error:', err);
      return false;
    }
  }

  /**
   * Schedule both prayers and all user tasks into hardware AlarmManager
   */
  public static async syncAll(tasks?: Task[]): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await this.initChannels();
      await this.schedulePrayers();
      if (tasks && tasks.length > 0) {
        await this.scheduleTasks(tasks);
      }
      return true;
    } catch (err) {
      console.error('[NativeAlarmService] syncAll error:', err);
      return false;
    }
  }

  /**
   * Schedule Cairo prayer times for 3 days in advance (IDs 1000 - 1050)
   */
  public static async schedulePrayers(): Promise<void> {
    if (!this.isNative()) return;
    try {
      const pending = await LocalNotifications.getPending();
      const prayerNotifs = pending.notifications.filter(n => n.id >= 1000 && n.id < 2000);
      if (prayerNotifs.length > 0) {
        await LocalNotifications.cancel({
          notifications: prayerNotifs.map(n => ({ id: n.id }))
        });
      }

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
              body: `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${p.name} حسب توقيت القاهرة. تقبل الله منا ومنكم.`,
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
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} prayer alerts.`);
      }
    } catch (err) {
      console.error('[NativeAlarmService] schedulePrayers error:', err);
    }
  }

  /**
   * Schedule all active tasks into native hardware AlarmManager (IDs 2000+)
   */
  public static async scheduleTasks(tasks: Task[]): Promise<void> {
    if (!this.isNative()) return;
    try {
      // 1. Cancel previous task notifications (range 2000+)
      const pending = await LocalNotifications.getPending();
      const taskNotifs = pending.notifications.filter(n => n.id >= 2000);
      if (taskNotifs.length > 0) {
        await LocalNotifications.cancel({
          notifications: taskNotifs.map(n => ({ id: n.id }))
        });
      }

      const now = new Date();
      const notificationsToSchedule: any[] = [];

      for (const task of tasks) {
        if (task.status === 'completed') continue;

        let targetDate: Date | null = null;

        if (task.status === 'snoozed' && task.snoozeUntil) {
          targetDate = new Date(task.snoozeUntil);
        } else if (task.dueDate && task.dueTime) {
          // Parse YYYY-MM-DD and HH:mm
          const [year, month, day] = task.dueDate.split('-').map(Number);
          const [hour, min] = task.dueTime.split(':').map(Number);
          const baseDate = new Date(year, month - 1, day, hour, min, 0, 0);

          // Subtract reminder minutes before
          const reminderMinutes = task.reminderMinutesBefore || 0;
          targetDate = new Date(baseDate.getTime() - reminderMinutes * 60 * 1000);
        }

        if (targetDate && targetDate.getTime() > now.getTime()) {
          const numericId = NativeAlarmService.getNumericIdForTask(task.id);
          notificationsToSchedule.push({
            id: numericId,
            title: `📋 تذكير بمهمة: ${task.title}`,
            body: `يا دكتور عبد العزيز: ${task.description || task.voiceMessage || 'حان موعد تنفيذ ومتابعة هذه المهمة الآن.'}`,
            schedule: {
              at: targetDate,
              allowWhileIdle: true
            },
            channelId: 'task_channel',
            sound: 'dr_abdelaziz_task_alert.mp3',
            actionTypeId: 'TASK_ACTION',
            extra: {
              taskId: task.id,
              type: 'task',
              title: task.title
            }
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} task alerts in AlarmManager.`);
      }
    } catch (err) {
      console.error('[NativeAlarmService] scheduleTasks error:', err);
    }
  }

  /**
   * Generate a unique 31-bit integer ID for a task string ID (range 2000 - 2147483647)
   */
  private static getNumericIdForTask(taskId: string): number {
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return 2000 + (positiveHash % 2000000);
  }
}
