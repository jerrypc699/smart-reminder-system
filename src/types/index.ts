export type TaskCategory = 'clinic' | 'work' | 'meeting' | 'dev' | 'admin' | 'personal' | 'health';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'snoozed';
export type TaskRepeat = 'none' | 'daily' | 'workdays' | 'weekly';

export type TaskAudioMode = 'tts' | 'custom' | 'record' | 'none';
export type MediaType = 'audio' | 'video';

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  cloudUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  reminderMinutesBefore: number; // 0, 5, 10, 15, 30
  voiceMessage?: string;
  audioMode?: TaskAudioMode;
  customAudioId?: string;
  customAudioName?: string;
  customMediaType?: MediaType;
  attachments?: TaskAttachment[];
  status: TaskStatus;
  repeat: TaskRepeat;
  createdAt: string;
  completedAt?: string;
  snoozeUntil?: string; // ISO string
  lastRemindedAt?: string;
  cloudUrl?: string;
}

export interface StoredMediaMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  mediaType: MediaType;
  duration?: number;
  thumbnail?: string;
  createdAt: string;
  category?: 'task' | 'azan' | 'scheduled' | 'custom';
  cloudUrl?: string;
}

// Backward compatibility alias
export type StoredAudioMeta = StoredMediaMeta;

export interface ScheduledMedia {
  id: string;
  title: string;
  description?: string;
  mediaId: string;
  mediaName: string;
  mediaType: MediaType;
  duration?: number;
  thumbnail?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  repeat: TaskRepeat;
  volume: number; // 0 to 1
  enabled: boolean;
  createdAt: string;
  lastPlayedAt?: string;
  cloudUrl?: string;
  // Aliases for compatibility
  audioId?: string;
  audioName?: string;
  audioDuration?: number;
}

// Backward compatibility alias
export type ScheduledAudio = ScheduledMedia;

export type PrayerId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerInfo {
  id: PrayerId;
  arabicName: string;
  time: Date;
  timeString: string;
  formatted12h: string;
  isNext: boolean;
  isPassed: boolean;
}

export interface CityPreset {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  method: string;
}

export interface PrayerSettings {
  cityName: string;
  countryName: string;
  latitude: number;
  longitude: number;
  method: 'Egyptian' | 'UmmAlQura' | 'MuslimWorldLeague' | 'Dubai' | 'Qatar' | 'Kuwait' | 'NorthAmerica' | 'Karachi';
  madhab: 'shafi' | 'hanafi';
  preAzanReminderMinutes: number; // 5, 10, 15
  enablePreAzanAlert: boolean;
  enableAzanAudio: boolean;
  azanReciter: 'takbeerat' | 'mishary' | 'abdulbasit' | 'makkah' | 'custom';
  customAzanAudioId?: string;
  customAzanName?: string;
  enableDuaaAfterAzan: boolean;
}

export interface AudioSettings {
  masterVolume: number; // 0 to 1
  enableTts: boolean;
  ttsVoiceURI: string;
  ttsRate: number; // 0.7 to 1.3
  ttsPitch: number;
  chimeSound: 'modern' | 'bell' | 'marimba' | 'soft';
  enableSoundEffects: boolean;
  soundMuted: boolean;
}

export interface ActiveAlert {
  id: string;
  type: 'task' | 'azan' | 'pre_azan' | 'scheduled_audio' | 'scheduled_media';
  title: string;
  message: string;
  priority?: TaskPriority;
  timestamp: string;
  taskId?: string;
  prayerId?: PrayerId;
  scheduledAudioId?: string;
  scheduledMediaId?: string;
  audioName?: string;
  mediaName?: string;
  mediaType?: MediaType;
  videoUrl?: string;
  audioUrl?: string;
  isCustomAudio?: boolean;
  canSnooze?: boolean;
}

export type AthkarCategory = 
  | 'all'
  | 'morning' 
  | 'evening' 
  | 'prayer' 
  | 'sleep' 
  | 'wake' 
  | 'ruqyah' 
  | 'work' 
  | 'distress' 
  | 'quranic' 
  | 'custom'
  | 'favorites';

export interface AthkarItem {
  id: string;
  category: 'morning' | 'evening' | 'prayer' | 'sleep' | 'wake' | 'ruqyah' | 'work' | 'distress' | 'quranic' | 'custom';
  title?: string;
  text: string;
  count: number;
  reward?: string;
  reference?: string;
  audioUrl?: string;
  mood?: 'anxiety' | 'distress' | 'gratitude' | 'fatigue' | 'guidance';
  isCustom?: boolean;
}
