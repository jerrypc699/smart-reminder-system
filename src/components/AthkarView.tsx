import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Check, 
  Heart, 
  Sun, 
  Moon, 
  Briefcase, 
  Compass,
  Play,
  Square,
  Search,
  Plus,
  Trash2,
  Copy,
  CheckCheck,
  Smartphone,
  Bed,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Clock,
  Settings,
  X,
  Sliders,
  Smile,
  Frown,
  Activity,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AthkarItem, AthkarCategory } from '../types';
import { athkarStorageService, FloatingDhikrSettings } from '../services/athkarStorageService';
import { audioService } from '../services/audioService';

const DEFAULT_TASBEEH_PRESETS = [
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
  'لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
  'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلاَ إِلَهَ إِلاَّ اللَّهُ، وَاللَّهُ أَكْبَرُ',
  'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
  'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ'
];

export const AthkarView: React.FC = () => {
  // Navigation & Category State
  const [selectedCategory, setSelectedCategory] = useState<AthkarCategory>('morning');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fontSize, setFontSize] = useState<'md' | 'lg' | 'xl'>('lg');
  const [activeMood, setActiveMood] = useState<string | null>(null);

  // All Athkar & Favorites
  const [allAthkar, setAllAthkar] = useState<AthkarItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Progress State (id -> remaining count)
  const [athkarProgress, setAthkarProgress] = useState<Record<string, number>>({});

  // Audio Continuous Playback State (Auto-read playlist)
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(-1);
  const sequenceTimeoutRef = useRef<any>(null);

  // Misbaha State
  const [tasbeehCount, setTasbeehCount] = useState<number>(0);
  const [tasbeehTarget, setTasbeehTarget] = useState<number>(33);
  const [selectedTasbeehText, setSelectedTasbeehText] = useState<string>(DEFAULT_TASBEEH_PRESETS[0]);
  const [totalTasbeehSession, setTotalTasbeehSession] = useState<number>(0);
  const [allTimeTasbeeh, setAllTimeTasbeeh] = useState<number>(0);
  const [dailyTasbeeh, setDailyTasbeeh] = useState<number>(0);
  const [tasbeehPresets, setTasbeehPresets] = useState<string[]>(DEFAULT_TASBEEH_PRESETS);
  const [isTasbeehHapticEnabled, setIsTasbeehHapticEnabled] = useState<boolean>(true);
  const [isTasbeehSoundEnabled, setIsTasbeehSoundEnabled] = useState<boolean>(true);

  // Floating Dhikr Settings State
  const [floatingSettings, setFloatingSettings] = useState<FloatingDhikrSettings>(() => athkarStorageService.getFloatingSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Custom Dhikr Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [customCount, setCustomCount] = useState<number>(1);
  const [customReward, setCustomReward] = useState<string>('');
  const [newPresetText, setNewPresetText] = useState<string>('');

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const combined = athkarStorageService.getAllAthkar();
    setAllAthkar(combined);
    setFavoriteIds(athkarStorageService.getFavorites());
    setAllTimeTasbeeh(athkarStorageService.getTotalTasbeeh());
    setDailyTasbeeh(athkarStorageService.getDailyTasbeeh().count);

    // Load custom presets
    const customPresets = athkarStorageService.getCustomTasbeehPresets();
    if (customPresets.length > 0) {
      setTasbeehPresets([...DEFAULT_TASBEEH_PRESETS, ...customPresets]);
    }

    // Load saved progress
    const savedProgress = athkarStorageService.getProgress();
    const initialProgress: Record<string, number> = { ...savedProgress };
    combined.forEach((item) => {
      if (initialProgress[item.id] === undefined) {
        initialProgress[item.id] = item.count;
      }
    });
    setAthkarProgress(initialProgress);
  };

  // Filtered Athkar list based on Category / Search / Favorites / Mood
  const filteredAthkar = useMemo(() => {
    let list = allAthkar;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.reward && item.reward.toLowerCase().includes(q))
      );
    }

    // Mood filter
    if (activeMood) {
      return list.filter((item) => item.mood === activeMood);
    }

    // Category filter
    if (selectedCategory === 'favorites') {
      return list.filter((item) => favoriteIds.includes(item.id));
    }

    if (selectedCategory === 'all') {
      return list;
    }

    return list.filter((item) => item.category === selectedCategory);
  }, [allAthkar, selectedCategory, searchQuery, favoriteIds, activeMood]);

  // Section Progress Statistics
  const sectionStats = useMemo(() => {
    if (filteredAthkar.length === 0) return { total: 0, completed: 0, percent: 0 };
    const total = filteredAthkar.length;
    const completed = filteredAthkar.filter((item) => (athkarProgress[item.id] ?? item.count) === 0).length;
    const percent = Math.round((completed / total) * 100);
    return { total, completed, percent };
  }, [filteredAthkar, athkarProgress]);

  // Decrement single dhikr counter (Tap on card)
  const handleDhikrProgress = (id: string, initialCount: number) => {
    if (isTasbeehHapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(35);
    }
    if (isTasbeehSoundEnabled) {
      audioService.playChime('click', 0.25);
    }

    setAthkarProgress((prev) => {
      const current = prev[id] !== undefined ? prev[id] : initialCount;
      const next = current > 0 ? current - 1 : initialCount;

      if (next === 0) {
        // Finished this Dhikr
        if (isTasbeehSoundEnabled) {
          audioService.playChime('success', 0.6);
        }
        if (isTasbeehHapticEnabled && 'vibrate' in navigator) {
          navigator.vibrate([60, 40, 60]);
        }
      }

      const updated = { ...prev, [id]: next };
      athkarStorageService.saveProgress(updated);
      return updated;
    });

    // Also count towards daily tasbeeh
    setDailyTasbeeh(athkarStorageService.incrementDailyTasbeeh(1));
    setAllTimeTasbeeh(athkarStorageService.incrementTotalTasbeeh(1));
  };

  // Reset progress for currently active category
  const handleResetCategory = () => {
    const updated = athkarStorageService.resetProgressForCategory(selectedCategory, filteredAthkar);
    setAthkarProgress({ ...updated });
    audioService.playChime('click', 0.4);
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowFav = athkarStorageService.toggleFavorite(id);
    setFavoriteIds(athkarStorageService.getFavorites());
    if (isNowFav && isTasbeehHapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate([40]);
    }
  };

  // Copy Dhikr Text
  const handleCopyText = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Speak single Dhikr
  const handleReadDhikr = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioService.speak(text, { volume: 0.95, rate: 0.9 });
  };

  // Continuous auto-read playlist
  const handleToggleSequence = () => {
    if (isPlayingSequence) {
      setIsPlayingSequence(false);
      clearTimeout(sequenceTimeoutRef.current);
      audioService.stopAll();
      setCurrentPlayingIndex(-1);
    } else {
      if (filteredAthkar.length === 0) return;
      setIsPlayingSequence(true);
      playSequenceItem(0);
    }
  };

  const playSequenceItem = (index: number) => {
    if (index >= filteredAthkar.length) {
      setIsPlayingSequence(false);
      setCurrentPlayingIndex(-1);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      return;
    }

    setCurrentPlayingIndex(index);
    const item = filteredAthkar[index];
    audioService.speak(item.text, { volume: 0.95, rate: 0.9 });

    // Approximate speech duration based on word count
    const words = item.text.split(' ').length;
    const estDurationMs = Math.max(3500, words * 450);

    sequenceTimeoutRef.current = setTimeout(() => {
      playSequenceItem(index + 1);
    }, estDurationMs);
  };

  // Misbaha Dial Tap
  const handleTasbeehClick = () => {
    if (isTasbeehHapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
    if (isTasbeehSoundEnabled) {
      audioService.playChime('click', 0.35);
    }

    const next = tasbeehCount + 1;
    setTasbeehCount(next);
    setTotalTasbeehSession((prev) => prev + 1);
    setDailyTasbeeh(athkarStorageService.incrementDailyTasbeeh(1));
    setAllTimeTasbeeh(athkarStorageService.incrementTotalTasbeeh(1));

    if (tasbeehTarget > 0 && next === tasbeehTarget) {
      if (isTasbeehSoundEnabled) {
        audioService.playChime('success', 0.8);
      }
      if (isTasbeehHapticEnabled && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 150]);
      }
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    }
  };

  const resetTasbeeh = () => {
    setTasbeehCount(0);
  };

  // Add custom tasbeeh preset
  const handleAddCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetText.trim()) return;
    const updated = athkarStorageService.addCustomTasbeehPreset(newPresetText.trim());
    setTasbeehPresets([...DEFAULT_TASBEEH_PRESETS, ...updated]);
    setSelectedTasbeehText(newPresetText.trim());
    setNewPresetText('');
    setTasbeehCount(0);
  };

  // Save new custom dhikr
  const handleSaveCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    athkarStorageService.saveCustomDhikr({
      category: 'custom',
      title: customTitle.trim() || 'دعاء خاص',
      text: customText.trim(),
      count: customCount || 1,
      reward: customReward.trim() || undefined,
    });

    setIsCustomModalOpen(false);
    setCustomTitle('');
    setCustomText('');
    setCustomCount(1);
    setCustomReward('');
    loadData();
    setSelectedCategory('all');
  };

  // Update floating settings
  const handleSaveFloatingSettings = (updated: Partial<FloatingDhikrSettings>) => {
    const saved = athkarStorageService.saveFloatingSettings(updated);
    setFloatingSettings(saved);
    window.dispatchEvent(new Event('update-floating-dhikr-settings'));
  };

  const triggerTestFloatingDhikr = () => {
    window.dispatchEvent(new Event('trigger-floating-dhikr'));
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 text-right dir-rtl select-none" dir="rtl">
      
      {/* 1. Header Banner & Main Controls */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/40 p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center lg:text-right">
            <div className="flex items-center justify-center lg:justify-start gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                أذكاري 🕊️ (حصن المسلم والسبحة الذكية)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              تطبيق أذكاري الشامل: أذكار الصباح والمساء، الرقية الشرعية، أدعية تفريج الكرب، والسبحة الإلكترونية مع ميزة الأذكار التلقائية العائمة على الشاشة.
            </p>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* Floating Dhikr Toggle Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                floatingSettings.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="إعدادات ظهور الأذكار على الشاشة"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>أذكار الشاشة: {floatingSettings.enabled ? 'مفعلة 🟢' : 'معطلة'}</span>
            </button>

            {/* Add Custom Dhikr Button */}
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>إضافة ذكر خاص ✍️</span>
            </button>

            {/* Font Size Adjuster */}
            <div className="flex items-center bg-slate-800/80 rounded-2xl p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setFontSize('md')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${fontSize === 'md' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                title="خط متوسط"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold text-sm ${fontSize === 'lg' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                title="خط كبير"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold text-base ${fontSize === 'xl' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                title="خط عريض جداً"
              >
                A++
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "كيف تشعر اليوم؟" (Azkari Mood Selector) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs sm:text-sm font-black text-white">
              كيف تشعر اليوم يا دكتور عبد العزيز؟ 💭 (ميزة أذكاري المميزة)
            </h4>
          </div>
          {activeMood && (
            <button
              onClick={() => setActiveMood(null)}
              className="text-[11px] text-rose-400 hover:underline cursor-pointer"
            >
              عرض كافة الأذكار ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {[
            { id: 'anxiety', label: 'قلق أو متوتر 😌', desc: 'طمأنينة وسكينة' },
            { id: 'distress', label: 'حزين أو مهموم 🤲', desc: 'تفريج الكرب' },
            { id: 'fatigue', label: 'مجهد أو متعب 🥱', desc: 'طلب العافية والنشاط' },
            { id: 'guidance', label: 'في حيرة من أمري 🌿', desc: 'استخارة وهداية' },
            { id: 'gratitude', label: 'سعيد وشاكر 😊', desc: 'حمد وشكر لله' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveMood(activeMood === m.id ? null : m.id);
                setSearchQuery('');
              }}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMood === m.id
                  ? 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 font-bold scale-[1.02]'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="text-xs sm:text-sm font-black">{m.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Electronic Misbaha Card (السبحة الإلكترونية المتطورة مثل برنامج أذكاري) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left: Text & Presets */}
          <div className="space-y-4 flex-1 text-center lg:text-right w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                السبحة الإلكترونية الذكية التفاعلية
              </span>

              {/* Haptic & Sound Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTasbeehHapticEnabled(!isTasbeehHapticEnabled)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    isTasbeehHapticEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                  title="الاهتزاز مع كل تسبيحة"
                >
                  الاهتزاز {isTasbeehHapticEnabled ? '✓' : '✕'}
                </button>
                <button
                  onClick={() => setIsTasbeehSoundEnabled(!isTasbeehSoundEnabled)}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    isTasbeehSoundEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                  title="الصوت مع كل تسبيحة"
                >
                  {isTasbeehSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-serif leading-relaxed">
              {selectedTasbeehText}
            </h3>

            {/* Presets Grid */}
            <div className="flex flex-wrap gap-2 pt-1 justify-center lg:justify-start max-h-36 overflow-y-auto scrollbar-none">
              {tasbeehPresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedTasbeehText(p);
                    setTasbeehCount(0);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTasbeehText === p
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 font-bold shadow-sm'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {p.length > 30 ? p.substring(0, 30) + '...' : p}
                </button>
              ))}
            </div>

            {/* Target Selectors & Stats */}
            <div className="flex flex-wrap items-center gap-3 pt-2 justify-center lg:justify-start text-xs text-slate-300">
              <span className="font-bold text-slate-400">الهدف:</span>
              {[33, 100, 500, 1000, 0].map((t) => (
                <button
                  key={t}
                  onClick={() => setTasbeehTarget(t)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    tasbeehTarget === t
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {t === 0 ? 'مفتوح (حر)' : t}
                </button>
              ))}

              <div className="flex items-center gap-3 mr-auto text-[11px] text-slate-400">
                <span>جلسة: <strong className="text-white">{totalTasbeehSession}</strong></span>
                <span>اليوم: <strong className="text-emerald-400">{dailyTasbeeh}</strong></span>
                <span>الكلي: <strong className="text-amber-400">{allTimeTasbeeh}</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Big Interactive Misbaha Bead Button */}
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={handleTasbeehClick}
              className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-2 shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
            >
              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-emerald-400/30 flex flex-col items-center justify-center p-4">
                <span className="text-5xl sm:text-6xl font-mono font-black text-white group-hover:text-emerald-300 transition-colors">
                  {tasbeehCount}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {tasbeehTarget > 0 ? `/ ${tasbeehTarget}` : 'تسبيح حر'}
                </span>
                <span className="text-[11px] text-emerald-400 font-bold mt-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                  المس للتسبيح 📿
                </span>
              </div>
            </button>

            <button
              onClick={resetTasbeeh}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير العداد الحالي</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Section Tabs (كافة أبواب أذكاري) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-400">أبواب وأقسام الأذكار:</div>
          <div className="flex items-center gap-2">
            {/* Auto Sequence Play Button */}
            <button
              onClick={handleToggleSequence}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isPlayingSequence
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isPlayingSequence ? <Square className="w-3 h-3 text-rose-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span>{isPlayingSequence ? 'إيقاف القراءة المتتالية' : 'قراءة الورد متتالياً 🎧'}</span>
            </button>

            {/* Reset Current Section Counters */}
            <button
              onClick={handleResetCategory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700 transition-colors cursor-pointer"
              title="إعادة تعيين عدادات هذا القسم"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تصفير الورد</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'morning', label: 'أذكار الصباح ☀️', icon: Sun },
            { id: 'evening', label: 'أذكار المساء 🌙', icon: Moon },
            { id: 'prayer', label: 'أذكار الصلاة 🕌', icon: Compass },
            { id: 'sleep', label: 'النوم والاستيقاظ 🛏️', icon: Bed },
            { id: 'work', label: 'العمل والبركة 💼', icon: Briefcase },
            { id: 'distress', label: 'تفريج الكرب والهم 🤲', icon: ShieldCheck },
            { id: 'ruqyah', label: 'الرقية الشرعية 🌿', icon: Sparkles },
            { id: 'quranic', label: 'أدعية قرآنية 📖', icon: BookOpen },
            { id: 'favorites', label: `المفضلة (${favoriteIds.length}) ⭐`, icon: Heart },
            { id: 'all', label: 'كافة الأذكار 📋', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id && !activeMood;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id as any);
                  setActiveMood(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Completion Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في أي ذكر أو دعاء أو فضل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Section Progress Counter */}
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-slate-400">
                إنجاز هذا الورد: <strong className="text-emerald-400">{sectionStats.completed}</strong> من <strong className="text-white">{sectionStats.total}</strong> ذكر
              </span>
              <span className="font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {sectionStats.percent}%
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${sectionStats.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Athkar Cards Grid (نظام بطاقات أذكاري التفاعلية) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAthkar.map((item, index) => {
          const remaining = athkarProgress[item.id] !== undefined ? athkarProgress[item.id] : item.count;
          const isDone = remaining === 0;
          const isFav = favoriteIds.includes(item.id);
          const isCurrentlyPlaying = currentPlayingIndex === index && isPlayingSequence;

          const textSizeClass = fontSize === 'xl' ? 'text-xl sm:text-2xl' : (fontSize === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg');

          return (
            <div
              key={item.id}
              onClick={() => handleDhikrProgress(item.id, item.count)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden group ${
                isDone
                  ? 'bg-slate-900/40 border-emerald-500/40 shadow-inner'
                  : (isCurrentlyPlaying
                      ? 'bg-slate-900 border-amber-500/60 shadow-xl shadow-amber-500/20 ring-1 ring-amber-500/40'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-xl')
              }`}
            >
              {/* Card Header (Title & Badges) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[11px] font-mono font-bold text-emerald-400">
                    {index + 1}
                  </span>
                  <h4 className="font-bold text-white text-xs sm:text-sm">
                    {item.title || 'ذكر نبوي شريف'}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Favorite Toggle */}
                  <button
                    onClick={(e) => handleToggleFavorite(item.id, e)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFav ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
                  </button>

                  {/* Copy Text */}
                  <button
                    onClick={(e) => handleCopyText(item.id, item.text, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    title="نسخ الذكر"
                  >
                    {copiedId === item.id ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  {/* Single Audio Read */}
                  <button
                    onClick={(e) => handleReadDhikr(item.text, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="استماع صوتي للذكر"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dhikr Body Text with Tashkeel */}
              <p className={`${textSizeClass} text-white font-serif leading-loose my-3 select-text`} dir="rtl">
                {item.text}
              </p>

              {/* Reward & Reference Box */}
              {item.reward && (
                <div className="text-xs text-emerald-300/95 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 my-3 leading-relaxed">
                  <span className="font-bold text-emerald-400">الفضل:</span> {item.reward}
                  {item.reference && (
                    <span className="text-slate-400 mr-2 text-[11px] block sm:inline mt-1 sm:mt-0 font-sans">
                      [{item.reference}]
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer: Interactive Counter Dial */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400">
                  {isDone ? 'اكتمل هذا الذكر بحمد الله' : 'المس البطاقة في أي مكان للتسبيح'}
                </span>

                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition-all border ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-500/20'
                  }`}
                >
                  {isDone ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم بحمد الله ✅</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">المتبقي:</span>
                      <span className="font-mono text-base font-black text-white">
                        {remaining}
                      </span>
                      <span className="text-[10px] text-slate-400">/ {item.count}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAthkar.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">لا توجد أذكار في هذا القسم</h4>
          <p className="text-xs text-slate-400">جرّب تغيير خيارات البحث أو استعراض أبواب أخرى من الأذكار.</p>
        </div>
      )}

      {/* 6. Settings Modal: Floating Dhikr On-Screen Controls */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  إعدادات أذكار الشاشة التلقائية 🕊️
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div>
                  <div className="font-bold text-white text-sm">تفعيل الأذكار العائمة على الشاشة</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">ظهور أذكار نبوية دورية تلقائياً دون مقاطعة العمل</div>
                </div>
                <input
                  type="checkbox"
                  checked={floatingSettings.enabled}
                  onChange={(e) => handleSaveFloatingSettings({ enabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block font-bold text-white mb-2">معدل التكرار (كل كم دقيقة؟):</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSaveFloatingSettings({ intervalMinutes: mins })}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        floatingSettings.intervalMinutes === mins
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {mins} دقيقة
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration on screen */}
              <div>
                <label className="block font-bold text-white mb-2">مدة بقاء الذكر على الشاشة:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[6, 10, 15].map((secs) => (
                    <button
                      key={secs}
                      onClick={() => handleSaveFloatingSettings({ durationSeconds: secs })}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        floatingSettings.durationSeconds === secs
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {secs} ثوانٍ
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound on popup */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span>تنبيه بنقرة صوتية خفيفة عند ظهور الذكر</span>
                <input
                  type="checkbox"
                  checked={floatingSettings.soundEnabled}
                  onChange={(e) => handleSaveFloatingSettings({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Preview Button */}
              <button
                onClick={triggerTestFloatingDhikr}
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 transition-all cursor-pointer"
              >
                تجربة ظهور الذكر على الشاشة الآن 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Custom Dhikr Modal (إضافة ذكر ودعاء خاص للدكتور عبد العزيز) */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  إضافة ذكر أو دعاء مخصص للدكتور عبد العزيز
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDhikr} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">عنوان الذكر أو المناسبة:</label>
                <input
                  type="text"
                  placeholder="مثال: دعاء دخول العيادة أو قبل العمليات"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">نص الذكر أو الدعاء المبارك *:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="اكتب نص الدعاء هنا..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">عدد التكرار (الهدف):</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={customCount}
                    onChange={(e) => setCustomCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الفضل أو الملاحظة:</label>
                  <input
                    type="text"
                    placeholder="مثال: تيسير وشفاء بإذن الله"
                    value={customReward}
                    onChange={(e) => setCustomReward(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                >
                  حفظ في أذكاري ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
