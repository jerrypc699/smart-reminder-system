import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { audioService } from '../services/audioService';

interface PomodoroViewProps {
  onSessionComplete?: () => void;
  nextPrayerArabicName: string;
  nextPrayerTimeFormatted: string;
}

export const PomodoroView: React.FC<PomodoroViewProps> = ({
  nextPrayerArabicName,
  nextPrayerTimeFormatted,
}) => {
  const [mode, setMode] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [voiceGuidance, setVoiceGuidance] = useState<boolean>(true);

  // Switch mode duration
  useEffect(() => {
    setIsActive(false);
    if (mode === 'work') setTimeLeft(25 * 60);
    else if (mode === 'short_break') setTimeLeft(5 * 60);
    else if (mode === 'long_break') setTimeLeft(15 * 60);
  }, [mode]);

  // Timer Tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    audioService.playChime('success', 0.9);

    if (mode === 'work') {
      const nextCount = completedSessions + 1;
      setCompletedSessions(nextCount);

      if (voiceGuidance) {
        audioService.speakAlert(
          'أحسنت صنعاً! انتهت جلسة العمل والتركيز بنجاح. حان وقت استراحة قصيرة لتجديد نشاطك وشرب الماء.',
          { volume: 0.9 }
        );
      }

      if (nextCount % 4 === 0) {
        setMode('long_break');
      } else {
        setMode('short_break');
      }
    } else {
      if (voiceGuidance) {
        audioService.speakAlert('انتهت فترة الاستراحة. فلنبدأ جلسة عمل جديدة ببركة الله وتوفيقه.', {
          volume: 0.9,
        });
      }
      setMode('work');
    }
  };

  const toggleTimer = () => {
    if (!isActive) {
      audioService.playChime('pomodoro_start', 0.8);
      if (voiceGuidance && timeLeft === 25 * 60 && mode === 'work') {
        audioService.speakAlert('بدأت جلسة التركيز والإنجاز. نسأل الله لك التوفيق والبركة في عملك.', {
          volume: 0.9,
        });
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'work') setTimeLeft(25 * 60);
    else if (mode === 'short_break') setTimeLeft(5 * 60);
    else if (mode === 'long_break') setTimeLeft(15 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const totalDuration = mode === 'work' ? 25 * 60 : mode === 'short_break' ? 5 * 60 : 15 * 60;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Brain className="w-6 h-6 text-indigo-400" />
          مؤقت التركيز والإنجاز (بومودورو الذكي)
        </h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          تقنية تقسيم أوقات العمل لتعزيز الإنتاجية القصوى مع توجيه صوتي لطيف ومراعاة أوقات الصلاة
        </p>
      </div>

      {/* Main Timer Dial */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 mb-8 z-10">
          <button
            onClick={() => setMode('work')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'work'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Brain className="w-4 h-4" />
            <span>جلسة تركيز (25 د)</span>
          </button>

          <button
            onClick={() => setMode('short_break')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'short_break'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Coffee className="w-4 h-4" />
            <span>استراحة قصيرة (5 د)</span>
          </button>

          <button
            onClick={() => setMode('long_break')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'long_break'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>استراحة طويلة (15 د)</span>
          </button>
        </div>

        {/* Big Circular Display */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 border-slate-800 flex flex-col items-center justify-center shadow-inner z-10">
          {/* Progress ring svg */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="fill-none stroke-indigo-500/20"
              strokeWidth="8"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="fill-none stroke-indigo-500 transition-all duration-1000 ease-linear"
              strokeWidth="8"
              strokeDasharray="800"
              strokeDashoffset={800 - (800 * progressPercent) / 100}
              strokeLinecap="round"
            />
          </svg>

          <div className="text-5xl sm:text-6xl font-mono font-black text-white tracking-widest z-10">
            {formattedTime}
          </div>

          <span className="text-xs font-bold text-slate-400 mt-2 z-10">
            {mode === 'work' ? 'تركيز مستمر' : 'استراحة نشاط'}
          </span>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-4 mt-8 z-10">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-extrabold text-base text-white shadow-xl transition-all cursor-pointer ${isActive
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 ring-2 ring-indigo-400/40'
              }`}
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>ابدأ الآن</span>
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            title="إعادة ضبط المؤقت"
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Options & Prayer note */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 z-10">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceGuidance}
              onChange={(e) => setVoiceGuidance(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>تفعيل التوجيه الصوتي العربي (نطق البداية والنهاية)</span>
          </label>

          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>الصلاة القادمة: {nextPrayerArabicName} ({nextPrayerTimeFormatted})</span>
          </div>
        </div>
      </div>

      {/* Completed Sessions Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">جلسات التركيز المكتملة</span>
            <div className="text-xl font-bold text-white mt-0.5">{completedSessions} جلسة</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">دقائق العمل المركز</span>
            <div className="text-xl font-bold text-white mt-0.5">{completedSessions * 25} دقيقة</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">فترات الاستراحة</span>
            <div className="text-xl font-bold text-white mt-0.5">{completedSessions} فترات</div>
          </div>
        </div>
      </div>
    </div>
  );
};
