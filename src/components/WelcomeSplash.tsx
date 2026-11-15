import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Compass,
  CheckSquare,
  Volume2,
  ArrowLeft,
  Calendar,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { PrayerInfo } from '../types';
import { audioService } from '../services/audioService';

interface WelcomeSplashProps {
  isOpen: boolean;
  onClose: () => void;
  nextPrayer?: PrayerInfo;
  remainingTime?: { hours: number; minutes: number; seconds: number; formatted: string };
  todayTasksCount?: number;
  hijriDate?: string;
  cityName?: string;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({
  isOpen,
  onClose,
  nextPrayer,
  remainingTime,
  todayTasksCount = 0,
  hijriDate = '',
  cityName = 'القاهرة'
}) => {
  const FULL_TEXT = 'مرحباً بك يا د/ عبد العزيز';
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Precise 3.5s total duration with smooth typing
  useEffect(() => {
    if (!isOpen) {
      setDisplayedText('');
      setIsTypingDone(false);
      setIsExiting(false);
      setIsPlayingAudio(false);
      return;
    }

    let charIndex = 0;
    setDisplayedText('');
    setIsTypingDone(false);
    setIsExiting(false);

    // 1. Start typing immediately (60ms)
    const startDelay = setTimeout(() => {
      const typingInterval = setInterval(() => {
        charIndex++;
        setDisplayedText(FULL_TEXT.slice(0, charIndex));

        if (charIndex >= FULL_TEXT.length) {
          clearInterval(typingInterval);
          setIsTypingDone(true);
        }
      }, 40); // 26 chars * 40ms = ~1.04s

      return () => clearInterval(typingInterval);
    }, 60);

    // 2. Auto-close system entrance: at 3.2s fade-out, at 3.5s call onClose()
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3200);

    const closeTimer = setTimeout(() => {
      onClose();
    }, 3550);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen, onClose]);

