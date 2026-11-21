import React, { useRef, useEffect } from 'react';
import { Play, Download, X, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatAttachmentSize } from '../services/taskAttachmentService';

export interface VideoPreviewData {
  url: string;
  title: string;
  size?: number;
  isPreAttachment?: boolean;
  onConfirmAttach?: () => void;
  confirmLoading?: boolean;
}

interface VideoPlayerModalProps {
  video: VideoPreviewData | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy might require user interaction on some web browsers
      });
    }
  }, [video]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c2e28] via-[#071c18] to-[#041210] border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Film className="w-5 h-5 text-[#F5D77F]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {video.isPreAttachment ? 'تشغيل ومعاينة الفيديو قبل الإرفاق للمهمة' : video.title}
              </h3>
              <p className="text-[11px] text-emerald-300/80 font-medium truncate">
                {video.isPreAttachment ? video.title : 'مشغّل فيديو المهمة الداخلي'}
                {video.size ? ` (${formatAttachmentSize(video.size)})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!video.isPreAttachment && video.url && (
              <a
                href={video.url}
                download={video.title}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[#F5D77F] border border-emerald-500/30 cursor-pointer transition-colors"
                title="تحميل الفيديو"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/30 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player Display */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-emerald-500/30 shadow-inner flex items-center justify-center max-h-[58vh]">
          <video
            ref={videoRef}
            src={video.url}
            controls
            autoPlay
            playsInline
            className="w-full max-h-[55vh] object-contain rounded-2xl"
          >
            متصفحك لا يدعم تشغيل الفيديو مباشرة.
          </video>
        </div>

        {/* Hardware Alarm Notice */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-extrabold text-[#F5D77F]">تنبيه منبه الفيديو التلقائي:</span>
            <p className="text-[11px] text-amber-200/90">
              هذا المقطع سيعمل كمنبه فيديو صريح بالصوت وشاشة كاملة فوق شاشة القفل فور حلول موعد المهمة، حتى لو كان الموبايل مقفلاً أو صامتاً.
            </p>
          </div>
        </div>

        {/* Bottom Actions for Pre-Attachment Preview */}
        {video.isPreAttachment ? (
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={onClose}
              disabled={video.confirmLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
            >
              ✕ إلغاء وعدم الإرفاق
            </button>
            <button
              type="button"
              onClick={video.onConfirmAttach}
              disabled={video.confirmLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#ECC86D] via-[#FFE59E] to-[#D4AF37] text-slate-950 border border-[#FFF2B2] shadow-lg shadow-amber-500/25 hover:brightness-105 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{video.confirmLoading ? 'جاري رفع وإرفاق الفيديو...' : '✓ تشغيل ممتاز — اعتماد وإرفاق الفيديو للمهمة'}</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              إغلاق المشغّل
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
