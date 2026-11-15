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
  const GREETING_PART = 'مرحباً بك يا ';
  const DOCTOR_NAME = 'د/ عبد العزيز شطا';
  const FULL_TEXT = GREETING_PART + DOCTOR_NAME;

  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Stable reference to onClose
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleDismiss = () => {
    setIsExiting(true);
    setIsDismissed(true);
    try {
      onCloseRef.current?.();
    } catch (e) {
      console.error('Error closing welcome splash:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setDisplayedText('');
      setIsTypingDone(false);
      setIsExiting(false);
      setIsDismissed(false);
      setProgressWidth(0);
      return;
    }

    let charIndex = 0;
    setDisplayedText('');
    setIsTypingDone(false);
    setIsExiting(false);
    setIsDismissed(false);
    setProgressWidth(0);

    // 1. Progress line starts immediately (fills over 2.6s)
    const progressTimer = setTimeout(() => {
      setProgressWidth(100);
    }, 30);

    // 2. Typewriter: 24ms per character (~750ms total for 30 chars)
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex >= FULL_TEXT.length) {
        setDisplayedText(FULL_TEXT);
        setIsTypingDone(true);
        clearInterval(typingInterval);
      } else {
        setDisplayedText(FULL_TEXT.slice(0, charIndex));
      }
    }, 24);

    // 3. At 2.5s: Start smooth fade out
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2500);

    // 4. At 2.8s: GUARANTEED automatic close & enter dashboard
    const closeTimer = setTimeout(() => {
      setIsDismissed(true);
      try {
        onCloseRef.current?.();
      } catch (e) {
        console.error('Error closing welcome splash:', e);
      }
    }, 2800);

    return () => {
      clearTimeout(progressTimer);
      clearInterval(typingInterval);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen]);

  // Click anywhere or press any key to enter immediately
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || isDismissed) return null;

  // Split displayed text into greeting and the Al Jazeera styled doctor's name
  const greetingLength = GREETING_PART.length;
  const currentGreeting = displayedText.slice(0, Math.min(displayedText.length, greetingLength));
  const currentDoctorName = displayedText.length > greetingLength ? displayedText.slice(greetingLength) : '';

  return (
    <div
      dir="rtl"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] w-screen h-screen flex flex-col items-center justify-center p-6 select-none bg-[#050811] overflow-hidden cursor-pointer transition-opacity duration-300 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Royal ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,transparent_70%)] blur-3xl -top-28"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.14)_0%,transparent_70%)] blur-3xl -bottom-28"
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6 sm:space-y-7 pointer-events-none">
        
        {/* Al Jazeera Style Golden Flame / Teardrop Crest (شعلة الجزيرة الذهبية) */}
        <div className="relative flex items-center justify-center">
          {/* Outer Golden Aura Flame Glow */}
          <div className="absolute w-36 h-44 sm:w-44 sm:h-52 bg-gradient-to-t from-[#B38728] via-[#F6D365] to-[#FFE259] rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] blur-2xl opacity-50 animate-pulse" />

          {/* SVG Al Jazeera Signature Teardrop Flame Silhouette */}
          <div className="relative w-32 h-40 sm:w-40 sm:h-48 flex items-center justify-center drop-shadow-[0_12px_45px_rgba(212,175,55,0.6)]">
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="aljazeeraGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF9E6" />
                  <stop offset="25%" stopColor="#F5D77F" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="75%" stopColor="#997819" />
                  <stop offset="100%" stopColor="#FFEAA7" />
                </linearGradient>
                <linearGradient id="innerFlameGlow" x1="50%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#070B14" />
                  <stop offset="70%" stopColor="#141B2D" />
                  <stop offset="100%" stopColor="#2A2208" />
                </linearGradient>
                <filter id="goldShine" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Iconic Al Jazeera Teardrop Flame Contour */}
              <path
                d="M100 12 C115 50, 185 105, 185 160 C185 205, 148 230, 100 230 C52 230, 15 205, 15 160 C15 105, 85 50, 100 12 Z"
                fill="url(#innerFlameGlow)"
                stroke="url(#aljazeeraGold)"
                strokeWidth="4"
                filter="url(#goldShine)"
              />

              {/* Inner Decorative Golden Rings */}
              <path
                d="M100 35 C112 68, 168 115, 168 160 C168 195, 138 215, 100 215 C62 215, 32 195, 32 160 C32 115, 88 68, 100 35 Z"
                fill="none"
                stroke="url(#aljazeeraGold)"
                strokeWidth="1.5"
                opacity="0.6"
              />

              {/* Calligraphic Flourishes Inside Flame */}
              <path
                d="M100 55 Q125 110 100 170 Q85 130 100 55 Z"
                fill="url(#aljazeeraGold)"
                opacity="0.35"
              />
              <circle cx="100" cy="115" r="32" fill="#070B14" stroke="url(#aljazeeraGold)" strokeWidth="2" />
            </svg>

            {/* Doctor Avatar / Logo Centered inside the Flame Crest */}
            <div className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#FFF2B2] via-[#D4AF37] to-[#8C6A1B] shadow-inner">
              <img
                src="/logo.png"
                alt="د. عبد العزيز شطا"
                className="w-full h-full object-cover rounded-full bg-[#070B14]"
              />
            </div>
          </div>
        </div>

        {/* Executive Sub-badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-[#D4AF37]/35 text-[#F1D583] text-xs sm:text-sm font-bold tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>نظام المساعد الشخصي والتذكير الذكي</span>
        </div>

        {/* Grand Headline: Greeting + Al Jazeera Style Doctor Name */}
        <div className="min-h-[6.5rem] sm:min-h-[7.5rem] flex flex-col items-center justify-center px-4 w-full">
          {/* Greeting: مرحباً بك يا */}
          <span className="text-xl sm:text-3xl font-semibold text-amber-100/90 tracking-wide font-['Cairo',sans-serif]">
            {currentGreeting}
          </span>

          {/* Al Jazeera Logo Calligraphic Style: د/ عبد العزيز شطا */}
          {currentDoctorName && (
            <div className="relative inline-block mt-1 sm:mt-2">
              {/* Golden Ambient Blur Glow */}
              <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-amber-500/20 via-yellow-400/35 to-amber-600/20 blur-xl rounded-full opacity-80 animate-pulse" />

              <h1 className="relative text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-normal leading-tight font-['Cairo',serif] text-transparent bg-clip-text bg-gradient-to-b from-[#FFFDF0] via-[#F6D365] via-[#D4AF37] to-[#8C6A1B] drop-shadow-[0_4px_35px_rgba(212,175,55,0.85)]">
                <span className="inline-block text-[#D4AF37] ml-2 font-normal text-2xl sm:text-4xl opacity-80">
                  ⚜️
                </span>
                {currentDoctorName}
                <span className="inline-block text-[#D4AF37] mr-2 font-normal text-2xl sm:text-4xl opacity-80">
                  ⚜️
                </span>
                {!isTypingDone && (
                  <span className="inline-block w-1.5 sm:w-2 h-[0.85em] align-middle bg-[#F1D583] mr-2 rounded-full animate-pulse shadow-[0_0_15px_#F1D583]" />
                )}
              </h1>
            </div>
          )}
        </div>

        {/* Subtitle */}
        <p
          className={`text-sm sm:text-base text-slate-300 font-medium transition-all duration-700 max-w-lg ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          طاب يومكم بكل خير دكتور عبد العزيز • جدول أعمالك وتنبيهاتك جاهزة
        </p>

        {/* Minimalist Golden Progress Line (Synchronized with 2.8s auto-open) */}
        <div className="w-56 sm:w-80 h-[3px] bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] rounded-full shadow-[0_0_10px_#F1D583] transition-all duration-[2600ms] ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Auto-Open Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-[#F1D583]/90 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F1D583] animate-ping" />
          <span>جاري فتح لوحة التحكم تلقائياً...</span>
        </div>
      </div>
    </div>
  );
};
