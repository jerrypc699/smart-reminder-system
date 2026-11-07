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
   * Initialize maximum-priority notification channels (Azan, Pre-Azan, and Tasks)
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

      // Delete older channels to force Android to discard any cached silent settings
      const oldChannelIds = [
        'azan_channel', 
        'task_channel', 
        'sound_mishary', 
        'sound_dr_abdelaziz_task_alert', 
        'dr_abdelaziz_tasks_v5', 
        'dr_abdelaziz_azan_v5',
        'dr_abdelaziz_tasks_v6',
        'dr_abdelaziz_azan_v6',
        'dr_abdelaziz_pre_azan_v6'
      ];
      for (const id of oldChannelIds) {
        await LocalNotifications.deleteChannel({ id }).catch(() => {});
      }

      // 1. Azan High-Priority Channel (Importance 5 = Heads-up with sound)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_azan_v7',
        name: 'أذان الصلاة الرسمي (د. عبد العزيز)',
        description: 'إطلاق صوت الأذان كاملاً في مواعيد الصلاة حتى لو كان الهاتف مقفلاً',
        importance: 5,
        visibility: 1,
        sound: 'mishary',
        vibration: true,
        lights: true,
        lightColor: '#D4AF37'
      });

      // 2. Pre-Azan Alert Channel (5 minutes before prayer with Dr. Abdelaziz voice)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_pre_azan_v7',
        name: 'تنبيه ما قبل الأذان بـ 5 دقائق (د. عبد العزيز)',
        description: 'تنبيه صوتي قبل موعد الصلاة بـ 5 دقائق بصوت الدكتور عبد العزيز',
        importance: 5,
        visibility: 1,
        sound: 'dr_abdelaziz_pre_azan',
        vibration: true,
        lights: true,
        lightColor: '#3B82F6'
      });

      // 3. Task High-Priority Channel (Importance 5 = Heads-up with doctor voice)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_tasks_v7',
        name: 'تنبيهات المهام والعيادة (د. عبد العزيز)',
        description: 'تنبيهات صوتية فورية لمهام العمل والعيادة بصوت الدكتور عبد العزيز',
        importance: 5,
        visibility: 1,
        sound: 'dr_abdelaziz_task_alert',
        vibration: true,
        lights: true,
        lightColor: '#10B981'
      });

      if (!this.isInitialized) {
        // Handle when notification is tapped
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('[NativeAlarmService] Notification tapped:', action);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('native_notification_tapped', {
              detail: action.notification.extra
            }));
          }
        });

        // Handle when notification is triggered/received while app is running/background
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('[NativeAlarmService] Notification fired live:', notification);
          try {
            const extra = notification.extra;
            if (extra?.type === 'task') {
              const audioSrc = extra.cloudUrl || '/audio/dr_abdelaziz_task_alert.mp3';
              const audio = new Audio(audioSrc);
              audio.volume = 1.0;
              audio.play().catch(console.warn);
            } else if (extra?.type === 'pre_azan') {
              const audio = new Audio('/audio/dr_abdelaziz_pre_azan.mp3');
              audio.volume = 1.0;
              audio.play().catch(console.warn);
            } else if (extra?.type === 'azan') {
              const audio = new Audio('/audio/mishary.mp3');
              audio.volume = 1.0;
              audio.play().catch(console.warn);
            }
          } catch (e) {
            console.warn('Live notification sound play error:', e);
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
   * Schedule both prayers (with pre-azan) and all user tasks into hardware AlarmManager
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
   * Schedule Cairo prayer times and 5-min pre-alerts for 3 days in advance (IDs 1000 - 1999)
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
      let preNotifId = 1500;

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
          // 1. Pre-Azan Voice Alert (5 minutes before Azan)
          const preDate = new Date(p.date.getTime() - 5 * 60 * 1000);
          if (preDate.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              id: preNotifId++,
              title: `اقترب موعد صلاة ${p.name} ⏳`,
              body: `يا دكتور عبد العزيز، باقي 5 دقائق على موعد أذان ${p.name} حسب توقيت القاهرة.`,
              schedule: {
                at: preDate,
                allowWhileIdle: true
              },
              sound: 'dr_abdelaziz_pre_azan.mp3',
              channelId: 'dr_abdelaziz_pre_azan_v7',
              actionTypeId: 'PRE_AZAN_ACTION',
              foreground: true,
              extra: {
                prayer: p.name,
                type: 'pre_azan'
              }
            });
          }

          // 2. Full Main Azan Alarm (Exact prayer time)
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
              channelId: 'dr_abdelaziz_azan_v7',
              actionTypeId: 'AZAN_ACTION',
              foreground: true,
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
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} prayer and pre-azan alerts.`);
      }
    } catch (err) {
      console.error('[NativeAlarmService] schedulePrayers error:', err);
    }
  }

  /**
   * Schedule all active tasks into native hardware AlarmManager (IDs 2000+)
   * Ensures alarms fire AT EXACT DUE TIME and optionally at pre-reminder time!
   */
  public static async scheduleTasks(tasks: Task[]): Promise<void> {
    if (!this.isNative()) return;
    try {
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

        const numericId = NativeAlarmService.getNumericIdForTask(task.id);

        // Case A: Snoozed Task
        if (task.status === 'snoozed' && task.snoozeUntil) {
          const snoozeDate = new Date(task.snoozeUntil);
          if (snoozeDate.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              id: numericId + 500000,
              title: `📋 تذكير بمهمة مؤجلة: ${task.title}`,
              body: task.voiceMessage || `يا دكتور عبد العزيز: حان موعد متابعة مهمة ${task.title}.`,
              schedule: {
                at: snoozeDate,
                allowWhileIdle: true
              },
              channelId: 'dr_abdelaziz_tasks_v7',
              sound: 'dr_abdelaziz_task_alert.mp3',
              actionTypeId: 'TASK_ACTION',
              foreground: true,
              extra: {
                taskId: task.id,
                type: 'task',
                title: task.title,
                voiceMessage: task.voiceMessage || '',
                customAudioId: task.customAudioId || '',
                cloudUrl: task.cloudUrl || ''
              }
            });
          }
          continue;
        }

        // Case B: Standard Task with dueDate and dueTime
        if (task.dueDate && task.dueTime) {
          const [year, month, day] = task.dueDate.split('-').map(Number);
          const [hour, min] = task.dueTime.split(':').map(Number);
          const exactDueDate = new Date(year, month - 1, day, hour, min, 0, 0);

          // 1. Primary Alarm AT EXACT DUE TIME
          if (exactDueDate.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              id: numericId,
              title: `📋 موعد مهمة: ${task.title}`,
              body: task.voiceMessage || `يا دكتور عبد العزيز: ${task.description || 'حان الآن موعد تنفيذ ومتابعة هذه المهمة.'}`,
              schedule: {
                at: exactDueDate,
                allowWhileIdle: true
              },
              channelId: 'dr_abdelaziz_tasks_v7',
              sound: 'dr_abdelaziz_task_alert.mp3',
              actionTypeId: 'TASK_ACTION',
              foreground: true,
              extra: {
                taskId: task.id,
                type: 'task',
                title: task.title,
                voiceMessage: task.voiceMessage || '',
                customAudioId: task.customAudioId || '',
                cloudUrl: task.cloudUrl || ''
              }
            });
          }

          // 2. Pre-Reminder Alarm (if reminderMinutesBefore > 0 and still in the future)
          const reminderMinutes = task.reminderMinutesBefore || 0;
          if (reminderMinutes > 0) {
            const preReminderDate = new Date(exactDueDate.getTime() - reminderMinutes * 60 * 1000);
            if (preReminderDate.getTime() > now.getTime()) {
              notificationsToSchedule.push({
                id: numericId + 1000000,
                title: `⏳ اقترب موعد مهمة: ${task.title}`,
                body: `يا دكتور عبد العزيز: باقي ${reminderMinutes} دقائق على موعد ${task.title}.`,
                schedule: {
                  at: preReminderDate,
                  allowWhileIdle: true
                },
                channelId: 'dr_abdelaziz_tasks_v7',
                sound: 'dr_abdelaziz_task_alert.mp3',
                actionTypeId: 'TASK_ACTION',
                foreground: true,
                extra: {
                  taskId: task.id,
                  type: 'task',
                  title: task.title,
                  voiceMessage: task.voiceMessage || '',
                  customAudioId: task.customAudioId || '',
                  cloudUrl: task.cloudUrl || ''
                }
              });
            }
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} task alarms in AlarmManager.`);
      }
    } catch (err) {
      console.error('[NativeAlarmService] scheduleTasks error:', err);
    }
  }

  /**
   * Generate a unique 31-bit integer ID for a task string ID (range 2000 - 2000000)
   */
  private static getNumericIdForTask(taskId: string): number {
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return 2000 + (positiveHash % 1000000);
  }
}
