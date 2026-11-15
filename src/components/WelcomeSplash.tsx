import React, { useState, useEffect, useRef } from 'react';

interface WelcomeSplashProps {
  isOpen: boolean;
  onClose: () => void;
  nextPrayer?: any;
  remainingTime?: any;
  todayTasksCount?: number;
  hijriDate?: string;
  cityName?: string;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ isOpen, onClose }) => {
  const FULL_TEXT = 'مرحباً بك يا د/ عبد العزيز';
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Keep a stable ref to onClose so re-renders in parent never reset the timers
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) {
      setDisplayedText('');
      setIsTypingDone(false);
      setIsExiting(false);
      setProgressWidth(0);
      return;
    }

    let charIndex = 0;
    setDisplayedText('');
    setIsTypingDone(false);
    setIsExiting(false);
    setProgressWidth(0);

    // 1. Kick off progress bar expansion immediately
    const progressTimer = setTimeout(() => {
      setProgressWidth(100);
    }, 40);

    // 2. Typewriter animation - 28ms per character (27 chars = ~750ms)
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex >= FULL_TEXT.length) {
        setDisplayedText(FULL_TEXT);
        setIsTypingDone(true);
        clearInterval(typingInterval);
      } else {
        setDisplayedText(FULL_TEXT.slice(0, charIndex));
      }
    }, 28);

    // 3. At 2.8s: start fading out
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    // 4. At 3.1s: call onCloseRef.current() guaranteed!
    const closeTimer = setTimeout(() => {
      try {
        onCloseRef.current?.();
      } catch (e) {
        console.error('Error closing welcome splash:', e);
      }
    }, 3100);

    return () => {
      clearTimeout(progressTimer);
      clearInterval(typingInterval);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen]); // ONLY depend on isOpen: Parent clock ticks/re-renders CANNOT cancel this!

  // Fallback keyboard listener: Enter, Escape, Space
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onCloseRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      onClick={() => onCloseRef.current?.()}
      className={`fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center p-6 select-none bg-[#060911] overflow-hidden cursor-default transition-opacity duration-300 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Luxury ambient radiant lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_70%)] blur-3xl -top-32"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.12)_0%,transparent_70%)] blur-3xl -bottom-32"
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 sm:space-y-8 pointer-events-none">
        {/* Official Doctor Logo Crest with Golden Aura */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] blur-2xl opacity-40 animate-pulse" />
          <div className="relative w-full h-full rounded-3xl p-[2.5px] bg-gradient-to-tr from-[#FFF2B2] via-[#D4AF37] to-[#8C6A1B] shadow-[0_12px_45px_rgba(212,175,55,0.35)]">
            <img
              src="/logo.png"
              alt="د. عبد العزيز"
              className="w-full h-full object-cover rounded-[22px] bg-[#070B14]"
            />
          </div>
        </div>

        {/* Executive Sub-badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-[#D4AF37]/35 text-[#F1D583] text-xs sm:text-sm font-bold tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>نظام المساعد الشخصي والتذكير الذكي</span>
        </div>

        {/* Grand Headline (Typewriter: مرحباً بك يا د/ عبد العزيز) */}
        <div className="min-h-[4.5rem] sm:min-h-[5.5rem] flex items-center justify-center px-4 w-full">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-relaxed font-['Cairo',sans-serif]">
            <span className="bg-gradient-to-r from-[#FFF6D4] via-[#F1D583] to-[#CA8A04] bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(212,175,55,0.5)]">
              {displayedText}
            </span>
            {!isTypingDone && (
              <span className="inline-block w-1 sm:w-1.5 h-[0.85em] align-middle bg-[#F1D583] mr-2 rounded-full animate-pulse shadow-[0_0_15px_#F1D583]" />
            )}
          </h1>
        </div>

        {/* Elegant Subtitle */}
        <p
          className={`text-sm sm:text-base text-slate-300 font-medium transition-all duration-700 max-w-lg ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          طاب يومكم بكل خير دكتور عبد العزيز • جدول أعمالك وتنبيهاتك جاهزة
        </p>

        {/* Minimalist Golden Progress Line (Synchronized with 3s auto-open) */}
        <div className="w-56 sm:w-80 h-[3px] bg-white/10 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] rounded-full shadow-[0_0_10px_#F1D583] transition-all duration-[2800ms] ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Auto-Open Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-[#F1D583]/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F1D583] animate-ping" />
          <span>جاري فتح النظام تلقائياً...</span>
        </div>
      </div>
    </div>
  );
};
