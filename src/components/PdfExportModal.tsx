import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  X,
  Download,
  Check,
  Search,
  CheckSquare,
  Square,
  Paperclip,
  Share2,
  Loader2,
  Award,
  Briefcase,
  AlertCircle,
  Users
} from 'lucide-react';
import type { Task, Employee } from '../types';
import { getLocalDateStr, NativeAlarmService } from '../services/nativeAlarmService';
import { generateExecutivePdfReport } from '../services/pdfReportService';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentDateKey?: string;
  currentMonthKey?: string;
  defaultScope?: 'comprehensive' | 'daily_and_tasks' | 'tasks_only';
  employees?: Employee[];
  initialEmployeeId?: string;
}

type TaskSelectionMode = 'all' | 'pending' | 'completed' | 'urgent' | 'custom';

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  currentDateKey = getLocalDateStr(),
  currentMonthKey = getLocalDateStr().slice(0, 7),
  defaultScope = 'comprehensive',
  employees = [],
  initialEmployeeId,
}) => {
  const [scope, setScope] = useState<'comprehensive' | 'daily_and_tasks' | 'tasks_only'>(defaultScope);
  const [reportTitle, setReportTitle] = useState('التقرير الشامل — نظامي اليومي ومهام العمل');
  const [selectionMode, setSelectionMode] = useState<TaskSelectionMode>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>(initialEmployeeId || '');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set(tasks.map((t) => t.id)));
  const [searchQuery, setSearchQuery] = useState('');
  const [includeDailySystemStats, setIncludeDailySystemStats] = useState(true);
  const [includeReflections, setIncludeReflections] = useState(true);
  const [includeAttachmentsDetails, setIncludeAttachmentsDetails] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAndroidNative = NativeAlarmService.isAndroidNative();

  // Sync defaults when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const targetEmpId = initialEmployeeId || '';
    setSelectedEmployeeFilter(targetEmpId);
    setStatusMessage(null);
    setSearchQuery('');

    if (targetEmpId) {
      setScope('tasks_only');
      const emp = employees.find((e) => e.id === targetEmpId);
      const empTasks = tasks.filter((t) => t.employeeId === targetEmpId);
      setSelectedTaskIds(new Set(empTasks.map((t) => t.id)));
      setReportTitle(emp ? `تقرير ملف الموظف: ${emp.name} — سجل المهام والمرفقات` : 'تقرير مهام الموظف');
    } else {
      setScope(defaultScope);
      setSelectionMode('all');
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
      if (defaultScope === 'tasks_only') {
        setReportTitle('تقرير سجل مهام العمل والمرفقات');
      } else if (defaultScope === 'daily_and_tasks') {
        setReportTitle(`تقرير نظامي اليومي ومهام العمل (${currentDateKey})`);
      } else {
        setReportTitle('التقرير الشامل — نظامي اليومي ومهام العمل');
      }
    }
  }, [isOpen, defaultScope, tasks, currentDateKey, initialEmployeeId, employees]);

  const handleEmployeeFilterChange = (empId: string) => {
    setSelectedEmployeeFilter(empId);
    if (empId) {
      setScope('tasks_only');
      const emp = employees.find((e) => e.id === empId);
      const empTasks = tasks.filter((t) => t.employeeId === empId);
      setSelectedTaskIds(new Set(empTasks.map((t) => t.id)));
      setReportTitle(emp ? `تقرير ملف الموظف: ${emp.name} — سجل المهام والمرفقات` : 'تقرير مهام الموظف');
    } else {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
      setReportTitle('تقرير سجل مهام العمل والمرفقات');
    }
  };

  const handleModeChange = (mode: TaskSelectionMode) => {
    setSelectionMode(mode);
    if (mode === 'all') {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
    } else if (mode === 'pending') {
      setSelectedTaskIds(new Set(tasks.filter((t) => t.status !== 'completed').map((t) => t.id)));
    } else if (mode === 'completed') {
      setSelectedTaskIds(new Set(tasks.filter((t) => t.status === 'completed').map((t) => t.id)));
    } else if (mode === 'urgent') {
      setSelectedTaskIds(new Set(tasks.filter((t) => t.priority === 'urgent').map((t) => t.id)));
    }
  };

  const toggleSingleTask = (taskId: string) => {
    setSelectionMode('custom');
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const visibleTasksList = useMemo(() => {
    let list = tasks;
    if (selectedEmployeeFilter) {
      list = list.filter((t) => t.employeeId === selectedEmployeeFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.employeeName && t.employeeName.toLowerCase().includes(q)) ||
        (t.dueDate && t.dueDate.includes(q))
    );
  }, [tasks, selectedEmployeeFilter, searchQuery]);

  const selectedTasksToExport = useMemo(
    () => tasks.filter((t) => selectedTaskIds.has(t.id)),
    [tasks, selectedTaskIds]
  );

  const handleExport = async (openOrShare: 'open' | 'share' = 'open') => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await generateExecutivePdfReport({
        reportTitle: reportTitle.trim() || 'تقرير نظامي ومهام العمل',
        scope,
        selectedTasks: selectedTasksToExport,
        currentDateKey,
        currentMonthKey,
        includeDailySystemStats,
        includeReflections,
        includeAttachmentsDetails,
        openOrShare,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: isAndroidNative
            ? `✅ تم إنشاء ملف PDF (${res.fileName}) وحفظه في التنزيلات بنجاح!`
            : `✅ تم تحميل ملف PDF (${res.fileName}) بنجاح!`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'تعذر إنشاء ملف PDF',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/82 backdrop-blur-lg animate-fade-in"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl rounded-3xl lux-modal p-5 sm:p-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="icon-squircle-gold w-11 h-11 shrink-0">
              <FileText className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                تصدير التقارير بصيغة PDF
              </h3>
              <p className="text-xs text-slate-400">
                اختر نطاق التقرير والمهام المطلوب تضمينها (الكل أو مهام محددة)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Report Title & Scope */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                عنوان التقرير:
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                نوع ونطاق التقرير:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'comprehensive', label: 'تقرير شامل (الشهري + المهام)', icon: Award },
                  { id: 'daily_and_tasks', label: 'اليوم المحدد + المهام', icon: FileText },
                  { id: 'tasks_only', label: 'مهام العمل فقط', icon: Briefcase },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = scope === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScope(opt.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-bold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extra Report Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {scope !== 'tasks_only' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIncludeDailySystemStats((v) => !v)}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      includeDailySystemStats
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    {includeDailySystemStats ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>إحصائيات نظامي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeReflections((v) => !v)}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      includeReflections
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    {includeReflections ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>ملاحظات ومراجعة</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIncludeAttachmentsDetails((v) => !v)}
                className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  includeAttachmentsDetails
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800'
                }`}
              >
                {includeAttachmentsDetails ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>إظهار الملفات المرفقة</span>
              </button>
            </div>
          </div>

          {/* Tasks Selection Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>تحديد مهام العمل المطلوب تصديرها:</span>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                المختار: {selectedTasksToExport.length} من {tasks.length}
              </span>
            </div>

            {/* Employee Dossier Filter (Optional) */}
            {employees.length > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 shrink-0">
                  تصفية حسب ملف الموظف:
                </span>
                <select
                  value={selectedEmployeeFilter}
                  onChange={(e) => handleEmployeeFilterChange(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- جميع الموظفين وكافة المهام --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role || 'عضو فريق'}) — {tasks.filter((t) => t.employeeId === emp.id).length} مهام
                    </option>
                  ))}
                </select>
                {selectedEmployeeFilter && (
                  <button
                    type="button"
                    onClick={() => handleEmployeeFilterChange('')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-1.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 cursor-pointer"
                  >
                    إلغاء التصفية ✕
                  </button>
                )}
              </div>
            )}

            {/* Quick Mode Filter Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'all', label: `كل المهام (${tasks.length})` },
                { id: 'pending', label: `قيد الانتظار (${tasks.filter((t) => t.status !== 'completed').length})` },
                { id: 'completed', label: `مكتملة (${tasks.filter((t) => t.status === 'completed').length})` },
                { id: 'urgent', label: `عاجلة (${tasks.filter((t) => t.priority === 'urgent').length})` },
                { id: 'custom', label: 'تحديد مخصص' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id as TaskSelectionMode)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate ${
                    selectionMode === m.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Search & Select All / Deselect All */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث لاختيار مهام معينة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('all');
                  setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold border border-slate-700 cursor-pointer shrink-0"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('custom');
                  setSelectedTaskIds(new Set());
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] font-bold border border-slate-700 cursor-pointer shrink-0"
              >
                إلغاء الكل
              </button>
            </div>

            {/* Interactive Checklist */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
              {visibleTasksList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  لا توجد مهام مطابقة للبحث
                </div>
              ) : (
                visibleTasksList.map((t) => {
                  const checked = selectedTaskIds.has(t.id);
                  const attachCount = t.attachments?.length || 0;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSingleTask(t.id)}
                      className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        checked
                          ? 'bg-emerald-500/10 border-emerald-500/35 text-white'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-emerald-500 border-emerald-400 text-white'
                              : 'bg-slate-800 border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{t.title}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{t.dueDate} • {t.dueTime}</span>
                            {t.status === 'completed' && (
                              <span className="text-emerald-400 font-bold">✓ منجزة</span>
                            )}
                            {attachCount > 0 && (
                              <span className="text-indigo-300 flex items-center gap-0.5 font-semibold">
                                <Paperclip className="w-2.5 h-2.5" />
                                {attachCount} ملف
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          t.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300'
                            : t.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.priority === 'urgent'
                          ? 'عاجل'
                          : t.priority === 'high'
                          ? 'مرتفع'
                          : t.priority === 'medium'
                          ? 'متوسط'
                          : 'عادي'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Feedback message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className={`grid ${isAndroidNative ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 pt-3 border-t border-slate-800 shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
          >
            إغلاق
          </button>

          {isAndroidNative && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleExport('share')}
              className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة PDF</span>
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleExport('open')}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التصدير...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تصدير وحفظ PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

