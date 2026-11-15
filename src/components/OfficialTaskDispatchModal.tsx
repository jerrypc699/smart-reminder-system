import React, { useRef, useState } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Download,
  Check,
  Share2,
  FileText
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
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

  if (!isOpen || !task) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = formatArabicDate(task.dueDate || todayStr);
  const recipientName = task.whatsapp?.recipientName || task.employeeName || '';
  const honorific = getArabicHonorific(recipientName);
  const taskTitle = task.title?.trim() || 'مهمة عمل رسمية';
  const taskRequired = task.description?.trim() || task.title?.trim() || 'البدء في اتخاذ الإجراءات اللازمة';

  const messageText = buildTaskWhatsAppMessage(task);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
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
    } catch (e) {
      console.warn('Download image error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectWhatsAppSend = () => {
    if (onSendWhatsApp) {
      onSendWhatsApp(task);
    } else {
      const phone = task.whatsapp?.phoneNumber || '';
      whatsappService.openWhatsAppChat(phone, messageText);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto select-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl my-auto">
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-300">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ECC764]" />
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              بطاقة تكليف مهمة رسمية (البريد المرسل)
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

        {/* Scrollable Container for Card Preview */}
        <div className="overflow-x-auto pb-3">
          {/* THE OFFICIAL CARD AS SHOWN IN THE IMAGE */}
          <div
            ref={cardRef}
            className="w-full min-w-[320px] max-w-[500px] mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 select-text font-['Cairo']"
            dir="rtl"
          >
            {/* 1. Dark Navy Top Bar: البريد المرسل */}
            <div className="bg-[#17375E] py-2.5 px-4 text-center">
              <span className="text-white text-base sm:text-lg font-black tracking-wide">
                البريد المرسل
              </span>
            </div>

            {/* 2. Main Content Body */}
            <div className="p-5 sm:p-7 space-y-5">
              {/* Document Title */}
              <h2 className="text-lg sm:text-2xl font-black text-[#17375E] text-center leading-snug">
                تكليف مهمة رسمية - {taskTitle}
              </h2>

              {/* Sender & Date Bordered Box */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 text-xs sm:text-sm text-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">من:</span>
                  <span className="font-bold text-[#17375E]">مكتب الدكتور عبد العزيز</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                  <span className="font-bold text-slate-600">التاريخ:</span>
                  <span className="font-semibold text-slate-700">{formattedDate}</span>
                </div>
              </div>

              {/* Salutation */}
              <div className="space-y-1 text-right">
                <p className="text-sm sm:text-base font-extrabold text-slate-900">
                  {honorific}،
                </p>
                <p className="text-xs sm:text-sm text-slate-700">
                  تحية طيبة وبعد،
                </p>
              </div>

              {/* Highlighted Mission Card (Soft Blue with Navy Border) */}
              <div className="rounded-xl p-4 sm:p-5 bg-[#EEF3F8] border-r-4 border-[#17375E] space-y-3 text-right">
                <div>
                  <span className="block text-[11px] text-slate-500 font-semibold mb-0.5">
                    المهمة
                  </span>
                  <p className="text-base sm:text-lg font-black text-[#17375E] leading-snug">
                    {taskTitle}
                  </p>
                </div>

                <div className="border-t border-slate-300/40 pt-2.5">
                  <span className="block text-[11px] text-slate-500 font-semibold mb-0.5">
                    المطلوب
                  </span>
                  <p className="text-sm sm:text-base font-bold text-[#17375E] leading-relaxed">
                    {taskRequired}
                  </p>
                </div>
              </div>

              {/* Directive */}
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed text-right">
                يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.
              </p>

              {/* Closing Signature */}
              <div className="pt-2 text-left space-y-1" dir="ltr">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  ،مع خالص الشكر والتقدير
                </p>
                <p className="text-sm sm:text-base font-black text-[#17375E]">
                  مكتب الدكتور عبد العزيز
                </p>
              </div>
            </div>

            {/* 3. Deep Green Bottom Bar: إدارة المتابعة */}
            <div className="bg-[#14532D] py-2.5 px-4 text-center">
              <span className="text-white text-xs sm:text-sm font-bold tracking-wider">
                إدارة المتابعة
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Send via WhatsApp */}
          <button
            type="button"
            onClick={handleDirectWhatsAppSend}
            className="h-10 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>إرسال واتساب الآن</span>
          </button>

          {/* Copy Message Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="h-10 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">تم نسخ النص!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>نسخ نص الرسالة</span>
              </>
            )}
          </button>

          {/* Download as Official Image (Matching uploaded photo) */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="h-10 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#ECC764]" />
            <span>{isDownloading ? 'جاري الحفظ...' : 'حفظ كصورة رسمية'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
