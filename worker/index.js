const PAGES_ORIGIN = 'https://jerrypc699.github.io/smart-reminder-system';
const STATE_KEY = 'state:dr-abdelaziz';
const PUSH_KEY = 'push:subscriptions';
const PUBLIC_VAPID_KEY =
  'BOw1BHKZUA1YRgFIf13ZVhMXk-P8OBZvOR2xrlL2Ft7XqE1IrK8zI85Jtf8H-mcuda3WBi8g20RlT60QgAK_Lmo';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
};

const MIME_BY_EXT = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function getSeedState() {
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  return {
    tombstones: { taskIds: [], employeeIds: [], scheduledIds: [], habitIds: [], mediaIds: [] },
    tasks: [
      {
        id: 'task-1',
        title: 'مراجعة التقرير الطبي والأسبوعي',
        description: 'تدقيق مؤشرات الأداء ومراجعة الأرقام النهائية قبل الاجتماع الدوري',
        category: 'work',
        priority: 'high',
        employeeId: 'emp-1',
        dueDate: today,
        dueTime: '11:00',
        reminderMinutesBefore: 10,
        voiceMessage: 'يا دكتور عبد العزيز، تنبيه مهم: يرجى مراجعة التقرير وتدقيق الأرقام قبل الاجتماع.',
        status: 'pending',
        repeat: 'none',
        createdAt: now,
      },
    ],
    employees: [
      {
        id: 'emp-1',
        name: 'م. أحمد الشافعي',
        role: 'مساعد تنفيذي وتقني',
        department: 'المكتب التنفيذي والتقنية',
        phone: '01001234567',
        whatsappPhone: '201001234567',
        email: 'ahmed@smartreminder.clinic',
        notes: 'مسؤول الأنظمة التقنية وجداول الاجتماعات والتقارير التنفيذية.',
        createdAt: now,
      },
    ],
    scheduledMedia: [],
    mediaLibrary: [],
    whatsappSettings: {},
    dailySystem: null,
    athkar: null,
    updatedAt: now,
    seeded: true,
  };
}

function mergeItemsById(existingList = [], incomingList = [], deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map();
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (item && item.id && !deletedSet.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }
  if (Array.isArray(incomingList)) {
    for (const item of incomingList) {
      if (item && item.id && !deletedSet.has(item.id)) {
        const prev = map.get(item.id);
        map.set(item.id, prev ? { ...prev, ...item } : item);
      }
    }
  }
  return Array.from(map.values());
}

