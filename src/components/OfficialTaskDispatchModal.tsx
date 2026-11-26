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
  ImageIcon,
  Edit3,
  RotateCcw,
  Save
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Task, WhatsAppRecipient } from '../types';
import {
  buildTaskWhatsAppMessage,
  formatArabicDate,
  getArabicHonorific,
  whatsappService
} from '../services/whatsappService';
import { taskService } from '../services/taskService';

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

  const isGroup = Boolean(
    task?.whatsapp?.isGroupDispatch ||
    (task?.whatsapp?.recipients && task.whatsapp.recipients.length > 1) ||
    (task?.assignees && task.assignees.length > 1)
  );
  const recipientsList: WhatsAppRecipient[] =
    task?.whatsapp?.recipients && task.whatsapp.recipients.length > 0
      ? task.whatsapp.recipients
      : task?.assignees && task.assignees.length > 0
        ? task.assignees
        : recipientName
          ? [{ name: recipientName, phone: task?.whatsapp?.phoneNumber || '' }]
          : [];

  const groupDisplayName =
    task?.whatsapp?.groupName?.trim() ||
    (recipientsList.length > 1
      ? recipientsList.map((r) => r.name).join('، ')
      : recipientName || 'فريق العمل المكلف');

  const [isSendingRecipientPhone, setIsSendingRecipientPhone] = useState<string | null>(null);

  // Editable Card Fields State (Pre-send editing before PNG capture)
  const defaultSalutation = isGroup
    ? `السادة الأفاضل المحترمون / ${groupDisplayName}،`
    : `${honorific}،`;

  const [isEditingCard, setIsEditingCard] = useState(false);
  const [persistToTask, setPersistToTask] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('أمر تكليف بمهمة رسمية');
  const [editTopic, setEditTopic] = useState(taskTitle);
  const [editSender, setEditSender] = useState('مكتب د/ عبد العزيز شطا');
  const [editDate, setEditDate] = useState(formattedDate);
  const [editSalutation, setEditSalutation] = useState(defaultSalutation);
  const [editGreeting, setEditGreeting] = useState('تحية طيبة وبعد،');
  const [editMissionTitle, setEditMissionTitle] = useState(taskTitle);
  const [editRequired, setEditRequired] = useState(taskRequired);
  const [editDirective, setEditDirective] = useState(
    'يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.'
  );
  const [editClosing, setEditClosing] = useState('مع خالص الشكر والتقدير،');
  const [editSignature, setEditSignature] = useState('مكتب د/ عبد العزيز شطا');

  // Sync editable fields whenever task or modal open state changes
  useEffect(() => {
    if (!isOpen || !task) return;
    setEditDocTitle('أمر تكليف بمهمة رسمية');
    setEditTopic(taskTitle);
    setEditSender('مكتب د/ عبد العزيز شطا');
    setEditDate(formattedDate);
    setEditSalutation(defaultSalutation);
    setEditGreeting('تحية طيبة وبعد،');
    setEditMissionTitle(taskTitle);
    setEditRequired(taskRequired);
    setEditDirective('يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.');
    setEditClosing('مع خالص الشكر والتقدير،');
    setEditSignature('مكتب د/ عبد العزيز شطا');
    setIsEditingCard(false);
    setPersistToTask(false);
  }, [isOpen, task?.id, taskTitle, taskRequired, formattedDate, defaultSalutation]);

  const handleResetCardEdits = () => {
    setEditDocTitle('أمر تكليف بمهمة رسمية');
    setEditTopic(taskTitle);
    setEditSender('مكتب د/ عبد العزيز شطا');
    setEditDate(formattedDate);
    setEditSalutation(defaultSalutation);
    setEditGreeting('تحية طيبة وبعد،');
    setEditMissionTitle(taskTitle);
    setEditRequired(taskRequired);
    setEditDirective('يُرجى البدء في التنفيذ، وموافاتنا بإشعار التأكيد فور الانتهاء.');
    setEditClosing('مع خالص الشكر والتقدير،');
    setEditSignature('مكتب د/ عبد العزيز شطا');
    displayToast('✓ تم استعادة النص الأصلي للبطاقة');
  };

  const handleSaveEditsToTaskIfRequested = () => {
    if (!task || !persistToTask) return;
    try {
      taskService.updateTask(task.id, {
        title: editMissionTitle.trim() || task.title,
        description: editRequired.trim() || task.description,
      });
    } catch (e) {
      console.warn('Could not persist card edits to task:', e);
    }
  };

  const editedMessageText = task
    ? [
        `*${editDocTitle}*`,
        editTopic ? `الموضوع: ${editTopic}` : '',
        `من: ${editSender}`,
        `التاريخ: ${editDate}`,
        '',
        editSalutation,
        editGreeting,
        '',
        `*المهمة:* ${editMissionTitle}`,
        `*المطلوب:* ${editRequired}`,
        '',
        editDirective,
        '',
        editClosing,
        `*${editSignature}*`,
      ]
        .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
        .join('\n')
    : '';

  const messageText = editedMessageText || (task ? buildTaskWhatsAppMessage(task) : '');

  // Background Pre-rendering: Re-render PNG cleanly (debounced) whenever card content changes
  useEffect(() => {
    if (!isOpen || !task) {
      setReadyImage(null);
      setIsPreRendering(false);
      return;
    }

    let isCancelled = false;
    setReadyImage(null);
    setIsPreRendering(true);

    const timer = setTimeout(async () => {
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch { }
      }
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
            const safeTitle = (editMissionTitle || taskTitle).replace(/[\\/:*?"<>|]/g, '_');
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
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    task?.id,
    editDocTitle,
    editTopic,
    editSender,
    editDate,
    editSalutation,
    editGreeting,
    editMissionTitle,
    editRequired,
    editDirective,
    editClosing,
    editSignature
  ]);

  if (!isOpen || !task) return null;

  // On-demand canvas generator if clicked before pre-rendering finishes
  const ensureImageReady = async (): Promise<PreparedImage | null> => {
    if (readyImage) return readyImage;
    if (!cardRef.current) return null;

    try {
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        try {
          await (document as any).fonts.ready;
        } catch { }
      }
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
    handleSaveEditsToTaskIfRequested();

    try {
      const img = await ensureImageReady();
      if (!img) {
        displayToast('⚠️ تعذر تجهيز صورة الخطاب؛ يرجى المحاولة مرة أخرى.');
        setIsSharingImage(false);
        return;
      }

      const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `تكليف_رسمي_${safeTitle}_${Date.now()}.png`;

      const targetPhone = (!isGroup && task.whatsapp?.phoneNumber) ? task.whatsapp.phoneNumber : '';

      // 1. Direct WhatsApp Dispatch to the specific contact (when single recipient, bypasses app chooser)
      if (targetPhone) {
        const directRes = await whatsappService.shareImageToWhatsAppDirect({
          base64: img.base64,
          fileName,
          phone: targetPhone,
          caption: '',
        });
        if (directRes.success && directRes.method === 'native_direct') {
          displayToast('✅ تم فتح محادثة الرقم مباشرة في واتساب مع إرفاق بطاقة التكليف!');
          setIsSharingImage(false);
          return;
        }
      }

      // Branch A: Native Android or iOS Capacitor App Fallback (Ideal for Group Sharing)
      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: img.base64,
            directory: Directory.Cache
          });

          await Share.share({
            files: [writeRes.uri],
            dialogTitle: isGroup
              ? 'مشاركة بطاقة التكليف الجماعي كصورة (WhatsApp Group / الكل)'
              : 'إرسال بطاقة التكليف كصورة عبر واتساب (صورة فقط)'
          });

          displayToast(isGroup ? '✅ تم فتح مشاركة التكليف الجماعي بنجاح!' : '✅ تم فتح مشاركة الصورة بنجاح (صورة فقط بدون كلام)!');
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
          });
          displayToast('✅ تم فتح مشاركة الصورة بنجاح (صورة فقط بدون كلام)!');
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

      // 3. Open WhatsApp chat with recipient (image only, no words/text)
      const phone = task.whatsapp?.phoneNumber || '';
      whatsappService.openWhatsAppChat(phone, '');

      if (didCopy) {
        displayToast(
          '✅ تم نسخ صورة التكليف للحافظة وتنزيلها! الصق الصورة فوراً (Ctrl+V) في محادثة الواتساب (صورة فقط بدون كلام).'
        );
      } else {
        displayToast(
          '✅ تم تنزيل صورة التكليف في جهازك! أرفق الصورة الآن في محادثة الواتساب المفتوحة (صورة فقط بدون كلام).'
        );
      }
    } catch (e) {
      console.error('Error sharing official card image:', e);
      displayToast('⚠️ تعذر إرسال الصورة؛ يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSharingImage(false);
    }
  };

  // 1b. Send directly to a single recipient from the group list
  const handleSendToSingleRecipient = async (recipient: WhatsAppRecipient) => {
    if (!recipient.phone) {
      displayToast(`⚠️ لا يوجد رقم هاتف مسجل للمكلف ${recipient.name}`);
      return;
    }
    setIsSendingRecipientPhone(recipient.phone);
    try {
      const img = await ensureImageReady();
      if (!img) {
        displayToast('⚠️ تعذر تجهيز صورة الخطاب؛ يرجى المحاولة مرة أخرى.');
        setIsSendingRecipientPhone(null);
        return;
      }
      const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `تكليف_رسمي_${safeTitle}_${Date.now()}.png`;

      const directRes = await whatsappService.shareImageToWhatsAppDirect({
        base64: img.base64,
        fileName,
        phone: recipient.phone,
        caption: '',
      });

      if (directRes.success && directRes.method === 'native_direct') {
        displayToast(`✅ تم فتح محادثة ${recipient.name} مباشرة في واتساب مع إرفاق بطاقة التكليف!`);
      } else {
        whatsappService.openWhatsAppChat(recipient.phone, '');
        displayToast(`✅ تم فتح محادثة ${recipient.name} في واتساب!`);
      }
    } catch (e) {
      console.warn('Error sending to single recipient:', e);
      whatsappService.openWhatsAppChat(recipient.phone, '');
    } finally {
      setIsSendingRecipientPhone(null);
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
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
              بطاقة تكليف مهمة رسمية (صورة الواتساب)
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditingCard((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isEditingCard
                  ? 'bg-[#D4AF37]/25 text-[#F5D77F] border-[#D4AF37]/60 shadow-sm'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
              }`}
              title="تعديل نص البطاقة قبل إرسالها كصورة"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingCard ? 'إخفاء التعديل ✓' : 'تعديل قبل الإرسال ✏️'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Pre-Send Card Editor Panel */}
        {isEditingCard && (
          <div
            className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-[#0c3830] via-[#082620] to-[#041512] border border-[#D4AF37]/40 space-y-3 text-right text-xs shadow-lg"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="font-black text-[#F5D77F] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل نصوص البطاقة مباشرة (يتم تحديث الصورة تلقائياً)</span>
              </span>
              <button
                type="button"
                onClick={handleResetCardEdits}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة الأصلي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">عنوان الخطاب:</label>
                <input
                  type="text"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">الموضوع:</label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">من (المرسل):</label>
                <input
                  type="text"
                  value={editSender}
                  onChange={(e) => setEditSender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">التاريخ:</label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">التحية / المخاطب:</label>
                <input
                  type="text"
                  value={editSalutation}
                  onChange={(e) => setEditSalutation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">عبارة التحية:</label>
                <input
                  type="text"
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">عنوان المهمة داخل الصندوق:</label>
              <input
                type="text"
                value={editMissionTitle}
                onChange={(e) => setEditMissionTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">المطلوب / تفاصيل التكليف:</label>
              <textarea
                rows={3}
                value={editRequired}
                onChange={(e) => setEditRequired(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">التوجيه الختامي:</label>
              <input
                type="text"
                value={editDirective}
                onChange={(e) => setEditDirective(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">عبارة الختام:</label>
                <input
                  type="text"
                  value={editClosing}
                  onChange={(e) => setEditClosing(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-200/80 mb-1">التوقيع:</label>
                <input
                  type="text"
                  value={editSignature}
                  onChange={(e) => setEditSignature(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/45 border border-emerald-500/30 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
              <label className="flex items-center gap-2 text-[11px] text-slate-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={persistToTask}
                  onChange={(e) => setPersistToTask(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <span>حفظ تعديل المهمة والمطلوب في أصل المهمة عند الإرسال</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (task) {
                    taskService.updateTask(task.id, {
                      title: editMissionTitle.trim() || task.title,
                      description: editRequired.trim() || task.description,
                    });
                    displayToast('✅ تم حفظ التعديلات في المهمة وتحديث البطاقة!');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ في المهمة الآن</span>
              </button>
            </div>
          </div>
        )}

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
            className="w-full min-w-[340px] max-w-[460px] bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 select-text p-6 sm:p-8 space-y-4"
            dir="rtl"
            style={{
              backgroundColor: '#ffffff',
              letterSpacing: '0px',
              wordSpacing: 'normal',
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }}
          >
            {/* 1. Document Title: أمر تكليف بمهمة رسمية */}
            <div className="text-center space-y-1 pb-1">
              <h2
                style={{ letterSpacing: '0px', wordSpacing: 'normal' }}
                className="text-xl sm:text-2xl font-black text-[#17375E] text-center leading-snug"
              >
                {editDocTitle}
              </h2>
              {editTopic && (
                <p
                  style={{ letterSpacing: '0px', wordSpacing: 'normal' }}
                  className="text-sm sm:text-base font-extrabold text-[#0d4a41] text-center"
                >
                  الموضوع: {editTopic}
                </p>
              )}
            </div>

            {/* 2. Sender & Date Box (White/off-white rounded box with thin border) */}
            <div className="border border-slate-200/90 rounded-xl p-4 bg-[#fcfdfe] text-xs sm:text-sm space-y-2.5">
              <div className="flex items-center justify-start text-right">
                <span className="font-bold text-slate-500 w-16 text-right shrink-0">
                  من:
                </span>
                <span className="font-black text-[#17375E]">
                  {editSender}
                </span>
              </div>
              <div className="flex items-center justify-start text-right">
                <span className="font-bold text-slate-500 w-16 text-right shrink-0">
                  التاريخ:
                </span>
                <span className="font-bold text-slate-800">{editDate}</span>
              </div>
            </div>

            {/* 3. Salutation */}
            <div className="space-y-1.5 text-right pt-1">
              <div className="flex items-center gap-2">
                <p className="text-base sm:text-lg font-black text-slate-900">
                  {editSalutation}
                </p>
                {isGroup && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    👥 تكليف جماعي
                  </span>
                )}
              </div>
              {isGroup && recipientsList.length > 1 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <span className="text-[10px] font-bold text-slate-500 w-full mb-0.5">
                    أعضاء الفريق المكلفون:
                  </span>
                  {recipientsList.map((r, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200"
                    >
                      👤 {r.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {editGreeting}
              </p>
            </div>

            {/* 4. Highlighted Mission Card (Soft Blue #EEF3F8 with Navy Right Border) */}
            <div className="rounded-xl p-4 sm:p-5 bg-[#EEF3F8] border-r-[5px] border-[#17375E] space-y-3.5 text-right">
              <div>
                <span className="block text-[11px] text-slate-500 font-bold mb-1">
                  المهمة
                </span>
                <p className="text-base sm:text-lg font-black text-[#17375E] leading-snug">
                  {editMissionTitle}
                </p>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-slate-500 font-bold mb-1">
                  المطلوب
                </span>
                <p className="text-sm sm:text-base font-extrabold text-[#17375E] leading-relaxed whitespace-pre-line">
                  {editRequired}
                </p>
              </div>
            </div>

            {/* 5. Directive */}
            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-right pt-1">
              {editDirective}
            </p>

            {/* 6. Subtle Separator Line */}
            <div className="border-t border-slate-200/90 pt-1" />

            {/* 7. Closing Signature (Right-aligned matching original letterhead) */}
            <div className="text-right space-y-1 pt-1 pr-1">
              <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                {editClosing}
              </p>
              <p className="text-sm sm:text-base font-black text-[#17375E]">
                {editSignature}
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
                <span>
                  {isGroup
                    ? 'مشاركة جماعية كصورة على واتساب 📸 (WhatsApp Group / الكل)'
                    : 'إرسال كصورة على واتساب فوراً 📸 (صورة فقط)'}
                </span>
              </>
            )}
          </button>

          {/* Sequential 1-Click Dispatch List for Group Members */}
          {isGroup && recipientsList.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-right">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>إرسال فردي مباشر لكل مكلف (1-Click لكل شخص):</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  {recipientsList.length} مكلفين
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {recipientsList.map((recip, idx) => (
                  <div
                    key={`recip-dispatch-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="truncate text-right">
                      <span className="font-bold text-white block truncate">{recip.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{recip.phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendToSingleRecipient(recip)}
                      disabled={isSendingRecipientPhone === recip.phone}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
                    >
                      {isSendingRecipientPhone === recip.phone ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>إرسال</span>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
