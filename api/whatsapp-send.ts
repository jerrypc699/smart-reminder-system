import type { VercelRequest, VercelResponse } from '@vercel/node';
import { head, put } from '@vercel/blob';

const STATE_PATH = 'dr-abdelaziz/state.json';
const WA_HISTORY_PATH = 'dr-abdelaziz/last-whatsapp-history.json';

type ProviderType = 'none' | 'greenapi' | 'ultramsg' | 'callmebot' | 'meta_cloud' | 'webhook';

interface GatewayConfig {
  provider: ProviderType;
  defaultCountryCode?: string;
  greenApiInstanceId?: string;
  greenApiToken?: string;
  greenApiHost?: string;
  ultraMsgInstanceId?: string;
  ultraMsgToken?: string;
  callMeBotApiKey?: string;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

function toAsciiDigits(input: string): string {
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function normalizePhone(raw: string, defaultCountryCode = '20'): string {
  let digits = toAsciiDigits(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  const cc = toAsciiDigits(defaultCountryCode || '20').replace(/\D/g, '') || '20';
  if (cc === '20' && digits.startsWith('01') && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 12) {
    return `${cc}${digits.slice(1)}`;
  }
  return digits;
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const meta = await head(pathname);
    if (meta && meta.url) {
      const resp = await fetch(`${meta.url}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (resp.ok) {
        return (await resp.json()) as T;
      }
    }
  } catch {
    // Blob does not exist yet
  }
  return null;
}

function resolveGateway(bodyGateway: any, cloudGateway: any): GatewayConfig {
  const src = {
    ...(cloudGateway || {}),
    ...(bodyGateway || {}),
  };

  const envProvider = (process.env.WHATSAPP_PROVIDER || 'none') as ProviderType;
  const provider = (src.provider && src.provider !== 'none' ? src.provider : envProvider) as ProviderType;

  return {
    provider: provider || 'none',
    defaultCountryCode: src.defaultCountryCode || process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '20',
    greenApiInstanceId: src.greenApiInstanceId || process.env.GREENAPI_INSTANCE_ID || '',
    greenApiToken: src.greenApiToken || process.env.GREENAPI_API_TOKEN || '',
    greenApiHost: src.greenApiHost || process.env.GREENAPI_HOST || 'https://api.green-api.com',
    ultraMsgInstanceId: src.ultraMsgInstanceId || process.env.ULTRAMSG_INSTANCE_ID || '',
    ultraMsgToken: src.ultraMsgToken || process.env.ULTRAMSG_TOKEN || '',
    callMeBotApiKey: src.callMeBotApiKey || process.env.CALLMEBOT_API_KEY || '',
    metaPhoneNumberId: src.metaPhoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '',
    metaAccessToken: src.metaAccessToken || process.env.META_WHATSAPP_ACCESS_TOKEN || '',
    webhookUrl: src.webhookUrl || process.env.WHATSAPP_WEBHOOK_URL || '',
    webhookSecret: src.webhookSecret || process.env.WHATSAPP_WEBHOOK_SECRET || '',
  };
}

function formatTaskMessage(task: any): string {
  const custom = task?.whatsapp?.customMessage?.trim();
  const title = task?.title || 'مهمة عمل';
  const dueDate = task?.dueDate || '';
  const dueTime = task?.dueTime || '';
  const desc = task?.description || '';

  const includeAtts = task?.whatsapp?.includeAttachmentsLinks !== false;
  const attUrls = includeAtts && Array.isArray(task?.attachments)
    ? task.attachments.filter((a: any) => a?.cloudUrl).map((a: any) => `📎 ${a.name}: ${a.cloudUrl}`)
    : [];

  if (custom) {
    let text = custom
      .replace(/\{العنوان\}|\{title\}/gi, title)
      .replace(/\{التاريخ\}|\{date\}/gi, dueDate)
      .replace(/\{الوقت\}|\{time\}/gi, dueTime)
      .replace(/\{التفاصيل\}|\{description\}/gi, desc);
    if (attUrls.length > 0 && !text.includes(attUrls[0])) {
      text += `\n\n${attUrls.join('\n')}`;
    }
    return text;
  }

  const lines = [
    `📋 *تذكير مهمة: ${title}*`,
    dueDate || dueTime ? `⏰ الموعد: ${dueDate}${dueTime ? ` — الساعة ${dueTime}` : ''}` : '',
    desc ? `📝 التفاصيل: ${desc}` : '',
    attUrls.length > 0 ? `\n*المرفقات:*\n${attUrls.join('\n')}` : '',
    `\n— نظام التذكير الذكي (د. عبد العزيز)`,
  ].filter(Boolean);

  return lines.join('\n');
}

async function dispatchWhatsApp(
  gateway: GatewayConfig,
  params: {
    phone: string;
    message: string;
    recipientName?: string;
    taskId?: string;
    taskTitle?: string;
    dueDate?: string;
    dueTime?: string;
  }
): Promise<{ success: boolean; provider: string; error?: string; code?: string; detail?: any }> {
  const normalizedPhone = normalizePhone(params.phone, gateway.defaultCountryCode);
  if (!normalizedPhone || normalizedPhone.length < 8) {
    return {
      success: false,
      provider: gateway.provider,
      code: 'INVALID_PHONE',
      error: 'رقم الهاتف غير صالح. يرجى إدخال الرقم مع رمز الدولة (مثال: 201012345678).',
    };
  }

  const text = String(params.message || '').trim();
  if (!text) {
    return {
      success: false,
      provider: gateway.provider,
      code: 'EMPTY_MESSAGE',
      error: 'نص الرسالة فارغ.',
    };
  }

  if (!gateway.provider || gateway.provider === 'none') {
    return {
      success: false,
      provider: 'none',
      code: 'NO_GATEWAY',
      error: 'لم يتم إعداد بوابة إرسال تلقائي في الإعدادات (سيتم الفتح عبر تطبيق واتساب).',
    };
  }

  try {
    if (gateway.provider === 'greenapi') {
      const inst = (gateway.greenApiInstanceId || '').trim();
      const tok = (gateway.greenApiToken || '').trim();
      const host = (gateway.greenApiHost || 'https://api.green-api.com').replace(/\/+$/, '');
      if (!inst || !tok) {
        return { success: false, provider: 'greenapi', code: 'MISSING_CREDS', error: 'بيانات Green-API غير مكتملة.' };
      }
      const resp = await fetch(`${host}/waInstance${inst}/sendMessage/${tok}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${normalizedPhone}@c.us`,
          message: text,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.idMessage) {
        return {
          success: false,
          provider: 'greenapi',
          error: json?.message || json?.invokeStatus?.description || `HTTP ${resp.status}`,
          detail: json,
        };
      }
      return { success: true, provider: 'greenapi', detail: json };
    }

    if (gateway.provider === 'ultramsg') {
      const inst = (gateway.ultraMsgInstanceId || '').trim();
      const tok = (gateway.ultraMsgToken || '').trim();
      if (!inst || !tok) {
        return { success: false, provider: 'ultramsg', code: 'MISSING_CREDS', error: 'بيانات UltraMsg غير مكتملة.' };
      }
      const formBody = new URLSearchParams({
        token: tok,
        to: `+${normalizedPhone}`,
        body: text,
      });
      const resp = await fetch(`https://api.ultramsg.com/${inst}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.error || json?.sent === 'false') {
        return {
          success: false,
          provider: 'ultramsg',
          error: json?.error || `HTTP ${resp.status}`,
          detail: json,
        };
      }
      return { success: true, provider: 'ultramsg', detail: json };
    }

    if (gateway.provider === 'callmebot') {
      const apiKey = (gateway.callMeBotApiKey || '').trim();
      if (!apiKey) {
        return { success: false, provider: 'callmebot', code: 'MISSING_CREDS', error: 'مفتاح CallMeBot API Key غير موجود.' };
      }
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      const bodyText = await resp.text().catch(() => '');
      if (!resp.ok || /error/i.test(bodyText)) {
        return {
          success: false,
          provider: 'callmebot',
          error: bodyText.slice(0, 200) || `HTTP ${resp.status}`,
        };
      }
      return { success: true, provider: 'callmebot', detail: bodyText.slice(0, 200) };
    }

    if (gateway.provider === 'meta_cloud') {
      const phoneId = (gateway.metaPhoneNumberId || '').trim();
      const token = (gateway.metaAccessToken || '').trim();
      if (!phoneId || !token) {
        return { success: false, provider: 'meta_cloud', code: 'MISSING_CREDS', error: 'بيانات Meta Cloud API غير مكتملة.' };
      }
      const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.error) {
        return {
          success: false,
          provider: 'meta_cloud',
          error: json?.error?.message || `HTTP ${resp.status}`,
          detail: json,
        };
      }
      return { success: true, provider: 'meta_cloud', detail: json };
    }

    if (gateway.provider === 'webhook') {
      const hookUrl = (gateway.webhookUrl || '').trim();
      if (!hookUrl) {
        return { success: false, provider: 'webhook', code: 'MISSING_CREDS', error: 'رابط Webhook غير محدد.' };
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (gateway.webhookSecret) {
        headers.Authorization = `Bearer ${gateway.webhookSecret}`;
      }
      const resp = await fetch(hookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: normalizedPhone,
          formattedPhone: `+${normalizedPhone}`,
          recipientName: params.recipientName || '',
          message: text,
          taskId: params.taskId || '',
          taskTitle: params.taskTitle || '',
          dueDate: params.dueDate || '',
          dueTime: params.dueTime || '',
          sentAt: new Date().toISOString(),
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        return {
          success: false,
          provider: 'webhook',
          error: errText.slice(0, 200) || `HTTP ${resp.status}`,
        };
      }
      return { success: true, provider: 'webhook' };
    }

    return { success: false, provider: gateway.provider, error: 'مزود غير مدعوم.' };
  } catch (err: any) {
    return {
      success: false,
      provider: gateway.provider,
      error: err?.message || 'خطأ في الاتصال ببوابة واتساب',
    };
  }
}

function getCairoNowWallClock(): { fakeUtcMs: number; ymd: string } {
  const now = new Date();
  const ymd = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  const hms = now.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [y, m, d] = ymd.split('-').map(Number);
  const [hh, mm] = hms.split(':').map(Number);
  return {
    fakeUtcMs: Date.UTC(y, m - 1, d, hh, mm, 0, 0),
    ymd,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const cloudState = await readBlobJson<any>(STATE_PATH);

    // GET: check due cloud tasks and auto-dispatch any due WhatsApp task (for external scheduler/cron)
    if (req.method === 'GET') {
      const tasks: any[] = Array.isArray(cloudState?.tasks) ? cloudState.tasks : [];
      const gateway = resolveGateway(null, cloudState?.whatsappSettings);
      if (gateway.provider === 'none') {
        return res.status(200).json({ status: 'no_gateway_configured', checkedTasks: tasks.length, sentCount: 0 });
      }

      const history = (await readBlobJson<string[]>(WA_HISTORY_PATH)) || [];
      const { fakeUtcMs } = getCairoNowWallClock();
      const forceTaskId = typeof req.query.taskId === 'string' ? req.query.taskId : '';

      const dispatched: any[] = [];
      for (const task of tasks) {
        if (task.status === 'completed') continue;
        if (!task.whatsapp?.enabled || !task.whatsapp?.phoneNumber) continue;

        let isDue = false;
        let triggerKey = '';

        if (forceTaskId && task.id === forceTaskId) {
          isDue = true;
          triggerKey = `${task.id}-force-${Date.now()}`;
        } else if (task.dueDate && task.dueTime) {
          const [y, m, d] = String(task.dueDate).split('-').map(Number);
          const [hh, mm] = String(task.dueTime).split(':').map(Number);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm)) {
            const remOffsetMs = (Number(task.reminderMinutesBefore) || 0) * 60 * 1000;
            const targetFakeUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0) - remOffsetMs;
            const diffMins = (fakeUtcMs - targetFakeUtcMs) / 60000;
            if (diffMins >= 0 && diffMins <= 5) {
              triggerKey = `${task.id}-${targetFakeUtcMs}`;
              if (!history.includes(triggerKey)) {
                isDue = true;
              }
            }
          }
        }

        if (isDue) {
          const msg = formatTaskMessage(task);
          const result = await dispatchWhatsApp(gateway, {
            phone: task.whatsapp.phoneNumber,
            message: msg,
            recipientName: task.whatsapp.recipientName,
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
          });
          dispatched.push({ taskId: task.id, title: task.title, ...result });
          if (result.success) {
            history.push(triggerKey);
          }
        }
      }

      if (dispatched.some((d) => d.success)) {
        const trimmedHistory = history.slice(-150);
        await put(WA_HISTORY_PATH, JSON.stringify(trimmedHistory), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
        }).catch(() => {});
      }