async function handleSync(request, env) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const forceSeed = url.searchParams.get('seed') === '1' || url.searchParams.get('seed') === 'true';
    let data = await env.SMART_REMINDER_KV.get(STATE_KEY, { type: 'json' });

    const tombstones = data?.tombstones || {
      taskIds: [],
      employeeIds: [],
      scheduledIds: [],
      habitIds: [],
      mediaIds: [],
    };
    const hasTombstones =
      (tombstones.taskIds?.length || 0) > 0 ||
      (tombstones.employeeIds?.length || 0) > 0 ||
      (tombstones.mediaIds?.length || 0) > 0;

    if ((!data && !hasTombstones) || forceSeed) {
      data = getSeedState();
      await env.SMART_REMINDER_KV.put(STATE_KEY, JSON.stringify(data));
    } else if (data) {
      const taskTomb = new Set(tombstones.taskIds || []);
      const empTomb = new Set(tombstones.employeeIds || []);
      const schedTomb = new Set(tombstones.scheduledIds || []);
      const habitTomb = new Set(tombstones.habitIds || []);
      const mediaTomb = new Set(tombstones.mediaIds || []);

      if (Array.isArray(data.tasks)) data.tasks = data.tasks.filter((t) => t && t.id && !taskTomb.has(t.id));
      if (Array.isArray(data.employees)) data.employees = data.employees.filter((e) => e && e.id && !empTomb.has(e.id));
      if (Array.isArray(data.scheduledMedia)) data.scheduledMedia = data.scheduledMedia.filter((s) => s && s.id && !schedTomb.has(s.id));
      if (Array.isArray(data.mediaLibrary)) data.mediaLibrary = data.mediaLibrary.filter((m) => m && m.id && !mediaTomb.has(m.id));
      if (data.dailySystem?.settings) {
        if (Array.isArray(data.dailySystem.settings.customHabits)) {
          data.dailySystem.settings.customHabits = data.dailySystem.settings.customHabits.filter((h) => h && h.id && !habitTomb.has(h.id));
        }
        if (Array.isArray(data.dailySystem.settings.customPrayers)) {
          data.dailySystem.settings.customPrayers = data.dailySystem.settings.customPrayers.filter((p) => p && p.id && !habitTomb.has(p.id));
        }
        if (Array.isArray(data.dailySystem.settings.customAdhkar)) {
          data.dailySystem.settings.customAdhkar = data.dailySystem.settings.customAdhkar.filter((a) => a && a.id && !habitTomb.has(a.id));
        }
      }
    }
    return jsonResponse(data);
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const existingData = (await env.SMART_REMINDER_KV.get(STATE_KEY, { type: 'json' })) || {};
    const existingTombstones = existingData.tombstones || {
      taskIds: [],
      employeeIds: [],
      scheduledIds: [],
      habitIds: [],
      mediaIds: [],
    };

    const allDeletedTasks = Array.from(new Set([...(existingTombstones.taskIds || []), ...(Array.isArray(body.deletedTaskIds) ? body.deletedTaskIds : [])]));
    const allDeletedEmployees = Array.from(new Set([...(existingTombstones.employeeIds || []), ...(Array.isArray(body.deletedEmployeeIds) ? body.deletedEmployeeIds : [])]));
    const allDeletedScheduled = Array.from(new Set([...(existingTombstones.scheduledIds || []), ...(Array.isArray(body.deletedScheduledIds) ? body.deletedScheduledIds : [])]));
    const allDeletedHabits = Array.from(new Set([...(existingTombstones.habitIds || []), ...(Array.isArray(body.deletedHabitIds) ? body.deletedHabitIds : [])]));
    const allDeletedMedia = Array.from(new Set([...(existingTombstones.mediaIds || []), ...(Array.isArray(body.deletedMediaIds) ? body.deletedMediaIds : [])]));

    const updatedTombstones = {
      taskIds: allDeletedTasks,
      employeeIds: allDeletedEmployees,
      scheduledIds: allDeletedScheduled,
      habitIds: allDeletedHabits,
      mediaIds: allDeletedMedia,
    };

    const mergedTasks = body.forceWipe
      ? []
      : Array.isArray(body.tasks)
        ? mergeItemsById(existingData.tasks || [], body.tasks, allDeletedTasks)
        : (existingData.tasks || []).filter((t) => !allDeletedTasks.includes(t.id));

    const mergedEmployees = body.forceWipe
      ? []
      : Array.isArray(body.employees)
        ? mergeItemsById(existingData.employees || [], body.employees, allDeletedEmployees)
        : (existingData.employees || []).filter((e) => !allDeletedEmployees.includes(e.id));

    const mergedScheduledMedia = body.forceWipe
      ? []
      : Array.isArray(body.scheduledMedia)
        ? mergeItemsById(existingData.scheduledMedia || [], body.scheduledMedia, allDeletedScheduled)
        : (existingData.scheduledMedia || []).filter((m) => !allDeletedScheduled.includes(m.id));

    const mergedMediaLibrary = body.forceWipe
      ? []
      : Array.isArray(body.mediaLibrary)
        ? mergeItemsById(existingData.mediaLibrary || [], body.mediaLibrary, allDeletedMedia)
        : (existingData.mediaLibrary || []).filter((m) => !allDeletedMedia.includes(m.id));

    let mergedDailySystem = existingData.dailySystem || null;
    if (body.dailySystem) {
      const habitTombSet = new Set(allDeletedHabits);
      const rawHabits = body.dailySystem.settings?.customHabits ?? existingData.dailySystem?.settings?.customHabits ?? [];
      const rawPrayers = body.dailySystem.settings?.customPrayers ?? existingData.dailySystem?.settings?.customPrayers ?? [];
      const rawAdhkar = body.dailySystem.settings?.customAdhkar ?? existingData.dailySystem?.settings?.customAdhkar ?? [];

      const cleanHabits = rawHabits.filter((h) => h && h.id && !habitTombSet.has(h.id));
      const cleanPrayers = rawPrayers.filter((p) => p && p.id && !habitTombSet.has(p.id));
      const cleanAdhkar = rawAdhkar.filter((a) => a && a.id && !habitTombSet.has(a.id));

      mergedDailySystem = {
        ...(mergedDailySystem || {}),
        ...body.dailySystem,
        days: { ...(mergedDailySystem?.days || {}), ...(body.dailySystem.days || {}) },
        months: { ...(mergedDailySystem?.months || {}), ...(body.dailySystem.months || {}) },
        settings: {
          ...(mergedDailySystem?.settings || {}),
          ...(body.dailySystem.settings || {}),
          customHabits: cleanHabits,
          customPrayers: cleanPrayers,
          customAdhkar: cleanAdhkar,
          builtInSchedules: {
            ...(mergedDailySystem?.settings?.builtInSchedules || {}),
            ...(body.dailySystem.settings?.builtInSchedules || {}),
          },
        },
      };
    }

    const payload = {
      ...existingData,
      ...body,
      tombstones: updatedTombstones,
      tasks: mergedTasks,
      employees: mergedEmployees,
      scheduledMedia: mergedScheduledMedia,
      mediaLibrary: mergedMediaLibrary,
      dailySystem: mergedDailySystem,
      athkar: body.athkar ? { ...(existingData.athkar || {}), ...body.athkar } : (existingData.athkar ?? null),
      whatsappSettings: body.whatsappSettings ?? existingData.whatsappSettings ?? null,
      prayerSettings: body.prayerSettings ?? existingData.prayerSettings ?? null,
      audioSettings: body.audioSettings ?? existingData.audioSettings ?? null,
      updatedAt: new Date().toISOString(),
    };

    await env.SMART_REMINDER_KV.put(STATE_KEY, JSON.stringify(payload));

    return jsonResponse({
      success: true,
      platform: 'cloudflare-kv',
      updatedAt: payload.updatedAt,
      tasksCount: payload.tasks.length,
      employeesCount: payload.employees.length,
      scheduledCount: payload.scheduledMedia.length,
      data: payload,
    });
  }

  return jsonResponse({ error: 'Method Not Allowed' }, 405);
}

