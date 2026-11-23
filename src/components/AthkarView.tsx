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
  Edit3, 
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
  Zap,
  Bookmark
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
  const [isVoiceReciteEnabled, setIsVoiceReciteEnabled] = useState<boolean>(true);
  const [playingDhikrId, setPlayingDhikrId] = useState<string | null>(null);

  // Floating Dhikr Settings State
  const [floatingSettings, setFloatingSettings] = useState<FloatingDhikrSettings>(() => athkarStorageService.getFloatingSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Custom Dhikr Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [customCount, setCustomCount] = useState<number>(1);
  const [customReward, setCustomReward] = useState<string>('');
  const [newPresetText, setNewPresetText] = useState<string>('');

  const customAthkarCount = useMemo(() => {
    return allAthkar.filter((item) => item.category === 'custom' || item.isCustom).length;
  }, [allAthkar]);

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

    if (selectedCategory === 'custom') {
      return list.filter((item) => item.category === 'custom' || item.isCustom);
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

  // Helper to clean dhikr text from brackets and numbers for high-clarity voice recitation
  const cleanDhikrForVoice = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\[.*?\]/g, '') // remove book references
      .replace(/\{.*?\}/g, '')
      .replace(/\(.*?مرات.*?\)/g, '') // remove repetition notes
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Decrement single dhikr counter & speak clearly (Tap on card)
  const handleDhikrProgress = (item: AthkarItem) => {
    const id = item.id;
    const initialCount = item.count;
    if (isTasbeehHapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(35);
    }

    // Audible and clear voice recitation on tap
    if (isVoiceReciteEnabled) {
      setPlayingDhikrId(item.id);
      audioService.playDhikrRecitation(item.text, {
        volume: 1.0,
        onEnd: () => setPlayingDhikrId((curr) => (curr === item.id ? null : curr)),
        onError: () => setPlayingDhikrId((curr) => (curr === item.id ? null : curr)),
      });
    } else if (isTasbeehSoundEnabled) {
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

  // Speak single Dhikr with universal audio player & toggle control
  const handleReadDhikr = (item: AthkarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingDhikrId === item.id) {
      audioService.stopAll();
      setPlayingDhikrId(null);
      return;
    }

    setPlayingDhikrId(item.id);
    audioService.playDhikrRecitation(item.text, {
      volume: 1.0,
      onEnd: () => setPlayingDhikrId((curr) => (curr === item.id ? null : curr)),
      onError: () => setPlayingDhikrId((curr) => (curr === item.id ? null : curr)),
    });
  };

  // Continuous auto-read playlist
  const handleToggleSequence = () => {
    if (isPlayingSequence) {
      setIsPlayingSequence(false);
      clearTimeout(sequenceTimeoutRef.current);
      audioService.stopAll();
      setCurrentPlayingIndex(-1);
      setPlayingDhikrId(null);
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
      setPlayingDhikrId(null);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      return;
    }

    const item = filteredAthkar[index];
    setCurrentPlayingIndex(index);
    setPlayingDhikrId(item.id);

    audioService.playDhikrRecitation(item.text, {
      volume: 1.0,
      onEnd: () => {
        sequenceTimeoutRef.current = setTimeout(() => {
          playSequenceItem(index + 1);
        }, 800);
      },
      onError: () => {
        sequenceTimeoutRef.current = setTimeout(() => {
          playSequenceItem(index + 1);
        }, 800);
      },
    });
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
        colors: ['#10b981', '#34d399', '#f59e0b', '#D4AF37'],
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

  // Open modal to add custom dhikr
  const handleOpenAddCustom = () => {
    setEditingCustomId(null);
    setCustomTitle('');
    setCustomText('');
    setCustomCount(1);
    setCustomReward('');
    setIsCustomModalOpen(true);
  };

  // Open modal to edit existing custom dhikr
  const handleOpenEditCustom = (item: AthkarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomId(item.id);
    setCustomTitle(item.title || '');
    setCustomText(item.text || '');
    setCustomCount(item.count || 1);
    setCustomReward(item.reward || '');
    setIsCustomModalOpen(true);
  };

  // Delete custom dhikr
  const handleDeleteCustomDhikr = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا الذكر المخصص نهائياً؟')) {
      athkarStorageService.deleteCustomDhikr(id);
      loadData();
    }
  };

  // Save new or edited custom dhikr
  const handleSaveCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    if (editingCustomId) {
      athkarStorageService.updateCustomDhikr(editingCustomId, {
        title: customTitle.trim() || 'دعاء خاص',
        text: customText.trim(),
        count: customCount || 1,
        reward: customReward.trim() || undefined,
      });
    } else {
      athkarStorageService.saveCustomDhikr({
        category: 'custom',
        title: customTitle.trim() || 'دعاء خاص',
        text: customText.trim(),
        count: customCount || 1,
        reward: customReward.trim() || undefined,
      });
    }

    setIsCustomModalOpen(false);
    setEditingCustomId(null);
    setCustomTitle('');
    setCustomText('');
    setCustomCount(1);
    setCustomReward('');
    loadData();
    setSelectedCategory('custom');
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

  // Calculate circular progress for Misbaha
  const misbahaProgressRatio = useMemo(() => {
    if (!tasbeehTarget || tasbeehTarget <= 0) return 0;
    return Math.min(1, tasbeehCount / tasbeehTarget);
  }, [tasbeehCount, tasbeehTarget]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-16 text-right dir-rtl select-none" dir="rtl">
      
      {/* ======================================================== */}
      {/* 1. LUXURY EXECUTIVE HEADER BANNER                        */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#0c4038] via-[#082e28] to-[#041a17] border border-emerald-400/40 shadow-[0_15px_45px_rgba(4,26,23,0.5)] relative overflow-hidden text-white">
        {/* Soft Mosque Atmosphere Ambient Halo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative Islamic Star Ornaments */}
        <div className="w-full flex items-center justify-between px-2 pointer-events-none absolute top-4 left-0 right-0 opacity-20">
          <span className="text-[#D4AF37] text-base">❖</span>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
          <span className="text-[#D4AF37] text-base">❖</span>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 relative z-10 pt-1">
          <div className="space-y-2 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#F5D77F] text-[11px] font-extrabold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>أذكاري وحصن المسلم التنفيذي</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              أذكاري وحصن المسلم المبارك
            </h2>

            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl leading-relaxed">
              أذكار الصباح والمساء، الرقية الشرعية، أدعية تفريج الكرب، والمسبحة الإلكترونية التفاعلية مع الأذكار التلقائية.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* Screen Athkar Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer shadow-sm ${
                floatingSettings.enabled
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-emerald-950/30'
                  : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/20 hover:text-white'
              }`}
              title="إعدادات ظهور الأذكار على الشاشة"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" strokeWidth={1.8} />
              <span>أذكار الشاشة: {floatingSettings.enabled ? 'مفعلة' : 'معطلة'}</span>
            </button>

            {/* Add Custom Dhikr Button */}
            <button
              onClick={handleOpenAddCustom}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-teal-500/25 hover:from-amber-500/35 hover:to-emerald-500/30 text-[#F5D77F] border border-amber-500/40 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-amber-300" strokeWidth={2.2} />
              <span>إضافة ذكر خاص</span>
            </button>

            {/* Font Size Segmented Control */}
            <div className="flex items-center rounded-2xl p-1 bg-black/40 border border-white/10 text-xs">
              <button
                onClick={() => setFontSize('md')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                  fontSize === 'md' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="خط متوسط"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold text-sm ${
                  fontSize === 'lg' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="خط كبير"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold text-base ${
                  fontSize === 'xl' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="خط عريض"
              >
                A++
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CALM MOOD SELECTOR (SYMMETRICAL 5-COLUMN MATRIX)      */}
      {/* ======================================================== */}
      <div className="lux-card p-5 sm:p-6 rounded-3xl space-y-3.5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="icon-squircle-emerald w-9 h-9 shrink-0">
              <Activity className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                أذكار مخصصة لحالتك النفسية والروحية الآن
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">اختر الحالة لعرض الأذكار النبوية المناسبة فوراً</p>
            </div>
          </div>

          {activeMood && (
            <button
              onClick={() => setActiveMood(null)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
            >
              عرض الكل ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[
            { id: 'anxiety', label: 'قلق أو متوتر', desc: 'طمأنينة وسكينة', icon: '🕊️' },
            { id: 'distress', label: 'مهموم أو مكروب', desc: 'تفريج الكرب', icon: '🤲' },
            { id: 'fatigue', label: 'مجهد أو متعب', desc: 'طلب العافية', icon: '🌿' },
            { id: 'guidance', label: 'طلب الهداية', desc: 'استخارة وتيسير', icon: '🧭' },
            { id: 'gratitude', label: 'حمد وشكر', desc: 'شكر النعم', icon: '⭐' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveMood(activeMood === m.id ? null : m.id);
                setSearchQuery('');
              }}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[88px] ${
                activeMood === m.id
                  ? 'bg-gradient-to-b from-emerald-600/30 to-teal-700/20 border-emerald-400 text-white font-bold shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/40'
                  : 'lux-well hover:border-white/20 text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-lg mb-1">{m.icon}</span>
              <div className="text-xs font-extrabold">{m.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. LUXURY ELECTRONIC MISBAHA (EXECUTIVE CHRONO SPHERE)   */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0c4038] via-[#082e28] to-[#041a17] border border-emerald-400/40 shadow-[0_15px_45px_rgba(4,26,23,0.5)] relative overflow-hidden text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          
          {/* Left: Presets, Target Controls & Statistics */}
          <div className="space-y-4 flex-1 text-center lg:text-right w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#F5D77F] tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F5D77F]" strokeWidth={1.75} />
                المسبحة الإلكترونية الذكية
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTasbeehHapticEnabled(!isTasbeehHapticEnabled)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    isTasbeehHapticEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-black/30 text-slate-400 border-white/10'
                  }`}
                >
                  الاهتزاز {isTasbeehHapticEnabled ? '✓' : '✕'}
                </button>
                <button
                  onClick={() => setIsTasbeehSoundEnabled(!isTasbeehSoundEnabled)}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isTasbeehSoundEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-black/30 text-slate-400 border-white/10'
                  }`}
                >
                  {isTasbeehSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white font-serif leading-relaxed px-1">
              {selectedTasbeehText}
            </h3>

            {/* Preset Selector Chips */}
            <div className="flex flex-wrap gap-2 pt-1 justify-center lg:justify-start max-h-36 overflow-y-auto scrollbar-none">
              {tasbeehPresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedTasbeehText(p);
                    setTasbeehCount(0);
                  }}
                  className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTasbeehText === p
                      ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-200 border-emerald-400 font-bold shadow-sm'
                      : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {p.length > 34 ? p.substring(0, 34) + '...' : p}
                </button>
              ))}
            </div>

            {/* Target Selector */}
            <div className="flex flex-wrap items-center gap-2 pt-2 justify-center lg:justify-start text-xs text-slate-300">
              <span className="font-bold text-slate-400 text-xs">الهدف:</span>
              {[33, 100, 500, 1000, 0].map((t) => (
                <button
                  key={t}
                  onClick={() => setTasbeehTarget(t)}
                  className={`px-3.5 py-1 rounded-xl border text-xs font-bold cursor-pointer transition-all tabular-nums ${
                    tasbeehTarget === t
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                      : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {t === 0 ? 'مفتوح' : t}
                </button>
              ))}
            </div>

            {/* Stat Badges Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 max-w-md mx-auto lg:mx-0">
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">جلسة حالية</span>
                <strong className="text-sm font-mono font-black text-white tabular-nums">{totalTasbeehSession}</strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">اليوم</span>
                <strong className="text-sm font-mono font-black text-emerald-400 tabular-nums">{dailyTasbeeh}</strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">الإجمالي الكلي</span>
                <strong className="text-sm font-mono font-black text-[#F5D77F] tabular-nums">{allTimeTasbeeh}</strong>
              </div>
            </div>
          </div>

          {/* Right: Chrono Progress Ring Sphere Dial */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative flex items-center justify-center">
              {/* Outer Circular SVG Progress Ring */}
              <svg className="w-52 h-52 sm:w-56 sm:h-56 -rotate-90 pointer-events-none absolute" viewBox="0 0 200 200">
                {/* Track circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="5"
                />
                {/* Active progress arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="url(#misbahaGoldEmerald)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 92}
                  strokeDashoffset={(2 * Math.PI * 92) * (1 - misbahaProgressRatio)}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="misbahaGoldEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#F5D77F" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Main Sphere Button */}
              <button
                type="button"
                onClick={handleTasbeehClick}
                className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-[#0e463e] via-[#06221d] to-[#041613] p-1 border-2 border-[#D4AF37]/50 shadow-[0_15px_40px_rgba(4,26,23,0.7)] hover:scale-[1.03] active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center group relative overflow-hidden"
              >
                {/* Specular Dial Flare */}
                <div className="absolute top-2 left-6 w-20 h-10 rounded-full bg-white/10 blur-[2px] pointer-events-none" />

                <div className="flex flex-col items-center justify-center p-4 text-center z-10">
                  <span className="text-5xl sm:text-6xl font-mono font-black tabular-nums text-white group-hover:text-[#F5D77F] transition-colors leading-none tracking-tight">
                    {tasbeehCount}
                  </span>
                  
                  <span className="text-xs text-emerald-300/80 font-mono tabular-nums mt-1 font-bold">
                    {tasbeehTarget > 0 ? `/ ${tasbeehTarget}` : 'تسبيح حر'}
                  </span>

                  <span className="text-[11px] text-[#F5D77F] font-bold mt-2.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-0.5 rounded-full shadow-sm">
                    اضغط للتسبيح ❖
                  </span>
                </div>
              </button>
            </div>

            {/* Reset Counter Button */}
            <button
              onClick={resetTasbeeh}
              className="mt-3 flex items-center gap-1.5 text-xs text-emerald-200/70 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير العداد الحالي</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SECTION TABS (كافة أبواب أذكاري)                      */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">أبواب وأقسام الأذكار:</span>
            <button
              onClick={() => {
                setSelectedCategory('custom');
                setActiveMood(null);
                handleOpenAddCustom();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="إضافة ذكر أو دعاء مخصص جديد"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ إضافة ذكر مخصص</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Sequence Play Button */}
            <button
              onClick={handleToggleSequence}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                isPlayingSequence
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'lux-well text-slate-300 hover:text-white hover:border-white/20'
              }`}
            >
              {isPlayingSequence ? <Square className="w-3 h-3 text-rose-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span>{isPlayingSequence ? 'إيقاف القراءة المتتالية' : 'قراءة الورد متتالياً 🎧'}</span>
            </button>

            {/* Reset Current Section Counters */}
            <button
              onClick={handleResetCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl lux-well text-slate-400 hover:text-white text-xs border transition-colors cursor-pointer"
              title="إعادة تعيين عدادات هذا القسم"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تصفير الورد</span>
            </button>
          </div>
        </div>

        {/* Tab Buttons Bar - Symmetrical wrapping grid */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {[
            { id: 'morning', label: 'أذكار الصباح ☀️', icon: Sun },
            { id: 'evening', label: 'أذكار المساء 🌙', icon: Moon },
            { id: 'custom', label: `أذكار مخصصة (${customAthkarCount}) ✍️`, icon: Sparkles, featured: true },
            { id: 'prayer', label: 'أذكار الصلاة 🕌', icon: Compass },
            { id: 'sleep', label: 'النوم والاستيقاظ 🛏️', icon: Bed },
            { id: 'work', label: 'العمل والبركة 💼', icon: Briefcase },
            { id: 'distress', label: 'تفريج الكرب والهم 🤲', icon: ShieldCheck },
            { id: 'ruqyah', label: 'الرقية الشرعية 🌿', icon: Sparkles },
            { id: 'quranic', label: 'أدعية قرآنية 📖', icon: BookOpen },
            { id: 'favorites', label: `المفضلة (${favoriteIds.length}) ⭐`, icon: Heart },
            { id: 'all', label: 'كافة الأذكار 📋', icon: Sparkles },
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id && !activeMood;
            const isFeaturedCustom = tab.id === 'custom';
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id as any);
                  setActiveMood(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? (isFeaturedCustom
                        ? 'bg-amber-500/25 text-amber-200 border-amber-500/60 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/40'
                        : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/30')
                    : (isFeaturedCustom
                        ? 'lux-well text-amber-300 border-amber-500/40 hover:bg-amber-900/30 hover:border-amber-400'
                        : 'lux-well text-slate-400 hover:text-slate-200 hover:border-white/15')
                }`}
              >
                <Icon className={`w-4 h-4 ${isFeaturedCustom ? 'text-amber-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Completion Progress Bar */}
        <div className="p-4 sm:p-5 rounded-3xl lux-card border border-white/10 space-y-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في أي ذكر أو دعاء أو فضل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="lux-input w-full pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Section Progress Counter */}
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-slate-400 font-medium">
                إنجاز هذا الورد: <strong className="text-emerald-400 font-mono">{sectionStats.completed}</strong> من <strong className="text-white font-mono">{sectionStats.total}</strong> ذكر
              </span>
              <span className="font-mono font-extrabold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                {sectionStats.percent}%
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-[1px] border border-white/5">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${sectionStats.percent}%` }}
            />
          </div>

          {/* Voice Recitation Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsVoiceReciteEnabled(!isVoiceReciteEnabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                isVoiceReciteEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'lux-well text-slate-400 hover:text-white'
              }`}
              title="تلاوة صوتية واضحة ومسموعة عند النقر على أي بطاقة ذكر"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>تلاوة مسموعة عند لمس الذكر {isVoiceReciteEnabled ? '✓' : '✕'}</span>
            </button>
            <span className="text-[11px] text-slate-400">
              {isVoiceReciteEnabled ? 'اضغط على أي ذكر لقراءته بصوت مسموع وواضح' : 'القراءة الصوتية التلقائية متوقفة'}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Category Top CTA Banner */}
      {selectedCategory === 'custom' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="icon-squircle-gold w-11 h-11 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm sm:text-base">
                أبواب وأقسام أذكارك وأدعيتك المخصصة ✍️
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                أضف أذكارك وأدعيتك الخاصة لسعادة الدكتور عبد العزيز وحدد عدد التسبيحات والفضل ليتم حفظها ومزامنتها سحابياً.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddCustom}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-105 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ذكر مخصص جديد</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ATHKAR CARDS GRID (SYMMETRICAL 2-COLUMN LUXURY CARDS) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {filteredAthkar.map((item, index) => {
          const remaining = athkarProgress[item.id] !== undefined ? athkarProgress[item.id] : item.count;
          const isDone = remaining === 0;
          const isFav = favoriteIds.includes(item.id);
          const isCurrentlyPlaying = currentPlayingIndex === index && isPlayingSequence;

          const textSizeClass = fontSize === 'xl' ? 'text-xl sm:text-2xl' : (fontSize === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg');

          return (
            <div
              key={item.id}
              onClick={() => handleDhikrProgress(item)}
              className={`p-6 rounded-3xl border transition-all duration-200 cursor-pointer select-none relative overflow-hidden group flex flex-col justify-between ${
                isDone
                  ? 'bg-slate-900/50 border-emerald-500/40 shadow-inner'
                  : (isCurrentlyPlaying
                      ? 'bg-slate-900 border-amber-500/60 shadow-xl shadow-amber-500/20 ring-1 ring-amber-500/40'
                      : 'lux-card border-white/10 hover:border-emerald-500/40 hover:shadow-xl')
              }`}
            >
              <div>
                {/* Card Header (Index, Title, Actions) */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[11px] font-mono font-black text-emerald-400">
                      {index + 1}
                    </span>
                    <h4 className="font-extrabold text-white text-xs sm:text-sm">
                      {item.title || 'ذكر نبوي شريف'}
                    </h4>
                    {(item.category === 'custom' || item.isCustom) && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        مخصص ✨
                      </span>
                    )}
                  </div>

                  {/* Toolbar Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Edit Custom Dhikr */}
                    {(item.category === 'custom' || item.isCustom) && (
                      <button
                        onClick={(e) => handleOpenEditCustom(item, e)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="تعديل هذا الذكر المخصص"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete Custom Dhikr */}
                    {(item.category === 'custom' || item.isCustom) && (
                      <button
                        onClick={(e) => handleDeleteCustomDhikr(item.id, e)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="حذف هذا الذكر المخصص"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Favorite Toggle */}
                    <button
                      onClick={(e) => handleToggleFavorite(item.id, e)}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        isFav ? 'text-rose-400 bg-rose-500/15' : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
                    </button>

                    {/* Copy Text */}
                    <button
                      onClick={(e) => handleCopyText(item.id, item.text, e)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="نسخ الذكر"
                    >
                      {copiedId === item.id ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Single Audio Read */}
                    <button
                      type="button"
                      onClick={(e) => handleReadDhikr(item, e)}
                      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        playingDhikrId === item.id
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-500/40'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.06]'
                      }`}
                      title={playingDhikrId === item.id ? 'إيقاف القراءة الصوتية' : 'استماع صوتي واضح للذكر'}
                    >
                      {playingDhikrId === item.id ? (
                        <Square className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dhikr Body Text with Elegant Tashkeel */}
                <p className={`${textSizeClass} text-white font-serif leading-loose my-3 select-text`} dir="rtl">
                  {item.text}
                </p>

                {/* Reward & Reference Box */}
                {item.reward && (
                  <div className="text-xs text-emerald-200/90 bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 my-3 leading-relaxed">
                    <span className="font-extrabold text-emerald-400">الفضل:</span> {item.reward}
                    {item.reference && (
                      <span className="text-slate-400 mr-2 text-[11px] block sm:inline mt-1 sm:mt-0 font-sans">
                        [{item.reference}]
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Interactive Counter Dial */}
              <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.08] text-xs mt-2">
                <span className="text-[11px] text-slate-400 font-medium">
                  {isDone ? 'اكتمل هذا الذكر بحمد الله' : 'المس البطاقة في أي مكان للتسبيح'}
                </span>

                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition-all border ${
                    isDone
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-500/25 group-hover:border-emerald-500/50'
                  }`}
                >
                  {isDone ? (
                    <>
                      <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      <span>تم بحمد الله ✅</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400 text-[11px]">المتبقي:</span>
                      <span className="font-mono text-base font-black text-white">
                        {remaining}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/ {item.count}</span>
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
        <div className="p-12 text-center rounded-3xl lux-card border border-white/10 space-y-4">
          <div className="icon-squircle-emerald w-12 h-12 mx-auto">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-base font-extrabold text-white">
            {selectedCategory === 'custom'
              ? 'لا توجد أذكار مخصصة مضافة بعد'
              : 'لا توجد أذكار في هذا القسم'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {selectedCategory === 'custom'
              ? 'يمكن لسعادة الدكتور عبد العزيز إضافة أذكاره وأدعيته الخاصة هنا، مع تحديد عدد التكرار والفضل ليتم حفظها ومزامنتها سحابياً.'
              : 'جرّب تغيير خيارات البحث أو استعراض أبواب أخرى من الأذكار.'}
          </p>
          {selectedCategory === 'custom' && (
            <button
              type="button"
              onClick={handleOpenAddCustom}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول ذكر مخصص للدكتور عبد العزيز ✍️</span>
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SETTINGS MODAL: FLOATING DHIKR ON-SCREEN              */}
      {/* ======================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="icon-squircle-emerald w-8 h-8">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-white">
                  إعدادات أذكار الشاشة التلقائية 🕊️
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
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
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:border-white/20'
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
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {secs} ثوانٍ
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound on popup */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
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
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-200 font-extrabold border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
              >
                تجربة ظهور الذكر على الشاشة الآن 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. CUSTOM DHIKR MODAL (إضافة ذكر ودعاء خاص)             */}
      {/* ======================================================== */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className={editingCustomId ? "icon-squircle-gold w-8 h-8" : "icon-squircle-emerald w-8 h-8"}>
                  {editingCustomId ? (
                    <Edit3 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {editingCustomId ? 'تعديل الذكر أو الدعاء المخصص' : 'إضافة ذكر أو دعاء مخصص للدكتور عبد العزيز'}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
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
                  className="lux-input w-full px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none"
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
                  className="lux-input w-full px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none font-serif text-sm leading-relaxed"
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
                    className="lux-input w-full px-4 py-2.5 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الفضل أو الملاحظة:</label>
                  <input
                    type="text"
                    placeholder="مثال: تيسير وشفاء بإذن الله"
                    value={customReward}
                    onChange={(e) => setCustomReward(e.target.value)}
                    className="lux-input w-full px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3.5 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-white/[0.06] text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-105 text-white font-extrabold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                >
                  {editingCustomId ? 'حفظ التعديلات ✅' : 'حفظ في أذكاري ✅'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