      return res.status(200).json({
        status: 'ok',
        checkedTasks: tasks.length,
        sentCount: dispatched.filter((d) => d.success).length,
        dispatched,
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody || {};
    const gateway = resolveGateway(body.gateway, cloudState?.whatsappSettings);

    // Optional dedupe for automated background triggers (Android Receiver / Daemon)
    const dedupeKey = typeof body.dedupeKey === 'string' ? body.dedupeKey : '';
    let history: string[] = [];
    if (dedupeKey) {
      history = (await readBlobJson<string[]>(WA_HISTORY_PATH)) || [];
      if (history.includes(dedupeKey)) {
        return res.status(200).json({
          success: true,
          deduplicated: true,
          provider: gateway.provider,
        });
      }
    }

    const result = await dispatchWhatsApp(gateway, {
      phone: body.phone || '',
      message: body.message || '',
      recipientName: body.recipientName || '',
      taskId: body.taskId || '',
      taskTitle: body.taskTitle || '',
      dueDate: body.dueDate || '',
      dueTime: body.dueTime || '',
    });

    if (result.success && dedupeKey) {
      history.push(dedupeKey);
      await put(WA_HISTORY_PATH, JSON.stringify(history.slice(-150)), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      }).catch(() => {});
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('WhatsApp Send API Error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
  }
}