async function handleTts(request) {
  const url = new URL(request.url);
  const text = (url.searchParams.get('text') || '').trim();
  const lang = (url.searchParams.get('lang') || 'ar').trim();
  if (!text) return jsonResponse({ error: 'Text query parameter is required' }, 400);

  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
  const upstream = await fetch(googleTtsUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!upstream.ok) return jsonResponse({ error: 'Upstream TTS failed' }, upstream.status);

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      ...CORS_HEADERS,
    },
  });
}

async function handleUpload(request, env) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const rawFilename = decodeURIComponent(request.headers.get('x-filename') || `media_${Date.now()}.mp4`);
  const requestedType = request.headers.get('x-content-type') || '';
  const ext = rawFilename.split('.').pop()?.toLowerCase() || '';
  const mime = requestedType || MIME_BY_EXT[ext] || 'application/octet-stream';

  const buf = await request.arrayBuffer();
  if (buf.byteLength > 24 * 1024 * 1024) {
    return jsonResponse({ error: 'حجم الملف يتجاوز الحد المسموح للسحابة (24 ميجابايت) — يُحفظ محلياً على جهازك.' }, 413);
  }

  const safeExt = ext || 'bin';
  const mediaId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  await env.SMART_REMINDER_KV.put(`media:${mediaId}`, buf, {
    metadata: { contentType: mime, filename: rawFilename, size: buf.byteLength },
  });

  const origin = new URL(request.url).origin;
  return jsonResponse({
    success: true,
    url: `${origin}/api/media/${mediaId}`,
    contentType: mime,
  });
}

