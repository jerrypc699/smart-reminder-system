import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
  BookOpen,
  Activity,
  GraduationCap,
  Moon,
  Droplets,
  Utensils,
  Scale,
  Briefcase,
  Flame,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  DownloadCloud,
  Check,
  TrendingUp,
  AlertTriangle,
  FileText,
  Clock,
  Compass,
  Paperclip,
  ExternalLink,
  Image as ImageIcon,
  Cloud,
  CheckSquare
} from 'lucide-react';
import { Task } from '../types';
import {
  dailySystemService,
  DailyRecord,
  DailySettings,
  MonthlyReview,
  calculateScore,
  isMinDay,
  hasData,
  formatDateKey,
  parseDateKey,
  addDaysToDateKey,
  padZero,
  getHeatmapColor,
  calculateMonthStats,
  PRAYERS_LIST,
  ADHKAR_LIST,
  CATEGORIES_LIST,
} from '../services/dailySystemService';
import { audioService } from '../services/audioService';
import { taskAttachmentService, formatAttachmentSize } from '../services/taskAttachmentService';
import { PdfExportModal } from './PdfExportModal';
import { ImageLightboxModal } from './ImageLightboxModal';

interface DailySystemViewProps {
  tasks: Task[];
  onOpenAthkar?: () => void;
  onToggleTask?: (taskId: string) => void;
  onOpenTasksTab?: () => void;
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const DailySystemView: React.FC<DailySystemViewProps> = ({
  tasks,
  onOpenAthkar,
  onToggleTask,
  onOpenTasksTab,
}) => {
  const [activeTab, setActiveTab] = useState<'day' | 'month' | 'settings'>('day');
  const todayKey = formatDateKey(new Date());
  const [currentDateKey, setCurrentDateKey] = useState<string>(todayKey);
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(todayKey.slice(0, 7));

  // State from service
  const [dayRecord, setDayRecord] = useState<DailyRecord>(dailySystemService.getDay(currentDateKey));
  const [allDays, setAllDays] = useState<Record<string, DailyRecord>>(dailySystemService.getAllDays());
  const [settings, setSettings] = useState<DailySettings>(dailySystemService.getSettings());
  const [monthReview, setMonthReview] = useState<MonthlyReview>(dailySystemService.getMonthReview(currentMonthKey));

  // Work tasks & PDF report states
  const [dayTasksMode, setDayTasksMode] = useState<'all' | 'day'>('all');
  const [reportTasksFilter, setReportTasksFilter] = useState<'all' | 'month' | 'completed' | 'pending' | 'urgent'>('all');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 1500);
  };

  // Subscribe to service updates
  useEffect(() => {
    const unsub = dailySystemService.subscribe(() => {
      setDayRecord(dailySystemService.getDay(currentDateKey));
      setAllDays(dailySystemService.getAllDays());
      setSettings(dailySystemService.getSettings());
      setMonthReview(dailySystemService.getMonthReview(currentMonthKey));
    });
    return unsub;
  }, [currentDateKey, currentMonthKey]);

  // Keep dayRecord in sync when date changes
  useEffect(() => {
    setDayRecord(dailySystemService.getDay(currentDateKey));
  }, [currentDateKey]);

  // Keep monthReview in sync when month changes
  useEffect(() => {
    setMonthReview(dailySystemService.getMonthReview(currentMonthKey));
  }, [currentMonthKey]);

  const updateCurrentDay = (updates: Partial<DailyRecord>) => {
    const updated = { ...dayRecord, ...updates };
    setDayRecord(updated);
    dailySystemService.setDay(updated);
  };

  // Score computation
  const scoreResult = calculateScore(dayRecord, settings);
  const minDayAchieved = isMinDay(dayRecord);

  // Date navigation
  const navigateDay = (offset: number) => {
    const nextKey = addDaysToDateKey(currentDateKey, offset);
    setCurrentDateKey(nextKey);
    setCurrentMonthKey(nextKey.slice(0, 7));
  };

  const navigateMonth = (offset: number) => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const newMonthKey = `${d.getFullYear()}-${padZero(d.getMonth() + 1)}`;
    setCurrentMonthKey(newMonthKey);
  };

  const currentDateObj = parseDateKey(currentDateKey);
  const relativeDateLabel =
    currentDateKey === todayKey
      ? 'النهارده'
      : currentDateKey === addDaysToDateKey(todayKey, -1)
        ? 'امبارح'
        : currentDateKey === addDaysToDateKey(todayKey, 1)
          ? 'بكرة'
          : '';

  // Prayer click handler: 0 (none) -> 2 (on time) -> 1 (late) -> 0 (none)
  const handlePrayerClick = (prayerKey: keyof DailyRecord['prayers']) => {
    const currentStatus = dayRecord.prayers[prayerKey];
    const nextStatus = currentStatus === 0 ? 2 : currentStatus === 2 ? 1 : 0;
    const updatedPrayers = { ...dayRecord.prayers, [prayerKey]: nextStatus };
    updateCurrentDay({ prayers: updatedPrayers });

    if (nextStatus === 2) {
      audioService.playChime('success', 0.4);
      showToast('في وقتها (+5 نقط)');
    } else if (nextStatus === 1) {
      audioService.playChime('click', 0.4);
      showToast('متأخرة (+2 نقطة)');
    }
  };

  // Stepper helper
  const handleStep = (
    field: 'quran' | 'sport' | 'study' | 'sleep' | 'water',
    dir: number,
    stepSize: number
  ) => {
    const currentVal = dayRecord[field];
    const nextVal = Math.max(0, Math.round((currentVal + dir * stepSize) * 10) / 10);
    updateCurrentDay({ [field]: nextVal });
    audioService.playChime('click', 0.2);
  };

  // Month stats
  const monthStats = calculateMonthStats(currentMonthKey, allDays, settings);

  // Work tasks integration across Daily System & Reports
  const dayWorkTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === currentDateKey),
    [tasks, currentDateKey]
  );

  const monthWorkTasks = useMemo(
    () => tasks.filter((t) => (t.dueDate || '').startsWith(currentMonthKey)),
    [tasks, currentMonthKey]
  );

  const reportFilteredTasks = useMemo(() => {
    switch (reportTasksFilter) {
      case 'month':
        return monthWorkTasks;
      case 'completed':
        return tasks.filter((t) => t.status === 'completed');
      case 'pending':
        return tasks.filter((t) => t.status !== 'completed');
      case 'urgent':
        return tasks.filter((t) => t.priority === 'urgent');
      default:
        return tasks;
    }
  }, [tasks, monthWorkTasks, reportTasksFilter]);

  const totalWorkCompleted = tasks.filter((t) => t.status === 'completed').length;
  const totalWorkPending = tasks.filter((t) => t.status !== 'completed').length;
  const totalWorkUrgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
  const totalWorkAttachments = tasks.reduce((acc, t) => acc + (t.attachments?.length || 0), 0);

  const renderWorkTaskRow = (task: Task) => {
    const isCompleted = task.status === 'completed';
    const isUrgent = task.priority === 'urgent';
    return (
      <div
        key={task.id}
        className={`p-3.5 rounded-2xl border transition-all ${
          isCompleted
            ? 'bg-slate-950/40 border-slate-800/70 opacity-75'
            : isUrgent
            ? 'bg-slate-950/80 border-rose-500/40'
            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {onToggleTask ? (
              <button
                type="button"
                onClick={() => onToggleTask(task.id)}
                className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : 'bg-slate-900 border-slate-600 hover:border-emerald-500 text-transparent'
                }`}
                title={isCompleted ? 'تحديد كقيد الانتظار' : 'تحديد كمكتملة'}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div
                className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : 'bg-slate-900 border-slate-700 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    isCompleted ? 'line-through text-slate-500' : 'text-white'
                  }`}
                >
                  {task.title}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    task.priority === 'urgent'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : task.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {task.priority === 'urgent'
                    ? 'عاجل'
                    : task.priority === 'high'
                    ? 'مرتفع'
                    : task.priority === 'medium'
                    ? 'متوسط'
                    : 'منخفض'}
                </span>
              </div>

              {task.description && (
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Task Attached Files */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {task.attachments.map((att) => {
                    const isImg = att.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name);
                    return (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() =>
                          taskAttachmentService.openAttachment(att, (url, title) =>
                            setPreviewImage({ url, title })
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/35 text-indigo-200 text-[10px] font-semibold transition-colors cursor-pointer"
                        title="فتح / معاينة الملف"
                      >
                        {isImg ? (
                          <ImageIcon className="w-3 h-3 text-indigo-300 shrink-0" />
                        ) : (
                          <Paperclip className="w-3 h-3 text-indigo-300 shrink-0" />
                        )}
                        <span className="max-w-[120px] truncate">{att.name}</span>
                        <span className="text-indigo-300/70 font-mono">
                          ({formatAttachmentSize(att.size)})
                        </span>
                        {att.cloudUrl && <Cloud className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                        <ExternalLink className="w-2.5 h-2.5 opacity-75 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="text-left font-mono text-[10px] text-slate-400 shrink-0">
            <div className="font-bold text-slate-300">{task.dueTime}</div>
            <div>{task.dueDate}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto" dir="rtl">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xl border border-emerald-400 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  نظامي اليومي
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    متابعة وتقارير
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  تتبع الصلوات، الأذكار، القرآن، الرياضة، الصحة، وكافة مهام العمل مع تصدير PDF
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>تصدير تقرير PDF 📄</span>
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="grid grid-cols-3 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('day')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'day'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>اليوم</span>
            </button>

            <button
              onClick={() => setActiveTab('month')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'month'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>التقرير الشهري والمهام</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settings'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <Award className="w-4 h-4" />
              <span>الأهداف والنقاط</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: DAY VIEW */}
        {/* ======================================================== */}
        {activeTab === 'day' && (
          <div className="mt-5 space-y-5">
            {/* Date Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <button
                onClick={() => navigateDay(-1)}
                className="p-2 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors"
                title="اليوم السابق"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">السابق</span>
              </button>

              <div className="text-center">
                <div className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-2">
                  <span>
                    {AR_DAYS[currentDateObj.getDay()]} {currentDateObj.getDate()} {AR_MONTHS[currentDateObj.getMonth()]}
                  </span>
                  {relativeDateLabel && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {relativeDateLabel}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentDateObj.getFullYear()}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {currentDateKey !== todayKey && (
                  <button
                    onClick={() => {
                      setCurrentDateKey(todayKey);
                      setCurrentMonthKey(todayKey.slice(0, 7));
                    }}
                    className="p-2 sm:px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold cursor-pointer transition-colors"
                    title="الرجوع إلى اليوم"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">النهارده</span>
                  </button>
                )}

                <button
                  onClick={() => navigateDay(1)}
                  className="p-2 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors"
                  title="اليوم التالي"
                >
                  <span className="hidden sm:inline">التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Score Ring & Category Breakdown */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Circular Score Gauge */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all shadow-xl"
                    style={{
                      background: `conic-gradient(#10b981 ${scoreResult.total}%, #1e293b 0%)`,
                    }}
                  >
                    <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-slate-900 flex flex-col items-center justify-center border border-slate-800 shadow-inner">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                        {scoreResult.total}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold -mt-1">من 100</span>
                    </div>
                  </div>
                </div>

                {/* Categories Horizontal Progress Bars */}
                <div className="flex-1 w-full space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {CATEGORIES_LIST.map(({ key, label, max }) => {
                      const val = scoreResult.c[key] || 0;
                      const pct = Math.round((val / max) * 100);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-12 text-slate-400 font-semibold truncate">{label}</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-left font-mono font-bold text-slate-300">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Minimum Day Badge */}
                  <div className="pt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${minDayAchieved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}
                    >
                      {minDayAchieved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>✓ الحد الأدنى اتحقق بنجاح لليوم</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>الحد الأدنى: الصلوات الخمس + أذكار الصباح والمساء + صفحة قرآن + 10 دقائق حركة</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 1: PRAYERS (25 Points) */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">الصلاة</h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {scoreResult.c.prayer} / 25 نقطة
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {PRAYERS_LIST.map(([k, name]) => {
                  const status = dayRecord.prayers[k];
                  const isOntime = status === 2;
                  const isLate = status === 1;

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handlePrayerClick(k)}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${isOntime
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/25 scale-102'
                          : isLate
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      <span className="font-bold text-xs sm:text-sm">{name}</span>
                      <small className="text-[10px] mt-1 font-semibold opacity-90">
                        {isOntime ? 'في وقتها 🌟' : isLate ? 'متأخرة ⏳' : 'لم تُصلّ —'}
                      </small>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                💡 اضغط مرة = في وقتها (5 نقاط)، مرتين = متأخرة (2 نقطة)، تالت مرة = إلغاء
              </p>
            </div>

            {/* CARD 2: ADHKAR & DUA (10 Points) */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">الأذكار والدعاء</h3>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenAthkar && (
                    <button
                      type="button"
                      onClick={onOpenAthkar}
                      className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <span>قراءة الأذكار 📿</span>
                    </button>
                  )}
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {scoreResult.c.adhkar} / 10 نقاط
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ADHKAR_LIST.map(([k, label, pts]) => {
                  const active = dayRecord.adhkar[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...dayRecord.adhkar,
                          [k]: !active,
                        };
                        updateCurrentDay({ adhkar: updated });
                        if (!active) {
                          audioService.playChime('click', 0.3);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${active
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-400 shadow-md shadow-teal-500/20'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${active ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{label}</span>
                      <span className="text-[10px] opacity-75 font-mono">({pts}ن)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 3: QURAN, SPORT, STUDY (35 Points) */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">القرآن والرياضة والتعلّم</h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {Math.round(scoreResult.c.quran + scoreResult.c.sport + scoreResult.c.study)} / 35 نقطة
                </span>
              </div>

              {/* Quran */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">ورد القرآن</span>
                    <span className="text-[10px] text-slate-400">الهدف: {settings.quran} صفحات (10ن)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep('quran', -1, 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-white text-sm">
                    {dayRecord.quran} ص
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('quran', 1, 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sport */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">رياضة وحركة</span>
                    <span className="text-[10px] text-slate-400">الهدف: {settings.sport} دقيقة (10ن)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep('sport', -1, 5)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-white text-sm">
                    {dayRecord.sport} د
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('sport', 1, 5)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Study */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">تعلّم / مذاكرة</span>
                    <span className="text-[10px] text-slate-400">الهدف: {settings.study} دقيقة (15ن)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep('study', -1, 15)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-white text-sm">
                    {dayRecord.study} د
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('study', 1, 15)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 4: HEALTH (10 Points) */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">الصحة والراحة</h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {Math.round(scoreResult.c.health)} / 10 نقاط
                </span>
              </div>

              {/* Sleep */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">النوم</span>
                    <span className="text-[10px] text-slate-400">الهدف: {settings.sleep} ساعات (4ن)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep('sleep', -1, 0.5)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-white text-sm">
                    {dayRecord.sleep} س
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('sleep', 1, 0.5)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Water */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">شرب الماء</span>
                    <span className="text-[10px] text-slate-400">الهدف: {settings.water} أكواب (3ن)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStep('water', -1, 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-white text-sm">
                    {dayRecord.water} كوب
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep('water', 1, 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Food & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Clean Food Toggle */}
                <button
                  type="button"
                  onClick={() => updateCurrentDay({ food: !dayRecord.food })}
                  className={`p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${dayRecord.food
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold">أكل نضيف ومنتظم (3ن)</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center ${dayRecord.food ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-700'
                      }`}
                  >
                    {dayRecord.food && <Check className="w-4 h-4" />}
                  </div>
                </button>

                {/* Weight Input */}
                <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">الوزن (اختياري)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={dayRecord.weight}
                      onChange={(e) => updateCurrentDay({ weight: e.target.value })}
                      placeholder="0.0"
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs text-center focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs text-slate-400">كجم</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: WORK - TOP 3 TASKS (20 Points) */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">الشغل: أهم ٣ مهام اليوم</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      dailySystemService.importTasksFromWorkList(tasks, currentDateKey);
                      showToast('تم استيراد مهام اليوم بنجاح!');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
                    title="استيراد المهام المجدولة اليوم تلقائياً"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>استيراد من المهام</span>
                  </button>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {Math.round(scoreResult.c.work)} / 20 نقطة
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {dayRecord.tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const newTasks = [...dayRecord.tasks];
                        newTasks[idx] = { ...newTasks[idx], d: !newTasks[idx].d };
                        updateCurrentDay({ tasks: newTasks });
                        if (!task.d) {
                          audioService.playChime('success', 0.4);
                        }
                      }}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${task.d
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/25'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                        }`}
                    >
                      {task.d && <Check className="w-4 h-4" />}
                    </button>

                    <input
                      type="text"
                      value={task.t}
                      onChange={(e) => {
                        const newTasks = [...dayRecord.tasks];
                        newTasks[idx] = { ...newTasks[idx], t: e.target.value };
                        updateCurrentDay({ tasks: newTasks });
                      }}
                      placeholder={`المهمة ${idx + 1}...`}
                      className={`flex-1 bg-transparent border-none text-xs text-white focus:outline-none ${task.d ? 'line-through text-slate-500' : ''
                        }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 5B: ALL WORK TASKS & ATTACHMENTS IN DAILY SYSTEM */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">سجل مهام العمل الشامل والمرفقات</h3>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {tasks.length} مهمة
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDayTasksMode('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        dayTasksMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      كل المهام ({tasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTasksMode('day')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        dayTasksMode === 'day' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      مهام اليوم ({dayWorkTasks.length})
                    </button>
                  </div>

                  {onOpenTasksTab && (
                    <button
                      type="button"
                      onClick={onOpenTasksTab}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
                    >
                      فتح المهام ↗
                    </button>
                  )}
                </div>
              </div>

              {(dayTasksMode === 'all' ? tasks : dayWorkTasks).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  {dayTasksMode === 'all'
                    ? 'لا توجد مهام عمل مضافة حتى الآن.'
                    : `لا توجد مهام مجدولة بتاريخ ${currentDateKey}. يمكنك التبديل إلى "كل المهام".`}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                  {(dayTasksMode === 'all' ? tasks : dayWorkTasks).map((t) => renderWorkTaskRow(t))}
                </div>
              )}
            </div>

            {/* CARD 6: EVENING REVIEW / JOURNAL */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">مراجعة آخر اليوم</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ✨ إيه اللي نجح النهارده؟ (أبرز إنجازاتك)
                  </label>
                  <textarea
                    rows={2}
                    value={dayRecord.notes.good}
                    onChange={(e) =>
                      updateCurrentDay({ notes: { ...dayRecord.notes, good: e.target.value } })
                    }
                    placeholder="مثال: خلصت كشوفات العيادة، وصليت السنن في وقتها..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🚧 إيه اللي عطّلني؟ (المعوقات والمشتتات)
                  </label>
                  <textarea
                    rows={2}
                    value={dayRecord.notes.block}
                    onChange={(e) =>
                      updateCurrentDay({ notes: { ...dayRecord.notes, block: e.target.value } })
                    }
                    placeholder="مثال: تصفح الهاتف بدون تركيز، تأخر موعد نوم الأمس..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🎯 أهم حاجة لازم أعملها بكرة؟ (أولوية الغد الأولى)
                  </label>
                  <textarea
                    rows={2}
                    value={dayRecord.notes.tomorrow}
                    onChange={(e) =>
                      updateCurrentDay({ notes: { ...dayRecord.notes, tomorrow: e.target.value } })
                    }
                    placeholder="مثال: إتمام التقرير الطبي ومقابلة الساعة 3..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: MONTH VIEW (HEATMAP & STATS) */}
        {/* ======================================================== */}
        {activeTab === 'month' && (
          <div className="mt-5 space-y-5">
            {/* Month Navigator */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors"
                title="الشهر السابق"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">الشهر السابق</span>
              </button>

              <div className="text-center">
                <span className="text-base sm:text-lg font-black text-white block">
                  {AR_MONTHS[parseInt(currentMonthKey.split('-')[1], 10) - 1]} {currentMonthKey.split('-')[0]}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">التقرير الشهري الشامل</span>
              </div>

              <button
                onClick={() => navigateMonth(1)}
                className="p-2 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-xs font-bold cursor-pointer transition-colors"
                title="الشهر التالي"
              >
                <span className="hidden sm:inline">الشهر التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Heatmap Calendar */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>خريطة الالتزام الشهري (Heatmap)</span>
                </h3>
                <span className="text-[11px] text-slate-400">اضغط على أي يوم لفتحه</span>
              </div>

              {/* Saturday-First Grid Header */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] text-slate-400 font-bold">
                <div>سبت</div>
                <div>أحد</div>
                <div>اثنين</div>
                <div>ثلاثاء</div>
                <div>أربعاء</div>
                <div>خميس</div>
                <div>جمعة</div>
              </div>

              {/* Heatmap Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {(() => {
                  const [y, mo] = currentMonthKey.split('-').map(Number);
                  const firstDay = new Date(y, mo - 1, 1);
                  // Saturday start offset
                  const lead = (firstDay.getDay() + 1) % 7;
                  const cells = [];

                  // Empty lead cells
                  for (let i = 0; i < lead; i++) {
                    cells.push(<div key={`lead-${i}`} className="aspect-square" />);
                  }

                  // Month day cells
                  monthStats.ids.forEach((id) => {
                    const loggedEntry = monthStats.logged.find((l) => l.id === id);
                    const score = loggedEntry ? loggedEntry.s.total : null;
                    const minMet = loggedEntry && isMinDay(loggedEntry.d);
                    const dayNum = parseInt(id.slice(8), 10);
                    const isToday = id === todayKey;

                    cells.push(
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setCurrentDateKey(id);
                          setActiveTab('day');
                        }}
                        className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center transition-all cursor-pointer relative border ${minMet ? 'ring-2 ring-emerald-400/80 ring-offset-1 ring-offset-slate-900' : ''
                          } ${isToday ? 'border-amber-400/80' : 'border-slate-800/60 hover:scale-105'}`}
                        style={{
                          backgroundColor: getHeatmapColor(score),
                          color: score !== null && score >= 40 ? '#ffffff' : '#94a3b8',
                        }}
                      >
                        <span className="text-xs font-black">{dayNum}</span>
                        {score !== null && (
                          <span className="text-[9px] font-mono font-bold opacity-90">{score}</span>
                        )}
                      </button>
                    );
                  });

                  return cells;
                })()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span>85+ ممتاز</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-600" />
                  <span>65-84 جيد جداً</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-600" />
                  <span>40-64 متوسط</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-600" />
                  <span>أقل من 40</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded ring-2 ring-emerald-400" />
                  <span>إطار = الحد الأدنى ✓</span>
                </span>
              </div>
            </div>

            {/* Monthly KPIs */}
            {monthStats.n === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold">لا توجد أيام مسجلة بعد في هذا الشهر.</p>
                <p className="text-xs">سجّل يومك من تبويب "اليوم" وسيتم تحديث الخريطة والإحصائيات تلقائياً.</p>
              </div>
            ) : (
              <>
                {/* Month Average Ring & Categories */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all shadow-xl"
                        style={{
                          background: `conic-gradient(#10b981 ${Math.round(monthStats.avg)}%, #1e293b 0%)`,
                        }}
                      >
                        <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-slate-900 flex flex-col items-center justify-center border border-slate-800">
                          <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                            {Math.round(monthStats.avg)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold -mt-1">متوسط الشهر</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {CATEGORIES_LIST.map(({ key, label }) => {
                          const pct = Math.round(monthStats.cats[key] || 0);
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="w-12 text-slate-400 font-semibold truncate">{label}</span>
                              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-left font-mono font-bold text-slate-300">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1">
                        متوسط نقاط {monthStats.n} يوم مسجل من أصل {monthStats.ids.length} يوم في الشهر
                      </p>
                    </div>
                  </div>
                </div>

                {/* 10 KPIs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-emerald-400 block">
                      {Math.round(monthStats.onTime)}%
                    </span>
                    <span className="text-xs text-slate-400">صلوات في وقتها</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-teal-400 block">
                      {Math.round(monthStats.prayed)}%
                    </span>
                    <span className="text-xs text-slate-400">صلوات مؤداة (أي وقت)</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-cyan-400 block">
                      {Math.round(monthStats.adhkarPct)}%
                    </span>
                    <span className="text-xs text-slate-400">أذكار الصباح والمساء</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-indigo-400 block">
                      {monthStats.quran} ص
                    </span>
                    <span className="text-xs text-slate-400">
                      قرآن ≈ {(monthStats.quran / 20).toFixed(1)} جزء
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-amber-400 block">
                      {monthStats.sportDays} يوم
                    </span>
                    <span className="text-xs text-slate-400">
                      رياضة ({(monthStats.sportMin / 60).toFixed(1)} ساعة)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-purple-400 block">
                      {monthStats.studyH.toFixed(1)} س
                    </span>
                    <span className="text-xs text-slate-400">ساعات تعلّم / مذاكرة</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-slate-200 block">
                      {monthStats.sleep.toFixed(1)} س
                    </span>
                    <span className="text-xs text-slate-400">متوسط ساعات النوم</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-emerald-400 block">
                      {monthStats.tasks} / {monthStats.tasksAll}
                    </span>
                    <span className="text-xs text-slate-400">مهام شغل أُنجزت</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-2xl font-black font-mono text-orange-400 block">
                      {monthStats.minDays} يوم
                    </span>
                    <span className="text-xs text-slate-400">
                      أيام الحد الأدنى (أطول سلسلة: {monthStats.streak} 🔥)
                    </span>
                  </div>

                  {monthStats.w0 !== null && monthStats.w1 !== null && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-2xl font-black font-mono text-cyan-400 block">
                        {monthStats.w1} كجم
                      </span>
                      <span className="text-xs text-slate-400">
                        الوزن ({monthStats.w1 - monthStats.w0 >= 0 ? '+' : ''}
                        {(monthStats.w1 - monthStats.w0).toFixed(1)} من أول الشهر)
                      </span>
                    </div>
                  )}
                </div>

                {/* Weekly Performance Table */}
                {monthStats.weeks.length > 0 && (
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-white">متوسط أداء الأسابيع</h3>
                    <div className="divide-y divide-slate-800 text-xs">
                      {monthStats.weeks.map((w, idx) => {
                        const d = parseDateKey(w.k);
                        return (
                          <div key={idx} className="flex items-center justify-between py-2">
                            <span className="text-slate-300 font-semibold">
                              الأسبوع من {AR_DAYS[d.getDay()]} {d.getDate()} {AR_MONTHS[d.getMonth()]}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">{w.n} أيام</span>
                              <span className="font-mono font-black text-emerald-400 text-sm">
                                {Math.round(w.avg)} نقطة
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {monthStats.best && monthStats.worst && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        🌟 أفضل يوم: <strong>{monthStats.best.id} ({monthStats.best.s.total}ن)</strong> •
                        ⚠️ أقل يوم: <strong>{monthStats.worst.id} ({monthStats.worst.s.total}ن)</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Blockers History */}
                {monthStats.blocks.length > 0 && (
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>أبرز الحاجات اللي عطّلتك خلال الشهر</span>
                    </h3>
                    <div className="space-y-2">
                      {monthStats.blocks.map((b, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
                          <span className="text-slate-200">{b.t}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{b.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Monthly Review Form */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">مراجعة الشهر وتقييم الأداء</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🏆 أهم ٣ إنجازات في الشغل هذا الشهر
                  </label>
                  <textarea
                    rows={2}
                    value={monthReview.wins}
                    onChange={(e) => {
                      const updated = { ...monthReview, wins: e.target.value };
                      setMonthReview(updated);
                      dailySystemService.setMonthReview(currentMonthKey, updated);
                    }}
                    placeholder="1. إتمام النظام الجديد... 2. انتظام مواعيد العيادة..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    💡 الدرس اللي اتعلمته
                  </label>
                  <textarea
                    rows={2}
                    value={monthReview.lesson}
                    onChange={(e) => {
                      const updated = { ...monthReview, lesson: e.target.value };
                      setMonthReview(updated);
                      dailySystemService.setMonthReview(currentMonthKey, updated);
                    }}
                    placeholder="أهم درس مستفاد في الإنتاجية أو إدارة الوقت..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🔄 تعديل واحد بس للشهر الجاي
                  </label>
                  <textarea
                    rows={2}
                    value={monthReview.change}
                    onChange={(e) => {
                      const updated = { ...monthReview, change: e.target.value };
                      setMonthReview(updated);
                      dailySystemService.setMonthReview(currentMonthKey, updated);
                    }}
                    placeholder="عادة واحدة سأبدأ بها أو سأتوقف عنها الشهر القادم..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🎯 هدف الشهر الجاي الرئيسي
                  </label>
                  <textarea
                    rows={2}
                    value={monthReview.goal}
                    onChange={(e) => {
                      const updated = { ...monthReview, goal: e.target.value };
                      setMonthReview(updated);
                      dailySystemService.setMonthReview(currentMonthKey, updated);
                    }}
                    placeholder="الهدف الأساسي الذي سأركز عليه في الشهر القادم..."
                    className="w-full p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* COMPREHENSIVE WORK TASKS REPORT SECTION IN MONTHLY SYSTEM REPORT */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-indigo-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">تقرير مهام العمل الشامل والمرفقات</h3>
                    <p className="text-[11px] text-slate-400">عرض كافة مهام العمل وملفاتها المرفقة مع إمكانية المتابعة وتصدير PDF</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>تصدير PDF مع اختيار المهام</span>
                </button>
              </div>

              {/* Work Tasks KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="text-lg font-black font-mono text-white">{tasks.length}</div>
                  <div className="text-[11px] text-slate-400">إجمالي مهام العمل</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/25">
                  <div className="text-lg font-black font-mono text-emerald-400">
                    {totalWorkCompleted} ({tasks.length > 0 ? Math.round((totalWorkCompleted / tasks.length) * 100) : 0}%)
                  </div>
                  <div className="text-[11px] text-slate-400">المهام المنجزة</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-950/25 border border-amber-500/25">
                  <div className="text-lg font-black font-mono text-amber-400">
                    {totalWorkPending} {totalWorkUrgent > 0 ? `(${totalWorkUrgent} عاجل)` : ''}
                  </div>
                  <div className="text-[11px] text-slate-400">قيد الانتظار</div>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/25">
                  <div className="text-lg font-black font-mono text-indigo-300">{totalWorkAttachments}</div>
                  <div className="text-[11px] text-slate-400">ملفات ومرفقات العمل</div>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `كافة المهام (${tasks.length})` },
                  { id: 'month', label: `مهام هذا الشهر (${monthWorkTasks.length})` },
                  { id: 'completed', label: `مكتملة (${totalWorkCompleted})` },
                  { id: 'pending', label: `قيد الانتظار (${totalWorkPending})` },
                  { id: 'urgent', label: `عاجلة (${tasks.filter((t) => t.priority === 'urgent').length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReportTasksFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      reportTasksFilter === f.id
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tasks Rows */}
              {reportFilteredTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  لا توجد مهام مطابقة للتصفية الحالية.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-0.5">
                  {reportFilteredTasks.map((t) => renderWorkTaskRow(t))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: SETTINGS & GOALS */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="mt-5 space-y-5">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>أهدافك اليومية المخصصة</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">ورد القرآن</span>
                    <span className="text-[10px] text-slate-400">عدد الصفحات المستهدفة يومياً (ختمة كل شهر = 20 صفحة)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.quran}
                      onChange={(e) => dailySystemService.updateSettings({ quran: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">صفحة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">الرياضة والحركة</span>
                    <span className="text-[10px] text-slate-400">عدد دقائق الرياضة أو المشي اليومية</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={settings.sport}
                      onChange={(e) => dailySystemService.updateSettings({ sport: Math.max(5, parseInt(e.target.value, 10) || 5) })}
                      className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">دقيقة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">التعلّم / المذاكرة</span>
                    <span className="text-[10px] text-slate-400">وقت القراءة وتطوير المهارات بالدقائق</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={settings.study}
                      onChange={(e) => dailySystemService.updateSettings({ study: Math.max(10, parseInt(e.target.value, 10) || 10) })}
                      className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">دقيقة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">ساعات النوم</span>
                    <span className="text-[10px] text-slate-400">الهدف المثالي لساعات النوم ليلاً</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={4}
                      max={12}
                      step={0.5}
                      value={settings.sleep}
                      onChange={(e) => dailySystemService.updateSettings({ sleep: Math.max(4, parseFloat(e.target.value) || 4) })}
                      className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">ساعة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">شرب الماء</span>
                    <span className="text-[10px] text-slate-400">الهدف اليومي لأكواب الماء</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.water}
                      onChange={(e) => dailySystemService.updateSettings({ water: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs text-center font-bold"
                    />
                    <span className="text-xs text-slate-400">أكواب</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Points Distribution Breakdown */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>توزيع الـ 100 نقطة اليومية</span>
                <span className="text-xs font-mono font-bold text-emerald-400">المجموع = 100 نقطة</span>
              </h3>

              <div className="divide-y divide-slate-800 text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">الصلاة</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">5 نقاط لكل صلاة في وقتها، 2 لو متأخرة</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">25 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">الشغل</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">إنجاز أهم 3 مهام عمل (6.7 ن للمهمة)</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">20 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">التعلّم / المذاكرة</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">نسبة تحقيق هدف الدقائق المحدد</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">15 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">الأذكار والدعاء</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">صباح (3ن)، مساء (3ن)، نوم (2ن)، ورد دعاء (2ن)</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">10 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">ورد القرآن</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">نسبة تحقيق عدد الصفحات اليومية</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">10 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">الرياضة</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">نسبة تحقيق وقت الرياضة بالدقائق</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">10 ن</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-white">الصحة العامة</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">نوم كافٍ (4ن) + شرب الماء (3ن) + أكل صحي (3ن)</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">10 ن</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Persistence & Cloud Info */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                بياناتك وسجلاتك اليومية محفوظة ومزامنة تلقائياً بين جهاز الكمبيوتر وتطبيق الهاتف المحمول (Android & iOS).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PDF Report Export Studio Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        tasks={tasks}
        currentDateKey={currentDateKey}
        currentMonthKey={currentMonthKey}
        defaultScope={activeTab === 'day' ? 'daily_and_tasks' : 'comprehensive'}
      />

      {/* Lightbox Preview for Image Attachments */}
      <ImageLightboxModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

