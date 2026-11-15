import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Download,
  Check,
  Share2,
  Sparkles,
  Loader2,
  ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
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

interface PreparedImage {
  file: File;
  blob: Blob;
  dataUrl: string;
  base64: string;
}

export const OfficialTaskDispatchModal: React.FC<OfficialTaskDispatchModalProps> = ({
  task,
  isOpen,
  onClose,
  onSendWhatsApp
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [isPreRendering, setIsPreRendering] = useState(false);
  const [readyImage, setReadyImage] = useState<PreparedImage | null>(null);
  const [showStatusToast, setShowStatusToast] = useState<string | null>(null);

  const displayToast = (msg: string) => {
    setShowStatusToast(msg);
    setTimeout(() => setShowStatusToast(null), 5000);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = formatArabicDate(task?.dueDate || todayStr);
  const recipientName = task?.whatsapp?.recipientName || task?.employeeName || '';
  const honorific = getArabicHonorific(recipientName);
  const taskTitle = task?.title?.trim() || 'مهمة عمل رسمية';
  const taskRequired =
    task?.description?.trim() ||
    task?.title?.trim() ||
    'البدء في اتخاذ الإجراءات اللازمة فوراً وموافاتنا بالتقرير';

  const messageText = task ? buildTaskWhatsAppMessage(task) : '';

  // Background Pre-rendering: As soon as the modal opens and DOM settles,
  // render the card into a File and Base64 so it can be shared instantly on tap
  useEffect(() => {
    if (!isOpen || !task) {
      setReadyImage(null);
      setIsPreRendering(false);
      return;
    }

    let isCancelled = false;
    setIsPreRendering(true);

    const renderCard = async () => {
      // Allow browser to render DOM node and web fonts cleanly
      await new Promise((res) => setTimeout(res, 200));
      if (isCancelled || !cardRef.current) return;

      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        if (isCancelled) return;

        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

        canvas.toBlob(
          (blob) => {
            if (isCancelled || !blob) {
              setIsPreRendering(false);
              return;
            }
            const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
            const fileName = `تكليف_رسمي_${safeTitle}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            setReadyImage({
              file,
              blob,
              dataUrl,
              base64
            });
            setIsPreRendering(false);
          },
          'image/png',
          1.0
        );
      } catch (err) {
        console.warn('Failed to pre-render card:', err);
        setIsPreRendering(false);
      }
    };

    renderCard();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    task?.id,
    task?.title,
    task?.description,
    task?.dueDate,
    recipientName
  ]);

  if (!isOpen || !task) return null;

  // On-demand canvas generator if clicked before pre-rendering finishes
  const ensureImageReady = async (): Promise<PreparedImage | null> => {
    if (readyImage) return readyImage;
    if (!cardRef.current) return null;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/png', 1.0)
      );
      if (!blob) return null;
      const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
      const file = new File([blob], `تكليف_رسمي_${safeTitle}.png`, {
        type: 'image/png'
      });
      const prepared = { file, blob, dataUrl, base64 };
      setReadyImage(prepared);
      return prepared;
    } catch (e) {
      console.warn('ensureImageReady error:', e);
      return null;
    }
  };

  // 1. Primary Action: Send As Image to WhatsApp across Android, iOS & Web
  const handleSendAsWhatsAppImage = async () => {
    setIsSharingImage(true);

    try {
      const img = await ensureImageReady();
      if (!img) {
        displayToast('⚠️ تعذر تجهيز صورة الخطاب؛ يرجى المحاولة مرة أخرى.');
        setIsSharingImage(false);
        return;
      }

      const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `تكليف_رسمي_${safeTitle}_${Date.now()}.png`;

      // Branch A: Native Android or iOS Capacitor App
      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: img.base64,
            directory: Directory.Cache
          });

          await Share.share({
            title: `تكليف مهمة رسمية - ${taskTitle}`,
            text: `تكليف مهمة رسمية من مكتب د/ عبد العزيز شطا\nالمهمة: ${taskTitle}\nالمطلوب: ${taskRequired}`,
            files: [writeRes.uri],
            dialogTitle: 'إرسال بطاقة التكليف كصورة عبر واتساب'
          });

          displayToast('✅ تم فتح مشاركة الصورة بنجاح!');
          setIsSharingImage(false);
          return;
        } catch (nativeErr: any) {
          if (nativeErr?.message?.includes('canceled') || nativeErr?.name === 'AbortError') {
            setIsSharingImage(false);
            return;
          }
          console.warn('Native Capacitor share error, falling back:', nativeErr);
        }
      }

      // Branch B: Web / Mobile Browser (Safari on iOS, Chrome on Android)
      // Because img.file was pre-rendered, navigator.share runs in the active user gesture
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [img.file] })
      ) {
        try {
          await navigator.share({
            files: [img.file],
            title: `تكليف مهمة رسمية - ${taskTitle}`,
            text: `تكليف مهمة رسمية من مكتب د/ عبد العزيز شطا\nالمهمة: ${taskTitle}\nالمطلوب: ${taskRequired}`
          });
          displayToast('✅ تم فتح مشاركة الصورة بنجاح!');
          setIsSharingImage(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsSharingImage(false);
            return;
          }
          console.warn('navigator.share failed, using fallback:', shareErr);
        }
      }

      // Branch C: Desktop Browser / Unsupported Share Fallback
      // 1. Copy image directly into system clipboard
      let didCopy = false;
      try {
        if (navigator.clipboard && 'write' in navigator.clipboard) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': img.blob })
          ]);
          didCopy = true;
        }
      } catch (clipErr) {
        console.warn('Clipboard write image fallback error:', clipErr);
      }

      // 2. Download the PNG file
      const downloadUrl = URL.createObjectURL(img.blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = downloadUrl;
      link.click();

      // 3. Open WhatsApp chat with recipient
      const phone = task.whatsapp?.phoneNumber || '';
      const caption = `مرفق صورة تكليف مهمة رسمية من مكتب د/ عبد العزيز شطا:\n📌 المهمة: *${taskTitle}*\n🎯 المطلوب: *${taskRequired}*`;
      whatsappService.openWhatsAppChat(phone, caption);

      if (didCopy) {
        displayToast(
          '✅ تم نسخ صورة التكليف للحافظة وحفظها! الصق الصورة فوراً (Ctrl+V أو لصق) في محادثة الواتساب.'
        );
      } else {
        displayToast(
          '✅ تم تنزيل صورة التكليف في جهازك! أرفق الصورة الآن في محادثة الواتساب المفتوحة.'
        );
      }
    } catch (e) {
      console.error('Error sharing official card image:', e);
      displayToast('⚠️ تعذر إرسال الصورة؛ يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSharingImage(false);
    }
  };

  // 2. Download Image File
  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const img = await ensureImageReady();
      if (!img) {
        displayToast('⚠️ تعذر حفظ الصورة.');
        setIsDownloading(false);
        return;
      }
      const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `تكليف_رسمي_${safeTitle}.png`;

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: fileName,
          data: img.base64,
          directory: Directory.Documents
        });
        displayToast('✅ تم حفظ صورة الخطاب في مستندات هاتفك بنجاح!');
        return;
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = img.dataUrl;
      link.click();
      displayToast('✅ تم حفظ صورة الخطاب في جهازك بنجاح!');
    } catch (e) {
      console.warn('Download image error:', e);
      displayToast('⚠️ تعذر حفظ الصورة.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 3. Copy PNG Image bytes directly to clipboard
  const handleCopyImageToClipboard = async () => {
    try {
      const img = await ensureImageReady();
      if (!img) {
        displayToast('⚠️ تعذر نسخ الصورة.');
        return;
      }
      if (navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': img.blob })
        ]);
        setCopiedImage(true);
        displayToast('✅ تم نسخ صورة الخطاب إلى الحافظة بنجاح! يمكنك لصقها (Paste) في أي محادثة.');
        setTimeout(() => setCopiedImage(false), 3000);
        return;
      }
      displayToast('⚠️ خاصية نسخ الصورة للحافظة غير مدعومة في هذا المتصفح.');
    } catch (e) {
      console.warn('Clipboard image copy error:', e);
      displayToast('⚠️ تعذر نسخ الصورة؛ يرجى تنزيلها كملف.');
    }
  };

  // 4. Copy Message Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedText(true);
      displayToast('✅ تم نسخ نص الرسالة للحافظة بنجاح!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // fallback
    }
  };

  // 5. Direct WhatsApp Text Send
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
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse text-center leading-relaxed">
            {showStatusToast}
          </div>
        )}

        {/* Scrollable Container for Card Preview */}
        <div className="overflow-x-auto pb-2 flex justify-center">
          {/* THE OFFICIAL CARD: Exactly matches reference image media_1794766965447_a21d570e.jpg */}
          <div
            ref={cardRef}
            className="w-full min-w-[340px] max-w-[460px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 select-text font-['Cairo',sans-serif] p-6 sm:p-8 space-y-4"
            dir="rtl"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* 1. Document Title: تكليف مهمة رسمية - [اسم المهمة] */}
            <h2 className="text-xl sm:text-2xl font-black text-[#17375E] text-center leading-snug tracking-tight">
              تكليف مهمة رسمية - {taskTitle}
            </h2>

            {/* 2. Sender & Date Box (White/off-white rounded box with thin border) */}
            <div className="border border-slate-200/90 rounded-xl p-4 bg-[#fcfdfe] text-xs sm:text-sm space-y-2.5">
              <div className="flex items-center justify-start text-right">
                <span className="font-bold text-slate-500 w-16 text-right shrink-0">
                  من:
                </span>
                <span className="font-black text-[#17375E]">
                  مكتب د/ عبد العزيز شطا
                </span>
              </div>
              <div className="flex items-center justify-start text-right">
                <span className="font-bold text-slate-500 w-16 text-right shrink-0">
                  التاريخ:
                </span>
                <span className="font-bold text-slate-800">{formattedDate}</span>
              </div>
            </div>

            {/* 3. Salutation */}
            <div className="space-y-1 text-right pt-1">
              <p className="text-base sm:text-lg font-black text-slate-900">
                {honorific}،
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                تحية طيبة وبعد،
              </p>
            </div>

            {/* 4. Highlighted Mission Card (Soft Blue #EEF3F8 with Navy Right Border) */}
            <div className="rounded-xl p-4 sm:p-5 bg-[#EEF3F8] border-r-[5px] border-[#17375E] space-y-3.5 text-right">
              <div>
                <span className="block text-[11px] text-slate-500 font-bold mb-1">
                  المهمة
                </span>
                <p className="text-base sm:text-lg font-black text-[#17375E] leading-snug">
                  {taskTitle}
                </p>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-slate-500 font-bold mb-1">
                  المطلوب
                </span>
                <p className="text-sm sm:text-base font-extrabold text-[#17375E] leading-relaxed">
                  {taskRequired}
                </p>
              </div>
            </div>

            {/* 5. Directive */}
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-right pt-1">
              يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.
            </p>

            {/* 6. Subtle Separator Line */}
            <div className="border-t border-slate-200/90 pt-1" />

            {/* 7. Closing Signature (Right-aligned matching original letterhead) */}
            <div className="text-right space-y-1 pt-1 pr-1">
              <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                مع خالص الشكر والتقدير،
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
            {isSharingImage || isPreRendering ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span>
                  {isPreRendering
                    ? 'جاري إعداد صورة الخطاب...'
                    : 'جاري فتح الواتساب وإرسال الصورة...'}
                </span>
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 text-white" />
                <span>إرسال كصورة على واتساب فوراً 📸</span>
              </>
            )}
          </button>

          {/* Secondary Options Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Download Image File */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="h-10 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#ECC764]" />
              ) : (
                <Download className="w-4 h-4 text-[#ECC764]" />
              )}
              <span>حفظ كصورة 💾</span>
            </button>

            {/* Copy Image to Clipboard */}
            <button
              type="button"
              onClick={handleCopyImageToClipboard}
              className="h-10 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              {copiedImage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">تم نسخ الصورة!</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  <span>نسخ الصورة 🖼️</span>
                </>
              )}
            </button>

            {/* Send as Formatted Text */}
            <button
              type="button"
              onClick={handleDirectWhatsAppTextSend}
              className="h-10 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>إرسال كنص 💬</span>
            </button>

            {/* Copy Message Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="h-10 px-2 sm:px-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">تم نسخ النص!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>نسخ النص 📋</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