async function handleGetMedia(mediaId, env) {
  const { value, metadata } = await env.SMART_REMINDER_KV.getWithMetadata(`media:${mediaId}`, {
    type: 'arrayBuffer',
  });
  if (!value) return jsonResponse({ error: 'Media not found' }, 404);

  return new Response(value, {
    status: 200,
    headers: {
      'Content-Type': metadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
      ...CORS_HEADERS,
    },
  });
}

async function handlePushSubscribe(request, env) {
  if (request.method === 'GET') {
    return jsonResponse({ publicKey: PUBLIC_VAPID_KEY });
  }
  if (request.method === 'POST') {
    const subscription = await request.json().catch(() => null);
    if (!subscription || !subscription.endpoint) {
      return jsonResponse({ error: 'Invalid subscription object' }, 400);
    }
    let subs = (await env.SMART_REMINDER_KV.get(PUSH_KEY, { type: 'json' })) || [];
    const idx = subs.findIndex((s) => s.endpoint === subscription.endpoint);
    if (idx >= 0) {
      subs[idx] = { ...subscription, updatedAt: new Date().toISOString() };
    } else {
      subs.push({ ...subscription, createdAt: new Date().toISOString() });
    }
    if (subs.length > 50) subs = subs.slice(-50);
    await env.SMART_REMINDER_KV.put(PUSH_KEY, JSON.stringify(subs));
    return jsonResponse({ success: true, message: 'تم تسجيل اشتراك الإشعارات بنجاح', count: subs.length });
  }
  return jsonResponse({ error: 'Method Not Allowed' }, 405);
}

async function proxyFrontend(request) {
  const url = new URL(request.url);
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const targetUrl = `${PAGES_ORIGIN}${path}${url.search}`;

  let upstream = await fetch(targetUrl, {
    headers: { 'User-Agent': 'Cloudflare-Worker-SmartReminder' },
    cf: { cacheEverything: true, cacheTtl: 120 },
  });

  // SPA fallback to index.html for client-side routes
  if (upstream.status === 404 && !path.includes('.')) {
    upstream = await fetch(`${PAGES_ORIGIN}/index.html`, {
      headers: { 'User-Agent': 'Cloudflare-Worker-SmartReminder' },
      cf: { cacheEverything: true, cacheTtl: 120 },
    });
  }

  const headers = new Headers(upstream.headers);
  headers.set('X-Powered-By', 'Cloudflare-Workers-DrAbdelaziz');
  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === '/api/health') {
        return jsonResponse({ ok: true, platform: 'cloudflare-workers', kv: Boolean(env.SMART_REMINDER_KV) });
      }
      if (pathname === '/api/sync') {
        return await handleSync(request, env);
      }
      if (pathname === '/api/tts') {
        return await handleTts(request);
      }
      if (pathname === '/api/upload') {
        return await handleUpload(request, env);
      }
      if (pathname.startsWith('/api/media/')) {
        const mediaId = pathname.slice('/api/media/'.length);
        return await handleGetMedia(mediaId, env);
      }
      if (pathname === '/api/push-subscribe') {
        return await handlePushSubscribe(request, env);
      }

      return await proxyFrontend(request);
    } catch (err) {
      return jsonResponse({ error: err?.message || 'Internal Worker Error' }, 500);
    }
  },
};
