import React, { useRef, useState } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Download,
  Check,
  FileText,
  Share2,
  Sparkles
} from 'lucide-react';
import type { Task } from '../types';
import {
  buildTaskWhatsAppMessage,
  formatArabicDate,
  getArabicHonorific,
  whatsappService
} from '../services/whatsappService';

interface OfficialTaskDispatchModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSendWhatsApp?: (task: Task) => void;
}

export const OfficialTaskDispatchModal: React.FC<OfficialTaskDispatchModalProps> = ({
  task,
  isOpen,
  onClose,
  onSendWhatsApp
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = formatArabicDate(task.dueDate || todayStr);
  const recipientName = task.whatsapp?.recipientName || task.employeeName || '';
  const honorific = getArabicHonorific(recipientName);
  const taskTitle = task.title?.trim() || 'مهمة عمل رسمية';
  const taskRequired = task.description?.trim() || task.title?.trim() || 'البدء في اتخاذ الإجراءات اللازمة فوراً وموافاتنا بالتقرير';

  const messageText = buildTaskWhatsAppMessage(task);

  const displayToast = (msg: string) => {
    setShowStatusToast(msg);
    setTimeout(() => setShowStatusToast(null), 4000);
  };

  // Convert letter card to PNG image and share/send directly to WhatsApp
  const handleSendAsWhatsAppImage = async () => {
    if (!cardRef.current) return;
    setIsSharingImage(true);
    try {
      const html2canvasModule = await import('html2canvas-pro');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharingImage(false);
          return;
        }

        const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `تكليف_رسمي_${safeTitle}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // 1. Native Mobile Share Sheet (Android & iOS) -> opens WhatsApp with image attached!
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `تكليف مهمة رسمية - ${taskTitle}`,
              text: `تكليف مهمة رسمية من مكتب د/ عبد العزيز شطا\nالمهمة: ${taskTitle}\nالمطلوب: ${taskRequired}`
            });
            setIsSharingImage(false);
            displayToast('✅ تم فتح المشاركة كصورة بنجاح!');
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') {
              setIsSharingImage(false);
              return;
            }
          }
        }

        // 2. Clipboard copy fallback (Copies image directly into clipboard)
        let copiedImage = false;
        try {
          if (navigator.clipboard && 'write' in navigator.clipboard) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            copiedImage = true;
          }
        } catch (clipErr) {
          console.warn('Clipboard write image fallback:', clipErr);
        }

        // 3. Download the image file to device
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = downloadUrl;
        link.click();

        // 4. Open WhatsApp chat with the contact
        const phone = task.whatsapp?.phoneNumber || '';
        const caption = `مرفق صورة تكليف مهمة رسمية من مكتب د/ عبد العزيز شطا:\n📌 المهمة: *${taskTitle}*\n🎯 المطلوب: *${taskRequired}*`;
        whatsappService.openWhatsAppChat(phone, caption);

        if (copiedImage) {
          displayToast('✅ تم نسخ صورة الخطاب للحافظة وحفظها! الصق الصورة (Ctrl+V أو لصق) في محادثة الواتساب لإرسالها فوراً.');
        } else {
          displayToast('✅ تم حفظ صورة الخطاب في جهازك! أرفق الصورة الآن في محادثة الواتساب.');
        }
        setIsSharingImage(false);
      }, 'image/png', 1.0);
    } catch (e) {
      console.error('Error generating official card image:', e);
      setIsSharingImage(false);
      displayToast('⚠️ تعذر إنشاء الصورة؛ يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvasModule = await import('html2canvas-pro');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const link = document.createElement('a');
      link.download = `تكليف_رسمي_${taskTitle.replace(/[\\/:*?"<>|]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      displayToast('✅ تم حفظ صورة الخطاب في جهازك بنجاح!');
    } catch (e) {
      console.warn('Download image error:', e);
      displayToast('⚠️ تعذر حفظ الصورة.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      displayToast('✅ تم نسخ نص الرسالة للحافظة بنجاح!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDirectWhatsAppTextSend = () => {
    if (onSendWhatsApp) {
      onSendWhatsApp(task);
    } else {
      const phone = task.whatsapp?.phoneNumber || '';
      whatsappService.openWhatsAppChat(phone, messageText);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto select-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl my-auto">
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              بطاقة تكليف مهمة رسمية (صورة الواتساب)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {showStatusToast && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse text-center">
            {showStatusToast}
          </div>
        )}

        {/* Scrollable Container for Card Preview */}
        <div className="overflow-x-auto pb-2 flex justify-center">
          {/* THE OFFICIAL CARD AS SHOWN IN THE IMAGE (Matching user's reference photo 100%) */}
          <div
            ref={cardRef}
            className="w-full min-w-[320px] max-w-[460px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 select-text font-['Cairo',sans-serif] p-6 sm:p-8 space-y-5"
            dir="rtl"
          >
            {/* 1. Document Title: تكليف مهمة رسمية - [اسم المهمة] */}
            <h2 className="text-xl sm:text-2xl font-black text-[#17375E] text-center leading-snug">
              تكليف مهمة رسمية - {taskTitle}
            </h2>

            {/* 2. Sender & Date Bordered Box */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 text-xs sm:text-sm text-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">من:</span>
                <span className="font-extrabold text-[#17375E]">مكتب د/ عبد العزيز شطا</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                <span className="font-bold text-slate-600">التاريخ:</span>
                <span className="font-bold text-slate-700">{formattedDate}</span>
              </div>
            </div>

            {/* 3. Salutation */}
            <div className="space-y-1 text-right">
              <p className="text-base sm:text-lg font-black text-slate-900">
                {honorific}،
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                تحية طيبة وبعد،
              </p>
            </div>

            {/* 4. Highlighted Mission Card (Soft Blue with Navy Right Border) */}
            <div className="rounded-2xl p-4 sm:p-5 bg-[#EEF3F8] border-r-[5px] border-[#17375E] space-y-3.5 text-right">
              <div>
                <span className="block text-[11px] text-slate-500 font-semibold mb-1">
                  المهمة
                </span>
                <p className="text-base sm:text-lg font-black text-[#17375E] leading-snug">
                  {taskTitle}
                </p>
              </div>

              <div className="border-t border-slate-300/50 pt-3">
                <span className="block text-[11px] text-slate-500 font-semibold mb-1">
                  المطلوب
                </span>
                <p className="text-sm sm:text-base font-extrabold text-[#17375E] leading-relaxed">
                  {taskRequired}
                </p>
              </div>
            </div>

            {/* 5. Directive */}
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-right">
              يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.
            </p>

            {/* 6. Subtle Separator Line */}
            <div className="border-t border-slate-200 pt-2" />

            {/* 7. Closing Signature */}
            <div className="text-left space-y-1" dir="ltr">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                ،مع خالص الشكر والتقدير
              </p>
              <p className="text-sm sm:text-base font-black text-[#17375E]">
                مكتب د/ عبد العزيز شطا
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5">
          {/* PRIMARY BUTTON: Send as Image to WhatsApp */}
          <button
            type="button"
            onClick={handleSendAsWhatsAppImage}
            disabled={isSharingImage}
            className="w-full h-12 px-5 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-emerald-950/60 transition-all disabled:opacity-50"
          >
            <Share2 className="w-5 h-5 text-white" />
            <span>
              {isSharingImage ? 'جاري تحويل الخطاب إلى صورة...' : 'إرسال كصورة على واتساب فوراً 📸'}
            </span>
          </button>

          {/* Secondary Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Download Image File */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="h-10 px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#ECC764]" />
              <span>{isDownloading ? 'جاري الحفظ...' : 'حفظ كصورة في الهاتف 💾'}</span>
            </button>

            {/* Send as Formatted Text */}
            <button
              type="button"
              onClick={handleDirectWhatsAppTextSend}
              className="h-10 px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>إرسال كنص مكتوب 💬</span>
            </button>

            {/* Copy Message Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="h-10 px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">تم نسخ النص!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>نسخ نص الرسالة 📋</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
