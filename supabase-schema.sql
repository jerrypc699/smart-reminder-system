-- ==============================================================================
-- Dr. Abdelaziz Smart Reminder & Clinic System - Supabase PostgreSQL Schema
-- قاعدة بيانات نظام التذكير الذكي والعيادة للدكتور عبد العزيز
-- ==============================================================================

-- 1. جدول ملفات ودوسيهات الموظفين (Employees)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  phone TEXT,
  whatsapp_phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول مهام العمل (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'work',
  priority TEXT DEFAULT 'medium',
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  due_date TEXT,
  due_time TEXT,
  reminder_minutes_before INT DEFAULT 10,
  voice_message TEXT,
  status TEXT DEFAULT 'pending',
  repeat TEXT DEFAULT 'none',
  snooze_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  whatsapp JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الوسائط المجدولة والفيديوهات والصوتيات (Scheduled Media)
CREATE TABLE IF NOT EXISTS scheduled_media (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  media_name TEXT NOT NULL,
  media_type TEXT DEFAULT 'video',
  title TEXT,
  description TEXT,
  cloud_url TEXT,
  scheduled_date TEXT,
  scheduled_time TEXT,
  repeat TEXT DEFAULT 'none',
  duration INT DEFAULT 0,
  volume FLOAT DEFAULT 1.0,
  enabled BOOLEAN DEFAULT true,
  thumbnail TEXT,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول حالة النظام اليومي والإعدادات العامة (System State)
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- سياسات الأمان وتصاريح الوصول (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read/write employees" ON employees;
CREATE POLICY "Allow anon read/write employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read/write tasks" ON tasks;
CREATE POLICY "Allow anon read/write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read/write scheduled_media" ON scheduled_media;
CREATE POLICY "Allow anon read/write scheduled_media" ON scheduled_media FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read/write system_state" ON system_state;
CREATE POLICY "Allow anon read/write system_state" ON system_state FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- تفعيل البث والتزامن اللحظي (Supabase Realtime WebSockets)
-- ==============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE employees, tasks, scheduled_media, system_state;
COMMIT;

-- ==============================================================================
-- إدخال السجلات الأولية التجريبية (Initial Seed Data)
-- ==============================================================================
INSERT INTO employees (id, name, role, department, phone, whatsapp_phone, email, notes)
VALUES
  ('emp-1', 'م. أحمد الشافعي', 'مساعد تنفيذي وتقني', 'المكتب التنفيذي والتقنية', '01001234567', '201001234567', 'ahmed@smartreminder.clinic', 'مسؤول الأنظمة التقنية وجداول الاجتماعات والتقارير التنفيذية.'),
  ('emp-2', 'د. سارة عادل', 'منسقة العيادة والملفات الطبية', 'العيادة الطبية', '01123456789', '201123456789', 'sara@smartreminder.clinic', 'مسؤولة تنسيق مواعيد الكشوفات، ملفات المرضى، ونتائج الفحوصات.'),
  ('emp-3', 'أ. محمود إبراهيم', 'سكرتارية ومتابعة المرضى', 'خدمة العملاء والاستقبال', '01234567890', '201234567890', 'mahmoud@smartreminder.clinic', 'متابعة استفسارات المرضى والاتصالات وتجهيز الوصفات والملفات.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, title, description, category, priority, employee_id, due_date, due_time, reminder_minutes_before, voice_message, status, repeat)
VALUES
  ('task-1', 'مراجعة التقرير الطبي والأسبوعي', 'تدقيق مؤشرات الأداء ومراجعة الأرقام النهائية قبل الاجتماع الدوري', 'work', 'high', 'emp-1', CURRENT_DATE::text, '11:00', 10, 'يا دكتور عبد العزيز، تنبيه مهم: يرجى مراجعة التقرير وتدقيق الأرقام قبل الاجتماع.', 'pending', 'none'),
  ('task-2', 'اجتماع تنسيق فريق العمل عبر زووم', 'مناقشة خطة تسليم مهام المرحلة الثانية وتوزيع الأدوار', 'meeting', 'urgent', 'emp-2', CURRENT_DATE::text, '14:30', 15, 'يا دكتور عبد العزيز، تذكير عاجل: موعد اجتماع فريق العمل يبدأ بعد قليل، يرجى الاستعداد والانضمام.', 'pending', 'none'),
  ('task-3', 'استراحة وتجديد النشاط وشرب الماء', 'تمارين تمدد خفيفة وإراحة العينين من شاشات الحاسوب', 'health', 'low', 'emp-3', CURRENT_DATE::text, '16:00', 0, 'يا دكتور عبد العزيز، حان وقت استراحة صحية قصيرة، تذكر شرب كوب ماء والابتعاد عن الشاشة قليلاً.', 'pending', 'daily')
ON CONFLICT (id) DO NOTHING;

