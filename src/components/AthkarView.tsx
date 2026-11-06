import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  Check, 
  Heart, 
  Sun, 
  Moon, 
  Briefcase, 
  Compass,
  Play
} from 'lucide-react';
import { ATHKAR_DATA } from '../data/athkar';
import { audioService } from '../services/audioService';

const TASBEEH_PRESETS = [
  'سبحان الله وبحمده، سبحان الله العظيم',
  'أستغفر الله وأتوب إليه',
  'لا حول ولا قوة إلا بالله العلي العظيم',
  'اللهم صلِّ وسلم على نبينا محمد',
  'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
  'لا إله إلا الله وحده لا شريك له',
];

export const AthkarView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'work' | 'morning' | 'evening' | 'prayer'>('work');
  
  // Tasbeeh State
  const [tasbeehCount, setTasbeehCount] = useState<number>(0);
  const [tasbeehTarget, setTasbeehTarget] = useState<number>(33);
  const [selectedTasbeehText, setSelectedTasbeehText] = useState<string>(TASBEEH_PRESETS[0]);
  const [totalTasbeehSession, setTotalTasbeehSession] = useState<number>(0);

  // Athkar progress state (item id -> remaining count)
  const [athkarProgress, setAthkarProgress] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ATHKAR_DATA.forEach((item) => {
      initial[item.id] = item.count;
    });
    return initial;
  });

  const handleTasbeehClick = () => {
    audioService.playChime('click', 0.4);
    const next = tasbeehCount + 1;
    setTasbeehCount(next);
    setTotalTasbeehSession((prev) => prev + 1);

    if (next === tasbeehTarget) {
      audioService.playChime('success', 0.8);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const resetTasbeeh = () => {
    setTasbeehCount(0);
  };

  const handleDhikrProgress = (id: string, initialCount: number) => {
    audioService.playChime('click', 0.3);
    setAthkarProgress((prev) => {
      const current = prev[id] !== undefined ? prev[id] : initialCount;
      const next = current > 0 ? current - 1 : initialCount;
      if (next === 0) {
        audioService.playChime('success', 0.6);
      }
      return { ...prev, [id]: next };
    });
  };

  const handleReadDhikr = (text: string) => {
    audioService.speak(text, { volume: 0.95, rate: 0.9 });
  };

  const filteredAthkar = ATHKAR_DATA.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          الأذكار النبوية والسبحة الإلكترونية
        </h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          حصن نفسك خلال يوم العمل بالأذكار المأثورة عن النبي ﷺ واستغل أوقات الراحة في التسبيح والاستغفار
        </p>
      </div>

      {/* Electronic Tasbeeh Counter Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/30 p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left: Text & Presets */}
          <div className="space-y-4 flex-1 text-center lg:text-right">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              السبحة الإلكترونية التفاعلية
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              {selectedTasbeehText}
            </h3>

            {/* Presets Grid */}
            <div className="flex flex-wrap gap-2 pt-2 justify-center lg:justify-start">
              {TASBEEH_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedTasbeehText(p);
                    setTasbeehCount(0);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTasbeehText === p
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {p.length > 28 ? p.substring(0, 28) + '...' : p}
                </button>
              ))}
            </div>

            {/* Target Selectors */}
            <div className="flex items-center gap-3 pt-2 justify-center lg:justify-start text-xs text-slate-400">
              <span>الهدف:</span>
              {[33, 100, 500].map((t) => (
                <button
                  key={t}
                  onClick={() => setTasbeehTarget(t)}
                  className={`px-3 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                    tasbeehTarget === t
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
              <span className="text-slate-500 mr-2">إجمالي الجلسة: {totalTasbeehSession}</span>
            </div>
          </div>

          {/* Right: Big Clickable Dial */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleTasbeehClick}
              className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-1.5 shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center p-4">
                <span className="text-4xl sm:text-5xl font-mono font-black text-white group-hover:text-emerald-300 transition-colors">
                  {tasbeehCount}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  / {tasbeehTarget}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  اضغط للتسبيح
                </span>
              </div>
            </button>

            <button
              onClick={resetTasbeeh}
              className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير العداد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Athkar Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'work', label: 'أذكار العمل والبركة', icon: Briefcase },
          { id: 'morning', label: 'أذكار الصباح', icon: Sun },
          { id: 'evening', label: 'أذكار المساء', icon: Moon },
          { id: 'prayer', label: 'أذكار الصلاة', icon: Compass },
          { id: 'all', label: 'كافة الأدعية', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Athkar Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAthkar.map((item) => {
          const remaining = athkarProgress[item.id] !== undefined ? athkarProgress[item.id] : item.count;
          const isDone = remaining === 0;

          return (
            <div
              key={item.id}
              className={`p-6 rounded-3xl border transition-all ${
                isDone
                  ? 'bg-slate-900/40 border-emerald-500/30 opacity-75'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <p className="text-base sm:text-lg text-white font-serif leading-relaxed mb-4">
                {item.text}
              </p>

              {item.reward && (
                <div className="text-xs text-emerald-400/90 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 mb-4 leading-normal">
                  <span className="font-bold">الفضل:</span> {item.reward}
                  {item.reference && (
                    <span className="text-slate-400 mr-2 text-[11px]">({item.reference})</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                {/* Audio Read Button */}
                <button
                  onClick={() => handleReadDhikr(item.text)}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>استماع صوتي للذكر</span>
                </button>

                {/* Counter / Done button */}
                <button
                  onClick={() => handleDhikrProgress(item.id, item.count)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  {isDone ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم بحمد الله</span>
                    </>
                  ) : (
                    <>
                      <span>التكرار:</span>
                      <span className="font-mono text-emerald-400">{remaining}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