  // Handle ESC or Enter or Space key to skip instantly
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePlayVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingAudio(true);
    audioService.initAudioContext();
    audioService.playDoctorWelcome(1.0, () => {
      setIsPlayingAudio(false);
    });
  };

  const handleReplayTypewriter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDisplayedText('');
    setIsTypingDone(false);
    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex++;
      setDisplayedText(FULL_TEXT.slice(0, charIndex));
      if (charIndex >= FULL_TEXT.length) {
        clearInterval(interval);
        setIsTypingDone(true);
      }
    }, 40);
  };

  if (!isOpen) return null;

  const gregorianDate = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      className={`fixed inset-0 z-[100] w-screen h-[100dvh] min-h-[100dvh] flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none bg-[#050811]/95 backdrop-blur-3xl pt-safe pb-safe cursor-pointer transition-all duration-350 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      onClick={onClose}
    >
      {/* Dynamic Ambient Radiant Halos */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.18),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-10 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(0,113,227,0.15),transparent_65%)] blur-3xl"
      />

      {/* Main Luxury Executive Card */}
      <div className="relative w-full max-w-xl rounded-3xl p-6 sm:p-9 bg-gradient-to-b from-[#0F172A]/95 via-[#0B1222]/98 to-[#070B14] border border-[#D4AF37]/35 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(212,175,55,0.2)] text-center overflow-hidden transition-all duration-300">
        
        {/* Top Metallic Gold Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#F1D583] to-transparent shadow-[0_0_15px_#F1D583]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="إغلاق الترحيب ومتابعة النظام (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Replay Typing Button */}
        {isTypingDone && (
          <button
            type="button"
            onClick={handleReplayTypewriter}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-[#ECC764] hover:bg-[#D4AF37]/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title="إعادة كتابة الترحيب"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Doctor Official Crest & Emblem */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-5">
          {/* Pulsing Aura Ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] animate-pulse blur-md opacity-40" />

          {/* Golden Frame */}
          <div className="relative w-full h-full rounded-2xl p-[2px] bg-gradient-to-tr from-[#FFF2B2] via-[#D4AF37] to-[#8C6A1B] shadow-[0_6px_25px_rgba(212,175,55,0.35)]">
            <img
              src="/logo.png"
              alt="شعار د. عبد العزيز الرسمي"
              className="w-full h-full object-cover rounded-[14px] bg-[#070B14]"
            />
          </div>

          {/* Active Status Badge */}
          <span
            className="absolute -bottom-1 -left-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-bold shadow-md"
            title="النظام متصل ويعمل بكفاءة"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            نشط
          </span>
        </div>

        {/* Royal Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#F1D583] border border-[#D4AF37]/30 text-xs font-bold shadow-sm mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#F1D583]" />
          <span>نظام المساعد الشخصي والتذكير الذكي</span>
        </div>

        {/* Typewriter Executive Main Headline */}
        <div className="min-h-[3rem] sm:min-h-[4rem] flex items-center justify-center mb-2 px-2">
          <h1 className="text-2xl sm:text-4xl md:text-[2.6rem] font-black tracking-tight text-white leading-tight">
            <span className="bg-gradient-to-r from-[#FFF6D4] via-[#F1D583] to-[#CA8A04] bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(212,175,55,0.45)]">
              {displayedText}
            </span>
            {/* Blinking Golden Typing Cursor */}
            <span
              className={`inline-block w-[3px] sm:w-[3.5px] h-[0.9em] align-middle bg-[#F1D583] mr-1.5 rounded-full shadow-[0_0_12px_#F1D583] ${
                isTypingDone ? 'animate-pulse opacity-75' : 'animate-ping'
              }`}
            />
          </h1>
        </div>

        {/* Subtitle & Welcome Statement (Appears smoothly) */}
        <p
          className={`text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto transition-all duration-700 ${
            displayedText.length > 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          نسعد بخدمتكم وتنسيق يومكم • مواقيت صلاتكم، مهامكم اليومية، وتنبيهاتكم الصوتية مضبوطة وجاهزة بأعلى درجات الدقة.
        </p>

        {/* Daily Dashboard Preview Pills */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-5 text-right transition-all duration-700 delay-150 ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {/* Prayer Widget */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-400 font-medium">الصلاة القادمة</span>
              <span className="block text-xs font-bold text-emerald-300 truncate">
                {nextPrayer?.arabicName ? `صلاة ${nextPrayer.arabicName}` : 'محسوبة بدقة'}
              </span>
              {remainingTime && (
                <span className="block text-[9.5px] text-slate-400 font-mono mt-0.5">
                  متبقي {(remainingTime.hours || 0) > 0 ? `${remainingTime.hours} س و ` : ''}{remainingTime.minutes || 0} د
                </span>
              )}
            </div>
          </div>

          {/* Tasks Widget */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--lux-accent)]/15 border border-[var(--lux-accent)]/30 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4 text-[var(--lux-accent)]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-400 font-medium">مهام اليوم</span>
              <span className="block text-xs font-bold text-white truncate">
                {todayTasksCount > 0 ? `${todayTasksCount} مهام مجدولة` : 'لا توجد مهام معلقة'}
              </span>
              <span className="block text-[9.5px] text-slate-400 mt-0.5">جاهزة للمتابعة</span>
            </div>
          </div>

          {/* Date Widget */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#F1D583]" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-400 font-medium">{cityName}</span>
              <span className="block text-xs font-bold text-[#F1D583] truncate">
                {hijriDate || 'التاريخ الهجري'}
              </span>
              <span className="block text-[9.5px] text-slate-400 truncate mt-0.5">
                {gregorianDate}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 transition-all duration-700 delay-300 ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {/* Primary Enter Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-7 rounded-xl font-extrabold text-sm text-[#070B14] bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] hover:brightness-110 active:scale-98 shadow-[0_4px_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>دخول لوحة التحكم</span>
            <ArrowLeft className="w-4 h-4 text-[#070B14]" />
          </button>

          {/* Voice Greeting Button */}
          <button
            type="button"
            onClick={handlePlayVoice}
            disabled={isPlayingAudio}
            className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold text-xs text-white bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.15] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isPlayingAudio ? (
              <>
                <Volume2 className="w-4 h-4 text-[#F1D583] animate-pulse" />
                <span className="text-[#F1D583]">جاري تشغيل النداء...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#F1D583]" />
                <span>استماع للنداء: «يا دكتور عبد العزيز»</span>
              </>
            )}
          </button>
        </div>

        {/* Precision Auto-Open Progress Line (3.5s) */}
        <div className="mt-5 pt-3 border-t border-white/[0.08]">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] rounded-full transition-all duration-[3400ms] ease-linear"
              style={{ width: isTypingDone ? '100%' : '35%' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-[#F1D583] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F1D583] animate-ping" />
              جاري فتح النظام تلقائياً خلال 3 ثوانٍ...
            </span>
            <span className="text-[10px] text-slate-400">انقر في أي مكان للدخول الفوري</span>
          </div>
        </div>
      </div>
    </div>
  );
};

