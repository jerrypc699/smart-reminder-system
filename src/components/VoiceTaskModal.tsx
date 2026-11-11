import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  Check, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Volume2, 
  RotateCcw,
  MessageCircle
} from 'lucide-react';
import { Task, TaskPriority, TaskCategory } from '../types';
import { parseArabicVoiceTask, ParsedVoiceTask } from '../utils/arabicVoiceParser';
import { universalSpeechService } from '../services/speechRecognitionService';
import { normalizeWhatsAppPhone, whatsappService } from '../services/whatsappService';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
}) => {
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedVoiceTask | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Editable fields once parsed
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [voiceMessage, setVoiceMessage] = useState<string>('');
  const [waPhone, setWaPhone] = useState<string>('');
  const [waName, setWaName] = useState<string>('');

  // Modal lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setParsed(null);
      setErrorMsg('');
      setIsStarting(false);
      setWaPhone('');
      setWaName('');
      return;
    }

    // Modal is opened: ready for Dr. Abdelaziz to press the mic button deliberately
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = async () => {
    if (isStarting) return;
    if (isListening) {
      await stopListening();
      await new Promise((r) => setTimeout(r, 150));
    }

    setIsStarting(true);
    setErrorMsg('');
    setTranscript('');
    setParsed(null);

    try {
      await universalSpeechService.startListening({
        onStart: () => {
          setIsListening(true);
          setIsStarting(false);
          setErrorMsg('');
        },
        onResult: (currentText: string) => {
          setTranscript(currentText);
          if (currentText.trim()) {
            const result = parseArabicVoiceTask(currentText);
            setParsed(result);
            setTitle(result.title);
            setDueDate(result.dueDate);
            setDueTime(result.dueTime);
            setPriority(result.priority);
            setCategory(result.category);
            setVoiceMessage(result.voiceMessage);
          }
        },
        onError: (err: string) => {
          setIsListening(false);
          setIsStarting(false);
          setErrorMsg(err);
        },
        onEnd: () => {
          setIsListening(false);
          setIsStarting(false);
        },
      });
    } catch (e: any) {
      setIsListening(false);
      setIsStarting(false);
      setErrorMsg(e?.message || 'تعذر بدء التعرف الصوتي');
    }
  };

  const stopListening = async () => {
    setIsStarting(false);
    setIsListening(false);
    await universalSpeechService.stopListening();
  };

  const toggleListening = () => {
    if (isStarting) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleRetry = async () => {
    setErrorMsg('');
    await stopListening();
    await new Promise((r) => setTimeout(r, 200));
    await startListening();
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const cleanPhone = normalizeWhatsAppPhone(waPhone);

    onAddTask({
      title: title.trim(),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      dueTime: dueTime || '11:00',
      priority,
      category,
      reminderMinutesBefore: 5,
      voiceMessage: voiceMessage.trim() || `يا دكتور عبد العزيز، ${title.trim()}`,
      repeat: 'none',
      audioMode: 'tts',
      ...(cleanPhone.length >= 8
        ? {
            whatsapp: {
              enabled: true,
              phoneNumber: cleanPhone,
              recipientName: waName.trim() || undefined,
              autoTriggerAtDueTime: true,
              includeAttachmentsLinks: true,
            },
          }
        : {}),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-6 relative overflow-hidden"
        dir="rtl"
      >
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                إضافة مهمة بالصوت الذكي
              </h3>
              <p className="text-xs text-slate-400">تحدث بالعامية أو الفصحى، وسيقوم النظام بتحديد الموعد والتفاصيل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Microphone Pulse & Status */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className="relative">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-teal-500/20 animate-pulse" />
              </>
            )}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isStarting}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
                isStarting
                  ? 'bg-slate-700 text-slate-300 opacity-80 cursor-wait'
                  : isListening
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/30 scale-105'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 hover:scale-105'
              }`}
            >
              {isStarting ? (
                <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : isListening ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="text-center">
            <span className={`text-sm font-bold ${isStarting ? 'text-teal-400 animate-pulse' : isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
              {isStarting
                ? '⏳ جاري تجهيز الميكروفون...'
                : isListening
                ? '🎙️ جاري الاستماع إلى دكتور عبد العزيز الآن... تفضل بالحديث'
                : 'اضغط على الميكروفون للتحدث'}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              مثال: "مقابلة الجيار غداً الساعة خمسة مساءً" أو "كشف العيادة اليوم الساعة 7 مساء عاجل"
            </p>
          </div>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/50 text-xs text-rose-300 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isStarting}
              className="w-full py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>إعادة تهيئة الميكروفون والتشغيل 🎙️</span>
            </button>
          </div>
        )}

        {/* Spoken Text Display */}
        {transcript && (
          <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1 font-semibold">
              <span>🗣️ ما تم سماعه:</span>
            </div>
            <p className="text-sm font-medium text-white italic">"{transcript}"</p>
          </div>
        )}

        {/* Parsed Fields (Editable Preview) */}
        {parsed && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-800/40 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold border-b border-slate-700/50 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                البيانات المستخرجة تلقائياً:
              </span>
              <button
                type="button"
                onClick={startListening}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                تحدث مجدداً
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">عنوان المهمة:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  تاريخ المهمة:
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-400" />
                  وقت الاستحقاق:
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">التصنيف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="clinic">🩺 عيادة ومرضى</option>
                  <option value="work">💼 عمل ومشاريع</option>
                  <option value="meeting">👥 اجتماعات ومقابلات</option>
                  <option value="dev">💻 تطوير وبرمجة</option>
                  <option value="personal">🏠 شخصي ومنزل</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">الأولوية:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="urgent">🚨 عاجل جداً</option>
                  <option value="high">⚡ مرتفعة</option>
                  <option value="medium">🔹 متوسطة</option>
                  <option value="low">▫️ منخفضة</option>
                </select>
              </div>
            </div>

            {/* Optional Scheduled WhatsApp Recipient */}
            <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إرسال عبر واتساب في موعد المهمة (اختياري)</span>
                </label>
              </div>
              {whatsappService.getSettings().savedContacts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {whatsappService.getSettings().savedContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setWaPhone(c.phone);
                        setWaName(c.name);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-emerald-300 hover:border-emerald-500/40 cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="tel"
                dir="ltr"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="رقم الواتساب (مثال: 01012345678)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Spoken Voice Alert Preview */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-[11px] text-emerald-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">نطق التنبيه: <strong>{voiceMessage}</strong></span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>حفظ المهمة كمنبه ✅</span>
          </button>
        </div>
      </div>
    </div>
  );
};
