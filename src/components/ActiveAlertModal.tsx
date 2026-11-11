import React, { useEffect, useRef, useState } from 'react';
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
  Film,
  Maximize2,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { ActiveAlert } from '../types';
import { whatsappService } from '../services/whatsappService';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsUnmuteTap, setNeedsUnmuteTap] = useState(false);

  useEffect(() => {
    if (!alert?.videoUrl) return;

    const timer = setTimeout(() => {
      const vid = videoRef.current;
      if (!vid) return;
      vid.muted = false;
      vid.volume = 1.0;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setNeedsUnmuteTap(false);
        }).catch((err) => {
          console.warn('Autoplay with sound blocked, falling back to muted autoplay:', err);
          vid.muted = true;
          setNeedsUnmuteTap(true);
          vid.play().catch(console.warn);
        });
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [alert?.videoUrl, alert?.id]);

  if (!alert) return null;

  const isPrayer = alert.type === 'azan' || alert.type === 'pre_azan';
  const isVideo = alert.mediaType === 'video' || !!alert.videoUrl;
  const isScheduledMedia = alert.type === 'scheduled_audio' || alert.type === 'scheduled_media' || isVideo;
  const isUrgent = alert.priority === 'urgent';

  const handleUnmuteVideo = () => {
    const vid = videoRef.current;
    if (vid) {
      vid.muted = false;
      vid.volume = 1.0;
      vid.play().catch(console.warn);
    }
    setNeedsUnmuteTap(false);
  };

  const handleFullscreen = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {});
    } else if ((vid as any).webkitEnterFullscreen) {
      (vid as any).webkitEnterFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/82 backdrop-blur-lg animate-fade-in">
      <div 
        className={`relative w-full ${isVideo ? 'max-w-2xl' : 'max-w-lg'} p-5 sm:p-8 rounded-3xl lux-modal transition-all duration-300 ${
          isPrayer
            ? 'border-emerald-500/45 glow-emerald'
            : isVideo
            ? 'border-[#D4AF37]/40 glow-amber'
            : isScheduledMedia
            ? 'border-emerald-500/35 glow-emerald'
            : isUrgent
            ? 'border-rose-500/45 shadow-rose-500/20'
            : 'border-white/[0.12]'
        }`}
      >
        {/* Subtle Signature Badge Icon */}
        <div 
          className={`absolute -top-9 sm:-top-11 left-1/2 -translate-x-1/2 w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-[#06080D] ${
            isPrayer 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
              : isVideo
              ? 'bg-gradient-to-br from-[#ECD07B] to-[#C89B2B] text-[#06080D]'
              : isScheduledMedia
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
              : isUrgent 
              ? 'bg-gradient-to-br from-rose-500 to-amber-500' 
              : 'bg-gradient-to-br from-emerald-600 to-teal-700'
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
            <div className="mb-5 rounded-2xl overflow-hidden border border-purple-500/40 bg-black shadow-2xl relative aspect-video ring-1 ring-purple-500/20 group">
              <video
                ref={videoRef}
                src={alert.videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={handleFullscreen}
                title="ملء الشاشة"
                className="absolute top-2.5 left-2.5 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer opacity-80 hover:opacity-100"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {needsUnmuteTap && (
                <button
                  type="button"
                  onClick={handleUnmuteVideo}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-purple-600/95 hover:bg-purple-500 text-white text-xs font-bold shadow-xl border border-purple-300/40 flex items-center gap-2 animate-bounce cursor-pointer z-20"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>اضغط لتشغيل الصوت</span>
                </button>
              )}
            </div>
          )}

          {/* Attached Media Info (if audio) */}
          {!isVideo && (alert.mediaName || alert.audioName) && (
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center justify-center gap-2 mb-4">
              <FileAudio className="w-4 h-4 text-cyan-400" />
              <span>الملف: <strong className="text-white">{alert.mediaName || alert.audioName}</strong></span>
            </div>
          )}

          {/* WhatsApp Auto-Send Status & Instant Send Action */}
          {alert.whatsappPhone && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/35 text-right space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {alert.whatsappAutoSentStatus === 'sent_api'
                      ? '✅ تم إرسال المهمة تلقائياً عبر واتساب'
                      : alert.whatsappAutoSentStatus === 'opened_app'
                        ? '💬 تم تجهيز المحادثة في واتساب'
                        : alert.whatsappAutoSentStatus === 'failed'
                          ? '⚠️ تعذر الإرسال الآلي — يمكنك الإرسال فوراً'
                          : '📲 موعد إرسال المهمة عبر واتساب'}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-emerald-200 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/25 shrink-0" dir="ltr">
                  {alert.whatsappRecipientName || alert.whatsappPhone}
                </span>
              </div>

              {alert.whatsappAutoSentError && alert.whatsappAutoSentStatus === 'failed' && (
                <p className="text-[11px] text-amber-300 bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                  {alert.whatsappAutoSentError}
                </p>
              )}

              {alert.whatsappMessage && (
                <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 whitespace-pre-line max-h-24 overflow-y-auto leading-relaxed">
                  {alert.whatsappMessage}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  whatsappService.openWhatsAppChat(
                    alert.whatsappPhone!,
                    alert.whatsappMessage || alert.message
                  );
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {alert.whatsappAutoSentStatus === 'sent_api'
                    ? 'إعادة إرسال / فتح المحادثة في واتساب'
                    : `إرسال الآن على واتساب إلى ${alert.whatsappRecipientName || alert.whatsappPhone}`}
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
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
