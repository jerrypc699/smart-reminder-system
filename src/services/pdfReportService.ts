import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import type { Task } from '../types';
import { getLocalDateStr, NativeAlarmService } from './nativeAlarmService';
import { VideoAlarm } from './videoAlarmPlugin';
import {
  dailySystemService,
  calculateScore,
  calculateMonthStats,
  calculatePeriodStats,
  parseDateKey,
  isMinDay,
  CATEGORIES_LIST,
} from './dailySystemService';
import { formatAttachmentSize } from './taskAttachmentService';

export interface PdfReportOptions {
  reportTitle: string;
  scope: 'comprehensive' | 'daily_and_tasks' | 'tasks_only' | 'specific_day' | 'date_range';
  selectedTasks: Task[];
  currentDateKey: string;
  currentMonthKey: string;
  startDateKey?: string;
  endDateKey?: string;
  includeDailySystemStats: boolean;
  includeReflections: boolean;
  includeAttachmentsDetails: boolean;
  includeWorkTasks?: boolean;
  openOrShare?: 'open' | 'share';
}

export type ExecutivePdfReportOptions = PdfReportOptions;

export interface PdfExportResult {
  success: boolean;
  fileName: string;
  savedToDownloads?: boolean;
  error?: string;
}

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCategoryArabic(cat: Task['category']): string {
  switch (cat) {
    case 'clinic': return 'عيادة ومرضى';
    case 'work': return 'عمل';
    case 'meeting': return 'اجتماع';
    case 'dev': return 'برمجة وتطوير';
    case 'admin': return 'إداري';
    case 'health': return 'صحي';
    case 'personal': return 'شخصي';
    default: return 'عمل';
  }
}

