import React from 'react';
import { 
  Bell, 
  Compass, 
  Check, 
  Clock, 
  VolumeX, 
  Volume2, 
  RotateCcw,
  AlertCircle,
  Radio,
  FileAudio,
  Music,
  Video,
  Film
} from 'lucide-react';
import { ActiveAlert } from '../types';

interface ActiveAlertModalProps {
  alert: ActiveAlert | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onStopAudio: () => void;
  isSpeaking: boolean;
}

export const ActiveAlertModal: React.FC<ActiveAlertModalProps> = ({
  alert,
  onDismiss,
  onSnooze,
  onStopAudio,
  isSpeaking,
}) => {
  if (!alert) return null;

  const isPrayer = alert.type === 'azan' || alert.type === 'pre_azan';
  const isVideo = alert.mediaType === 'video' || !!alert.videoUrl;
  const isScheduledMedia = alert.type === 'scheduled_audio' || alert.type === 'scheduled_media' || isVideo;
  const isUrgent = alert.priority === 'urgent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className={`relative w-full ${isVideo ? 'max-w-2xl' : 'max-w-lg'} p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900 border shadow-2xl transition-all duration-300 ${
          isPrayer
            ? 'border-emerald-500/50 glow-emerald'
            : isVideo
            ? 'border-purple-500/50 shadow-purple-500/20'
            : isScheduledMedia
            ? 'border-cyan-500/50 glow-cyan'
            : isUrgent
            ? 'border-rose-500/50 shadow-rose-500/20'
            : 'border-blue-500/50 glow-blue'
        }`}
      >
        {/* Glow decoration */}
        <div 
          className={`absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-xl ring-4 ring-slate-900 ${
            isPrayer 
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400' 
              : isVideo
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-500'
              : isScheduledMedia
              ? 'bg-gradient-to-tr from-cyan-600 to-blue-500'
              : isUrgent 
              ? 'bg-gradient-to-tr from-rose-600 to-amber-500' 
              : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
          }`}
        >
          {isPrayer ? (
            <Compass className="w-12 h-12 text-white animate-spin-slow" />
          ) : isVideo ? (
            <Video className="w-12 h-12 text-white animate-pulse" />
          ) : isScheduledMedia ? (
            <Radio className="w-12 h-12 text-white animate-pulse" />
          ) : isUrgent ? (
            <AlertCircle className="w-12 h-12 text-white animate-bounce" />
          ) : (
            <Bell className="w-12 h-12 text-white animate-pulse" />
          )}
        </div>

        <div className="mt-8 text-center">
          {/* Doctor Calling Badge */}
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm">
              <span>يا دكتور عبد العزيز</span>
            </span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            {isPrayer ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                {alert.type === 'azan' ? '🕌 حان الآن وقت الأذان' : '⏳ اقتراب موعد الصلاة'}
              </span>
            ) : isVideo ? (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
                <Film className="w-3.5 h-3.5" />
                عرض مقطع فيديو مجدول تلقائياً
              </span>
            ) : isScheduledMedia ? (
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                <Music className="w-3.5 h-3.5" />
                تشغيل صوتي مجدول تلقائياً
              </span>
            ) : (
              <span className={`px-3 py-1 rounded-full border ${
                isUrgent 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                {alert.priority === 'urgent' ? '⚡ تذكير مهمة عاجلة جداً' : '💼 تذكير بمهمة عمل'}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-extrabold text-white mb-2 leading-tight">
            {alert.title}
          </h2>

          {/* Message / Description */}
          {alert.message && (
            <p className="text-slate-300 text-sm sm:text-base mb-4 leading-relaxed bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-700/60">
              {alert.message}
            </p>
          )}

          {/* Embedded Video Player if Video */}
          {alert.videoUrl && (
            <div className="mb-5 rounded-2xl overflow-hidden border border-purple-500/40 bg-black shadow-2xl relative aspect-video ring-1 ring-purple-500/20">
              <video
                src={alert.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Attached Media Info (if audio) */}
          {!isVideo && (alert.mediaName || alert.audioName) && (
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center justify-center gap-2 mb-4">
              <FileAudio className="w-4 h-4 text-cyan-400" />
              <span>الملف: <strong className="text-white">{alert.mediaName || alert.audioName}</strong></span>
            </div>
          )}

          {/* Voice & Sound Wave Indicator for non-video alerts */}
          {!isVideo && (
            <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-slate-800/40 border border-slate-700/40 mb-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 font-medium">جاري تشغيل الصوت الآن...</span>
                    <div className="flex items-center gap-0.5 ml-2">
                      <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <span>اكتمل تشغيل الصوت</span>
                  </>
                )}
              </div>

              {isSpeaking && (
                <button
                  onClick={onStopAudio}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 underline font-semibold mr-auto cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  إيقاف الصوت
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={onDismiss}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isPrayer
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                  : isVideo
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 ring-2 ring-purple-400/50'
                  : isScheduledMedia
                  ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30 ring-2 ring-cyan-400/50'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 ring-2 ring-blue-400/50'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>
                {isPrayer 
                  ? 'تقبل الله (إغلاق)' 
                  : isVideo
                  ? 'تمت المشاهدة (إغلاق)'
                  : isScheduledMedia 
                  ? 'إيقاف وإغلاق' 
                  : 'تم إنجاز المهمة أو استلامها'}
              </span>
            </button>

            {/* Snooze options if allowed */}
            {alert.canSnooze && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                  <Clock className="w-3.5 h-3.5" />
                  تأجيل:
                </span>
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => onSnooze(mins)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>{mins} دقائق</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
