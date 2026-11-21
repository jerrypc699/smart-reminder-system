import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  Check, 
  Clock, 
  Calendar, 
  AlertCircle, 
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

  // Push-to-Talk (Hold to speak) refs
  const pressStartTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);

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
      isHoldingRef.current = false;
      return;
    }

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

  // Push to talk event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = true;
    if (!isListening && !isStarting) {
      startListening();
    }
  };

  const handlePointerUp = () => {
    const elapsed = Date.now() - pressStartTimeRef.current;
    const wasHolding = isHoldingRef.current;
    isHoldingRef.current = false;

    // If held for >= 400ms: push-to-talk released -> stop listening as user requested
    if (wasHolding && elapsed >= 400) {
      if (isListening || isStarting) {
        stopListening();
      }
    }
  };

  const handlePointerCancel = () => {
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      if (isListening) {
        stopListening();
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/82 backdrop-blur-lg animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-3xl lux-modal p-6 space-y-5 relative overflow-hidden max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-squircle-gold w-10 h-10 shrink-0">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                إضافة مهمة بالصوت الذكي
              </h3>
              <p className="text-[11px] text-slate-400">تحدث بطبيعتك وسيُضبط التاريخ والوقت والتصنيف تلقائياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Microphone Pulse & Status (Supports Press-and-Hold & Tap-to-Talk) */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3 select-none">
          <div className="relative">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                <div className="absolute -inset-3 rounded-full bg-teal-500/25 animate-pulse" />
              </>
            )}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onClick={() => {
                const elapsed = Date.now() - pressStartTimeRef.current;
                if (elapsed < 400) {
                  toggleListening();
                }
              }}
              disabled={isStarting}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer touch-none ${
                isStarting
                  ? 'bg-slate-700 text-slate-300 opacity-80 cursor-wait'
                  : isListening
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/40 scale-105 ring-4 ring-rose-400/50'
                  : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-[#D4AF37] text-white shadow-emerald-500/30 hover:scale-105 active:scale-95'
              }`}
            >
              {isStarting ? (
                <div className="w-9 h-9 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : isListening ? (
                <>
                  <MicOff className="w-9 h-9 animate-pulse" />
                  <span className="text-[9px] font-black mt-1 text-rose-100">ارفع للحفظ</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9" />
                  <span className="text-[9px] font-black mt-1 text-emerald-100">اضغط مطولاً</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center px-4">
            <span className={`text-sm font-black ${isStarting ? 'text-teal-400 animate-pulse' : isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-200'}`}>
              {isStarting
                ? '⏳ جاري تجهيز الميكروفون...'
                : isListening
                ? '🎙️ جاري الاستماع... تفضل بالحديث وارفع يدك عند الانتهاء'
                : 'اضغط باستمرار للتحدث وارفع يدك عند الانتهاء'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              (يعمل بالتسجيل المستمر بدون توقف طالما ضاغط على الزر، أو بنقرة واحدة للتشغيل)
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
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-sm">
            <div className="text-[11px] text-emerald-300 mb-1 flex items-center gap-1 font-bold">
              <span>🗣️ ما تم سماعه:</span>
            </div>
            <p className="text-sm font-semibold text-white leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {/* Parsed Fields (Editable Preview) */}
        {parsed && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-800/50 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-[#F5D77F] font-black border-b border-slate-700/50 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
              <label className="block text-[11px] text-slate-300 mb-1 font-bold">عنوان المهمة:</label>
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
                <label className="block text-[11px] text-slate-300 mb-1 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  تاريخ المهمة:
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-teal-400" />
                  وقت الاستحقاق:
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-bold">التصنيف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="clinic">🩺 عيادة ومرضى</option>
                  <option value="work">💼 عمل ومشاريع</option>
                  <option value="meeting">👥 اجتماعات ومقابلات</option>
                  <option value="dev">💻 تطوير وبرمجة</option>
                  <option value="personal">🏠 شخصي ومواعيد</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-bold">الأولوية:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="urgent">🚨 عاجل جداً</option>
                  <option value="high">⚡ مرتفعة</option>
                  <option value="medium">🔹 متوسطة</option>
                  <option value="low">▫️ منخفضة</option>
                </select>
              </div>
            </div>

            {/* Optional Scheduled WhatsApp Recipient */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
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
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-emerald-300 hover:border-emerald-500/40 cursor-pointer font-bold"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="tel"
                placeholder="رقم الهاتف (مثال: 01012345678)"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Confirm Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ECC86D] via-[#FFE59E] to-[#D4AF37] hover:brightness-105 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              <span>اعتماد وحفظ المهمة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
