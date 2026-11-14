import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Music, 
  FileAudio, 
  UploadCloud, 
  Mic, 
  Play, 
  Square, 
  Trash2, 
  Clock, 
  Volume2, 
  Plus, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  X, 
  Repeat, 
  Info,
  Sliders,
  Film,
  Video,
  Eye,
  RefreshCw,
  Cloud,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ScheduledMedia, StoredMediaMeta, TaskRepeat, MediaType } from '../types';
import { audioStorageService } from '../services/audioStorageService';
import { vercelCloudSync } from '../services/vercelCloudSync';
import { NativeAlarmService, getLocalDateStr } from '../services/nativeAlarmService';
import type { AutoLaunchPermissionsStatus } from '../services/videoAlarmPlugin';

interface AudioSchedulerViewProps {
  scheduledAudios: ScheduledMedia[];
  onRefreshScheduled: () => void;
  onTestScheduledAudio: (item: ScheduledMedia) => void;
  masterVolume: number;
}

export const AudioSchedulerView: React.FC<AudioSchedulerViewProps> = ({
  scheduledAudios,
  onRefreshScheduled,
  masterVolume,
}) => {
  const [mediaLibrary, setMediaLibrary] = useState<StoredMediaMeta[]>([]);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'library'>('scheduled');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [autoLaunchPerms, setAutoLaunchPerms] = useState<AutoLaunchPermissionsStatus | null>(null);
  const isAndroidNative = NativeAlarmService.isAndroidNative();

  // Form states for scheduling
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => getLocalDateStr(new Date(Date.now() + 15 * 60 * 1000)));
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [repeat, setRepeat] = useState<TaskRepeat>('none');
  const [volume, setVolume] = useState<number>(0.9);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Preview playback state for audio
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);

  // Video Preview Modal state
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  // Load media files on mount
  const loadLibrary = async () => {
    try {
      const list = await audioStorageService.getAllMediaMeta();
      setMediaLibrary(list);
      if (list.length > 0 && !selectedMediaId) {
        setSelectedMediaId(list[0].id);
      }
    } catch (e) {
      console.warn('Failed to load media library:', e);
    }
  };

  const refreshAutoLaunchPerms = async () => {
    if (!isAndroidNative) return;
    const perms = await NativeAlarmService.getAutoLaunchPermissions();
    if (perms) setAutoLaunchPerms(perms);
  };

  useEffect(() => {
    loadLibrary();
    refreshAutoLaunchPerms();

    const unsubLibrary = audioStorageService.onLibraryChange(() => {
      loadLibrary();
    });

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        refreshAutoLaunchPerms();
        loadLibrary();
      }
    };
    window.addEventListener('focus', refreshAutoLaunchPerms);
    document.addEventListener('visibilitychange', handleResume);
    return () => {
      unsubLibrary();
      window.removeEventListener('focus', refreshAutoLaunchPerms);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, []);

  // Cleanup active audio preview on unmount
  useEffect(() => {
    return () => {
      if (activeAudioElRef.current) {
        activeAudioElRef.current.pause();
        activeAudioElRef.current = null;
      }
    };
  }, []);

  // File Upload Handler (supports Audio & Video)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forcedType?: MediaType) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideo = file.type.startsWith('video') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || forcedType === 'video';
      const isAudio = file.type.startsWith('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || forcedType === 'audio';

      if (!isVideo && !isAudio) {
        throw new Error('يرجى اختيار ملف صالح (فيديو: MP4, WebM, MOV أو صوت: MP3, WAV, M4A).');
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(`جاري فحص ${isVideo ? 'مقطع الفيديو' : 'الملف الصوتي'} والرفع إلى السحابة...`);

      // 1. Upload to Cloud directly (supports large phone videos via @vercel/blob/client)
      let cloudUrl: string | undefined = undefined;
      try {
        cloudUrl = await vercelCloudSync.uploadMediaFile(file, file.name, (pct) => {
          setUploadSuccess(`جاري رفع ${isVideo ? 'الفيديو' : 'الصوت'} للسحابة: ${pct}%`);
        });
      } catch (uploadErr: any) {
        console.warn('Initial cloud upload warning, will retry in background:', uploadErr);
      }

      const meta = await audioStorageService.saveMediaFile(
        file,
        file.name.replace(/\.[^/.]+$/, ''),
        'scheduled',
        cloudUrl
      );

      await loadLibrary();
      setActiveTab('library');
      setSelectedMediaId(meta.id);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      setUploadSuccess(`تم حفظ ${meta.mediaType === 'video' ? 'مقطع الفيديو' : 'الملف الصوتي'} "${meta.name}" بنجاح! ستجده معروضاً في المكتبة أدناه وجاهزاً للجدولة.`);
      
      // Auto open schedule modal
      setIsScheduleModalOpen(true);
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء رفع الملف.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Mic Recording Handlers
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('تعذر الوصول إلى الميكروفون: ' + (err.message || 'يرجى السماح بصلاحيات الميكروفون'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) return;
    const finalName = recordingName.trim() || `تسجيل صوتي ${new Date().toLocaleTimeString('ar-EG')}`;
    try {
      const meta = await audioStorageService.saveMediaFile(recordedBlob, finalName, 'task');
      await loadLibrary();
      setSelectedMediaId(meta.id);
      setTitle(finalName);
      setIsRecordingModalOpen(false);
      setRecordedBlob(null);
      setRecordingName('');
      setIsScheduleModalOpen(true);
    } catch (err) {
      alert('فشل حفظ التسجيل: ' + err);
    }
  };

  // Audio Playback / Preview
  const handleToggleAudioPlay = async (audioId: string, cloudUrl?: string) => {
    if (playingAudioId === audioId) {
      if (activeAudioElRef.current) {
        activeAudioElRef.current.pause();
        activeAudioElRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioElRef.current) {
      activeAudioElRef.current.pause();
      activeAudioElRef.current = null;
    }

    const url = await audioStorageService.getMediaObjectUrl(audioId, cloudUrl);
    if (!url) {
      alert('لم يتم العثور على الملف.');
      return;
    }

    const audio = new Audio(url);
    audio.volume = masterVolume;
    activeAudioElRef.current = audio;
    setPlayingAudioId(audioId);

    audio.onended = () => {
      setPlayingAudioId(null);
      activeAudioElRef.current = null;
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      activeAudioElRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
    });
  };

  // Video Preview Handler
  const handleOpenVideoPreview = async (mediaId: string, videoTitle: string, cloudUrl?: string) => {
    if (activeAudioElRef.current) {
      activeAudioElRef.current.pause();
      setPlayingAudioId(null);
    }
    const url = await audioStorageService.getMediaObjectUrl(mediaId, cloudUrl);
    if (!url) {
      alert('لم يكتمل رفع هذا الفيديو إلى السحابة بعد من الجهاز الأصلي. يرجى الضغط على زر «مزامنة السحابة الآن» في الهاتف أو الجهاز الذي قمت برفع الفيديو منه.');
      return;
    }
    setPreviewVideo({ url, title: videoTitle });
  };

  // Submit Schedule
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMediaId) return;

    const mediaMeta = mediaLibrary.find((a) => a.id === selectedMediaId);
    const mediaName = mediaMeta ? mediaMeta.name : 'ملف وسائط';
    const mediaType = mediaMeta ? mediaMeta.mediaType : 'audio';

    audioStorageService.addScheduledMedia({
      title: title.trim(),
      description: description.trim() || undefined,
      mediaId: selectedMediaId,
      mediaName,
      mediaType,
      duration: mediaMeta?.duration,
      thumbnail: mediaMeta?.thumbnail,
      cloudUrl: mediaMeta?.cloudUrl,
      scheduledDate,
      scheduledTime,
      repeat,
      volume,
      enabled: true,
      audioId: selectedMediaId,
      audioName: mediaName,
      audioDuration: mediaMeta?.duration,
    });

    NativeAlarmService.scheduleMediaItems(audioStorageService.getScheduledAudios()).catch(console.warn);
    onRefreshScheduled();
    setActiveTab('scheduled');
    setIsScheduleModalOpen(false);
    setTitle('');
    setDescription('');
    setUploadSuccess(
      `تمت جدولة تشغيل "${title.trim()}" بنجاح! عند حلول الموعد سيفتح التطبيق تلقائياً ويبدأ التشغيل مباشرة.`
    );
  };

  // Toggle enabled
  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    audioStorageService.updateScheduledMedia(id, { enabled: !currentEnabled });
    NativeAlarmService.scheduleMediaItems(audioStorageService.getScheduledAudios()).catch(console.warn);
    onRefreshScheduled();
  };

  // Delete scheduled item
  const handleDeleteScheduled = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التنبيه المجدول؟')) {
      audioStorageService.deleteScheduledMedia(id);
      NativeAlarmService.scheduleMediaItems(audioStorageService.getScheduledAudios()).catch(console.warn);
      onRefreshScheduled();
      await loadLibrary();
    }
  };

  // Delete from library
  const handleDeleteLibraryItem = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الملف نهائياً من الذاكرة؟')) {
      await audioStorageService.deleteMediaFile(id);
      onRefreshScheduled();
      await loadLibrary();
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds?: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 بايت';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  // Calculate relative time description for scheduled media
  const getRelativeScheduleText = (dateStr: string, timeStr: string) => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const target = new Date(`${dateStr}T00:00:00`);
      target.setHours(h, m, 0, 0);

      const now = new Date();
      const diffMs = target.getTime() - now.getTime();

      if (diffMs < 0) {
        return 'الموعد انقضى (في انتظار التكرار التالي أو التعديل)';
      }

      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 60) {
        return `يبدأ بعد ${diffMins} دقيقة`;
      }
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      if (diffHours < 24) {
        return `يبدأ بعد ${diffHours} ساعة و ${remMins} دقيقة`;
      }
      const diffDays = Math.floor(diffHours / 24);
      return `متبقي ${diffDays} يوم`;
    } catch {
      return '';
    }
  };

  // Filtered Library Items
  const filteredLibrary = mediaLibrary.filter((item) => {
    if (libraryFilter === 'video') return item.mediaType === 'video';
    if (libraryFilter === 'audio') return item.mediaType === 'audio';
    return true;
  });

  const videoCount = mediaLibrary.filter((m) => m.mediaType === 'video').length;
  const audioCount = mediaLibrary.filter((m) => m.mediaType === 'audio').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner - Symmetrical Luxury Media Studio */}
      <div className="relative rounded-3xl lux-card-gold p-5 sm:p-7 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/25 text-[#E7C66C] text-[11px] font-bold mb-2.5">
              <Film className="w-3.5 h-3.5" strokeWidth={1.85} />
              <span>استوديو الوسائط والتشغيل المجدول</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              مكتبة الفيديو والصوت التلقائية
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-xl">
              ارفع الفيديوهات والتسجيلات الصوتية لتفتح وتشتغل تلقائياً كمنبه صريح حتى لو كان الهاتف صامتاً أو مقفلاً.
            </p>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          id="video-upload-input"
          type="file"
          accept="video/*,.mp4,.webm,.mov,.mkv,.avi"
          onChange={(e) => handleFileUpload(e, 'video')}
          className="hidden"
        />
        <input
          id="audio-upload-input"
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac"
          onChange={(e) => handleFileUpload(e, 'audio')}
          className="hidden"
        />

        {/* Uniform 2x2 Action Matrix (Refined Obsidian Squircle Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <label
            htmlFor="video-upload-input"
            className="lux-card-interactive group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer active:scale-[0.985]"
          >
            <div className="icon-squircle-gold w-10 h-10 sm:w-11 sm:h-11 shrink-0 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-xs sm:text-sm font-bold text-white truncate">رفع فيديو (MP4)</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">عروض مرئية مجدولة</div>
            </div>
          </label>

          <label
            htmlFor="audio-upload-input"
            className="lux-card-interactive group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer active:scale-[0.985]"
          >
            <div className="icon-squircle w-10 h-10 sm:w-11 sm:h-11 text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-xs sm:text-sm font-bold text-white truncate">رفع صوت (MP3)</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">أذكار وأصوات محفوظة</div>
            </div>
          </label>

          <button
            type="button"
            onClick={() => {
              setRecordedBlob(null);
              setIsRecording(false);
              setRecordingSeconds(0);
              setIsRecordingModalOpen(true);
            }}
            className="lux-card-interactive group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer active:scale-[0.985]"
          >
            <div className="icon-squircle-emerald w-10 h-10 sm:w-11 sm:h-11 shrink-0 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-xs sm:text-sm font-bold text-white truncate">تسجيل صوتي</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">تسجيل فوري بالميكروفون</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (mediaLibrary.length === 0) {
                alert('يرجى رفع ملف فيديو أو صوت أولاً لتتمكن من جدولته.');
                return;
              }
              setIsScheduleModalOpen(true);
            }}
            className="btn-lux-primary group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer text-right"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="text-xs sm:text-sm font-extrabold text-white truncate">جدولة تشغيل</div>
              <div className="text-[10px] sm:text-[11px] text-emerald-100/85 truncate">تحديد الموعد والتكرار</div>
            </div>
          </button>
        </div>

        {/* Cloud Command Bar */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={async () => {
              setIsSyncingCloud(true);
              setUploadSuccess('جاري فحص ورفع الوسائط والمزامنة مع السحابة...');
              try {
                const res = await vercelCloudSync.syncAllLocalToCloud((msg) => {
                  setUploadSuccess(msg);
                });
                if (res.success) {
                  await loadLibrary();
                  onRefreshScheduled();
                  setUploadSuccess(`تمت المزامنة السحابية بنجاح — متطابق الآن: ${res.scheduledCount} وسائط مجدولة و ${res.tasksCount} مهمة.`);
                } else {
                  setUploadError(res.error || 'تعذرت المزامنة السحابية.');
                }
              } catch (err: any) {
                setUploadError(err.message || 'حدث خطأ أثناء المزامنة السحابية.');
              } finally {
                setIsSyncingCloud(false);
              }
            }}
            disabled={isSyncingCloud}
            className="lux-well w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl hover:border-emerald-500/35 transition-all cursor-pointer disabled:opacity-50 group"
          >
            <div className="flex items-center gap-3">
              <div className="icon-squircle-emerald w-9 h-9 shrink-0">
                <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{isSyncingCloud ? 'جاري المزامنة السحابية...' : 'مزامنة السحابة الآن'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.08] font-semibold">
                    سحابي ومحلي
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">تطابق فوري للفيديوهات والملفات الصوتية بين الكمبيوتر والهاتف</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold bg-emerald-500/12 px-3 py-1.5 rounded-xl border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>جاهز للمزامنة</span>
            </div>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {uploadSuccess && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 shadow-lg shadow-emerald-950/20 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium leading-relaxed">{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300 shadow-lg shadow-rose-950/20 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium leading-relaxed">{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-500/20 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Stat Cards - 4-Column Refined Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="lux-card-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">التنبيهات المجدولة</span>
            <div className="icon-squircle-emerald w-8 h-8">
              <Clock className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums font-mono">
              {scheduledAudios.length}
            </p>
            <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {scheduledAudios.filter((s) => s.enabled).length} مفعّل تلقائياً
            </span>
          </div>
        </div>

        <div className="lux-card-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">مقاطع الفيديو</span>
            <div className="icon-squircle-gold w-8 h-8">
              <Video className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums font-mono">
              {videoCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7C66C]" />
              جاهز للعرض التلقائي
            </span>
          </div>
        </div>

        <div className="lux-card-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الملفات الصوتية</span>
            <div className="icon-squircle w-8 h-8 text-slate-300">
              <FileAudio className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums font-mono">
              {audioCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              ملفات صوت وأذكار مسجلة
            </span>
          </div>
        </div>

        <div className="lux-card-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[112px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">المساحة المستخدمة</span>
            <div className="icon-squircle w-8 h-8 text-slate-300">
              <Sliders className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums font-mono" dir="ltr">
              {formatSize(mediaLibrary.reduce((acc, cur) => acc + cur.size, 0))}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              محفوظ محلياً وسحابياً
            </span>
          </div>
        </div>
      </div>

      {/* Android Auto-Launch Readiness Card (Native Android Only) */}
      {isAndroidNative && autoLaunchPerms && (
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl transition-all ${
          autoLaunchPerms.overlayGranted && autoLaunchPerms.fullScreenGranted && autoLaunchPerms.exactAlarmGranted
            ? 'bg-emerald-950/25 border-emerald-500/30'
            : 'bg-gradient-to-br from-amber-950/35 via-slate-900 to-purple-950/25 border-amber-500/40'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                autoLaunchPerms.overlayGranted && autoLaunchPerms.fullScreenGranted && autoLaunchPerms.exactAlarmGranted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2 flex-wrap">
                  <span>تفعيل الفتح التلقائي للتطبيق وتشغيل الفيديو بالموعد</span>
                  {autoLaunchPerms.overlayGranted && autoLaunchPerms.fullScreenGranted && autoLaunchPerms.exactAlarmGranted && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      ✓ جاهز بالكامل
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {autoLaunchPerms.overlayGranted && autoLaunchPerms.fullScreenGranted && autoLaunchPerms.exactAlarmGranted
                    ? 'نظام الفتح التلقائي مفعل! سيفتح التطبيق تلقائياً على الشاشة ويشغّل الفيديو بصوت واضح في موعده حتى لو كان مغلقاً أو الشاشة مقفلة.'
                    : 'لفتح التطبيق تلقائياً فوق شاشة الهاتف وتشغيل الفيديو فور حلول وقته حتى لو كان مغلقاً، يرجى تفعيل الأذونات المطلوبة بضغطة واحدة:'}
                </p>
              </div>
            </div>
          </div>

          {(!autoLaunchPerms.overlayGranted || !autoLaunchPerms.fullScreenGranted || !autoLaunchPerms.exactAlarmGranted || !autoLaunchPerms.batteryIgnored) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-slate-800/80">
              {!autoLaunchPerms.overlayGranted && (
                <button
                  type="button"
                  onClick={() => NativeAlarmService.requestOverlayPermission()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>1. الظهور فوق التطبيقات الأخرى</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black">تفعيل الآن</span>
                </button>
              )}

              {!autoLaunchPerms.fullScreenGranted && (
                <button
                  type="button"
                  onClick={() => NativeAlarmService.requestFullScreenPermission()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-purple-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>2. منبه ملء الشاشة التلقائي</span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-400 text-slate-950 text-[10px] font-black">تفعيل الآن</span>
                </button>
              )}

              {!autoLaunchPerms.exactAlarmGranted && (
                <button
                  type="button"
                  onClick={() => NativeAlarmService.requestExactAlarmPermission()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>3. إذن المنبهات الدقيقة</span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-400 text-slate-950 text-[10px] font-black">تفعيل الآن</span>
                </button>
              )}

              {!autoLaunchPerms.batteryIgnored && (
                <button
                  type="button"
                  onClick={() => NativeAlarmService.requestBatteryOptimizationExemption()}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>عدم إغلاق التطبيق بالبطارية</span>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-400 text-slate-950 text-[10px] font-black">سماح</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs Switcher: Symmetrical Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-3">
        <div className="lux-well flex items-center p-1.5 rounded-2xl gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'scheduled'
                ? 'btn-lux-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>جدول التشغيل والمنبه</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
              activeTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-400'
            }`}>
              {scheduledAudios.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'library'
                ? 'btn-lux-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>مكتبة الملفات والوسائط</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
              activeTab === 'library' ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-400'
            }`}>
              {mediaLibrary.length}
            </span>
          </button>
        </div>

        {/* Filter within library tab */}
        {activeTab === 'library' && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 self-end sm:self-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'video', label: `فيديو (${videoCount})` },
              { id: 'audio', label: `صوت (${audioCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLibraryFilter(f.id as any)}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  libraryFilter === f.id
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: Scheduled Media List */}
      {activeTab === 'scheduled' && (
        <div>
          {scheduledAudios.length === 0 ? (
            mediaLibrary.length > 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-purple-500/30 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 text-purple-400">
                  <Film className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  لديك {mediaLibrary.length} ملف وسائط محفوظ في مكتبتك!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                  الملفات المرفوعة محفوظة بنجاح في مكتبتك. لكي تعمل في موعد محدد كمنبه رسمي يوقظ الهاتف، اضغط على «جدولة الآن» أو استعرض الفيديوهات في تبويب المكتبة.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaLibrary.length > 0 && !selectedMediaId) {
                        setSelectedMediaId(mediaLibrary[0].id);
                      }
                      setIsScheduleModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    ⏰ جدولة تشغيل كمنبه الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    🎬 استعراض الفيديوهات في المكتبة ({videoCount})
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">لا توجد ملفات فيديو أو صوت مجدولة حالياً</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  ارفع مقطع فيديو أو ملف صوتي وحدد وقتاً ليعمل تلقائياً كشاشة عرض أو تنبيه أو إذاعة
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="video-upload-input"
                    className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    رفع مقطع فيديو الآن
                  </label>
                  <label
                    htmlFor="audio-upload-input"
                    className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    رفع ملف صوتي
                  </label>
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledAudios.map((item) => {
                const isVideo = item.mediaType === 'video';
                const isPlayingAudio = playingAudioId === item.mediaId;
                const relativeText = getRelativeScheduleText(item.scheduledDate, item.scheduledTime);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-3xl bg-slate-900 border transition-all shadow-xl relative overflow-hidden flex flex-col justify-between ${
                      item.enabled
                        ? isVideo 
                          ? 'border-slate-800 hover:border-purple-500/50' 
                          : 'border-slate-800 hover:border-cyan-500/50'
                        : 'border-slate-800/50 opacity-60'
                    }`}
                  >
                    {/* Active Accent Top Border */}
                    {item.enabled && (
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                        isVideo ? 'from-purple-500 to-indigo-500' : 'from-cyan-500 to-blue-500'
                      }`} />
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">
                              {item.title}
                            </h4>
                            {/* Type badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVideo 
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' 
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {isVideo ? <Video className="w-2.5 h-2.5" /> : <Music className="w-2.5 h-2.5" />}
                              {isVideo ? 'فيديو' : 'صوت'}
                            </span>

                            {/* Cloud Status Badge */}
                            {item.cloudUrl ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                                سحابي متزامن
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                محلي فقط
                              </span>
                            )}

                            {item.repeat !== 'none' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                                <Repeat className="w-2.5 h-2.5" />
                                {item.repeat === 'daily'
                                  ? 'يومياً'
                                  : item.repeat === 'workdays'
                                  ? 'أيام العمل'
                                  : 'أسبوعياً'}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Enable / Disable Toggle Switch */}
                        <button
                          onClick={() => handleToggleEnabled(item.id, item.enabled)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            item.enabled ? (isVideo ? 'bg-purple-600' : 'bg-cyan-600') : 'bg-slate-700'
                          }`}
                          title={item.enabled ? 'تعطيل مؤقتاً' : 'تفعيل'}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              item.enabled ? 'translate-x-0' : '-translate-x-5'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Video Thumbnail or Audio Bar */}
                      {isVideo ? (
                        <div className="mb-4 relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center group">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.mediaName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-slate-600 flex flex-col items-center gap-1">
                              <Film className="w-8 h-8" />
                              <span className="text-[10px]">مقطع فيديو</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleOpenVideoPreview(item.mediaId, item.title, item.cloudUrl)}
                            className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                              <Play className="w-4 h-4 fill-white translate-x-0.5" />
                            </div>
                          </button>

                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 text-[10px] text-white font-mono">
                            {formatTime(item.duration)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-4 text-xs">
                          <div className="flex items-center gap-2 text-slate-300">
                            <FileAudio className="w-4 h-4 text-cyan-400" />
                            <span className="font-medium truncate max-w-[160px] sm:max-w-[200px]">
                              {item.mediaName}
                            </span>
                            {item.duration ? (
                              <span className="text-[11px] text-slate-500">
                                ({formatTime(item.duration)})
                              </span>
                            ) : null}
                          </div>

                          <button
                            onClick={() => handleToggleAudioPlay(item.mediaId, item.cloudUrl)}
                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                              isPlayingAudio
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-700 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400'
                            }`}
                          >
                            {isPlayingAudio ? (
                              <>
                                <Square className="w-3.5 h-3.5" />
                                <span className="text-[11px]">إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span className="text-[11px]">معاينة</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Schedule Timing & Actions */}
                    <div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`flex items-center gap-1 font-mono px-2.5 py-1 rounded-xl border ${
                            isVideo
                              ? 'text-purple-300 bg-purple-950/40 border-purple-800/40'
                              : 'text-cyan-300 bg-cyan-950/40 border-cyan-800/40'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.scheduledTime}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            {item.scheduledDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isAndroidNative && (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await NativeAlarmService.scheduleTestAutoLaunchAlarm(item, 10);
                                if (ok) {
                                  setUploadSuccess(
                                    `⚡ تم ضبط تجربة الفتح التلقائي بعد 10 ثوانٍ لـ "${item.title}"! أغلق التطبيق أو اقفل الشاشة الآن وسيُفتح تلقائياً.`
                                  );
                                } else {
                                  setUploadError('تعذر ضبط منبه التجربة. تأكد من صلاحية المنبهات الدقيقة.');
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="اختبار الفتح التلقائي للتطبيق وتشغيل الفيديو بعد 10 ثواني"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              <span>تجربة 10ث</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteScheduled(item.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف هذا التنبيه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Relative countdown */}
                      {relativeText && item.enabled && (
                        <p className={`text-[11px] font-medium mt-2 flex items-center gap-1 ${
                          isVideo ? 'text-purple-400' : 'text-emerald-400'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {relativeText}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Media Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {filteredLibrary.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800">
              <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">المكتبة فارغة</h3>
              <p className="text-xs text-slate-400 mb-4">
                قم برفع أول مقطع فيديو أو ملف صوتي للبدء
              </p>
              <div className="flex items-center justify-center gap-3">
                <label
                  htmlFor="video-upload-input"
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  رفع مقطع فيديو
                </label>
                <label
                  htmlFor="audio-upload-input"
                  className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  رفع ملف صوتي
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLibrary.map((item) => {
                const isVideo = item.mediaType === 'video';
                const isPlaying = playingAudioId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Video Thumbnail or Audio Header */}
                      {isVideo ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video mb-3 flex items-center justify-center group">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-8 h-8 text-slate-600" />
                          )}

                          <button
                            onClick={() => handleOpenVideoPreview(item.id, item.name, item.cloudUrl)}
                            className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-4 h-4 fill-white translate-x-0.5" />
                            </div>
                          </button>

                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 text-[10px] text-white font-mono">
                            {formatTime(item.duration)}
                          </div>

                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-purple-600/90 text-[10px] text-white font-bold flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            <span>فيديو</span>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {!isVideo && (
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                              <Music className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <h5 className="text-sm font-bold text-white truncate max-w-[180px]">
                              {item.name}
                            </h5>
                            <span className="text-[10px] text-slate-500 block">
                              {formatSize(item.size)} {item.duration ? `• ${formatTime(item.duration)}` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteLibraryItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      {isVideo ? (
                        <button
                          onClick={() => handleOpenVideoPreview(item.id, item.name, item.cloudUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهدة</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleAudioPlay(item.id, item.cloudUrl)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isPlaying
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedMediaId(item.id);
                          setTitle(item.name);
                          setIsScheduleModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>جدولة الآن</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                جدولة تشغيل ملف وسائط تلقائياً
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {/* Select Media File */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملف الفيديو أو الصوت المراد تشغيله *
                </label>
                <select
                  value={selectedMediaId}
                  onChange={(e) => {
                    setSelectedMediaId(e.target.value);
                    const selected = mediaLibrary.find((a) => a.id === e.target.value);
                    if (selected && !title) {
                      setTitle(selected.name);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">اختر ملفاً من المكتبة...</option>
                  {mediaLibrary.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.mediaType === 'video' ? '🎬 [فيديو]' : '🎵 [صوت]'} {item.name} ({formatTime(item.duration)} - {formatSize(item.size)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان العرض أو التنبيه *
                </label>
                <input
                  type="text"
                  placeholder="مثال: عرض مقطع تدريبي، إذاعة سورة، تنبيه موعد..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظات أو وصف إضافي (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="وصف مختصر للرسالة أو العرض..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    تاريخ التشغيل
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    وقت التشغيل المحدد
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Repeat Mode & Volume */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    التكرار التلقائي
                  </label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as TaskRepeat)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="none">مرة واحدة فقط</option>
                    <option value="daily">يومياً في نفس الموعد</option>
                    <option value="workdays">أيام العمل (الأحد - الخميس)</option>
                    <option value="weekly">أسبوعياً</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    مستوى الصوت: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  سيعمل الفيديو أو الصوت تلقائياً مع نافذة عرض تفاعلية فور حلول الوقت المحدد حتى لو كان المتصفح مصغراً.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  تأكيد وحفظ الجدولة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORDING MODAL */}
      {isRecordingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-center">
            <button
              onClick={() => {
                stopRecording();
                setIsRecordingModalOpen(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Mic className="w-5 h-5 text-emerald-400" />
              تسجيل صوتي مباشر
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              سجل بصوتك أي تذكير أو ملاحظة أو دعاء ليتم تشغيله تلقائياً في موعده
            </p>

            <div className="my-6">
              <div
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-400 ring-8 ring-rose-500/20 animate-pulse'
                    : recordedBlob
                    ? 'bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Mic className="w-10 h-10" />
              </div>

              <div className="mt-4 font-mono text-2xl font-bold text-white">
                {formatTime(recordingSeconds)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {isRecording
                  ? 'جاري التسجيل الآن... تحدث بوضوح'
                  : recordedBlob
                  ? 'تم اكتمال التسجيل، يمكنك الاستماع أو حفظه'
                  : 'اضغط على زر البدء لبدء التسجيل'}
              </span>
            </div>

            {!isRecording && !recordedBlob && (
              <button
                onClick={startRecording}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                بدء التسجيل الآن
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                إيقاف التسجيل
              </button>
            )}

            {recordedBlob && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="اسم التسجيل (مثال: تذكير موعد الاجتماع)"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(recordedBlob);
                      const audio = new Audio(url);
                      audio.play();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    استماع للتسجيل
                  </button>

                  <button
                    onClick={startRecording}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs cursor-pointer"
                    title="إعادة التسجيل"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleSaveRecording}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  حفظ في المكتبة وجدولة الموعد
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" />
                معاينة مقطع الفيديو: {previewVideo.title}
              </h3>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
