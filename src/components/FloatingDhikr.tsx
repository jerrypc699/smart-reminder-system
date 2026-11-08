import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, RotateCcw, Volume2, Heart, Check } from 'lucide-react';
import { athkarStorageService, FloatingDhikrSettings } from '../services/athkarStorageService';
import { audioService } from '../services/audioService';
import { AthkarItem } from '../types';

export const FloatingDhikr: React.FC = () => {
  const [settings, setSettings] = useState<FloatingDhikrSettings>(() => athkarStorageService.getFloatingSettings());
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [currentDhikr, setCurrentDhikr] = useState<AthkarItem | null>(null);
  const [progressWidth, setProgressWidth] = useState<number>(100);
  const [isDoneThisCycle, setIsDoneThisCycle] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const autoHideRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Pick a random dhikr
  const pickRandomDhikr = () => {
    const list = athkarStorageService.getAllAthkar();
    if (list.length === 0) return;
    const random = list[Math.floor(Math.random() * list.length)];
    setCurrentDhikr(random);
    setIsDoneThisCycle(false);
  };

  // Show floating dhikr
  const triggerDhikrPopup = () => {
    pickRandomDhikr();
    setIsVisible(true);
    setProgressWidth(100);

    if (settings.soundEnabled) {
      audioService.playChime('click', 0.2);
    }

    // Auto-hide countdown
    const durationMs = (settings.durationSeconds || 10) * 1000;
    const stepTime = 100;
    const stepDec = (100 / (durationMs / stepTime));

    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgressWidth((prev) => {
        if (prev <= stepDec) {
          clearInterval(progressIntervalRef.current);
          return 0;
        }
        return prev - stepDec;
      });
    }, stepTime);

    clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => {
      setIsVisible(false);
    }, durationMs);
  };

  useEffect(() => {
    // Initial interval setup
    if (!settings.enabled) {
      setIsVisible(false);
      return;
    }

    // Setup interval to show periodic dhikr on screen like Azkari app
    const intervalMs = Math.max(1, settings.intervalMinutes) * 60 * 1000;
    
    // First trigger after 1.5 minutes of opening the app to greet the user
    const firstTimeout = setTimeout(() => {
      triggerDhikrPopup();
    }, 90 * 1000);

    timerRef.current = setInterval(() => {
      triggerDhikrPopup();
    }, intervalMs);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(timerRef.current);
      clearTimeout(autoHideRef.current);
      clearInterval(progressIntervalRef.current);
    };
  }, [settings.enabled, settings.intervalMinutes, settings.durationSeconds]);

  // Listen to custom event to trigger manual preview or settings changes
  useEffect(() => {
    const handleTrigger = () => triggerDhikrPopup();
    const handleUpdate = () => setSettings(athkarStorageService.getFloatingSettings());

    window.addEventListener('trigger-floating-dhikr', handleTrigger);
    window.addEventListener('update-floating-dhikr-settings', handleUpdate);

    return () => {
      window.removeEventListener('trigger-floating-dhikr', handleTrigger);
      window.removeEventListener('update-floating-dhikr-settings', handleUpdate);
    };
  }, [settings]);

  if (!settings.enabled || !isVisible || !currentDhikr) {
    return null;
  }

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentDhikr) {
      audioService.speak(currentDhikr.text, { volume: 0.95, rate: 0.9 });
    }
  };

  const handleCycleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    pickRandomDhikr();
    setProgressWidth(100);
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDoneThisCycle(true);
    athkarStorageService.incrementDailyTasbeeh(1);
    athkarStorageService.incrementTotalTasbeeh(1);
    audioService.playChime('success', 0.5);
    if ('vibrate' in navigator) {
      navigator.vibrate([60]);
    }
    setTimeout(() => {
      setIsVisible(false);
    }, 1200);
  };

  return (
    <div
      className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-5 shadow-2xl shadow-emerald-950/60 transition-all animate-bounce-short select-none text-right dir-rtl"
      dir="rtl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-400">
              ذكر تلقائي (برنامج أذكاري) 🕊️
            </h4>
            <span className="text-[10px] text-slate-400">
              {currentDhikr.title || 'من نفحات ذكر الله تعالى'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCycleNext}
            title="ذكر آخر"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            title="إغلاق"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dhikr Body */}
      <div className="py-2">
        <p className="text-sm sm:text-base text-white font-serif leading-relaxed line-clamp-4">
          {currentDhikr.text}
        </p>

        {currentDhikr.reward && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 leading-snug">
            <span className="font-bold">الفضل:</span> {currentDhikr.reward}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-2 text-xs">
        <button
          onClick={handleSpeak}
          className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>استماع</span>
        </button>

        <button
          onClick={handleDone}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
            isDoneThisCycle
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          {isDoneThisCycle ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>تقبل الله ✅</span>
            </>
          ) : (
            <>
              <span>تسبيح (قرأت) 🤲</span>
            </>
          )}
        </button>
      </div>

      {/* Auto-Hide Progress Line */}
      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-3">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-100 ease-linear rounded-full"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
};

