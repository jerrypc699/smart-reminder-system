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
  // Full text with complete classical Arabic vocalization (التشكيل الكامل)
  const GREETING_PART = 'مَرْحَبًا بِكَ يَا ';
  const DOCTOR_NAME = 'د/ عَبْدُ العَزِيزِ شَطَا';
  const FULL_TEXT = GREETING_PART + DOCTOR_NAME;

  // Split into grapheme clusters so letters type WITH their tashkeel attached
  const graphemes = React.useMemo(() => {
    return FULL_TEXT.match(/\P{M}\p{M}*/gu) || [FULL_TEXT];
  }, [FULL_TEXT]);

  const greetingClustersCount = React.useMemo(() => {
    return (GREETING_PART.match(/\P{M}\p{M}*/gu) || []).length;
  }, [GREETING_PART]);

  const [displayedCount, setDisplayedCount] = useState(0);
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
      setDisplayedCount(0);
      setIsTypingDone(false);
      setIsExiting(false);
      setIsDismissed(false);
      setProgressWidth(0);
      return;
    }

    let count = 0;
    setDisplayedCount(0);
    setIsTypingDone(false);
    setIsExiting(false);
    setIsDismissed(false);
    setProgressWidth(0);

    // 1. Fill golden progress line smoothly across 2.5s
    const progressTimer = setTimeout(() => {
      setProgressWidth(100);
    }, 40);

    // 2. Typewriter animation - 28ms per cluster (~750ms total)
    const typingInterval = setInterval(() => {
      count++;
      if (count >= graphemes.length) {
        setDisplayedCount(graphemes.length);
        setIsTypingDone(true);
        clearInterval(typingInterval);
      } else {
        setDisplayedCount(count);
      }
    }, 28);

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
  }, [isOpen, graphemes]);

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

  // Reconstruct displayed greeting and doctor name parts
  const currentGreeting = graphemes.slice(0, Math.min(displayedCount, greetingClustersCount)).join('');
  const currentDoctorName = displayedCount > greetingClustersCount 
    ? graphemes.slice(greetingClustersCount, displayedCount).join('') 
    : '';

  return (
    <div
      dir="rtl"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] w-screen h-screen flex flex-col items-center justify-center p-6 select-none bg-[#050811] overflow-hidden cursor-pointer transition-opacity duration-300 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Royal ambient radiant lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,transparent_70%)] blur-3xl -top-28"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.14)_0%,transparent_70%)] blur-3xl -bottom-28"
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6 sm:space-y-8 pointer-events-none">
        
        {/* Doctor's Original Logo Crest (Untouched) */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] blur-2xl opacity-40 animate-pulse" />
          <div className="relative w-full h-full rounded-3xl p-[2.5px] bg-gradient-to-tr from-[#FFF2B2] via-[#D4AF37] to-[#8C6A1B] shadow-[0_12px_45px_rgba(212,175,55,0.35)]">
            <img
              src="/logo.png"
              alt="د. عبد العزيز شطا"
              className="w-full h-full object-cover rounded-[22px] bg-[#070B14]"
            />
          </div>
        </div>

        {/* Executive Sub-badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-[#D4AF37]/35 text-[#F1D583] text-xs sm:text-sm font-bold tracking-wide shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>نظام المساعد الشخصي والتذكير الذكي</span>
        </div>

        {/* Grand Typography: Al Jazeera Channel Calligraphic Logo Style with Full Tashkeel */}
        <div className="min-h-[7rem] sm:min-h-[8.5rem] flex flex-col items-center justify-center px-4 w-full">
          {/* Greeting: مَرْحَبًا بِكَ يَا */}
          <span className="text-xl sm:text-3xl font-bold text-amber-100/90 tracking-wide font-['Amiri','Cairo',serif] drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]">
            {currentGreeting}
          </span>

          {/* Al Jazeera Channel Style Metallic 3D Gold Typography with Tashkeel: د/ عَبْدُ العَزِيزِ شَطَا */}
          {currentDoctorName && (
            <div className="relative inline-block mt-2 sm:mt-3">
              {/* Golden Ambient Flame Aura */}
              <div className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-r from-amber-500/25 via-yellow-400/40 to-amber-600/25 blur-2xl rounded-full opacity-85 animate-pulse" />

              <h1 className="relative text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-wide leading-tight font-['Amiri','Aref_Ruqaa','Cairo',serif]">
                <span className="inline-block text-[#D4AF37] ml-2.5 font-normal text-2xl sm:text-4xl opacity-90 drop-shadow-[0_0_15px_#D4AF37]">
                  ⚜️
                </span>
                
                {/* 3D 24K Liquid Gold Beveled Calligraphy (Al Jazeera Channel Style) */}
                <span className="bg-gradient-to-b from-[#FFFFFF] via-[#FFF3B0] via-[#F2C744] via-[#D4AF37] to-[#7A5300] bg-clip-text text-transparent drop-shadow-[0_2px_0_#684805] drop-shadow-[0_6px_25px_rgba(212,175,55,0.9)] filter">
                  {currentDoctorName}
                </span>

                <span className="inline-block text-[#D4AF37] mr-2.5 font-normal text-2xl sm:text-4xl opacity-90 drop-shadow-[0_0_15px_#D4AF37]">
                  ⚜️
                </span>

                {!isTypingDone && (
                  <span className="inline-block w-1.5 sm:w-2 h-[0.85em] align-middle bg-[#F1D583] mr-2 rounded-full animate-pulse shadow-[0_0_15px_#F1D583]" />
                )}
              </h1>
            </div>
          )}
        </div>

        {/* Elegant Subtitle with Tashkeel */}
        <p
          className={`text-xs sm:text-sm text-slate-300 font-medium transition-all duration-700 max-w-lg font-['Cairo',sans-serif] ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          طَابَ يَوْمُكُمْ بِكُلِّ خَيْرٍ دُكْتُور عَبْد العَزِيز • جَدْوَلُ أَعْمَالِكَ وَتَنْبِيهَاتُكَ جَاهِزَة
        </p>

        {/* Minimalist Golden Progress Line (Synchronized with 2.8s auto-open) */}
        <div className="w-56 sm:w-80 h-[3px] bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-[#FFF4CC] via-[#F1D583] to-[#D4AF37] rounded-full shadow-[0_0_10px_#F1D583] transition-all duration-[2500ms] ease-out"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Auto-Open Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-[#F1D583]/90 font-medium font-['Cairo']">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F1D583] animate-ping" />
          <span>جَارِي فَتْحُ لَوْحَةِ التَّحَكُّمِ تِلْقَائِيًّا...</span>
        </div>
      </div>
    </div>
  );
};
