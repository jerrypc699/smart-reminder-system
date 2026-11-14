import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import type { Task, ScheduledMedia } from '../types';
import {
  VideoAlarm,
  type NativeScheduledAlarmPayload,
  type ScheduledMediaLaunchEvent,
  type AutoLaunchPermissionsStatus,
} from './videoAlarmPlugin';

const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

export function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class NativeAlarmService {
  private static isInitialized = false;

  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public static isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
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
        'dr_abdelaziz_pre_azan_v6',
        'dr_abdelaziz_tasks_v7',
        'dr_abdelaziz_azan_v7',
        'dr_abdelaziz_pre_azan_v7',
        'dr_abdelaziz_tasks_v8',
        'dr_abdelaziz_azan_v8',
        'dr_abdelaziz_pre_azan_v8'
      ];
      for (const id of oldChannelIds) {
        await LocalNotifications.deleteChannel({ id }).catch(() => {});
      }

      // 1. Azan High-Priority Channel (Importance 5 = Heads-up with sound, Alarm Stream)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_azan_v9',
        name: 'أذان الصلاة الرسمي (د. عبد العزيز)',
        description: 'إطلاق صوت الأذان كاملاً في مواعيد الصلاة حتى لو كان الهاتف مقفلاً أو صامتاً',
        importance: 5,
        visibility: 1,
        sound: 'mishary.mp3',
        vibration: true,
        lights: true,
        lightColor: '#D4AF37'
      });

      // 2. Pre-Azan Alert Channel (5 minutes before prayer with Dr. Abdelaziz voice)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_pre_azan_v9',
        name: 'تنبيه ما قبل الأذان بـ 5 دقائق (د. عبد العزيز)',
        description: 'تنبيه صوتي قبل موعد الصلاة بـ 5 دقائق بصوت الدكتور عبد العزيز حتى في الوضع الصامت',
        importance: 5,
        visibility: 1,
        sound: 'dr_abdelaziz_pre_azan.mp3',
        vibration: true,
        lights: true,
        lightColor: '#3B82F6'
      });

      // 3. Task High-Priority Channel (Importance 5 = Heads-up with doctor voice, Alarm Stream)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_tasks_v9',
        name: 'منبه وتنبيهات المهام والعيادة (د. عبد العزيز)',
        description: 'تنبيهات صوتية فورية لمهام العمل والعيادة بصوت الدكتور عبد العزيز تعمل كمنبه صريح حتى في الوضع الصامت',
        importance: 5,
        visibility: 1,
        sound: 'dr_abdelaziz_task_alert.mp3',
        vibration: true,
        lights: true,
        lightColor: '#10B981'
      });

      // 4. Scheduled Media & Video High-Priority Channel (Importance 5 = Hardware Alarm, Alarm Stream)
      await LocalNotifications.createChannel({
        id: 'dr_abdelaziz_media_v9',
        name: 'الوسائط والفيديوهات المجدولة (د. عبد العزيز)',
        description: 'تشغيل الفيديوهات والملفات الصوتية المجدولة كمنبه صريح حتى لو كان الهاتف في الوضع الصامت',
        importance: 5,
        visibility: 1,
        sound: 'dr_abdelaziz_task_alert.mp3',
        vibration: true,
        lights: true,
        lightColor: '#8B5CF6'
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
            } else if (extra?.type === 'scheduled_media' || extra?.type === 'scheduled_audio') {
              // Dispatch immediately to pop up active alert modal with video/audio
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('native_notification_tapped', {
                  detail: extra
                }));
              }
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
   * Schedule prayers, tasks, and scheduled media items into hardware AlarmManager
   */
  public static async syncAll(tasks?: Task[], mediaList?: ScheduledMedia[]): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await this.initChannels();
      await this.schedulePrayers();
      if (tasks && tasks.length > 0) {
        await this.scheduleTasks(tasks);
      }
      if (mediaList && mediaList.length > 0) {
        await this.scheduleMediaItems(mediaList);
      }
      await this.scheduleDailyHabits();
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

        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPrayerTimes = new PrayerTimes(coordinates, tomorrow, params);
        const nightDuration = tomorrowPrayerTimes.fajr.getTime() - prayerTimes.maghrib.getTime();
        const qiyamDate = new Date(prayerTimes.maghrib.getTime() + Math.round(nightDuration * (2 / 3)));
        const duhaDate = new Date(prayerTimes.sunrise.getTime() + 20 * 60 * 1000);

        const prayers = [
          { id: 'fajr', name: 'الفجر', date: prayerTimes.fajr, isAzan: true },
          { id: 'duha', name: 'صلاة الضحى', date: duhaDate, isAzan: false },
          { id: 'dhuhr', name: 'الظهر', date: prayerTimes.dhuhr, isAzan: true },
          { id: 'asr', name: 'العصر', date: prayerTimes.asr, isAzan: true },
          { id: 'maghrib', name: 'المغرب', date: prayerTimes.maghrib, isAzan: true },
          { id: 'isha', name: 'العشاء', date: prayerTimes.isha, isAzan: true },
          { id: 'qiyam', name: 'صلاة قيام الليل والتهجد', date: qiyamDate, isAzan: false }
        ];

        for (const p of prayers) {
          // 1. Pre-Azan Voice Alert (5 minutes before main prayers)
          if (p.isAzan) {
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
                channelId: 'dr_abdelaziz_pre_azan_v9',
                actionTypeId: 'PRE_AZAN_ACTION',
                foreground: true,
                extra: {
                  prayer: p.name,
                  type: 'pre_azan'
                }
              });
            }
          }

          // 2. Full Main Azan / Sunnah Prayer Alarm (Exact prayer time)
          if (p.date.getTime() > now.getTime()) {
            const notifTitle = p.isAzan
              ? `حان الآن موعد أذان ${p.name} 🕌`
              : p.id === 'duha'
              ? `حان الآن موعد صلاة الضحى ☀️`
              : `حان موعد صلاة قيام الليل والتهجد 🌌`;

            const notifBody = p.isAzan
              ? `الله أكبر.. يا دكتور عبد العزيز حان موعد صلاة ${p.name} حسب توقيت القاهرة. تقبل الله منا ومنكم.`
              : p.id === 'duha'
              ? `يا دكتور عبد العزيز، حان موعد صلاة الضحى (صلاة الأوابين). ركعتان تجزئان عن صدقة يومك.`
              : `يا دكتور عبد العزيز، الثلث الأخير من الليل وموعد قيام الليل واستجابة الدعاء. تقبل الله طاعتكم.`;

            notificationsToSchedule.push({
              id: notifId++,
              title: notifTitle,
              body: notifBody,
              schedule: {
                at: p.date,
                allowWhileIdle: true
              },
              sound: p.isAzan ? 'mishary.mp3' : 'takbeerat.mp3',
              channelId: 'dr_abdelaziz_azan_v9',
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
      const taskNotifs = pending.notifications.filter(
        n => n.id >= 2000 && !(n.id >= 3000 && n.id < 4000)
      );
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
              channelId: 'dr_abdelaziz_tasks_v9',
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
              channelId: 'dr_abdelaziz_tasks_v9',
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
                channelId: 'dr_abdelaziz_tasks_v9',
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
   * Schedule all enabled media & video items into native hardware AlarmManager.
   * On Android: uses VideoAlarmPlugin (AlarmManager.setAlarmClock + FullScreenIntent + StartActivity)
   * so the app wakes up, opens automatically onto the screen, and plays the video immediately!
   * On iOS: uses high-priority LocalNotifications.
   */
  public static async scheduleMediaItems(mediaList: ScheduledMedia[]): Promise<void> {
    if (!this.isNative()) return;
    try {
      // Clear any legacy/iOS 3000..3999 LocalNotifications so there is never duplicate ringing
      const pending = await LocalNotifications.getPending();
      const mediaNotifs = pending.notifications.filter(n => n.id >= 3000 && n.id < 4000);
      if (mediaNotifs.length > 0) {
        await LocalNotifications.cancel({
          notifications: mediaNotifs.map(n => ({ id: n.id }))
        });
      }

      const now = new Date();
      const nativeAlarms: NativeScheduledAlarmPayload[] = [];
      const iosNotifications: any[] = [];

      for (const item of mediaList) {
        if (!item.enabled || !item.scheduledTime) continue;

        const [hour, min] = item.scheduledTime.split(':').map(Number);
        if (isNaN(hour) || isNaN(min)) continue;

        const isVideo = item.mediaType === 'video';
        const baseHash = Math.abs(NativeAlarmService.getNumericIdForTask(item.id));
        const androidBaseId = 30000 + (baseHash % 9000) * 10;
        const iosBaseId = 3000 + (baseHash % 90);

        // Calculate local occurrence dates
        const targetDates: Date[] = [];

        if (item.repeat === 'none') {
          const dateStr = item.scheduledDate || getLocalDateStr(now);
          const [year, month, day] = dateStr.split('-').map(Number);
          const candidate = new Date(year, month - 1, day, hour, min, 0, 0);
          if (candidate.getTime() > now.getTime()) {
            targetDates.push(candidate);
          }
        } else if (item.repeat === 'daily') {
          for (let d = 0; d < 4; d++) {
            const candidate = new Date();
            candidate.setDate(candidate.getDate() + d);
            candidate.setHours(hour, min, 0, 0);
            if (candidate.getTime() > now.getTime()) {
              targetDates.push(candidate);
            }
          }
        } else if (item.repeat === 'workdays') {
          // Sunday (0) to Thursday (4) in Egypt / Middle East
          for (let d = 0; d < 7; d++) {
            const candidate = new Date();
            candidate.setDate(candidate.getDate() + d);
            candidate.setHours(hour, min, 0, 0);
            const dayOfWeek = candidate.getDay();
            if (dayOfWeek >= 0 && dayOfWeek <= 4 && candidate.getTime() > now.getTime()) {
              targetDates.push(candidate);
            }
          }
        } else if (item.repeat === 'weekly') {
          const baseDateStr = item.scheduledDate || getLocalDateStr(now);
          const [by, bm, bd] = baseDateStr.split('-').map(Number);
          const baseDate = new Date(by, bm - 1, bd, hour, min, 0, 0);
          const targetDayOfWeek = baseDate.getDay();

          for (let d = 0; d < 22; d++) {
            const candidate = new Date();
            candidate.setDate(candidate.getDate() + d);
            candidate.setHours(hour, min, 0, 0);
            if (candidate.getDay() === targetDayOfWeek && candidate.getTime() > now.getTime()) {
              targetDates.push(candidate);
            }
          }
        }

        targetDates.forEach((targetDate, idx) => {
          if (idx >= 9) return;
          const mediaTypeValue: 'video' | 'audio' = isVideo ? 'video' : 'audio';

          nativeAlarms.push({
            alarmId: androidBaseId + idx,
            triggerAtMs: targetDate.getTime(),
            scheduledId: item.id,
            mediaId: item.mediaId || item.id,
            mediaName: item.mediaName || item.audioName || 'ملف وسائط',
            mediaType: mediaTypeValue,
            title: item.title,
            description: item.description || '',
            cloudUrl: item.cloudUrl || '',
            isVideo,
          });

          iosNotifications.push({
            id: (iosBaseId * 10) + idx,
            title: isVideo ? `🎬 موعد تشغيل فيديو: ${item.title}` : `📻 موعد تشغيل وسائط: ${item.title}`,
            body: item.description || (isVideo ? `يا دكتور عبد العزيز: حان موعد عرض فيديو ${item.mediaName}` : `يا دكتور عبد العزيز: حان موعد تشغيل ${item.mediaName}`),
            schedule: {
              at: targetDate,
              allowWhileIdle: true
            },
            channelId: 'dr_abdelaziz_media_v9',
            sound: 'dr_abdelaziz_task_alert.mp3',
            actionTypeId: 'MEDIA_ACTION',
            foreground: true,
            extra: {
              type: 'scheduled_media',
              scheduledId: item.id,
              mediaId: item.mediaId || item.id,
              mediaName: item.mediaName || item.audioName || 'ملف وسائط',
              mediaType: mediaTypeValue,
              title: item.title,
              description: item.description,
              cloudUrl: item.cloudUrl,
              isVideo,
            }
          });
        });
      }

      if (this.isAndroidNative()) {
        const result = await VideoAlarm.syncVideoAlarms({ alarms: nativeAlarms });
        console.log(`[NativeAlarmService] Synced ${result.scheduledCount} Android auto-launch video alarms.`);
      } else if (iosNotifications.length > 0) {
        await LocalNotifications.schedule({
          notifications: iosNotifications
        });
        console.log(`[NativeAlarmService] Scheduled ${iosNotifications.length} iOS media alerts.`);
      }
    } catch (err) {
      console.error('[NativeAlarmService] scheduleMediaItems error:', err);
    }
  }

  /**
   * Schedule an immediate 10-second test alarm to verify automatic app launch & video auto-play.
   */
  public static async scheduleTestAutoLaunchAlarm(
    item: {
      id?: string;
      mediaId: string;
      mediaName: string;
      mediaType: 'video' | 'audio';
      title: string;
      description?: string;
      cloudUrl?: string;
    },
    delaySeconds: number = 10
  ): Promise<boolean> {
    if (!this.isAndroidNative()) return false;
    try {
      const triggerAtMs = Date.now() + delaySeconds * 1000;
      const isVideo = item.mediaType === 'video';
      const result = await VideoAlarm.scheduleSingleAlarm({
        alarm: {
          alarmId: 99501,
          triggerAtMs,
          scheduledId: item.id || `test_${item.mediaId}`,
          mediaId: item.mediaId,
          mediaName: item.mediaName,
          mediaType: item.mediaType,
          title: item.title,
          description: item.description || '',
          cloudUrl: item.cloudUrl || '',
          isVideo,
          isTestAlarm: true,
        },
      });
      return result.scheduled;
    } catch (e) {
      console.warn('[NativeAlarmService] scheduleTestAutoLaunchAlarm error:', e);
      return false;
    }
  }

  public static async consumePendingMediaLaunch(): Promise<ScheduledMediaLaunchEvent | null> {
    if (!this.isAndroidNative()) return null;
    try {
      const res = await VideoAlarm.getPendingLaunchMedia();
      if (res.hasPending && res.media) {
        return res.media;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async onMediaAutoLaunch(
    callback: (data: ScheduledMediaLaunchEvent) => void
  ): Promise<PluginListenerHandle | null> {
    if (!this.isAndroidNative()) return null;
    try {
      return await VideoAlarm.addListener('scheduledMediaLaunch', callback);
    } catch {
      return null;
    }
  }

  public static async getAutoLaunchPermissions(): Promise<AutoLaunchPermissionsStatus | null> {
    if (!this.isAndroidNative()) return null;
    try {
      return await VideoAlarm.getAutoLaunchPermissions();
    } catch {
      return null;
    }
  }

  public static async requestOverlayPermission(): Promise<void> {
    if (!this.isAndroidNative()) return;
    await VideoAlarm.requestOverlayPermission().catch(console.warn);
  }

  public static async requestFullScreenPermission(): Promise<void> {
    if (!this.isAndroidNative()) return;
    await VideoAlarm.requestFullScreenPermission().catch(console.warn);
  }

  public static async requestBatteryOptimizationExemption(): Promise<void> {
    if (!this.isAndroidNative()) return;
    await VideoAlarm.requestBatteryOptimizationExemption().catch(console.warn);
  }

  public static async requestExactAlarmPermission(): Promise<void> {
    if (!this.isAndroidNative()) return;
    await VideoAlarm.requestExactAlarmPermission().catch(console.warn);
  }

  /**
   * Schedule all Daily System scheduled habits, worship items, and routines (IDs 7000+)
   */
  public static async scheduleDailyHabits(): Promise<void> {
    if (!this.isNative()) return;
    try {
      const { dailySystemService } = await import('./dailySystemService');
      const pending = await LocalNotifications.getPending();
      const habitNotifs = pending.notifications.filter(n => n.id >= 7000 && n.id < 9000);
      if (habitNotifs.length > 0) {
        await LocalNotifications.cancel({
          notifications: habitNotifs.map(n => ({ id: n.id }))
        });
      }

      const now = new Date();
      const notificationsToSchedule: any[] = [];
      let notifId = 7000;

      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const scheduledItems = dailySystemService.getScheduledDailyItems(dateKey);
        for (const item of scheduledItems) {
          if (!item.scheduledTime || item.enableVoiceAlert === false) continue;
          if (dayOffset === 0 && item.isCompleted) continue;

          const [hour, min] = item.scheduledTime.split(':').map(Number);
          if (isNaN(hour) || isNaN(min)) continue;

          const scheduleDate = new Date(targetDate);
          scheduleDate.setHours(hour, min, 0, 0);

          if (scheduleDate.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              id: notifId++,
              title: `🌟 نظامي اليومي: ${item.title}`,
              body: item.voiceMessage || `يا دكتور عبد العزيز: حان موعد ${item.title} الآن.`,
              schedule: {
                at: scheduleDate,
                allowWhileIdle: true
              },
              channelId: 'dr_abdelaziz_tasks_v9',
              sound: 'dr_abdelaziz_task_alert.mp3',
              actionTypeId: 'HABIT_ACTION',
              foreground: true,
              extra: {
                type: 'habit',
                habitId: item.id,
                title: item.title,
                voiceMessage: item.voiceMessage
              }
            });
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[NativeAlarmService] Scheduled ${notificationsToSchedule.length} daily habits alarms`);
      }
    } catch (err) {
      console.warn('[NativeAlarmService] scheduleDailyHabits error:', err);
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
