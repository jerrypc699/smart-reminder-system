import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, head } from '@vercel/blob';

const STATE_PATH = 'dr-abdelaziz/state.json';

const SEED_EMPLOYEES = [
  {
    id: 'emp-1',
    name: 'م. أحمد الشافعي',
    role: 'مساعد تنفيذي وتقني',
    department: 'المكتب التنفيذي والتقنية',
    phone: '01001234567',
    whatsappPhone: '201001234567',
    email: 'ahmed@smartreminder.clinic',
    notes: 'مسؤول الأنظمة التقنية وجداول الاجتماعات والتقارير التنفيذية.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    name: 'د. سارة عادل',
    role: 'منسقة العيادة والملفات الطبية',
    department: 'العيادة الطبية',
    phone: '01123456789',
    whatsappPhone: '201123456789',
    email: 'sara@smartreminder.clinic',
    notes: 'مسؤولة تنسيق مواعيد الكشوفات، ملفات المرضى، ونتائج الفحوصات.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    name: 'أ. محمود إبراهيم',
    role: 'سكرتارية ومتابعة المرضى',
    department: 'خدمة العملاء والاستقبال',
    phone: '01234567890',
    whatsappPhone: '201234567890',
    email: 'mahmoud@smartreminder.clinic',
    notes: 'متابعة استفسارات المرضى والاتصالات وتجهيز الوصفات والملفات.',
    createdAt: new Date().toISOString(),
  },
];

const SEED_TASKS = [
  {
    id: 'task-1',
    title: 'مراجعة التقرير الطبي والأسبوعي',
    description: 'تدقيق مؤشرات الأداء ومراجعة الأرقام النهائية قبل الاجتماع الدوري',
    category: 'work',
    priority: 'high',
    employeeId: 'emp-1',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00',
    reminderMinutesBefore: 10,
    voiceMessage: 'يا دكتور عبد العزيز، تنبيه مهم: يرجى مراجعة التقرير وتدقيق الأرقام قبل الاجتماع.',
    status: 'pending',
    repeat: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'اجتماع تنسيق فريق العمل عبر زووم',
    description: 'مناقشة خطة تسليم مهام المرحلة الثانية وتوزيع الأدوار',
    category: 'meeting',
    priority: 'urgent',
    employeeId: 'emp-2',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '14:30',
    reminderMinutesBefore: 15,
    voiceMessage: 'يا دكتور عبد العزيز، تذكير عاجل: موعد اجتماع فريق العمل يبدأ بعد قليل، يرجى الاستعداد والانضمام.',
    status: 'pending',
    repeat: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'استراحة وتجديد النشاط وشرب الماء',
    description: 'تمارين تمدد خفيفة وإراحة العينين من شاشات الحاسوب',
    category: 'health',
    priority: 'low',
    employeeId: 'emp-3',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '16:00',
    reminderMinutesBefore: 0,
    voiceMessage: 'يا دكتور عبد العزيز، حان وقت استراحة صحية قصيرة، تذكر شرب كوب ماء والابتعاد عن الشاشة قليلاً.',
    status: 'pending',
    repeat: 'daily',
    createdAt: new Date().toISOString(),
  },
];

async function readBlobJson<T = any>(path: string): Promise<T | null> {
  try {
    const meta = await head(path);
    if (!meta || !meta.url) return null;
    const fetchUrl = `${meta.url}?t=${Date.now()}`;
    const cloudRes = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (cloudRes.ok) {
      return (await cloudRes.json()) as T;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      let data = await readBlobJson<any>(STATE_PATH);
      const forceSeed = req.query.seed === '1' || req.query.seed === 'true';

      // If data is null or empty, seed it with initial rich records
      const needsTasksSeed = forceSeed || !data || !Array.isArray(data.tasks) || data.tasks.length === 0;
      const needsEmployeesSeed = forceSeed || !data || !Array.isArray(data.employees) || data.employees.length === 0;

      if (!data || needsTasksSeed || needsEmployeesSeed) {
        data = {
          ...(data || {}),
          tasks: needsTasksSeed ? SEED_TASKS : (data?.tasks || []),
          employees: needsEmployeesSeed ? SEED_EMPLOYEES : (data?.employees || []),
          scheduledMedia: data?.scheduledMedia || [],
          mediaLibrary: data?.mediaLibrary || [],
          whatsappSettings: data?.whatsappSettings || {},
          dailySystem: data?.dailySystem || null,
          updatedAt: new Date().toISOString(),
          seeded: true,
        };

        // Persist the seeded state so subsequent calls receive it immediately
        try {
          await put(STATE_PATH, JSON.stringify(data), {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
          });
        } catch (saveErr) {
          console.warn('Could not auto-persist seed to blob:', saveErr);
        }
      }

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const rawBody = req.body;
      const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody || {});

      // Fetch existing cloud state to prevent accidental wipe from uninitialized clients
      const existingData: any = (await readBlobJson<any>(STATE_PATH)) || {};

      // Safeguard against fresh client boot wiping cloud database:
      // If client sends empty tasks or empty employees, but existingData has items,
      // and client did not explicitly flag `forceWipe: true`, keep existing items!
      const shouldKeepExistingTasks =
        (!body.tasks || body.tasks.length === 0) &&
        Array.isArray(existingData.tasks) &&
        existingData.tasks.length > 0 &&
        !body.forceWipe;

      const shouldKeepExistingEmployees =
        (!body.employees || body.employees.length === 0) &&
        Array.isArray(existingData.employees) &&
        existingData.employees.length > 0 &&
        !body.forceWipe;

      const shouldKeepExistingScheduled =
        (!body.scheduledMedia || body.scheduledMedia.length === 0) &&
        Array.isArray(existingData.scheduledMedia) &&
        existingData.scheduledMedia.length > 0 &&
        !body.forceWipe;

      const mergedTasks = shouldKeepExistingTasks ? existingData.tasks : (body.tasks ?? existingData.tasks ?? SEED_TASKS);
      const mergedEmployees = shouldKeepExistingEmployees ? existingData.employees : (body.employees ?? existingData.employees ?? SEED_EMPLOYEES);
      const mergedScheduledMedia = shouldKeepExistingScheduled ? existingData.scheduledMedia : (body.scheduledMedia ?? existingData.scheduledMedia ?? []);

      const payload = {
        ...existingData,
        ...body,
        tasks: mergedTasks,
        employees: mergedEmployees,
        scheduledMedia: mergedScheduledMedia,
        mediaLibrary: body.mediaLibrary ?? existingData.mediaLibrary ?? [],
        dailySystem: body.dailySystem ?? existingData.dailySystem ?? null,
        whatsappSettings: body.whatsappSettings ?? existingData.whatsappSettings ?? null,
        prayerSettings: body.prayerSettings ?? existingData.prayerSettings ?? null,
        audioSettings: body.audioSettings ?? existingData.audioSettings ?? null,
        updatedAt: new Date().toISOString(),
      };

      const blob = await put(STATE_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({
        success: true,
        url: blob.url,
        updatedAt: payload.updatedAt,
        tasksCount: payload.tasks.length,
        employeesCount: payload.employees.length,
        scheduledCount: payload.scheduledMedia.length,
        data: payload,
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('API Sync Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
