import React, { useState } from 'react';
import {
  Compass,
  CheckSquare,
  Clock,
  Plus,
  Play,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Volume2,
  Mic,
  Award,
  ArrowLeft,
  Film,
  MessageCircle
} from 'lucide-react';
import { Task, PrayerInfo, PrayerSettings, TaskPriority, TaskCategory } from '../types';
import { audioService } from '../services/audioService';
import { VoiceTaskModal } from './VoiceTaskModal';
import { dailySystemService, calculateScore, isMinDay, formatDateKey } from '../services/dailySystemService';

interface DashboardProps {
  prayerTimes: PrayerInfo[];
  nextPrayer: PrayerInfo;
  remainingTime: { hours: number; minutes: number; seconds: number; formatted: string; totalSeconds?: number };
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onToggleTask: (taskId: string) => void;
  onPreviewTaskAudio: (task: Task) => void;
  onPlayAzanPreview: () => void;
  prayerSettings: PrayerSettings;
  setActiveTab: (tab: string) => void;
  onOpenInstallModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  prayerTimes,
  nextPrayer,
  remainingTime,
  tasks,
  onAddTask,
  onToggleTask,
  onPreviewTaskAudio,
  onPlayAzanPreview,
  prayerSettings,
  setActiveTab,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('work');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr || !t.dueDate);
  const pendingTasks = todayTasks.filter((t) => t.status !== 'completed');
  const completedTasks = todayTasks.filter((t) => t.status === 'completed');
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent');

  const completionPercentage =
    todayTasks.length > 0 ? Math.round((completedTasks.length / todayTasks.length) * 100) : 0;

  // Daily Habit System quick stats
  const todayKey = formatDateKey(new Date());
  const todayRecord = dailySystemService.getDay(todayKey);
  const dailySettings = dailySystemService.getSettings();
  const dailyScore = calculateScore(todayRecord, dailySettings);
  const minMet = isMinDay(todayRecord, dailySettings);

  // Unified schedule for today (Prayers + Tasks)
  const timelineItems = [
    ...prayerTimes.map((p) => ({
      type: 'prayer' as const,
      id: `p-${p.id}`,
      title: `صلاة ${p.arabicName}`,
      time: p.time,
      timeString: p.formatted12h,
      isPassed: p.isPassed,
      isNext: p.isNext,
      raw: p,
    })),
    ...todayTasks.map((t) => {
      const [h, m] = (t.dueTime || '12:00').split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return {
        type: 'task' as const,
        id: t.id,
        title: t.title,
        time: d,
        timeString: t.dueTime,
        isPassed: t.status === 'completed' || d < new Date(),
        isNext: false,
        raw: t,
      };
    }),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const time =
      quickTime ||
      `${new Date().getHours().toString().padStart(2, '0')}:${(new Date().getMinutes() + 30)
        .toString()
        .padStart(2, '0')}`;

    onAddTask({
      title: quickTitle.trim(),
      dueDate: todayStr,
      dueTime: time,
      priority: quickPriority,
      category: quickCategory,
      reminderMinutesBefore: 5,
      voiceMessage: `يا دكتور عبد العزيز، تذكير بمهمة: ${quickTitle.trim()}. يرجى متابعتها الآن.`,
      repeat: 'none',
    });

    setQuickTitle('');
    setQuickTime('');
  };

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade-in pb-12">
      {/* Executive Welcome Card */}
      <div className="relative overflow-hidden rounded-[22px] sm:rounded-3xl lux-card-gold p-4 sm:p-6">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl p-[1.5px] bg-gradient-to-br from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] shadow-[0_6px_20px_rgba(212,175,55,0.2)] shrink-0">
              <img
                src="/logo.png"
                alt="شعار د. عبد العزيز الرسمي"
                className="w-full h-full object-cover rounded-[14px] bg-[#06080D]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                  أهلاً بك، دكتور عبد العزيز
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  النظام نشط
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                تنبيهاتك الصوتية، مواقيت الصلاة، ومهام يومك مضبوطة بدقة ومنسقة بالكامل باسمك.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => audioService.playDoctorWelcome()}
            className="btn-lux-secondary h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Volume2 className="w-4 h-4 text-[#E7C66C]" strokeWidth={1.75} />
            <span>نداء ترحيبي: «يا دكتور عبد العزيز»</span>
          </button>
        </div>
      </div>

      {/* Hero Row: Next Prayer Countdown + Daily Achievement Index */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Prayer Countdown */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl lux-card-emerald p-5 sm:p-7 flex flex-col justify-between">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-right w-full md:w-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-300 text-[11px] font-bold border border-emerald-500/25">
                <Compass className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
                <span>الصلاة القادمة بمشيئة الله</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                صلاة {nextPrayer.arabicName}
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm">
                في تمام الساعة{' '}
                <span className="font-bold text-[#E7C66C] font-mono tabular-nums text-sm sm:text-base">
                  {nextPrayer.formatted12h}
                </span>{' '}
                حسب توقيت {prayerSettings.cityName}
              </p>

              <div className="pt-2 grid grid-cols-2 gap-2.5 sm:flex sm:w-auto justify-center md:justify-start">
                <button
                  type="button"
                  onClick={onPlayAzanPreview}
                  className="btn-lux-primary h-10 px-5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" strokeWidth={1.75} />
                  <span>سماع الأذان الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prayers')}
                  className="btn-lux-secondary h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>جدول الصلوات</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Precision Digital Countdown Well */}
            <div className="lux-well flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl w-full md:w-auto md:min-w-[270px]">
              <span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-3">
                الوقت المتبقي للأذان
              </span>

              <div className="flex items-start justify-center gap-1.5 sm:gap-2.5" dir="ltr">
                {/* Hours */}
                <div className="flex flex-col items-center w-14 sm:w-16">
                  <span className="text-3xl sm:text-4xl font-mono font-extrabold tabular-nums text-white tracking-tight">
                    {remainingTime.hours.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1.5">ساعة</span>
                </div>

                <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--lux-accent)] opacity-60 pt-0.5 select-none">
                  :
                </span>

                {/* Minutes */}
                <div className="flex flex-col items-center w-14 sm:w-16">
                  <span className="text-3xl sm:text-4xl font-mono font-extrabold tabular-nums text-[var(--lux-accent)] tracking-tight">
                    {remainingTime.minutes.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1.5">دقيقة</span>
                </div>

                <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--lux-accent)] opacity-60 pt-0.5 select-none">
                  :
                </span>

                {/* Seconds */}
                <div className="flex flex-col items-center w-14 sm:w-16">
                  <span className="text-3xl sm:text-4xl font-mono font-extrabold tabular-nums text-[#E7C66C] tracking-tight">
                    {remainingTime.seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1.5">ثانية</span>
                </div>
              </div>

              <div className="mt-4 w-full bg-[var(--lux-track-bg)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0071E3] to-[#C59014] h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, Math.max(5, (1 - (remainingTime.totalSeconds || 0) / (4 * 3600)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Achievement Card */}
        <div className="lux-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="icon-squircle-emerald w-9 h-9">
                  <TrendingUp className="w-4 h-4" strokeWidth={1.85} />
                </div>
                <span className="text-sm font-bold text-white">مؤشر إنجاز اليوم</span>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.08] font-bold tabular-nums">
                {completedTasks.length} / {todayTasks.length} مهام
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>إنجاز المهام اليومية</span>
                  <span className="font-bold text-emerald-400 font-mono tabular-nums">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-[var(--lux-track-bg)] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#0071E3] to-[#38BDF8] h-full rounded-full transition-all duration-700"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="lux-well p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">قيد الانتظار</span>
                  <div className="text-xl font-extrabold text-[#E7C66C] font-mono tabular-nums mt-0.5">
                    {pendingTasks.length}
                  </div>
                </div>
                <div className="lux-well p-3 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">عاجلة</span>
                  <div className="text-xl font-extrabold text-rose-400 font-mono tabular-nums mt-0.5">
                    {urgentTasks.length}
                  </div>
                </div>
              </div>

              {/* Daily System Shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('daily_system')}
                className="w-full p-3 rounded-2xl lux-card-emerald hover:brightness-110 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="icon-squircle-emerald w-10 h-10 font-mono font-extrabold text-sm tabular-nums shrink-0">
                    {dailyScore.total}
                  </div>
                  <div className="text-right min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors">
                      <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.85} />
                      <span>نظامي اليومي</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {minMet ? '✓ تم تحقيق الحد الأدنى اليومي' : 'سجّل صلواتك وعاداتك (من 100 نقطة)'}
                    </span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform shrink-0" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-[#E7C66C] shrink-0" strokeWidth={1.75} />
            <span>«إن الله يحب إذا عمل أحدكم عملاً أن يتقنه»</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Right Control Stack */}
        <div className="space-y-5">
          {/* Quick Task Form */}
          <div className="lux-card rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <div className="icon-squircle-emerald w-8 h-8">
                  <Plus className="w-4 h-4" strokeWidth={2} />
                </div>
                <span>تذكير عمل سريع</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="btn-lux-gold px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
                title="إضافة مهمة بالصوت"
              >
                <Mic className="w-3.5 h-3.5" strokeWidth={2} />
                <span>إملاء صوتي</span>
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  عنوان المهمة
                </label>
                <input
                  type="text"
                  placeholder="مثال: مراجعة التقرير الطبي النهائي"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="lux-input w-full px-3.5 py-2.5 text-sm placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    وقت التنبيه
                  </label>
                  <input
                    type="time"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    className="lux-input w-full px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    الأولوية
                  </label>
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                    className="lux-input w-full px-3 py-2 text-xs"
                  >
                    <option value="urgent">عاجل جداً</option>
                    <option value="high">مرتفعة</option>
                    <option value="medium">متوسطة</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  التصنيف
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'work', label: 'عمل' },
                    { id: 'meeting', label: 'اجتماع' },
                    { id: 'clinic', label: 'العيادة' },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setQuickCategory(c.id as TaskCategory)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        quickCategory === c.id
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                          : 'lux-well text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-lux-primary w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                <span>حفظ وجدولة التنبيه</span>
              </button>
            </form>
          </div>

          {/* Media Auto-Scheduler Showcase Card */}
          <div className="lux-card-interactive rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="icon-squircle-gold w-9 h-9">
                  <Film className="w-4 h-4" strokeWidth={1.85} />
                </div>
                <span className="text-[11px] font-bold text-[#E7C66C] tracking-wide">
                  استوديو البث والوسائط
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <h4 className="text-base font-bold text-white mb-1.5">
              جدولة الفيديو والصوت التلقائية
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              ارفع مقاطع الفيديو أو الملفات الصوتية لتعمل تلقائياً كمنبّه في وقتها المحدد حتى مع قفل الهاتف.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('audio_scheduler')}
              className="btn-lux-secondary w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>فتح المشغّل المجدول</span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Left: Unified Executive Timeline (Prayers + Tasks) */}
        <div className="lg:col-span-2 lux-card rounded-3xl p-5 sm:p-7">
          <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="icon-squircle-emerald w-10 h-10 shrink-0">
                <Clock className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  الجدول الزمني الموحد لليوم
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تنسيق زمني دقيق يجمع مواقيت الصلوات مع مهام العمل والعيادة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="btn-lux-secondary px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>كل المهام</span>
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
            </button>
          </div>

          <div className="relative border-r border-white/[0.08] mr-2 sm:mr-3 space-y-3.5">
            {timelineItems.map((item) => {
              const isPrayer = item.type === 'prayer';
              const prayer = isPrayer ? (item.raw as PrayerInfo) : null;
              const task = !isPrayer ? (item.raw as Task) : null;

              return (
                <div key={item.id} className="relative pr-5 sm:pr-7">
                  {/* Refined Timeline Marker */}
                  <div
                    className={`absolute -right-[6.5px] top-4 w-3 h-3 rounded-full border-2 border-[#0C1019] transition-all ${
                      isPrayer
                        ? prayer?.isNext
                          ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                          : prayer?.isPassed
                            ? 'bg-slate-600'
                            : 'bg-emerald-500/80'
                        : task?.status === 'completed'
                          ? 'bg-emerald-500'
                          : task?.priority === 'urgent'
                            ? 'bg-rose-500 ring-4 ring-rose-500/20'
                            : 'bg-[#E7C66C]'
                    }`}
                  />

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isPrayer
                        ? prayer?.isNext
                          ? 'lux-card-emerald'
                          : 'lux-well hover:border-white/[0.10]'
                        : task?.status === 'completed'
                          ? 'lux-well opacity-55'
                          : 'bg-white/[0.025] border-white/[0.07] hover:border-white/[0.13]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {isPrayer ? (
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              prayer?.isNext
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                            }`}
                          >
                            <Compass className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => task && onToggleTask(task.id)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                              task?.status === 'completed'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-white/[0.04] border-white/[0.10] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
                            }`}
                          >
                            {task?.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                            ) : (
                              <CheckSquare className="w-4 h-4" strokeWidth={1.75} />
                            )}
                          </button>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={`text-sm font-bold truncate ${
                                task?.status === 'completed' ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h4>

                            {isPrayer && prayer?.isNext && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                                الصلاة القادمة
                              </span>
                            )}

                            {!isPrayer && task && (
                              <>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    task.priority === 'urgent'
                                      ? 'bg-rose-500/12 text-rose-300 border-rose-500/25'
                                      : task.priority === 'high'
                                        ? 'bg-amber-500/12 text-amber-300 border-amber-500/25'
                                        : 'bg-white/[0.05] text-slate-300 border-white/[0.09]'
                                  }`}
                                >
                                  {task.priority === 'urgent'
                                    ? 'عاجل'
                                    : task.priority === 'high'
                                      ? 'مرتفعة'
                                      : 'عادية'}
                                </span>
                                {task.whatsapp?.enabled && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 font-semibold inline-flex items-center gap-1">
                                    <MessageCircle className="w-2.5 h-2.5" strokeWidth={2} />
                                    واتساب
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {!isPrayer && task?.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mr-auto sm:mr-0 shrink-0">
                        <span className="font-mono tabular-nums text-xs font-bold text-slate-200 lux-well px-2.5 py-1 rounded-lg">
                          {item.timeString}
                        </span>

                        {!isPrayer && task && (
                          <button
                            type="button"
                            onClick={() => onPreviewTaskAudio(task)}
                            title="استماع للتنبيه الصوتي"
                            className="btn-lux-icon !w-8 !h-8 text-slate-300 hover:text-emerald-300 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Task Modal */}
      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddTask={onAddTask}
      />
    </div>
  );
};
