import React, { useState } from 'react';
import { 
  Compass, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Play, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Volume2,
  Radio,
  Smartphone,
  Download
} from 'lucide-react';
import { Task, PrayerInfo, PrayerSettings, TaskPriority, TaskCategory } from '../types';
import { audioService } from '../services/audioService';

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
  onOpenInstallModal,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('work');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr || !t.dueDate);
  const pendingTasks = todayTasks.filter((t) => t.status !== 'completed');
  const completedTasks = todayTasks.filter((t) => t.status === 'completed');
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent');

  const completionPercentage = todayTasks.length > 0 
    ? Math.round((completedTasks.length / todayTasks.length) * 100) 
    : 0;

  // Build unified schedule for today (Prayers + Tasks)
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

    const time = quickTime || `${new Date().getHours().toString().padStart(2, '0')}:${(new Date().getMinutes() + 30).toString().padStart(2, '0')}`;

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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Doctor Abdelaziz Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 p-4 sm:p-7 border border-emerald-500/25 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40 overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="شعار د. عبد العزيز الرسمي"
                className="w-full h-full object-cover rounded-[14px] bg-slate-950"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  أهلاً بك يا دكتور عبد العزيز 👋
                </h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold hidden sm:inline-flex">
                  المساعد الشخصي نشط
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                جميع التنبيهات الصوتية ومواقيت الصلاة ومواعيدك اليومية مضبوطة بدقة ومنسقة باسمك.
              </p>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto">
            <button
              onClick={() => audioService.playDoctorWelcome()}
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95"
            >
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>تجربة نداء: «يا دكتور عبد العزيز»</span>
            </button>
          </div>
        </div>
      </div>

      {/* PWA Mobile App Quick Banner */}
      {onOpenInstallModal && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 p-4 border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">تثبيت التطبيق على هاتفك المحمول (Android / iPhone)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  متوافق 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                يمكنك تثبيت النظام كأيقونة تطبيق رسمي على شاشة جوالك ليعمل بملء الشاشة وبدون اتصال بالإنترنت.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenInstallModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت التطبيق الآن</span>
          </button>
        </div>
      )}

      {/* Hero Section: Live Prayer Countdown & Today Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        
        {/* Next Prayer Countdown Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 p-5 sm:p-8 border border-emerald-500/30 shadow-2xl glow-emerald">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-3 text-center md:text-right w-full md:w-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>الصلاة القادمة بمشيئة الله</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                صلاة {nextPrayer.arabicName}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm">
                في تمام الساعة <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">{nextPrayer.formatted12h}</span> حسب توقيت {prayerSettings.cityName}
              </p>
              
              <div className="pt-2 grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto justify-center md:justify-start">
                <button
                  onClick={onPlayAzanPreview}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>سماع الأذان الآن</span>
                </button>
                <button
                  onClick={() => setActiveTab('prayers')}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                >
                  <span>جدول الصلوات</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Glowing Digital Countdown Dial */}
            <div className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-700/80 shadow-inner w-full md:w-auto md:min-w-[240px]">
              <span className="text-xs text-slate-400 font-medium mb-1">الوقت المتبقي للأذان</span>
              <div className="text-3xl sm:text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-wider">
                {remainingTime.formatted}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1 uppercase font-mono">
                <span>ساعة</span>
                <span>دقيقة</span>
                <span>ثانية</span>
              </div>
              <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(5, (1 - (remainingTime.totalSeconds || 0) / (4 * 3600)) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity & Daily Progress Card */}
        <div className="rounded-3xl bg-slate-900 p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                مؤشر إنجاز اليوم
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {completedTasks.length} من {todayTasks.length} مهام
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>نسبة الإنجاز</span>
                  <span className="font-bold text-blue-400 font-mono">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Status chips */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <span className="text-xs text-slate-400">مهام قيد الانتظار</span>
                  <div className="text-xl font-bold text-amber-400 mt-0.5">{pendingTasks.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <span className="text-xs text-slate-400">مهام عاجلة جداً</span>
                  <div className="text-xl font-bold text-rose-400 mt-0.5">{urgentTasks.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              «إن الله يحب إذا عمل أحدكم عملاً أن يتقنه»
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Task Form & Combined Day Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Quick Task Creation Card */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 p-6 border border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              إضافة تذكير عمل سريع مع نطق صوتي
            </h3>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان المهمة
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسليم تقرير المبيعات للمدير"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    وقت التنبيه
                  </label>
                  <input
                    type="time"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    درجة الأهمية
                  </label>
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="urgent">عاجل جداً</option>
                    <option value="high">مرتفعة</option>
                    <option value="medium">متوسطة</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  التصنيف
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'work', label: 'عمل' },
                    { id: 'meeting', label: 'اجتماع' },
                    { id: 'dev', label: 'برمجة' },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setQuickCategory(c.id as TaskCategory)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        quickCategory === c.id
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>حفظ وجدولة التذكير الصوتي</span>
              </button>
            </form>
          </div>

          {/* Quick Media Scheduler Card */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-950/40 via-cyan-950/30 to-slate-900 p-6 border border-purple-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                المشغّل التلقائي للوسائط
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              رفع وجدولة الفيديو والصوت
            </h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              ارفع مقاطع فيديو (MP4) أو ملفات صوت (MP3) لتعمل تلقائياً بشاشة عرض منبثقة أو بث صوتي في الوقت المحدد.
            </p>
            <button
              onClick={() => setActiveTab('audio_scheduler')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/20"
            >
              <span>فتح المشغل المجدول للوسائط</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Unified Chronological Timeline (Prayers + Tasks) */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl bg-slate-900 p-4 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                الجدول الزمني الموحد لليوم (الصلاة والعمل)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                تنسيق متناغم يربط بين واجباتك الدينية والتزاماتك المهنية دون تعارض
              </p>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>جميع المهام</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative border-r-2 border-slate-800 mr-2 sm:mr-4 space-y-4 sm:space-y-6">
            {timelineItems.map((item) => {
              const isPrayer = item.type === 'prayer';
              const prayer = isPrayer ? (item.raw as PrayerInfo) : null;
              const task = !isPrayer ? (item.raw as Task) : null;

              return (
                <div key={item.id} className="relative pr-5 sm:pr-8 group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -right-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-900 transition-all ${
                      isPrayer
                        ? prayer?.isNext
                          ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse'
                          : prayer?.isPassed
                          ? 'bg-slate-600'
                          : 'bg-emerald-500'
                        : task?.status === 'completed'
                        ? 'bg-blue-500'
                        : task?.priority === 'urgent'
                        ? 'bg-rose-500 ring-4 ring-rose-500/20'
                        : 'bg-amber-400'
                    }`}
                  ></div>

                  {/* Item Content Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isPrayer
                        ? prayer?.isNext
                          ? 'bg-emerald-950/20 border-emerald-500/40 glow-emerald'
                          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
                        : task?.status === 'completed'
                        ? 'bg-slate-800/20 border-slate-800 opacity-60'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {isPrayer ? (
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Compass className="w-4 h-4" />
                          </div>
                        ) : (
                          <button
                            onClick={() => task && onToggleTask(task.id)}
                            className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-emerald-500/20 border border-slate-600 hover:border-emerald-500/40 flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            {task?.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <CheckSquare className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-bold ${
                                task?.status === 'completed' ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h4>

                            {isPrayer && prayer?.isNext && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                الأذان القادم
                              </span>
                            )}

                            {!isPrayer && task && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                    : task.priority === 'high'
                                    ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                                    : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                }`}
                              >
                                {task.priority === 'urgent'
                                  ? 'عاجل'
                                  : task.priority === 'high'
                                  ? 'مهم'
                                  : 'عادي'}
                              </span>
                            )}
                          </div>

                          {!isPrayer && task?.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Time & Preview button */}
                      <div className="flex items-center gap-3 mr-auto sm:mr-0">
                        <div className="font-mono text-xs font-bold text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/60">
                          {item.timeString}
                        </div>

                        {!isPrayer && task && (
                          <button
                            onClick={() => onPreviewTaskAudio(task)}
                            title="تجربة النطق الصوتي للتنبيه"
                            className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
