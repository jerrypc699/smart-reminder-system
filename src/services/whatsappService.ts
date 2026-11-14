import { Capacitor } from '@capacitor/core';
import type { Task, WhatsAppGlobalSettings, WhatsAppSavedContact } from '../types';
import { getApiUrl } from '../config/api';
import { VideoAlarm, type NativeWhatsAppTaskAlarmPayload } from './videoAlarmPlugin';

const WHATSAPP_SETTINGS_KEY = 'smart_reminder_whatsapp_settings_v1';

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppGlobalSettings = {
  provider: 'none',
  defaultCountryCode: '20',
  greenApiInstanceId: '',
  greenApiToken: '',
  greenApiHost: 'https://api.green-api.com',
  ultraMsgInstanceId: '',
  ultraMsgToken: '',
  callMeBotApiKey: '',
  metaPhoneNumberId: '',
  metaAccessToken: '',
  webhookUrl: '',
  webhookSecret: '',
  savedContacts: [],
};

export function toAsciiDigits(input: string): string {
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizeWhatsAppPhone(raw: string, defaultCountryCode?: string): string {
  const cc =
    toAsciiDigits(defaultCountryCode || whatsappService.getSettings().defaultCountryCode || '20').replace(/\D/g, '') ||
    '20';
  let digits = toAsciiDigits(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (cc === '20' && digits.startsWith('01') && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 12) {
    return `${cc}${digits.slice(1)}`;
  }
  return digits;
}

export function formatWhatsAppDisplayPhone(raw: string, defaultCountryCode?: string): string {
  const normalized = normalizeWhatsAppPhone(raw, defaultCountryCode);
  return normalized ? `+${normalized}` : '';
}

export function buildTaskWhatsAppMessage(task: Pick<Task, 'title' | 'description' | 'dueDate' | 'dueTime' | 'attachments' | 'whatsapp'>): string {
  const custom = task.whatsapp?.customMessage?.trim();
  const title = task.title || 'مهمة عمل';
  const dueDate = task.dueDate || '';
  const dueTime = task.dueTime || '';
  const desc = task.description || '';

  const includeAtts = task.whatsapp?.includeAttachmentsLinks !== false;
  const attLinks =
    includeAtts && Array.isArray(task.attachments)
      ? task.attachments.filter((a) => a.cloudUrl).map((a) => `📎 ${a.name}: ${a.cloudUrl}`)
      : [];

  if (custom) {
    let text = custom
      .replace(/\{العنوان\}|\{title\}/gi, title)
      .replace(/\{التاريخ\}|\{date\}/gi, dueDate)
      .replace(/\{الوقت\}|\{time\}/gi, dueTime)
      .replace(/\{التفاصيل\}|\{description\}/gi, desc);
    if (attLinks.length > 0 && !text.includes(attLinks[0])) {
      text += `\n\n${attLinks.join('\n')}`;
    }
    return text;
  }

  const lines = [
    `📋 *تذكير مهمة: ${title}*`,
    dueDate || dueTime ? `⏰ الموعد: ${dueDate}${dueTime ? ` — الساعة ${dueTime}` : ''}` : '',
    desc ? `📝 التفاصيل: ${desc}` : '',
    attLinks.length > 0 ? `\n*المرفقات:*\n${attLinks.join('\n')}` : '',
    `\n— مرسل تلقائياً من نظام د. عبد العزيز الذكي`,
  ].filter(Boolean);

  return lines.join('\n');
}

export interface WhatsAppDispatchResult {
  success: boolean;
  method: 'api' | 'app' | 'none';
  provider?: string;
  error?: string;
}

class WhatsAppService {
  private listeners: Set<(settings: WhatsAppGlobalSettings) => void> = new Set();

  public getSettings(): WhatsAppGlobalSettings {
    if (typeof window === 'undefined') return { ...DEFAULT_WHATSAPP_SETTINGS };
    try {
      const raw = localStorage.getItem(WHATSAPP_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_WHATSAPP_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...parsed,
        savedContacts: Array.isArray(parsed?.savedContacts) ? parsed.savedContacts : [],
      };
    } catch {
      return { ...DEFAULT_WHATSAPP_SETTINGS };
    }
  }

  public saveSettings(updates: Partial<WhatsAppGlobalSettings>): WhatsAppGlobalSettings {
    const current = this.getSettings();
    const merged: WhatsAppGlobalSettings = {
      ...current,
      ...updates,
      savedContacts: updates.savedContacts !== undefined ? updates.savedContacts : current.savedContacts,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WHATSAPP_SETTINGS_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Failed to save WhatsApp settings:', e);
      }
    }
    this.listeners.forEach((cb) => cb(merged));
    return merged;
  }

  public subscribeSettings(cb: (settings: WhatsAppGlobalSettings) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public addSavedContact(name: string, phone: string): WhatsAppSavedContact[] {
    const settings = this.getSettings();
    const normalized = normalizeWhatsAppPhone(phone, settings.defaultCountryCode);
    if (!normalized) return settings.savedContacts;

    const cleanName = name.trim() || `+${normalized}`;
    const existingIdx = settings.savedContacts.findIndex(
      (c) => normalizeWhatsAppPhone(c.phone, settings.defaultCountryCode) === normalized
    );

    const next = [...settings.savedContacts];
    if (existingIdx >= 0) {
      next[existingIdx] = { ...next[existingIdx], name: cleanName, phone: normalized };
    } else {
      next.unshift({
        id: `wa_contact_${Date.now()}`,
        name: cleanName,
        phone: normalized,
      });
    }
    this.saveSettings({ savedContacts: next });
    return next;
  }

  public removeSavedContact(contactId: string): WhatsAppSavedContact[] {
    const settings = this.getSettings();
    const next = settings.savedContacts.filter((c) => c.id !== contactId);
    this.saveSettings({ savedContacts: next });
    return next;
  }

  public buildWhatsAppWebUrl(rawPhone: string, message: string): string {
    const phone = normalizeWhatsAppPhone(rawPhone);
    const encoded = encodeURIComponent(message || '');
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
  }

  /**
   * Pick contact directly from device phonebook (Native Android Contacts Intent, Web Contact Picker API, or saved contacts)
   */
  public async pickContactFromDevice(): Promise<{
    success: boolean;
    name?: string;
    phone?: string;
    cancelled?: boolean;
    message?: string;
  }> {
    // 1. Android Native Capacitor via VideoAlarm plugin
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await VideoAlarm.pickContact();
        if (res && res.success && res.phone) {
          return {
            success: true,
            name: res.name || '',
            phone: res.phone,
          };
        }
        if (res?.cancelled) {
          return { success: false, cancelled: true, message: 'تم إلغاء الاختيار' };
        }
      } catch (err: any) {
        console.warn('[WhatsAppService] Native pickContact error:', err);
      }
    }

    // 2. Web Contact Picker API (Chrome Android / PWA)
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (Array.isArray(contacts) && contacts.length > 0) {
          const c = contacts[0];
          const name = Array.isArray(c.name) ? c.name[0] : c.name || '';
          const phone = Array.isArray(c.tel) ? c.tel[0] : c.tel || '';
          if (phone) {
            return {
              success: true,
              name,
              phone,
            };
          }
        }
        return { success: false, cancelled: true, message: 'تم إلغاء الاختيار' };
      } catch (err: any) {
        console.warn('[WhatsAppService] Web contacts.select error:', err);
      }
    }

    return {
      success: false,
      message: 'خاصية سحب جهات الاتصال المباشرة مدعومة على تطبيق الأندرويد ومتصفحات الهواتف الذكية.',
    };
  }

  public async openWhatsAppChat(rawPhone: string, message: string): Promise<boolean> {
    const phone = normalizeWhatsAppPhone(rawPhone);
    if (!phone) return false;

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await VideoAlarm.openWhatsApp({ phone, text: message });
        return !!res?.opened;
      } catch (err) {
        console.warn('Native VideoAlarm.openWhatsApp fallback to browser URL:', err);
      }
    }

    if (typeof window !== 'undefined') {
      const url = this.buildWhatsAppWebUrl(phone, message);
      if (Capacitor.isNativePlatform()) {
        window.location.href = url;
        return true;
      }
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) return true;
    }
    return false;
  }

  public async sendViaApiGateway(params: {
    phone: string;
    message: string;
    recipientName?: string;
    taskId?: string;
    taskTitle?: string;
    dueDate?: string;
    dueTime?: string;
    dedupeKey?: string;
    gatewayOverride?: WhatsAppGlobalSettings;
  }): Promise<{ success: boolean; provider?: string; error?: string; code?: string }> {
    const settings = params.gatewayOverride || this.getSettings();
    const phone = normalizeWhatsAppPhone(params.phone, settings.defaultCountryCode);
    if (!phone || phone.length < 8) {
      return { success: false, code: 'INVALID_PHONE', error: 'رقم الهاتف غير صالح' };
    }

    try {
      const resp = await fetch(getApiUrl('/api/whatsapp-send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          phone,
          message: params.message,
          recipientName: params.recipientName || '',
          taskId: params.taskId || '',
          taskTitle: params.taskTitle || '',
          dueDate: params.dueDate || '',
          dueTime: params.dueTime || '',
          dedupeKey: params.dedupeKey || '',
          gateway: settings,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success) {
        return {
          success: false,
          provider: json?.provider || settings.provider,
          code: json?.code,
          error: json?.error || `HTTP ${resp.status}`,
        };
      }
      return { success: true, provider: json.provider || settings.provider };
    } catch (err: any) {
      return {
        success: false,
        provider: settings.provider,
        error: err?.message || 'تعذر الاتصال بخادم الإرسال التلقائي',
      };
    }
  }

  public async triggerTaskWhatsAppSend(
    task: Task,
    options: { allowOpenApp?: boolean; skipDedupe?: boolean } = {}
  ): Promise<WhatsAppDispatchResult> {
    const wa = task.whatsapp;
    if (!wa?.phoneNumber) {
      return { success: false, method: 'none', error: 'لم يتم تحديد رقم واتساب للمهمة' };
    }

    const settings = this.getSettings();
    const phone = normalizeWhatsAppPhone(wa.phoneNumber, settings.defaultCountryCode);
    if (!phone || phone.length < 8) {
      return { success: false, method: 'none', error: 'رقم الواتساب غير مكتمل' };
    }

    const message = buildTaskWhatsAppMessage(task);
    const dedupeKey = options.skipDedupe
      ? ''
      : `${task.id}-${task.dueDate || 'any'}-${task.dueTime || 'now'}`;

    // 1. Automatic Gateway Mode if configured
    if (settings.provider && settings.provider !== 'none') {
      const apiRes = await this.sendViaApiGateway({
        phone,
        message,
        recipientName: wa.recipientName,
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        dedupeKey,
        gatewayOverride: settings,
      });

      if (apiRes.success) {
        return { success: true, method: 'api', provider: apiRes.provider };
      }

      // If API fails and direct app fallback is permitted, open WhatsApp directly
      if (options.allowOpenApp) {
        const opened = await this.openWhatsAppChat(phone, message);
        if (opened) {
          return {
            success: true,
            method: 'app',
            provider: apiRes.provider,
            error: apiRes.error,
          };
        }
      }

      return {
        success: false,
        method: 'api',
        provider: apiRes.provider,
        error: apiRes.error,
      };
    }

    // 2. Direct WhatsApp App Mode
    if (options.allowOpenApp !== false) {
      const opened = await this.openWhatsAppChat(phone, message);
      return {
        success: opened,
        method: 'app',
        error: opened ? undefined : 'تم حظر الفتح التلقائي للنافذة؛ استخدم زر الإرسال من التنبيه.',
      };
    }

    return { success: false, method: 'none', error: 'الفتح التلقائي متوقف' };
  }

  public async syncNativeWhatsAppAlarms(tasks: Task[]): Promise<number> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return 0;
    }

    const settings = this.getSettings();
    const nowMs = Date.now();
    const alarms: NativeWhatsAppTaskAlarmPayload[] = [];

    for (const task of tasks) {
      if (task.status === 'completed') continue;
      if (!task.whatsapp?.enabled || !task.whatsapp.phoneNumber) continue;

      const phone = normalizeWhatsAppPhone(task.whatsapp.phoneNumber, settings.defaultCountryCode);
      if (!phone || phone.length < 8) continue;

      let triggerDate: Date | null = null;
      if (task.status === 'snoozed' && task.snoozeUntil) {
        triggerDate = new Date(task.snoozeUntil);
      } else if (task.dueDate && task.dueTime) {
        const [y, m, d] = task.dueDate.split('-').map(Number);
        const [hh, mm] = task.dueTime.split(':').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm)) {
          const base = new Date(y, m - 1, d, hh, mm, 0, 0);
          const remMins = Number(task.reminderMinutesBefore) || 0;
          triggerDate = new Date(base.getTime() - remMins * 60 * 1000);
        }
      }

      if (!triggerDate || triggerDate.getTime() <= nowMs - 5000) continue;

      // Deterministic integer ID in 40000..49999 range (distinct from 30000 media alarms)
      let hash = 0;
      for (let i = 0; i < task.id.length; i++) {
        hash = (hash * 31 + task.id.charCodeAt(i)) | 0;
      }
      const alarmId = 40000 + (Math.abs(hash) % 9000);

      alarms.push({
        alarmId,
        triggerAtMs: Math.max(triggerDate.getTime(), nowMs + 1500),
        taskId: task.id,
        title: task.title,
        phone,
        recipientName: task.whatsapp.recipientName || `+${phone}`,
        message: buildTaskWhatsAppMessage(task),
        autoTriggerAtDueTime: task.whatsapp.autoTriggerAtDueTime !== false,
        dedupeKey: `${task.id}-${task.dueDate || 'any'}-${task.dueTime || 'now'}`,
      });
    }

    try {
      const res = await VideoAlarm.syncWhatsAppTaskAlarms({
        alarms,
        gatewayConfigJson: JSON.stringify(settings),
      });
      return res?.scheduledCount || 0;
    } catch (err) {
      console.warn('[WhatsAppService] syncNativeWhatsAppAlarms error:', err);
      return 0;
    }
  }
}

export const whatsappService = new WhatsAppService();

