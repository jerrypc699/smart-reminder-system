import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PrayerTimesView } from './components/PrayerTimesView';
import { TasksView } from './components/TasksView';
import { AthkarView } from './components/AthkarView';
import { DailySystemView } from './components/DailySystemView';
import { SettingsView } from './components/SettingsView';
import { AudioSchedulerView } from './components/AudioSchedulerView';
import { ActiveAlertModal } from './components/ActiveAlertModal';
import { FloatingDhikr } from './components/FloatingDhikr';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InstallAppModal } from './components/InstallAppModal';
import { FirebaseSettingsModal } from './components/FirebaseSettingsModal';
import { cloudSyncService } from './services/cloudSyncService';
import { vercelCloudSync } from './services/vercelCloudSync';
import { supabaseService } from './services/supabaseService';
import { mobileBackgroundService } from './services/mobileBackgroundService';
import { NativeAlarmService, getLocalDateStr } from './services/nativeAlarmService';
import { dailySystemService } from './services/dailySystemService';
import { whatsappService, buildTaskWhatsAppMessage, formatWhatsAppDisplayPhone } from './services/whatsappService';

import type { 
  Task, 
  TaskStatus,
  PrayerSettings, 
  AudioSettings, 
  ActiveAlert,
  ScheduledAudio,
  ScheduledMedia,
  WhatsAppGlobalSettings
} from './types';
import { 
  prayerService, 
  DEFAULT_PRAYER_SETTINGS 
} from './services/prayerService';
import { 
  taskService, 
  INITIAL_TASKS 
} from './services/taskService';
import { audioService } from './services/audioService';
import { audioStorageService } from './services/audioStorageService';
import { notificationService } from './services/notificationService';