function getPriorityMeta(priority: Task['priority']): { label: string; bg: string; fg: string; border: string } {
  switch (priority) {
    case 'urgent':
      return { label: 'عاجل جداً', bg: '#fee2e2', fg: '#b91c1c', border: '#fecaca' };
    case 'high':
      return { label: 'مرتفعة', bg: '#fef3c7', fg: '#b45309', border: '#fde68a' };
    case 'medium':
      return { label: 'متوسطة', bg: '#dbeafe', fg: '#1d4ed8', border: '#bfdbfe' };
    default:
      return { label: 'منخفضة', bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' };
  }
}

function getStatusMeta(status: Task['status']): { label: string; bg: string; fg: string; border: string } {
  switch (status) {
    case 'completed':
      return { label: '✓ مكتملة', bg: '#d1fae5', fg: '#047857', border: '#a7f3d0' };
    case 'snoozed':
      return { label: '⏳ مؤجلة', bg: '#fef3c7', fg: '#b45309', border: '#fde68a' };
    case 'in_progress':
      return { label: '▶ قيد التنفيذ', bg: '#e0f2fe', fg: '#0369a1', border: '#bae6fd' };
    default:
      return { label: '○ قيد الانتظار', bg: '#f1f5f9', fg: '#334155', border: '#cbd5e1' };
  }
}

function buildTaskRowsHtml(
  tasksBatch: Task[],
  startIndex: number,
  includeAttachments: boolean
): string {
  if (tasksBatch.length === 0) {
    return `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-size: 12px; border: 1px solid #e2e8f0;">
          لا توجد مهام مختارة للعرض في هذا التقرير
        </td>
      </tr>
    `;
  }

  return tasksBatch
    .map((task, idx) => {
      const rowNum = startIndex + idx + 1;
      const prio = getPriorityMeta(task.priority);
      const st = getStatusMeta(task.status);
      const isAlt = idx % 2 === 1;
      const rowBg = isAlt ? '#f8fafc' : '#ffffff';

      let attachmentsHtml = '<span style="color: #94a3b8; font-size: 10px;">—</span>';
      if (includeAttachments && task.attachments && task.attachments.length > 0) {
        attachmentsHtml = task.attachments
          .map(
            (att) => `
            <div style="display: inline-block; margin: 1px 0 1px 4px; padding: 2px 6px; border-radius: 6px; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; font-size: 9.5px; font-weight: 600;">
              📎 ${escapeHtml(att.name)} (${escapeHtml(formatAttachmentSize(att.size))})
            </div>`
          )
          .join('');
      } else if (task.customAudioName) {
        attachmentsHtml = `<span style="font-size: 9.5px; color: #0e7490;">🎵 ${escapeHtml(task.customAudioName)}</span>`;
      }

      return `
        <tr style="background: ${rowBg};">
          <td style="padding: 8px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #475569; font-size: 11px; width: 32px;">${rowNum}</td>
          <td style="padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: top;">
            <div style="font-weight: 800; color: #0f172a; font-size: 11.5px; margin-bottom: 2px;">
              ${escapeHtml(task.title)}
              ${task.employeeName ? `<span style="display: inline-block; margin-right: 6px; padding: 1px 6px; border-radius: 6px; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 700;">👤 ${escapeHtml(task.employeeName)}</span>` : ''}
            </div>
            ${task.description ? `<div style="font-size: 10px; color: #475569; line-height: 1.45;">${escapeHtml(task.description)}</div>` : ''}
          </td>
          <td style="padding: 8px 6px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; width: 95px;">
            <div style="font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 4px;">${escapeHtml(getCategoryArabic(task.category))}</div>
            <span style="display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; background: ${prio.bg}; color: ${prio.fg}; border: 1px solid ${prio.border};">
              ${prio.label}
            </span>
          </td>
          <td style="padding: 8px 6px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; font-size: 10.5px; color: #1e293b; width: 92px;">
            <div style="font-weight: 700;">${escapeHtml(task.dueDate || '—')}</div>
            <div style="font-size: 10px; color: #059669; font-weight: 700; margin-top: 2px;">${escapeHtml(task.dueTime || '')}</div>
          </td>
          <td style="padding: 8px 6px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; width: 88px;">
            <span style="display: inline-block; padding: 3px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; background: ${st.bg}; color: ${st.fg}; border: 1px solid ${st.border};">
              ${st.label}
            </span>
          </td>
          <td style="padding: 8px 8px; border: 1px solid #e2e8f0; vertical-align: middle; width: 155px;">
            ${attachmentsHtml}
          </td>
        </tr>
      `;
    })
    .join('');
}

function buildTasksTableShell(rowsHtml: string, sectionTitle: string): string {
  return `
    <div style="margin-top: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-right: 4px solid #059669; padding-right: 10px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(sectionTitle)}</h3>
      </div>
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 8px 6px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; width: 32px; text-align: center;">#</th>
            <th style="padding: 8px 10px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; text-align: right;">المهمة والتفاصيل</th>
            <th style="padding: 8px 6px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; width: 95px; text-align: center;">التصنيف والأولوية</th>
            <th style="padding: 8px 6px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; width: 92px; text-align: center;">الموعد</th>
            <th style="padding: 8px 6px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; width: 88px; text-align: center;">الحالة</th>
            <th style="padding: 8px 8px; border: 1px solid #1e293b; font-size: 10.5px; font-weight: 800; width: 155px; text-align: right;">المرفقات والملفات</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

export async function generateExecutivePdfReport(
  options: ExecutivePdfReportOptions
): Promise<PdfExportResult> {
  const {
    reportTitle,
    scope,
    selectedTasks,
    currentDateKey,
    currentMonthKey,
    includeDailySystemStats,
    includeReflections,
    includeAttachmentsDetails,
    includeWorkTasks,
    openOrShare = 'open',
  } = options;

  const settings = dailySystemService.getSettings();
  const allDays = dailySystemService.getAllDays();
  const dayRecord = dailySystemService.getDay(currentDateKey);
  const dayScore = calculateScore(dayRecord, settings);
  const monthStats = calculateMonthStats(currentMonthKey, allDays, settings);
  const monthReview = dailySystemService.getMonthReview(currentMonthKey);

  const now = new Date();
  const gregorianNow = now.toLocaleDateString('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeNow = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const [mYear, mMonth] = currentMonthKey.split('-').map(Number);
  const monthLabel = `${AR_MONTHS[(mMonth || 1) - 1]} ${mYear}`;

  const sDate = options.startDateKey || currentDateKey;
  const eDate = options.endDateKey || currentDateKey;
  const periodStats = scope === 'date_range'
    ? calculatePeriodStats(sDate, eDate, allDays, settings)
    : null;

  const totalSelected = selectedTasks.length;
  const completedCount = selectedTasks.filter((t) => t.status === 'completed').length;
  const pendingCount = selectedTasks.filter((t) => t.status !== 'completed').length;
  const urgentCount = selectedTasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
  const attachmentsTotal = selectedTasks.reduce((sum, t) => sum + (t.attachments?.length || 0), 0);

  const showSystemSection = includeDailySystemStats && scope !== 'tasks_only';
  const shouldRenderTasks = scope === 'tasks_only' ? true : (includeWorkTasks !== false);

  // Daily System HTML Block
  let systemSummaryHtml = '';
  if (showSystemSection) {
    if (scope === 'daily_and_tasks' || scope === 'specific_day') {
      const targetDateKey = currentDateKey;
      const targetDayRecord = dailySystemService.getDay(targetDateKey);
      const targetDayScore = calculateScore(targetDayRecord, settings);

      const pdfCats = [
        ...CATEGORIES_LIST,
        ...(targetDayScore.maxByCat?.custom > 0 ? [{ key: 'custom', label: 'عادات مخصصة', max: targetDayScore.maxByCat.custom }] : []),
      ];
      const catBarsHtml = pdfCats
        .map(({ key, label, max }) => {
          const effectiveMax = targetDayScore.maxByCat?.[key] ?? max;
          if (!effectiveMax || effectiveMax <= 0) return '';
          const val = Math.round(targetDayScore.c[key] || 0);
          const pct = Math.round((val / effectiveMax) * 100);
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
              <span style="width: 68px; font-size: 10px; font-weight: 700; color: #334155;">${escapeHtml(label)}</span>
              <div style="flex: 1; height: 7px; border-radius: 99px; background: #e2e8f0; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: #059669; border-radius: 99px;"></div>
              </div>
              <span style="width: 34px; font-size: 10px; font-weight: 800; color: #0f172a; text-align: left;">${pct}%</span>
            </div>
          `;
        })
        .join('');

      systemSummaryHtml = `
        <div style="margin-top: 14px; padding: 14px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #cbd5e1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <h3 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a;">📊 ملخص التزام نظامي ليوم (${escapeHtml(targetDateKey)})</h3>
            <span style="padding: 3px 10px; border-radius: 99px; background: #d1fae5; color: #047857; font-size: 11px; font-weight: 800;">النتيجة: ${targetDayScore.total} / 100 نقطة</span>
          </div>
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="flex: 1;">${catBarsHtml}</div>
            <div style="width: 244px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <div style="flex: 1; padding: 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
                  <div style="font-size: 9.5px; color: #64748b;">القرآن</div>
                  <div style="font-size: 13px; font-weight: 800; color: #4338ca;">${targetDayRecord.quran} صفحة</div>
                </div>
                <div style="flex: 1; padding: 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
                  <div style="font-size: 9.5px; color: #64748b;">الرياضة</div>
                  <div style="font-size: 13px; font-weight: 800; color: #059669;">${targetDayRecord.sport} دقيقة</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <div style="flex: 1; padding: 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
                  <div style="font-size: 9.5px; color: #64748b;">التعلّم</div>
                  <div style="font-size: 13px; font-weight: 800; color: #7c3aed;">${targetDayRecord.study} دقيقة</div>
                </div>
                <div style="flex: 1; padding: 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
                  <div style="font-size: 9.5px; color: #64748b;">النوم والماء</div>
                  <div style="font-size: 12px; font-weight: 800; color: #0284c7;">${targetDayRecord.sleep}س • ${targetDayRecord.water} كوب</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (scope === 'date_range' && periodStats) {
      const pStats = periodStats;

      const pdfCats = [
        ...CATEGORIES_LIST,
        ...(pStats.logged[0]?.s.maxByCat?.custom > 0 ? [{ key: 'custom', label: 'عادات مخصصة', max: pStats.logged[0]?.s.maxByCat.custom }] : []),
      ];

      const catBarsHtml = pdfCats
        .map(({ key, label }) => {
          const pct = Math.round(pStats.cats[key] || 0);
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
              <span style="width: 72px; font-size: 10px; font-weight: 700; color: #334155;">${escapeHtml(label)}</span>
              <div style="flex: 1; height: 7px; border-radius: 99px; background: #e2e8f0; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: #059669; border-radius: 99px;"></div>
              </div>
              <span style="width: 34px; font-size: 10px; font-weight: 800; color: #0f172a; text-align: left;">${pct}%</span>
            </div>
          `;
        })
        .join('');

      const periodDaysRows = pStats.logged
        .slice(0, 31)
        .map((item, idx) => {
          const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
          const dt = parseDateKey(item.id);
          const dayName = dt.toLocaleDateString('ar-EG', { weekday: 'short' });
          const isMin = isMinDay(item.d, settings);

          return `
            <tr style="background: ${rowBg}; font-size: 10px; text-align: center;">
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">
                ${escapeHtml(item.id)} (${escapeHtml(dayName)})
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; font-weight: 800; color: ${item.s.total >= 70 ? '#047857' : '#b45309'};">
                ${item.s.total} / 100
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; color: #4338ca; font-weight: 700;">
                ${item.d.quran > 0 ? `${item.d.quran} ص` : '—'}
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; color: #059669; font-weight: 700;">
                ${item.d.sport > 0 ? `${item.d.sport} د` : '—'}
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; color: #7c3aed; font-weight: 700;">
                ${item.d.study > 0 ? `${item.d.study} د` : '—'}
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 600;">
                ${item.d.water || 0} ك • ${item.d.sleep || 0}س
              </td>
              <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">
                ${isMin ? '<span style="color: #059669; font-weight: 700;">✓ التزام تام</span>' : '<span style="color: #64748b;">عادي</span>'}
              </td>
            </tr>
          `;
        })
        .join('');

      const daysTableHtml = pStats.logged.length > 0 ? `
        <div style="margin-top: 10px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #0f172a;">سجل أيام الفترة بالتفصيل (${pStats.logged.length} يوم مسجل):</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #1e293b; color: #ffffff;">
                <th style="padding: 5px 6px; border: 1px solid #334155;">التاريخ</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">النقاط</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">القرآن</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">الرياضة</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">التعلّم</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">الماء والنوم</th>
                <th style="padding: 5px 6px; border: 1px solid #334155;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${periodDaysRows}
            </tbody>
          </table>
        </div>
      ` : '';

      systemSummaryHtml = `
        <div style="margin-top: 14px; padding: 14px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #cbd5e1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <h3 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a;">
              📅 مؤشرات أداء الفترة (${escapeHtml(pStats.startDate)} إلى ${escapeHtml(pStats.endDate)})
            </h3>
            <span style="padding: 3px 10px; border-radius: 99px; background: #d1fae5; color: #047857; font-size: 11px; font-weight: 800;">
              متوسط الالتزام: ${Math.round(pStats.avg)} / 100 (${pStats.n} يوم مسجل من ${pStats.totalDays})
            </span>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <div style="flex: 1; padding: 7px 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 9px; color: #64748b;">صلوات بوقتها</div>
              <div style="font-size: 13px; font-weight: 900; color: #059669;">${Math.round(pStats.onTime)}%</div>
            </div>
            <div style="flex: 1; padding: 7px 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 9px; color: #64748b;">إجمالي القرآن</div>
              <div style="font-size: 13px; font-weight: 900; color: #4338ca;">${pStats.quran} ص</div>
            </div>
            <div style="flex: 1; padding: 7px 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 9px; color: #64748b;">إجمالي الرياضة</div>
              <div style="font-size: 13px; font-weight: 900; color: #059669;">${pStats.sportMin} د</div>
            </div>
            <div style="flex: 1; padding: 7px 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 9px; color: #64748b;">ساعات التعلّم</div>
              <div style="font-size: 13px; font-weight: 900; color: #7c3aed;">${pStats.studyH.toFixed(1)}س</div>
            </div>
            <div style="flex: 1; padding: 7px 8px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 9px; color: #64748b;">أيام الحد الأدنى</div>
              <div style="font-size: 13px; font-weight: 900; color: #d97706;">${pStats.minDays} يوم</div>
            </div>
          </div>

          <div style="margin-bottom: 8px;">${catBarsHtml}</div>
          ${daysTableHtml}
        </div>
      `;
    } else {
      systemSummaryHtml = `
        <div style="margin-top: 14px; padding: 14px 16px; border-radius: 14px; background: #f8fafc; border: 1px solid #cbd5e1;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            <h3 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a;">📈 مؤشرات الأداء الشهري لنظامي (${escapeHtml(monthLabel)})</h3>
            <span style="padding: 3px 10px; border-radius: 99px; background: #d1fae5; color: #047857; font-size: 11px; font-weight: 800;">متوسط الشهر: ${Math.round(monthStats.avg)} / 100 (${monthStats.n} يوم مسجل)</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1; padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b;">صلوات في وقتها</div>
              <div style="font-size: 14px; font-weight: 900; color: #059669;">${Math.round(monthStats.onTime)}%</div>
            </div>
            <div style="flex: 1; padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b;">ورد القرآن الإجمالي</div>
              <div style="font-size: 14px; font-weight: 900; color: #4338ca;">${monthStats.quran} صفحة</div>
            </div>
            <div style="flex: 1; padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b;">ساعات التعلّم والرياضة</div>
              <div style="font-size: 13px; font-weight: 900; color: #7c3aed;">${monthStats.studyH.toFixed(1)}س • ${(monthStats.sportMin / 60).toFixed(1)}س</div>
            </div>
            <div style="flex: 1; padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;">
              <div style="font-size: 9.5px; color: #64748b;">أطول سلسلة التزام</div>
              <div style="font-size: 14px; font-weight: 900; color: #d97706;">${monthStats.streak} أيام 🔥</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Work Tasks KPI Summary Bar
  const tasksKpiHtml = `
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      <div style="flex: 1; padding: 9px; border-radius: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; text-align: center;">
        <div style="font-size: 15px; font-weight: 900; color: #0f172a;">${totalSelected}</div>
        <div style="font-size: 9.5px; font-weight: 700; color: #475569;">إجمالي المهام بالتقرير</div>
      </div>
      <div style="flex: 1; padding: 9px; border-radius: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; text-align: center;">
        <div style="font-size: 15px; font-weight: 900; color: #047857;">${completedCount}</div>
        <div style="font-size: 9.5px; font-weight: 700; color: #065f46;">مهام مكتملة</div>
      </div>
      <div style="flex: 1; padding: 9px; border-radius: 10px; background: #fffbeb; border: 1px solid #fde68a; text-align: center;">
        <div style="font-size: 15px; font-weight: 900; color: #b45309;">${pendingCount}</div>
        <div style="font-size: 9.5px; font-weight: 700; color: #92400e;">قيد الانتظار</div>
      </div>
      <div style="flex: 1; padding: 9px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; text-align: center;">
        <div style="font-size: 15px; font-weight: 900; color: #b91c1c;">${urgentCount}</div>
        <div style="font-size: 9.5px; font-weight: 700; color: #991b1b;">مهام عاجلة</div>
      </div>
      <div style="flex: 1; padding: 9px; border-radius: 10px; background: #eef2ff; border: 1px solid #c7d2fe; text-align: center;">
        <div style="font-size: 15px; font-weight: 900; color: #3730a3;">${attachmentsTotal}</div>
        <div style="font-size: 9.5px; font-weight: 700; color: #312e81;">ملفات ومرفقات</div>
      </div>
    </div>
  `;

  // Reflections Block (optional)
  let reflectionsHtml = '';
  if (includeReflections && scope !== 'tasks_only') {
    let notesPairs: { label: string; val: string }[] = [];

    if (scope === 'daily_and_tasks' || scope === 'specific_day') {
      const targetDateKey = currentDateKey;
      const targetDayRecord = dailySystemService.getDay(targetDateKey);
      notesPairs = [
        { label: 'أبرز إنجازات اليوم', val: targetDayRecord.notes.good },
        { label: 'المعوقات', val: targetDayRecord.notes.block },
        { label: 'أولوية الغد', val: targetDayRecord.notes.tomorrow },
      ].filter((n) => n.val && n.val.trim());
    } else if (scope === 'date_range') {
      const pStats = periodStats || calculatePeriodStats(sDate, eDate, allDays, settings);

      const goodNotes = pStats.logged
        .filter(({ d }) => d.notes?.good && d.notes.good.trim())
        .map(({ id, d }) => `[${id}]: ${d.notes.good.trim()}`);

      const blockNotes = pStats.blocks && pStats.blocks.length > 0
        ? pStats.blocks.map((b) => `[${b.id}]: ${b.t}`)
        : pStats.logged
            .filter(({ d }) => d.notes?.block && d.notes.block.trim())
            .map(({ id, d }) => `[${id}]: ${d.notes.block.trim()}`);

      const tomorrowNotes = pStats.logged
        .filter(({ d }) => d.notes?.tomorrow && d.notes.tomorrow.trim())
        .map(({ id, d }) => `[${id}]: ${d.notes.tomorrow.trim()}`);

      if (goodNotes.length > 0) {
        notesPairs.push({
          label: 'إنجازات ونجاحات الفترة',
          val: goodNotes.join(' • '),
        });
      }
      if (blockNotes.length > 0) {
        notesPairs.push({
          label: 'المعوقات والتحديات المسجلة',
          val: blockNotes.join(' • '),
        });
      }
      if (tomorrowNotes.length > 0) {
        notesPairs.push({
          label: 'الأولويات والخطط القادمة',
          val: tomorrowNotes.join(' • '),
        });
      }
    } else if (scope === 'comprehensive') {
      notesPairs = [
        { label: 'أهم إنجازات الشهر', val: monthReview.wins },
        { label: 'الدرس المستفاد', val: monthReview.lesson },
        { label: 'هدف الشهر القادم', val: monthReview.goal },
      ].filter((n) => n.val && n.val.trim());
    }

    if (notesPairs.length > 0) {
      reflectionsHtml = `
        <div style="margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a;">
          <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #92400e;">📝 المراجعة والملاحظات</h4>
          ${notesPairs
          .map(
            (n) => `
              <div style="margin-bottom: 5px; font-size: 10.5px; color: #1e293b;">
                <strong style="color: #78350f;">${escapeHtml(n.label)}:</strong> ${escapeHtml(n.val)}
              </div>`
          )
          .join('')}
        </div>
      `;
    }
  }

  // Paginate Tasks cleanly into chunks so no table rows split awkwardly across A4 page edges
  const firstPageBatchSize = showSystemSection ? 6 : 11;
  const nextPageBatchSize = 11;

  const taskChunks: Task[][] = [];
  if (!shouldRenderTasks || selectedTasks.length === 0) {
    taskChunks.push([]);
  } else {
    taskChunks.push(selectedTasks.slice(0, firstPageBatchSize));
    let cursor = firstPageBatchSize;
    while (cursor < selectedTasks.length) {
      taskChunks.push(selectedTasks.slice(cursor, cursor + nextPageBatchSize));
      cursor += nextPageBatchSize;
    }
  }

  const totalPages = taskChunks.length;
  const host = document.createElement('div');
  host.style.cssText =
    'position: fixed; left: -99999px; top: 0; width: 794px; background: #ffffff; z-index: -1; direction: rtl;';
  document.body.appendChild(host);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const pageNodes: HTMLElement[] = [];
    let runningIndex = 0;

    taskChunks.forEach((chunk, pageIdx) => {
      const isFirst = pageIdx === 0;
      const isLast = pageIdx === totalPages - 1;
      const rowsHtml = shouldRenderTasks ? buildTaskRowsHtml(chunk, runningIndex, includeAttachmentsDetails) : '';
      runningIndex += chunk.length;

      let headerBadgeLabel = '';
      if (scope === 'date_range') {
        headerBadgeLabel = `فترة: ${options.startDateKey || ''} إلى ${options.endDateKey || ''}`;
      } else if (scope === 'specific_day' || scope === 'daily_and_tasks') {
        headerBadgeLabel = `يوم ${currentDateKey}`;
      } else if (scope === 'tasks_only') {
        headerBadgeLabel = 'مهام العمل';
      } else {
        headerBadgeLabel = `التقرير الشهري الشامل — ${monthLabel}`;
      }

      const headerHtml = isFirst
        ? `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-radius: 16px; background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%); color: #ffffff;">
            <div>
              <div style="font-size: 10.5px; color: #6ee7b7; font-weight: 700; margin-bottom: 3px;">د. عبد العزيز — نظام التذكير والمتابعة الذكي</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff;">${escapeHtml(reportTitle)}</h1>
              <div style="font-size: 10.5px; color: #cbd5e1; margin-top: 4px;">تاريخ الإصدار: ${escapeHtml(gregorianNow)} • ${escapeHtml(timeNow)}</div>
            </div>
            <div style="text-align: left; padding: 8px 14px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 11px; font-weight: 800; color: #fde68a;">تقرير معتمد</div>
              <div style="font-size: 10px; color: #e2e8f0;">${escapeHtml(headerBadgeLabel)}</div>
            </div>
          </div>
        `
        : `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: #0f172a; color: #ffffff;">
            <span style="font-size: 12px; font-weight: 800;">تابع: ${escapeHtml(reportTitle)}</span>
            <span style="font-size: 10px; color: #94a3b8;">د. عبد العزيز • ${escapeHtml(gregorianNow)}</span>
          </div>
        `;

      const pageEl = document.createElement('div');
      pageEl.style.cssText =
        'width: 794px; min-height: 1122px; padding: 32px 36px 52px 36px; box-sizing: border-box; background: #ffffff; color: #0f172a; font-family: "Cairo", "Tajawal", sans-serif; direction: rtl; text-align: right; position: relative;';

      pageEl.innerHTML = `
        ${headerHtml}
        ${isFirst ? systemSummaryHtml : ''}
        ${shouldRenderTasks && isFirst ? tasksKpiHtml : ''}
        ${shouldRenderTasks ? buildTasksTableShell(rowsHtml, isFirst ? 'سجل مهام العمل والتفاصيل' : 'تابع سجل مهام العمل') : ''}
        ${isLast ? reflectionsHtml : ''}
        <div style="position: absolute; bottom: 20px; left: 36px; right: 36px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: #64748b;">
          <span>صادر من نظام المتابعة الذكي — د. عبد العزيز</span>
          <span style="font-weight: 700;">صفحة ${pageIdx + 1} من ${totalPages}</span>
        </div>
      `;

      host.appendChild(pageEl);
      pageNodes.push(pageEl);
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    const pageWidthMm = doc.internal.pageSize.getWidth();
    const pageHeightMm = doc.internal.pageSize.getHeight();

    for (let i = 0; i < pageNodes.length; i++) {
      if (i > 0) doc.addPage();
      const canvas = await html2canvas(pageNodes[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.94);
      const ratio = canvas.height / canvas.width;
      const renderedH = Math.min(pageHeightMm, pageWidthMm * ratio);
      doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, renderedH, undefined, 'FAST');
    }

    let fileNameScope = 'نظامي';
    if (scope === 'tasks_only') fileNameScope = 'مهام_العمل';
    else if (scope === 'specific_day' || scope === 'daily_and_tasks') fileNameScope = `يوم_${currentDateKey}`;
    else if (scope === 'date_range') fileNameScope = `فترة_${options.startDateKey}_إلى_${options.endDateKey}`;

    const fileName = `تقرير_${fileNameScope}_${getLocalDateStr(now)}.pdf`;

    if (NativeAlarmService.isAndroidNative()) {
      const dataUri = doc.output('datauristring');
      const base64 = dataUri.split(',')[1] || '';
      const res = await VideoAlarm.saveAndOpenFile({
        base64,
        fileName,
        mimeType: 'application/pdf',
        share: openOrShare === 'share',
      });
      return {
        success: !!res.success,
        fileName: res.fileName || fileName,
        savedToDownloads: res.savedToDownloads,
      };
    }

    doc.save(fileName);
    return { success: true, fileName };
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return {
      success: false,
      fileName: '',
      error: err?.message || 'حدث خطأ أثناء إنشاء ملف PDF',
    };
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}
