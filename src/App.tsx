import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PrayerTimesView } from './components/PrayerTimesView';
import { TasksView } from './components/TasksView';
import { PomodoroView } from './components/PomodoroView';
import { AthkarView } from './components/AthkarView';
import { SettingsView } from './components/SettingsView';
import { AudioSchedulerView } from './components/AudioSchedulerView';
import { ActiveAlertModal } from './components/ActiveAlertModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InstallAppModal } from './components/InstallAppModal';
import { FirebaseSettingsModal } from './components/FirebaseSettingsModal';
import { cloudSyncService } from './services/cloudSyncService';
import { vercelCloudSync } from './services/vercelCloudSync';

import type { 
  Task, 
  PrayerSettings, 
  AudioSettings, 
  ActiveAlert,
  ScheduledAudio
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

export function App() {
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

  // Cloud Database Sync State (Firebase)
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => cloudSyncService.isAvailable());

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

  // Automatic Zero-Config Vercel Cloud Sync (runs out of the box on PC & Mobile)
  useEffect(() => {
    const unsub = vercelCloudSync.subscribe((cloudData) => {
      if (cloudData.tasks && Array.isArray(cloudData.tasks) && cloudData.tasks.length > 0) {
        setTasks(cloudData.tasks);
        taskService.saveTasks(cloudData.tasks);
      }
      if (cloudData.scheduledMedia && Array.isArray(cloudData.scheduledMedia) && cloudData.scheduledMedia.length > 0) {
        setScheduledAudios(cloudData.scheduledMedia);
        audioStorageService.saveScheduledMedias(cloudData.scheduledMedia);
      }
    });

    return () => unsub();
  }, []);

  const syncCurrentStateToCloud = (currentTasks?: Task[]) => {
    const t = currentTasks || taskService.getTasks();
    const m = audioStorageService.getScheduledMedias();
    vercelCloudSync.pushToCloud({
      tasks: t,
      scheduledMedia: m,
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

  // Scheduled Custom Audio Files
  const [scheduledAudios, setScheduledAudios] = useState<ScheduledAudio[]>(() =>
    audioStorageService.getScheduledAudios()
  );

  const refreshScheduledAudios = () => {
    setScheduledAudios(audioStorageService.getScheduledAudios());
  };

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

  // Subscribe to speaking events
  useEffect(() => {
    const unsub = audioService.subscribeSpeakingChange(setIsSpeaking);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
    return unsub;
  }, []);

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
      const todayDateStr = now.toISOString().split('T')[0];
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

            // Trigger Notification
            notificationService.showNotification(`🕌 حان الآن موعد أذان ${prayer.arabicName}`, {
              body: `الله أكبر، الله أكبر. حان الآن وقت صلاة ${prayer.arabicName} بتوقيت ${prayerSettings.cityName}. تقبل الله منا ومنكم صالح الأعمال.`,
              tag: `azan-${prayer.id}`,
            });

            // Trigger Modal Alert
            setActiveAlert({
              id: `alert-azan-${Date.now()}`,
              type: 'azan',
              title: `حان الآن موعد أذان ${prayer.arabicName}`,
              message: `الله أكبر، الله أكبر. نداء الحق لصلاة ${prayer.arabicName} يرتفع الآن. أوقف عملك واستعد للصلاة.`,
              timestamp: now.toISOString(),
              prayerId: prayer.id,
              canSnooze: false,
            });

            // Trigger Audio Azan
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
          });

          // Play Audio chime & Speech or Custom Audio
          if (!audioSettings.soundMuted) {
            if (task.customAudioId) {
              audioStorageService.getAudioObjectUrl(task.customAudioId).then((customUrl) => {
                if (customUrl) {
                  audioService.playCustomAudio(customUrl, audioSettings.masterVolume);
                } else {
                  // Fallback to chime and speech
                  const chimeType = task.priority === 'urgent' ? 'urgent' : 'task';
                  audioService.playChime(chimeType, audioSettings.masterVolume);
                  if (audioSettings.enableTts) {
                    const speechText =
                      task.voiceMessage ||
                      `تنبيه لمهمة عمل: ${task.title}. ${
                        task.priority === 'urgent' ? 'هذه المهمة عاجلة جداً.' : ''
                      } يرجى المتابعة الآن.`;

                    setTimeout(() => {
                      audioService.speakAlert(speechText, {
                        volume: audioSettings.masterVolume,
                        rate: audioSettings.ttsRate,
                        pitch: audioSettings.ttsPitch,
                        voiceURI: audioSettings.ttsVoiceURI,
                      });
                    }, 600);
                  }
                }
              });
            } else {
              const chimeType = task.priority === 'urgent' ? 'urgent' : 'task';
              audioService.playChime(chimeType, audioSettings.masterVolume);

              if (audioSettings.enableTts) {
                const speechText =
                  task.voiceMessage ||
                  `تنبيه لمهمة عمل: ${task.title}. ${
                    task.priority === 'urgent' ? 'هذه المهمة عاجلة جداً.' : ''
                  } يرجى المتابعة الآن.`;

                setTimeout(() => {
                  audioService.speakAlert(speechText, {
                    volume: audioSettings.masterVolume,
                    rate: audioSettings.ttsRate,
                    pitch: audioSettings.ttsPitch,
                    voiceURI: audioSettings.ttsVoiceURI,
                  });
                }, 600);
              }
            }
          }
        }
      });

      // 4. Check Scheduled Custom Audio and Video Files
      const schedList = audioStorageService.getScheduledMedias();
      schedList.forEach(async (item) => {
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
            audioStorageService.updateScheduledMedia(item.id, {
              lastPlayedAt: now.toISOString(),
              enabled: item.repeat === 'none' ? false : true,
            });
            setScheduledAudios(audioStorageService.getScheduledMedias());

            const isVideo = item.mediaType === 'video';
            const mediaUrl = await audioStorageService.getMediaObjectUrl(item.mediaId);

            notificationService.showNotification(
              isVideo ? `🎬 تشغيل فيديو تلقائي: ${item.title}` : `📻 تشغيل صوتي تلقائي: ${item.title}`,
              {
                body: item.description || (isVideo ? `حان موعد عرض مقطع الفيديو: ${item.mediaName}` : `جاري تشغيل الملف الصوتي: ${item.mediaName}`),
                tag: `sched-media-${item.id}`,
              }
            );

            setActiveAlert({
              id: `alert-sched-${item.id}-${Date.now()}`,
              type: isVideo ? 'scheduled_media' : 'scheduled_audio',
              title: item.title,
              message: item.description || (isVideo ? `حان موعد تشغيل مقطع الفيديو: ${item.mediaName}` : `حان موعد تشغيل الملف الصوتي: ${item.mediaName}`),
              timestamp: now.toISOString(),
              scheduledMediaId: item.id,
              mediaName: item.mediaName,
              mediaType: item.mediaType,
              videoUrl: isVideo ? (mediaUrl || undefined) : undefined,
              audioName: item.mediaName,
              isCustomAudio: !isVideo,
              canSnooze: false,
            });

            if (!isVideo && !audioSettings.soundMuted && mediaUrl) {
              audioService.playCustomAudio(mediaUrl, (item.volume ?? 0.9) * audioSettings.masterVolume);
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 3000);
    return () => clearInterval(interval);
  }, [prayerSettings, audioSettings, prayerCalc]);

  // Request Windows Desktop Notification permission
  const handleRequestNotification = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      notificationService.showNotification('🎉 تم تفعيل إشعارات ويندوز بنجاح', {
        body: 'ستصلك كافة تنبيهات العمل ومواقيت الأذان فور حلولها.',
      });
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
    if (task.customAudioId) {
      const url = await audioStorageService.getAudioObjectUrl(task.customAudioId);
      if (url) {
        audioService.playCustomAudio(url, audioSettings.masterVolume);
        return;
      }
    }

    audioService.playChime(task.priority === 'urgent' ? 'urgent' : 'task', audioSettings.masterVolume);
    setTimeout(() => {
      const msg = task.voiceMessage || `تذكير بمهمة: ${task.title}. يرجى المتابعة الآن.`;
      audioService.speakAlert(msg, {
        volume: audioSettings.masterVolume,
        rate: audioSettings.ttsRate,
        pitch: audioSettings.ttsPitch,
        voiceURI: audioSettings.ttsVoiceURI,
      });
    }, 500);
  };

  // Stop all audio
  const handleStopAudio = () => {
    audioService.stopAll();
  };

  // Task Actions
  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const newTask = taskService.addTask(taskData);
    const all = taskService.getTasks();
    setTasks(all);
    audioService.playChime('click', 0.5);
    if (cloudSyncService.isAvailable()) {
      cloudSyncService.syncTask(newTask);
    }
    syncCurrentStateToCloud(all);
    return newTask;
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    const updated = taskService.updateTask(taskId, updates);
    setTasks(updated);
    const item = updated.find((t) => t.id === taskId);
    if (item && cloudSyncService.isAvailable()) {
      cloudSyncService.syncTask(item);
    }
    syncCurrentStateToCloud(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = taskService.deleteTask(taskId);
    setTasks(updated);
    if (cloudSyncService.isAvailable()) {
      cloudSyncService.deleteTask(taskId);
    }
    syncCurrentStateToCloud(updated);
  };

  const handleToggleTask = (taskId: string) => {
    const { tasks: updated, completed } = taskService.toggleTaskStatus(taskId);
    setTasks(updated);
    const item = updated.find((t) => t.id === taskId);
    if (item && cloudSyncService.isAvailable()) {
      cloudSyncService.syncTask(item);
    }
    syncCurrentStateToCloud(updated);
    if (completed) {
      audioService.playChime('success', audioSettings.masterVolume);
    }
  };

  const handleSnoozeTask = (taskId: string, minutes: number) => {
    const updated = taskService.snoozeTask(taskId, minutes);
    setTasks(updated);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo']">
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 md:pb-16">
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

        {activeTab === 'pomodoro' && (
          <PomodoroView
            nextPrayerArabicName={prayerCalc.nextPrayer.arabicName}
            nextPrayerTimeFormatted={prayerCalc.nextPrayer.formatted12h}
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>نظام التذكير الصوتي الذكي • مهام العمل ومواقيت الصلاة</span>
          </div>
          <div className="flex items-center gap-3">
            <span>تزامن فلكي دقيق</span>
            <span>•</span>
            <span>نطق صوتي ذكي باللغة العربية</span>
            <span>•</span>
            <span>إشعارات سطح المكتب</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