const PRAYER_SETTINGS_KEY = 'smart_reminder_prayer_settings_v1';
const AUDIO_SETTINGS_KEY = 'smart_reminder_audio_settings_v1';
const THEME_STORAGE_KEY = 'smart_reminder_theme_v1';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', theme === 'light' ? '#F3F6FB' : '#070B14');
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);

  // Active Popup Alert
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    try {
      return window.matchMedia('(display-mode: standalone)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Cloud Database Sync State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => {
    return vercelCloudSync.isAvailable() || cloudSyncService.isAvailable();
  });

  // Subscribe to Realtime Cloud Updates for Tasks and Scheduled Media
  useEffect(() => {
    if (!isCloudConnected) return;

    const unsubTasks = cloudSyncService.subscribeTasks((cloudTasks) => {
      if (cloudTasks && cloudTasks.length > 0) {
        setTasks(cloudTasks);
        taskService.saveTasks(cloudTasks);
      }
    });

    const unsubMedia = cloudSyncService.subscribeScheduledMedia((cloudMedia) => {
      if (cloudMedia && cloudMedia.length > 0) {
        setScheduledAudios(cloudMedia);
        audioStorageService.saveScheduledMedias(cloudMedia);
      }
    });

    return () => {
      unsubTasks();
      unsubMedia();
    };
  }, [isCloudConnected]);

  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  // Automatic Zero-Config Central Cloud Sync (Any phone/PC instantly sees the database)
  useEffect(() => {
    // 1. Subscribe to local task changes to update state
    const unsubTaskService = taskService.subscribeTasks((updatedTasks) => {
      setTasks(updatedTasks);
    });

    // 2. Initial background scan & upload of any un-uploaded local media
    const initialSyncTimer = setTimeout(() => {
      vercelCloudSync.syncAllLocalToCloud().catch(console.warn);
    }, 1500);

    // 3. Subscribe to authoritative real-time cloud updates
    const unsubCloud = vercelCloudSync.subscribe((cloudData) => {
      if (cloudData.tasks && Array.isArray(cloudData.tasks)) {
        setTasks(cloudData.tasks);
        taskService.saveTasks(cloudData.tasks, true);
        NativeAlarmService.scheduleTasks(cloudData.tasks).catch(console.warn);
      }
      if (cloudData.employees && Array.isArray(cloudData.employees)) {
        taskService.saveEmployees(cloudData.employees, true);
      }
      if (cloudData.scheduledMedia && Array.isArray(cloudData.scheduledMedia)) {
        setScheduledAudios(cloudData.scheduledMedia);
        audioStorageService.saveScheduledMedias(cloudData.scheduledMedia);
      }
      if (cloudData.mediaLibrary && Array.isArray(cloudData.mediaLibrary)) {
        audioStorageService.syncRemoteMetaList(cloudData.mediaLibrary);
      }
      if (cloudData.dailySystem) {
        dailySystemService.mergeFromCloud(cloudData.dailySystem);
      }
      if (cloudData.whatsappSettings) {
        whatsappService.saveSettings(cloudData.whatsappSettings);
        setWhatsappSettings(cloudData.whatsappSettings);
        whatsappService.syncNativeWhatsAppAlarms(taskService.getTasks()).catch(console.warn);
      }
      if (cloudData.prayerSettings) {
        setPrayerSettings(cloudData.prayerSettings);
        try {
          localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(cloudData.prayerSettings));
        } catch {}
      }
      if (cloudData.audioSettings) {
        setAudioSettings(cloudData.audioSettings);
        try {
          localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(cloudData.audioSettings));
        } catch {}
      }
    });

    return () => {
      unsubTaskService();
      clearTimeout(initialSyncTimer);
      unsubCloud();
    };
  }, []);

  // Supabase Realtime WebSockets Synchronization (if configured)
  useEffect(() => {
    if (!supabaseService.isConfigured()) return;

    // Initial pull from Supabase
    supabaseService.fetchTasks().then((spTasks) => {
      if (spTasks && spTasks.length > 0) {
        setTasks(spTasks);
        taskService.saveTasks(spTasks, true);
      }
    }).catch(console.warn);

    supabaseService.fetchEmployees().then((spEmp) => {
      if (spEmp && spEmp.length > 0) {
        taskService.saveEmployees(spEmp, true);
      }
    }).catch(console.warn);

    supabaseService.fetchScheduledMedia().then((spMedia) => {
      if (spMedia && spMedia.length > 0) {
        setScheduledAudios(spMedia);
        audioStorageService.saveScheduledMedias(spMedia);
      }
    }).catch(console.warn);

    // Live WebSockets listener
    const unsubSp = supabaseService.subscribeRealtime({
      onTasksChange: async () => {
        const fresh = await supabaseService.fetchTasks();
        if (fresh && fresh.length > 0) {
          setTasks(fresh);
          taskService.saveTasks(fresh, true);
          NativeAlarmService.scheduleTasks(fresh).catch(console.warn);
        }
      },
      onEmployeesChange: async () => {
        const fresh = await supabaseService.fetchEmployees();
        if (fresh && fresh.length > 0) {
          taskService.saveEmployees(fresh, true);
        }
      },
      onScheduledMediaChange: async () => {
        const fresh = await supabaseService.fetchScheduledMedia();
        if (fresh && fresh.length > 0) {
          setScheduledAudios(fresh);
          audioStorageService.saveScheduledMedias(fresh);
        }
      },
      onSystemStateChange: (key, data) => {
        if (key === 'daily_system' && data) {
          dailySystemService.mergeFromCloud(data);
        }
        if (key === 'whatsapp_settings' && data) {
          whatsappService.saveSettings(data);
          setWhatsappSettings(data);
        }
      },
    });

    return unsubSp;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      // 1. Fetch latest state from central cloud first
      const freshCloud = await vercelCloudSync.fetchFromCloud();
      if (freshCloud) {
        if (freshCloud.tasks && Array.isArray(freshCloud.tasks)) {
          setTasks(freshCloud.tasks);
          taskService.saveTasks(freshCloud.tasks, true);
        }
        if (freshCloud.employees && Array.isArray(freshCloud.employees)) {
          taskService.saveEmployees(freshCloud.employees, true);
        }
        if (freshCloud.scheduledMedia && Array.isArray(freshCloud.scheduledMedia)) {
          setScheduledAudios(freshCloud.scheduledMedia);
          audioStorageService.saveScheduledMedias(freshCloud.scheduledMedia);
        }
        if (freshCloud.dailySystem) {
          dailySystemService.mergeFromCloud(freshCloud.dailySystem);
        }
        if (freshCloud.whatsappSettings) {
          whatsappService.saveSettings(freshCloud.whatsappSettings);
          setWhatsappSettings(freshCloud.whatsappSettings);
        }
      }

      // 2. Upload any local unsynced files/blobs to cloud
      const res = await vercelCloudSync.syncAllLocalToCloud();
      if (res.success) {
        setTasks(taskService.getTasks());
        setScheduledAudios(audioStorageService.getScheduledMedias());
        notificationService.showNotification('✅ تمت المزامنة السحابية بنجاح', {
          body: `قاعدة البيانات المركزية متزامنة بالكامل (${res.tasksCount} مهمة و ${res.scheduledCount} ملف وسائط وموظفي العيادة) بين الكمبيوتر وكل الموبايلات.`,
        });
      }
    } catch (e) {
      console.warn('Manual sync error:', e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const syncCurrentStateToCloud = (currentTasks?: Task[]) => {
    vercelCloudSync.pushCurrentState({
      tasks: currentTasks || taskService.getTasks(),
      prayerSettings,
      audioSettings,
    }).catch(console.warn);
  };

  // Prayer Settings
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings>(() => {
    try {
      const saved = localStorage.getItem(PRAYER_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PRAYER_SETTINGS;
    } catch {
      return DEFAULT_PRAYER_SETTINGS;
    }
  });

  // Audio Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    try {
      const saved = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      masterVolume: 0.85,
      enableTts: true,
      ttsVoiceURI: '',
      ttsRate: 0.95,
      ttsPitch: 1.0,
      chimeSound: 'modern',
      enableSoundEffects: true,
      soundMuted: false,
    };
  });

  // Tasks
  const [tasks, setTasks] = useState<Task[]>(() => taskService.getTasks());
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppGlobalSettings>(() =>
    whatsappService.getSettings()
  );
  const recentWhatsAppRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const unsubWa = whatsappService.subscribeSettings((updated) => {
      setWhatsappSettings(updated);
      vercelCloudSync.pushCurrentState({
        whatsappSettings: updated,
        prayerSettings,
        audioSettings,
      }).catch(console.warn);
    });
    return unsubWa;
  }, [prayerSettings, audioSettings]);

  // Automatically sync Work Tasks into Today's Daily System & Native WhatsApp Alarms whenever tasks/settings update
  useEffect(() => {
    dailySystemService.autoSyncWorkTasksForDay(tasks, getLocalDateStr());
    whatsappService.syncNativeWhatsAppAlarms(tasks).catch(console.warn);
  }, [tasks, whatsappSettings]);

  // Scheduled Custom Audio Files
  const [scheduledAudios, setScheduledAudios] = useState<ScheduledAudio[]>(() =>
    audioStorageService.getScheduledAudios()
  );

  const refreshScheduledAudios = () => {
    const list = audioStorageService.getScheduledAudios();
    setScheduledAudios(list);
    NativeAlarmService.scheduleMediaItems(list).catch(console.warn);
  };

  useEffect(() => {
    NativeAlarmService.scheduleMediaItems(scheduledAudios).catch(console.warn);
  }, [scheduledAudios]);

  // Track prayers already reminded today to prevent repeated alerts
  const remindedPrayersRef = useRef<Set<string>>(new Set());
  const remindedPrePrayersRef = useRef<Set<string>>(new Set());

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(prayerSettings));
    } catch (e) {
      console.warn(e);
    }
  }, [prayerSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings));
    } catch (e) {
      console.warn(e);
    }
  }, [audioSettings]);

  // Subscribe to speaking events and permanently auto-enable notifications & audio keep-alive
  useEffect(() => {
    const unsub = audioService.subscribeSpeakingChange(setIsSpeaking);
    if (typeof window !== 'undefined') {
      // 1. Permanently keep background audio session active
      mobileBackgroundService.setKeepAliveMode(true);

      // 2. Initialize native exact alarms (Prayers + Tasks + Scheduled Media) if running on Android/iOS app
      NativeAlarmService.syncAll(tasks, scheduledAudios).catch(console.warn);

      // 3. Auto-check & auto-subscribe to push notifications
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setHasNotificationPermission(true);
          mobileBackgroundService.subscribeToPush();
        } else if (Notification.permission === 'default') {
          // On user's first touch anywhere, request and subscribe without manual button clicking
          const autoRequestOnInteraction = () => {
            notificationService.requestPermission().then((granted) => {
              setHasNotificationPermission(granted);
              if (granted) {
                mobileBackgroundService.subscribeToPush();
              }
            });
            window.removeEventListener('click', autoRequestOnInteraction);
            window.removeEventListener('touchstart', autoRequestOnInteraction);
          };
          window.addEventListener('click', autoRequestOnInteraction, { once: true });
          window.addEventListener('touchstart', autoRequestOnInteraction, { once: true });
        }
      }
    }
    return unsub;
  }, []);

  // Dedicated Voice Alert Trigger for Tasks (Plays recorded voice note, audio recording, voiceMessage TTS, or doctor chime)
  const handleTriggerTaskVoiceAlert = async (params: {
    taskId?: string;
    title?: string;
    voiceMessage?: string;
    audioUrl?: string;
    customAudioId?: string;
  }) => {
    try {
      audioService.initAudioContext();

      const allTasks = taskService.getTasks();
      const task = params.taskId ? allTasks.find((t) => t.id === params.taskId) : null;

      const audioUrl = params.audioUrl || task?.cloudUrl;
      const customAudioId = params.customAudioId || task?.customAudioId;
      const voiceMsg = params.voiceMessage || task?.voiceMessage;
      const taskTitle = params.title || task?.title || 'مهمة عمل';

      // Switch to tasks tab so the user sees the active task
      setActiveTab('tasks');

      // Display Active Alert Modal
      const waActive = !!(task?.whatsapp?.enabled && task.whatsapp.phoneNumber);
      setActiveAlert({
        id: `alert-task-${params.taskId || Date.now()}`,
        type: 'task',
        title: `يا دكتور عبد العزيز: ${taskTitle}`,
        message: voiceMsg || task?.description || 'حان وقت تنفيذ ومتابعة هذه المهمة الآن.',
        priority: task?.priority || 'medium',
        timestamp: new Date().toISOString(),
        taskId: params.taskId || task?.id,
        audioName: task?.customAudioName,
        isCustomAudio: !!(audioUrl || customAudioId),
        canSnooze: true,
        ...(waActive && task?.whatsapp
          ? {
              whatsappPhone: task.whatsapp.phoneNumber,
              whatsappRecipientName:
                task.whatsapp.recipientName ||
                formatWhatsAppDisplayPhone(task.whatsapp.phoneNumber, whatsappSettings.defaultCountryCode),
              whatsappMessage: buildTaskWhatsAppMessage(task),
              whatsappAutoSentStatus:
                task.whatsapp.lastSendStatus === 'sent_api'
                  ? 'sent_api'
                  : task.whatsapp.lastSendStatus === 'opened_app'
                    ? 'opened_app'
                    : 'pending_open',
            }
          : {}),
      });

      // 1. If there is a cloud audio URL (uploaded recorded voice note), play it immediately!
      if (audioUrl) {
        await audioService.playCustomAudio(audioUrl, audioSettings.masterVolume);
        return;
      }

      // 2. If there is an indexedDB audio (recorded locally on this device), play it!
      if (customAudioId) {
        const localBlobUrl = await audioStorageService.getAudioObjectUrl(customAudioId, audioUrl);
        if (localBlobUrl) {
          await audioService.playCustomAudio(localBlobUrl, audioSettings.masterVolume);
          return;
        }
      }

      // 3. Play luxury doctor task alert chime
      audioService.playDoctorTaskAlert(audioSettings.masterVolume);

      // 4. Speak the recorded voice message or personalized title alert
      if (audioSettings.enableTts) {
        const textToSpeak = voiceMsg
          ? (voiceMsg.startsWith('يا دكتور') ? voiceMsg : `يا دكتور عبد العزيز: ${voiceMsg}`)
          : `يا دكتور عبد العزيز: حان الآن موعد تنفيذ مهمة ${taskTitle}. يرجى المتابعة الآن.`;

        setTimeout(() => {
          audioService.speakAlert(textToSpeak, {
            volume: audioSettings.masterVolume,
            rate: audioSettings.ttsRate,
            pitch: audioSettings.ttsPitch,
            voiceURI: audioSettings.ttsVoiceURI,
          });
        }, 1600);
      }
    } catch (err) {
      console.warn('handleTriggerTaskVoiceAlert error:', err);
    }
  };

  // Handle Incoming Azan and Task Alerts (Push notification clicks, query params, SW messages, Native Alarms)
  useEffect(() => {
    const triggerInstantAzan = () => {
      audioService.initAudioContext();
      const reciter = prayerSettings.azanReciter === 'custom' ? 'mishary' : prayerSettings.azanReciter;
      audioService.playAzan(reciter as any, audioSettings.masterVolume);
      mobileBackgroundService.playAzanDirectly(`/audio/${reciter}.mp3`, audioSettings.masterVolume);

      setActiveAlert({
        id: `alert-azan-push-${Date.now()}`,
        type: 'azan',
        title: 'حان الآن موعد الأذان 🕌',
        message: 'الله أكبر، الله أكبر. نداء الحق يرتفع الآن بصوت الشيخ مشاري العفاسي.. تقبل الله منا ومنكم صالح الأعمال.',
        timestamp: new Date().toISOString(),
        canSnooze: false,
      });
    };

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Case A: Opened from Azan notification
      if (params.get('play_azan') === 'true') {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        setTimeout(triggerInstantAzan, 400);
      }
      // Case B: Opened from Task notification
      else if (params.get('play_task') !== null) {
        const taskId = params.get('play_task') || undefined;
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        setTimeout(() => {
          handleTriggerTaskVoiceAlert({ taskId });
        }, 500);
      }
      // Case C: Opened from Pre-Azan notification
      else if (params.get('play_pre_azan') === 'true') {
        const prayerName = params.get('prayer') || '';
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        setTimeout(() => {
          audioService.initAudioContext();
          audioService.playCustomAudio('/audio/dr_abdelaziz_pre_azan.mp3', audioSettings.masterVolume);
          setActiveAlert({
            id: `alert-pre-azan-push-${Date.now()}`,
            type: 'azan',
            title: `اقترب موعد صلاة ${prayerName} ⏳`,
            message: `يا دكتور عبد العزيز، باقي 5 دقائق على موعد أذان ${prayerName}. تقبل الله منا ومنكم صالح الأعمال.`,
            timestamp: new Date().toISOString(),
            canSnooze: false,
          });
        }, 400);
      }

      // Listen for Service Worker postMessage
      if ('serviceWorker' in navigator) {
        const handleSwMessage = (event: MessageEvent) => {
          if (event.data?.type === 'TRIGGER_AZAN') {
            triggerInstantAzan();
          } else if (event.data?.type === 'TRIGGER_PRE_AZAN') {
            audioService.initAudioContext();
            audioService.playCustomAudio('/audio/dr_abdelaziz_pre_azan.mp3', audioSettings.masterVolume);
            setActiveAlert({
              id: `alert-pre-azan-sw-${Date.now()}`,
              type: 'azan',
              title: `اقترب موعد الصلاة ⏳`,
              message: `يا دكتور عبد العزيز، باقي 5 دقائق على موعد الأذان. تقبل الله منا ومنكم.`,
              timestamp: new Date().toISOString(),
              canSnooze: false,
            });
          } else if (event.data?.type === 'TRIGGER_TASK_ALERT') {
            handleTriggerTaskVoiceAlert({
              taskId: event.data.taskId,
              title: event.data.title,
              voiceMessage: event.data.voiceMessage,
              audioUrl: event.data.audioUrl,
            });
          }
        };
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => {
          navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        };
      }
    }
  }, [prayerSettings.azanReciter, audioSettings.masterVolume, audioSettings.enableTts]);

  const audioSettingsRef = useRef(audioSettings);
  useEffect(() => {
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  const recentMediaTriggersRef = useRef<Map<string, number>>(new Map());

  const triggerScheduledMediaPlayback = async (params: {
    scheduledId?: string;
    mediaId: string;
    mediaName?: string;
    mediaType?: 'video' | 'audio';
    title?: string;
    description?: string;
    cloudUrl?: string;
    isVideo?: boolean;
    isTestAlarm?: boolean;
    volume?: number;
  }) => {
    try {
      const dedupeKey = `${params.scheduledId || params.mediaId}_${params.isTestAlarm ? 'test' : 'sched'}`;
      const nowMs = Date.now();
      const prevMs = recentMediaTriggersRef.current.get(dedupeKey) || 0;
      if (nowMs - prevMs < 55000) {
        return;
      }
      recentMediaTriggersRef.current.set(dedupeKey, nowMs);

      const schedList = audioStorageService.getScheduledMedias();
      const matchedItem = params.scheduledId
        ? schedList.find((s) => s.id === params.scheduledId)
        : schedList.find((s) => s.mediaId === params.mediaId);

      if (!params.isTestAlarm && matchedItem) {
        audioStorageService.updateScheduledMedia(matchedItem.id, {
          lastPlayedAt: new Date(nowMs).toISOString(),
          enabled: matchedItem.repeat === 'none' ? false : true,
        });
        const updatedList = audioStorageService.getScheduledMedias();
        setScheduledAudios(updatedList);
        NativeAlarmService.scheduleMediaItems(updatedList).catch(console.warn);
      }

      const isVideo =
        params.isVideo ??
        (params.mediaType === 'video' || matchedItem?.mediaType === 'video');
      const resolvedMediaId = params.mediaId || matchedItem?.mediaId || '';
      const resolvedCloudUrl = params.cloudUrl || matchedItem?.cloudUrl;
      const playUrl = await audioStorageService.getMediaObjectUrl(
        resolvedMediaId,
        resolvedCloudUrl
      );
      const finalUrl = playUrl || resolvedCloudUrl;
      const displayName = params.mediaName || matchedItem?.mediaName || 'ملف وسائط';
      const displayTitle =
        params.title ||
        matchedItem?.title ||
        (isVideo ? '🎬 تشغيل فيديو مجدول' : '📻 تشغيل وسائط مجدولة');
      const displayDesc =
        params.description ||
        matchedItem?.description ||
        (isVideo
          ? `يا دكتور عبد العزيز: حان موعد عرض مقطع الفيديو: ${displayName}`
          : `يا دكتور عبد العزيز: حان موعد تشغيل الملف الصوتي: ${displayName}`);

      setActiveTab('audio_scheduler');
      setActiveAlert({
        id: `alert-sched-${resolvedMediaId || Date.now()}-${nowMs}`,
        type: isVideo ? 'scheduled_media' : 'scheduled_audio',
        title: displayTitle,
        message: displayDesc,
        timestamp: new Date(nowMs).toISOString(),
        scheduledMediaId: matchedItem?.id || params.scheduledId,
        mediaName: displayName,
        mediaType: isVideo ? 'video' : 'audio',
        videoUrl: isVideo ? (finalUrl || undefined) : undefined,
        audioName: displayName,
        isCustomAudio: !isVideo,
        canSnooze: false,
      });

      const currAudio = audioSettingsRef.current;
      if (!isVideo && !currAudio.soundMuted && finalUrl) {
        audioService.initAudioContext();
        audioService.playCustomAudio(
          finalUrl,
          (params.volume ?? matchedItem?.volume ?? 0.9) * currAudio.masterVolume
        );
      }
    } catch (err) {
      console.warn('triggerScheduledMediaPlayback error:', err);
    }
  };

  // Handle Native Android Scheduled Video Auto-Launch (Cold start & Warm start)
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    let isCancelled = false;

    const setupAutoLaunch = async () => {
      const pending = await NativeAlarmService.consumePendingMediaLaunch();
      if (!isCancelled && pending) {
        triggerScheduledMediaPlayback(pending);
      }

      const handle = await NativeAlarmService.onMediaAutoLaunch((data) => {
        if (!isCancelled) {
          triggerScheduledMediaPlayback(data);
        }
      });
      if (isCancelled && handle) {
        handle.remove().catch(() => {});
      } else {
        listenerHandle = handle;
      }
    };

    setupAutoLaunch().catch(console.warn);

    return () => {
      isCancelled = true;
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, []);

  // Handle Native Android / iOS Hardware Alarm Taps
  useEffect(() => {
    const handleNativeTap = (e: any) => {
      const extra = e.detail;
      if (extra?.type === 'task') {
        handleTriggerTaskVoiceAlert({
          taskId: extra.taskId,
          title: extra.title,
          voiceMessage: extra.voiceMessage,
          audioUrl: extra.cloudUrl,
          customAudioId: extra.customAudioId,
        });
      } else if (extra?.type === 'pre_azan') {
        audioService.initAudioContext();
        audioService.playCustomAudio('/audio/dr_abdelaziz_pre_azan.mp3', audioSettings.masterVolume);
        setActiveAlert({
          id: `alert-pre-azan-${Date.now()}`,
          type: 'azan',
          title: `اقترب موعد صلاة ${extra.prayer || ''} ⏳`,
          message: `يا دكتور عبد العزيز، باقي 5 دقائق على موعد أذان ${extra.prayer || ''}. تقبل الله منا ومنكم صالح الأعمال.`,
          timestamp: new Date().toISOString(),
          canSnooze: false,
        });
      } else if (extra?.type === 'azan') {
        const reciter = prayerSettings.azanReciter === 'custom' ? 'mishary' : prayerSettings.azanReciter;
        audioService.initAudioContext();
        audioService.playAzan(reciter as any, audioSettings.masterVolume);
      } else if (extra?.type === 'scheduled_media' || extra?.type === 'scheduled_audio') {
        triggerScheduledMediaPlayback(extra);
      }
    };
    window.addEventListener('native_notification_tapped', handleNativeTap);
    return () => window.removeEventListener('native_notification_tapped', handleNativeTap);
  }, [audioSettings.masterVolume, prayerSettings.azanReciter, audioSettings.enableTts]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate prayer times
  const prayerCalc = prayerService.getPrayerTimes(currentTime, prayerSettings);
  const hijriDate = prayerService.getHijriDate(currentTime);

  // Reminder Engine: checks tasks and prayers every 3 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayDateStr = getLocalDateStr(now);
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');

      // 1. Check Azan Times
      if (prayerSettings.enableAzanAudio && !audioSettings.soundMuted) {
        prayerCalc.prayers.forEach((prayer) => {
          if (prayer.id === 'sunrise') return; // Sunrise is not prayer

          const prayerHours = prayer.time.getHours().toString().padStart(2, '0');
          const prayerMinutes = prayer.time.getMinutes().toString().padStart(2, '0');
          const prayerKey = `${todayDateStr}_${prayer.id}_${prayerHours}:${prayerMinutes}`;

          // Check if current minute matches prayer minute
          if (
            currentHours === prayerHours &&
            currentMinutes === prayerMinutes &&
            !remindedPrayersRef.current.has(prayerKey)
          ) {
            remindedPrayersRef.current.add(prayerKey);

            const isDuha = prayer.id === 'duha';
            const isQiyam = prayer.id === 'qiyam';

            const alertTitle = isDuha
              ? '☀️ حان الآن موعد صلاة الضحى'
              : isQiyam
              ? '🌌 حان الآن موعد قيام الليل والتهجد'
              : `🕌 حان الآن موعد أذان ${prayer.arabicName}`;

            const alertMsg = isDuha
              ? `يا دكتور عبد العزيز، حان الآن موعد صلاة الضحى (صلاة الأوابين). ركعتان تجزئان عن صدقة يومك بتوقيت ${prayerSettings.cityName}. تقبل الله طاعتكم.`
              : isQiyam
              ? `يا دكتور عبد العزيز، الثلث الأخير من الليل وموعد قيام الليل والتهجد. وقت النزول الإلهي واستجابة الدعاء. تقبل الله طاعتكم.`
              : `الله أكبر، الله أكبر. حان الآن وقت صلاة ${prayer.arabicName} بتوقيت ${prayerSettings.cityName}. تقبل الله منا ومنكم صالح الأعمال.`;

            // Trigger Notification
            notificationService.showNotification(alertTitle, {
              body: alertMsg,
              tag: `azan-${prayer.id}`,
            });

            // Trigger Modal Alert
            setActiveAlert({
              id: `alert-azan-${Date.now()}`,
              type: 'azan',
              title: alertTitle,
              message: alertMsg,
              timestamp: now.toISOString(),
              prayerId: prayer.id,
              canSnooze: false,
            });

            // Trigger Audio Alert
            audioService.initAudioContext();
            if (isDuha || isQiyam) {
              const voiceMsg = isDuha
                ? 'يا دكتور عبد العزيز، حان الآن موعد صلاة الضحى. ركعتان تجزئان عن صدقة يومك، صلاة الأوابين.'
                : 'يا دكتور عبد العزيز، حان الثلث الأخير من الليل، موعد قيام الليل والتهجد واستجابة الدعاء.';
              audioService.speakAlert(voiceMsg, {
                volume: audioSettings.masterVolume,
                onEnd: () => {
                  audioService.playAzan('takbeerat', audioSettings.masterVolume);
                },
              });
            } else {
              const chosenFile = `/audio/${prayerSettings.azanReciter === 'custom' ? 'mishary' : prayerSettings.azanReciter}.mp3`;
              mobileBackgroundService.playAzanDirectly(chosenFile, audioSettings.masterVolume);

              if (prayerSettings.azanReciter === 'custom' && prayerSettings.customAzanAudioId) {
                audioStorageService.getAudioObjectUrl(prayerSettings.customAzanAudioId).then((customUrl) => {
                  audioService.playAzan(
                    'custom',
                    audioSettings.masterVolume,
                    () => {
                      if (prayerSettings.enableDuaaAfterAzan) {
                        audioService.speak(
                          'اللهم رب هذه الدعوة التامة والصلاة القائمة، آت محمداً الوسيلة والفضيلة، وابعثه مقاماً محموداً الذي وعدته.',
                          { volume: audioSettings.masterVolume * 0.9 }
                        );
                      }
                    },
                    customUrl
                  );
                });
              } else {
                audioService.playAzan(
                  prayerSettings.azanReciter,
                  audioSettings.masterVolume,
                  () => {
                    if (prayerSettings.enableDuaaAfterAzan) {
                      audioService.speak(
                        'اللهم رب هذه الدعوة التامة والصلاة القائمة، آت محمداً الوسيلة والفضيلة، وابعثه مقاماً محموداً الذي وعدته.',
                        { volume: audioSettings.masterVolume * 0.9 }
                      );
                    }
                  }
                );
              }
            }
          }
        });
      }

      // 2. Check Pre-Azan Alert
      if (prayerSettings.enablePreAzanAlert && !audioSettings.soundMuted) {
        const next = prayerCalc.nextPrayer;
        if (next && next.id !== 'sunrise') {
          const diffMs = next.time.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / (60 * 1000));
          const preKey = `${todayDateStr}_pre_${next.id}_${prayerSettings.preAzanReminderMinutes}`;

          if (
            diffMins === prayerSettings.preAzanReminderMinutes &&
            !remindedPrePrayersRef.current.has(preKey)
          ) {
            remindedPrePrayersRef.current.add(preKey);

            notificationService.showNotification(`⏳ اقتراب موعد صلاة ${next.arabicName}`, {
              body: `يا دكتور عبد العزيز، متبقي ${prayerSettings.preAzanReminderMinutes} دقائق على موعد أذان ${next.arabicName}. استعد للوضوء.`,
              tag: `pre-azan-${next.id}`,
            });

            setActiveAlert({
              id: `alert-pre-${Date.now()}`,
              type: 'pre_azan',
              title: `يا دكتور عبد العزيز: اقتراب صلاة ${next.arabicName}`,
              message: `متبقي ${prayerSettings.preAzanReminderMinutes} دقائق على موعد الأذان. ننصحك بإتمام ما بيدك والاستعداد للوضوء.`,
              timestamp: now.toISOString(),
              prayerId: next.id,
              canSnooze: false,
            });

            audioService.playChime('pre_azan', audioSettings.masterVolume);
            setTimeout(() => {
              audioService.speakAlert(
                `اقترب موعد أذان صلاة ${next.arabicName}، متبقي ${prayerSettings.preAzanReminderMinutes} دقائق. يرجى الاستعداد للوضوء.`,
                {
                  volume: audioSettings.masterVolume,
                  rate: audioSettings.ttsRate,
                  pitch: audioSettings.ttsPitch,
                  voiceURI: audioSettings.ttsVoiceURI,
                }
              );
            }, 800);
          }
        }
      }

      // 3. Check Work Tasks
      const currentTasks = taskService.getTasks();
      currentTasks.forEach((task) => {
        if (task.status === 'completed') return;

        let shouldTrigger = false;

        // Check snoozed task
        if (task.status === 'snoozed' && task.snoozeUntil) {
          const snoozeDate = new Date(task.snoozeUntil);
          if (now >= snoozeDate) {
            shouldTrigger = true;
          }
        } else if (task.dueDate === todayDateStr && task.dueTime) {
          // Regular scheduled task
          const [tHour, tMin] = task.dueTime.split(':').map(Number);
          const taskTime = new Date(now);
          taskTime.setHours(tHour, tMin, 0, 0);

          // Subtract reminder minutes before
          const reminderTime = new Date(taskTime.getTime() - (task.reminderMinutesBefore || 0) * 60 * 1000);
          const remHours = reminderTime.getHours().toString().padStart(2, '0');
          const remMins = reminderTime.getMinutes().toString().padStart(2, '0');

          if (currentHours === remHours && currentMinutes === remMins) {
            // Check if already reminded in the last 60 seconds
            if (!task.lastRemindedAt || (now.getTime() - new Date(task.lastRemindedAt).getTime()) > 65000) {
              shouldTrigger = true;
            }
          }
        }

        if (shouldTrigger) {
          // Mark lastRemindedAt
          taskService.updateTask(task.id, {
            lastRemindedAt: now.toISOString(),
            status: 'pending',
            snoozeUntil: undefined,
          });
          setTasks(taskService.getTasks());

          // Show Native Notification
          notificationService.showNotification(`💼 تذكير بمهمة: ${task.title}`, {
            body: `يا دكتور عبد العزيز: ${task.description || task.voiceMessage || 'حان موعد هذه المهمة الآن.'}`,
            tag: `task-${task.id}`,
          });

          // Prepare WhatsApp dispatch if enabled on this task
          const hasWhatsAppTask = !!(task.whatsapp?.enabled && task.whatsapp.phoneNumber);
          const waMessage = hasWhatsAppTask ? buildTaskWhatsAppMessage(task) : undefined;
          const waRecipientDisplay = hasWhatsAppTask && task.whatsapp
            ? task.whatsapp.recipientName ||
              formatWhatsAppDisplayPhone(task.whatsapp.phoneNumber, whatsappSettings.defaultCountryCode)
            : undefined;

          // Show Active Alert Modal
          setActiveAlert({
            id: `alert-task-${task.id}-${Date.now()}`,
            type: 'task',
            title: `يا دكتور عبد العزيز: ${task.title}`,
            message: task.description || task.voiceMessage || 'حان وقت تنفيذ ومتابعة هذه المهمة الآن.',
            priority: task.priority,
            timestamp: now.toISOString(),
            taskId: task.id,
            audioName: task.customAudioName,
            isCustomAudio: !!task.customAudioId,
            canSnooze: true,
            ...(hasWhatsAppTask && task.whatsapp
              ? {
                  whatsappPhone: task.whatsapp.phoneNumber,
                  whatsappRecipientName: waRecipientDisplay,
                  whatsappMessage: waMessage,
                  whatsappAutoSentStatus: 'pending_open',
                }
              : {}),
          });

          // Auto-trigger WhatsApp message send/open at due time (deduped within 65s)
          if (hasWhatsAppTask && task.whatsapp) {
            const waDedupeKey = `${task.id}-${task.dueDate}-${task.dueTime}`;
            const prevWaMs = recentWhatsAppRef.current.get(waDedupeKey) || 0;
            const lastSentDiff = task.whatsapp.lastSentAt
              ? now.getTime() - new Date(task.whatsapp.lastSentAt).getTime()
              : Infinity;

            if (now.getTime() - prevWaMs > 65000 && lastSentDiff > 65000) {
              recentWhatsAppRef.current.set(waDedupeKey, now.getTime());
              whatsappService
                .triggerTaskWhatsAppSend(task, {
                  allowOpenApp: task.whatsapp.autoTriggerAtDueTime !== false,
                })
                .then((res) => {
                  const statusValue: 'sent_api' | 'opened_app' | 'failed' =
                    res.success && res.method === 'api'
                      ? 'sent_api'
                      : res.success && res.method === 'app'
                        ? 'opened_app'
                        : 'failed';

                  const latestList = taskService.getTasks();
                  const latestTask = latestList.find((item) => item.id === task.id);
                  if (latestTask?.whatsapp) {
                    const nextTasks = taskService.updateTask(task.id, {
                      whatsapp: {
                        ...latestTask.whatsapp,
                        lastSentAt: res.success ? new Date().toISOString() : latestTask.whatsapp.lastSentAt,
                        lastSendStatus: statusValue,
                        lastSendError: res.error,
                      },
                    });
                    setTasks(nextTasks);
                    syncCurrentStateToCloud(nextTasks);
                  }

                  setActiveAlert((prev) =>
                    prev && prev.taskId === task.id
                      ? {
                          ...prev,
                          whatsappAutoSentStatus: statusValue,
                          whatsappAutoSentError: res.error,
                        }
                      : prev
                  );
                })
                .catch(console.warn);
            }
          }

          // Play Audio chime & Speech or Custom Audio
          if (!audioSettings.soundMuted) {
            handleTriggerTaskVoiceAlert({
              taskId: task.id,
              title: task.title,
              voiceMessage: task.voiceMessage,
              audioUrl: task.cloudUrl,
              customAudioId: task.customAudioId,
            });
          }
        }
      });

      // 4. Check Scheduled Custom Audio and Video Files
      const schedList = audioStorageService.getScheduledMedias();
      schedList.forEach((item) => {
        if (!item.enabled) return;

        let shouldPlay = false;
        const dayOfWeek = now.getDay();
        const isWorkday = dayOfWeek >= 0 && dayOfWeek <= 4; // Sun - Thu

        if (item.repeat === 'none') {
          if (item.scheduledDate === todayDateStr && item.scheduledTime === `${currentHours}:${currentMinutes}`) {
            shouldPlay = true;
          }
        } else if (item.repeat === 'daily') {
          if (item.scheduledTime === `${currentHours}:${currentMinutes}`) {
            shouldPlay = true;
          }
        } else if (item.repeat === 'workdays') {
          if (isWorkday && item.scheduledTime === `${currentHours}:${currentMinutes}`) {
            shouldPlay = true;
          }
        } else if (item.repeat === 'weekly') {
          const schedDay = new Date(`${item.scheduledDate}T00:00:00`).getDay();
          if (dayOfWeek === schedDay && item.scheduledTime === `${currentHours}:${currentMinutes}`) {
            shouldPlay = true;
          }
        }

        if (shouldPlay) {
          if (!item.lastPlayedAt || (now.getTime() - new Date(item.lastPlayedAt).getTime()) > 65000) {
            triggerScheduledMediaPlayback({
              scheduledId: item.id,
              mediaId: item.mediaId,
              mediaName: item.mediaName,
              mediaType: item.mediaType,
              title: item.title,
              description: item.description,
              cloudUrl: item.cloudUrl,
              isVideo: item.mediaType === 'video',
              volume: item.volume,
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 3000);
    return () => clearInterval(interval);
  }, [prayerSettings, audioSettings, prayerCalc]);

  // Request Notification permission and subscribe to Mobile Web Push
  const handleRequestNotification = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      notificationService.showNotification('🎉 تم تفعيل إشعارات د. عبد العزيز بنجاح', {
        body: 'ستصلك كافة تنبيهات العمل ومواقيت الأذان فور حلولها على هاتفك وحاسوبك.',
      });
      // Register Web Push for mobile
      try {
        const { mobileBackgroundService } = await import('./services/mobileBackgroundService');
        await mobileBackgroundService.subscribeToPush();
      } catch (err) {
        console.warn('Auto push subscribe error:', err);
      }
    }
  };

  // Test Audio
  const handleTestAudio = () => {
    audioService.initAudioContext();
    audioService.playChime('urgent', audioSettings.masterVolume);
    setTimeout(() => {
      audioService.playDoctorWelcome(audioSettings.masterVolume);
    }, 600);
  };

  // Play Azan Preview
  const handlePlayAzanPreview = async (reciter?: 'takbeerat' | 'mishary' | 'abdulbasit' | 'makkah' | 'custom') => {
    audioService.initAudioContext();
    const chosenReciter = reciter || prayerSettings.azanReciter;
    if (chosenReciter === 'custom' && prayerSettings.customAzanAudioId) {
      const customUrl = await audioStorageService.getAudioObjectUrl(prayerSettings.customAzanAudioId);
      audioService.playAzan('custom', audioSettings.masterVolume, undefined, customUrl);
    } else {
      audioService.playAzan(chosenReciter, audioSettings.masterVolume);
    }
  };



  // Preview individual task audio
  const handlePreviewTaskAudio = async (task: Task) => {
    audioService.initAudioContext();
    if (task.cloudUrl) {
      audioService.playCustomAudio(task.cloudUrl, audioSettings.masterVolume);
      return;
    }
    if (task.customAudioId) {
      const url = await audioStorageService.getAudioObjectUrl(task.customAudioId, task.cloudUrl);
      if (url) {
        audioService.playCustomAudio(url, audioSettings.masterVolume);
        return;
      }
    }

    audioService.playDoctorTaskAlert(audioSettings.masterVolume);
    if (audioSettings.enableTts) {
      const msg = task.voiceMessage
        ? (task.voiceMessage.startsWith('يا دكتور') ? task.voiceMessage : `يا دكتور عبد العزيز: ${task.voiceMessage}`)
        : `يا دكتور عبد العزيز: تذكير بمهمة ${task.title}. يرجى المتابعة الآن.`;

      setTimeout(() => {
        audioService.speakAlert(msg, {
          volume: audioSettings.masterVolume,
          rate: audioSettings.ttsRate,
          pitch: audioSettings.ttsPitch,
          voiceURI: audioSettings.ttsVoiceURI,
        });
      }, 1600);
    }
  };

  // Stop all audio
  const handleStopAudio = () => {
    audioService.stopAll();
  };

  // Task Actions
  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      taskService.saveTasks(updated);
      syncCurrentStateToCloud(updated);
      NativeAlarmService.scheduleTasks(updated).catch(console.warn);
      return updated;
    });

    audioService.playChime('click', 0.5);
    return newTask;
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      taskService.saveTasks(updated);
      syncCurrentStateToCloud(updated);
      NativeAlarmService.scheduleTasks(updated).catch(console.warn);
      return updated;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      taskService.saveTasks(updated);
      syncCurrentStateToCloud(updated);
      NativeAlarmService.scheduleTasks(updated).catch(console.warn);
      return updated;
    });
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) => {
      let isCompleted = false;
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus: TaskStatus = t.status === 'completed' ? 'pending' : 'completed';
          isCompleted = nextStatus === 'completed';
          return {
            ...t,
            status: nextStatus,
            completedAt: isCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      });

      taskService.saveTasks(updated);
      syncCurrentStateToCloud(updated);
      NativeAlarmService.scheduleTasks(updated).catch(console.warn);

      if (isCompleted) {
        audioService.playChime('success', audioSettings.masterVolume);
      }

      return updated;
    });
  };

  const handleSnoozeTask = (taskId: string, minutes: number) => {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'snoozed' as TaskStatus, snoozeUntil: snoozeTime }
          : t
      );
      taskService.saveTasks(updated);
      syncCurrentStateToCloud(updated);
      NativeAlarmService.scheduleTasks(updated).catch(console.warn);
      return updated;
    });
    audioService.speakAlert(`تم تأجيل التنبيه لمدة ${minutes} دقائق.`, {
      volume: audioSettings.masterVolume,
      rate: 1,
    });
  };

  // Reset Default Data
  const handleResetAllData = () => {
    taskService.saveTasks(INITIAL_TASKS);
    setTasks(INITIAL_TASKS);
    setPrayerSettings(DEFAULT_PRAYER_SETTINGS);
  };

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="min-h-screen flex flex-col font-['Cairo'] relative">
      {/* Subtle Ambient Zenith Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(0,113,227,0.06),transparent_70%)] z-0"
      />
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTime={currentTime}
        hijriDate={hijriDate}
        prayerSettings={prayerSettings}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
        isSpeaking={isSpeaking}
        onTestAudio={handleTestAudio}
        hasNotificationPermission={hasNotificationPermission}
        onRequestNotification={handleRequestNotification}
        pendingTasksCount={pendingTasksCount}
        scheduledAudiosCount={scheduledAudios.filter((s) => s.enabled).length}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isCloudConnected={isCloudConnected}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onManualSync={handleManualSync}
        isManualSyncing={isManualSyncing}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 md:pb-16">
        {activeTab === 'dashboard' && (
          <Dashboard
            prayerTimes={prayerCalc.prayers}
            nextPrayer={prayerCalc.nextPrayer}
            remainingTime={prayerCalc.remaining}
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onPreviewTaskAudio={handlePreviewTaskAudio}
            onPlayAzanPreview={handlePlayAzanPreview}
            prayerSettings={prayerSettings}
            setActiveTab={setActiveTab}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}

        {activeTab === 'daily_system' && (
          <DailySystemView
            tasks={tasks}
            onOpenAthkar={() => setActiveTab('athkar')}
            onToggleTask={handleToggleTask}
            onOpenTasksTab={() => setActiveTab('tasks')}
          />
        )}

        {activeTab === 'prayers' && (
          <PrayerTimesView
            prayerTimes={prayerCalc.prayers}
            nextPrayer={prayerCalc.nextPrayer}
            remainingTime={prayerCalc.remaining}
            prayerSettings={prayerSettings}
            setPrayerSettings={setPrayerSettings}
            onPlayAzan={handlePlayAzanPreview}
            onStopAudio={handleStopAudio}
            isSpeaking={isSpeaking}
            qiblaDirection={prayerCalc.qiblaDirection}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            prayerTimes={prayerCalc.prayers}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onSnoozeTask={handleSnoozeTask}
            onPreviewTaskAudio={handlePreviewTaskAudio}
          />
        )}

        {activeTab === 'audio_scheduler' && (
          <AudioSchedulerView
            scheduledAudios={scheduledAudios}
            onRefreshScheduled={refreshScheduledAudios}
            onTestScheduledAudio={async (item) => {
              const url = await audioStorageService.getMediaObjectUrl(item.mediaId);
              if (url && item.mediaType === 'audio') {
                audioService.playCustomAudio(url, (item.volume ?? 0.9) * audioSettings.masterVolume);
              }
            }}
            masterVolume={audioSettings.masterVolume}
          />
        )}

        {activeTab === 'athkar' && <AthkarView />}

        {activeTab === 'settings' && (
          <SettingsView
            prayerSettings={prayerSettings}
            setPrayerSettings={setPrayerSettings}
            audioSettings={audioSettings}
            setAudioSettings={setAudioSettings}
            onTestAudio={handleTestAudio}
            hasNotificationPermission={hasNotificationPermission}
            onRequestNotification={handleRequestNotification}
            onResetAllData={handleResetAllData}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            isCloudConnected={isCloudConnected}
            onOpenCloudModal={() => setIsCloudModalOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Android & iOS) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingTasksCount={pendingTasksCount}
        scheduledAudiosCount={scheduledAudios.filter((s) => s.enabled).length}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstallable={!isAppInstalled}
      />

      {/* PWA Mobile Installation Guidance Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setIsAppInstalled(true)}
      />

      {/* Firebase Cloud Database Settings Modal */}
      <FirebaseSettingsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onConfigChanged={() => setIsCloudConnected(cloudSyncService.isAvailable())}
      />

      {/* Interactive Active Alert Modal */}
      <ActiveAlertModal
        alert={activeAlert}
        onDismiss={() => {
          handleStopAudio();
          setActiveAlert(null);
        }}
        onSnooze={(minutes) => {
          handleStopAudio();
          if (activeAlert?.taskId) {
            handleSnoozeTask(activeAlert.taskId, minutes);
          }
          setActiveAlert(null);
        }}
        onStopAudio={handleStopAudio}
        isSpeaking={isSpeaking}
      />

      {/* Floating On-Screen Dhikr (Azkari App Style) */}
      <FloatingDhikr />

      {/* Footer */}
      <footer className="lux-footer relative z-10 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="font-semibold">نظام د. عبد العزيز الذكي • إدارة المهام ومواقيت الصلاة</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>تزامن فلكي دقيق</span>
            <span className="text-slate-700">•</span>
            <span>نطق صوتي عربي ذكي</span>
            <span className="text-slate-700">•</span>
            <span>واتساب ومزامنة سحابية</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
