import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle,
  X,
  Sparkles,
  Zap,
  Key,
  FolderGit2,
  HardDrive,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Database,
  Radio
} from 'lucide-react';
import { firebaseManager } from '../services/firebaseConfig';
import { supabaseService } from '../services/supabaseService';
import { vercelCloudSync } from '../services/vercelCloudSync';

interface FirebaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- 1. جدول ملفات الموظفين (Employees)
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

-- 3. جدول الوسائط المجدولة (Scheduled Media)
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

-- 4. جدول حالة النظام والإعدادات (System State)
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل الصلاحيات والبث اللحظي (RLS & Realtime)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public scheduled_media" ON scheduled_media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public system_state" ON system_state FOR ALL USING (true) WITH CHECK (true);

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE employees, tasks, scheduled_media, system_state;
COMMIT;`;

export const FirebaseSettingsModal: React.FC<FirebaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'vercel' | 'firebase'>('supabase');

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseMessage, setSupabaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Firebase State
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [rawSnippet, setRawSnippet] = useState('');
  const [isFirebaseSaving, setIsFirebaseSaving] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [copiedFirebaseSnippet, setCopiedFirebaseSnippet] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load Supabase
      const spConfig = supabaseService.getConfig();
      setSupabaseUrl(spConfig.url || '');
      setSupabaseKey(spConfig.anonKey || '');
      setIsSupabaseConfigured(supabaseService.isConfigured());

      // Load Firebase
      const current = firebaseManager.getConfig();
      if (current) {
        setApiKey(current.apiKey || '');
        setAuthDomain(current.authDomain || '');
        setProjectId(current.projectId || '');
        setStorageBucket(current.storageBucket || '');
        setMessagingSenderId(current.messagingSenderId || '');
        setAppId(current.appId || '');
      }
      setIsFirebaseConnected(firebaseManager.getIsConnected());
      setSupabaseMessage(null);
      setFirebaseError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Supabase Handlers
  const handleSaveSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseMessage({ type: 'error', text: 'يرجى إدخال رابط المشروع (Project URL) والمفتاح العام (anon key).' });
      return;
    }

    setIsTestingSupabase(true);
    setSupabaseMessage(null);

    const saved = supabaseService.setConfig(supabaseUrl, supabaseKey);
    if (!saved) {
      setIsTestingSupabase(false);
      setSupabaseMessage({ type: 'error', text: 'فشل حفظ إعدادات Supabase.' });
      return;
    }

    const test = await supabaseService.testConnection();
    setIsTestingSupabase(false);

    if (test.success) {
      setIsSupabaseConfigured(true);
      setSupabaseMessage({ type: 'success', text: test.message });
      onConfigChanged();
    } else {
      setSupabaseMessage({ type: 'error', text: test.message });
    }
  };

  const handleSyncLocalToSupabase = async () => {
    setIsSyncingToSupabase(true);
    setSupabaseMessage(null);
    try {
      const res = await supabaseService.syncAllLocalToSupabase();
      if (res.success) {
        setSupabaseMessage({
          type: 'success',
          text: `✓ تمت مزامنة جميع البيانات بنجاح إلى Supabase (${res.tasksCount} مهمة و ${res.employeesCount} موظف و ${res.scheduledCount} ملف وسائط)!`,
        });
      } else {
        setSupabaseMessage({ type: 'error', text: `فشلت المزامنة: ${res.error}` });
      }
    } catch (err: any) {
      setSupabaseMessage({ type: 'error', text: err.message });
    } finally {
      setIsSyncingToSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDisconnectSupabase = () => {
    supabaseService.clearConfig();
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsSupabaseConfigured(false);
    setSupabaseMessage({ type: 'success', text: 'تم فصل Supabase بنجاح والعودة إلى سحابة Vercel المركزية.' });
    onConfigChanged();
  };

  // Firebase Handlers
  const handleParseSnippet = (text: string) => {
    setRawSnippet(text);
    try {
      const extract = (key: string) => {
        const match = text.match(new RegExp(`${key}["']?\\s*:\\s*["']([^"']+)["']`));
        return match ? match[1] : '';
      };
      const parsedApiKey = extract('apiKey');
      const parsedAuthDomain = extract('authDomain');
      const parsedProjectId = extract('projectId');
      const parsedStorageBucket = extract('storageBucket');
      const parsedSenderId = extract('messagingSenderId');
      const parsedAppId = extract('appId');

      if (parsedApiKey && parsedProjectId) {
        setApiKey(parsedApiKey);
        setAuthDomain(parsedAuthDomain);
        setProjectId(parsedProjectId);
        setStorageBucket(parsedStorageBucket);
        setMessagingSenderId(parsedSenderId);
        setAppId(parsedAppId);
        setFirebaseError('');
      }
    } catch {}
  };

  const handleSaveFirebase = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setFirebaseError('يرجى ملء حقول apiKey و projectId على الأقل.');
      return;
    }

    setIsFirebaseSaving(true);
    const success = firebaseManager.saveConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    });

    setIsFirebaseSaving(false);
    if (success) {
      setIsFirebaseConnected(true);
      onConfigChanged();
    } else {
      setFirebaseError('تعذر الاتصال بـ Firebase.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden dir-rtl text-right">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">إعدادات قاعدة البيانات السحابية المركزية</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مزامنة لحظية وتطابق فوري لكافة المهام والموظفين بين الكمبيوتر وجميع الهواتف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>⚡ Supabase (Realtime DB)</span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vercel'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>🟢 سحابة Vercel المدمجة</span>
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'firebase'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🔥 Firebase (اختياري)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSupabaseConfigured ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {isSupabaseConfigured
                        ? 'Supabase نشط ومربوط بالبث اللحظي 🟢'
                        : 'Supabase جاهز للربط الفوري (Realtime WebSockets)'}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      تزامن فوري في أجزاء من الثانية للمهام وملفات الموظفين وفيديوهات التنبيهات.
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isSupabaseConfigured ? 'متصل بالبث الحي' : 'غير متصل'}
                </span>
              </div>

              {supabaseMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    supabaseMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {supabaseMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{supabaseMessage.text}</span>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold">Project URL (رابط المشروع) *</label>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>فتح Supabase Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzproject.supabase.co"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Anon Public Key (المفتاح العام) *</label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  disabled={isTestingSupabase}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isTestingSupabase ? 'جاري الاتصال والتحقق...' : 'حفظ واختبار الاتصال بـ Supabase'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? '✓ تم نسخ كود الجداول SQL!' : 'نسخ كود SQL لإنشاء الجداول'}</span>
                </button>
              </div>

              {isSupabaseConfigured && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-white text-xs">مزامنة ونقل كل البيانات المحلية لـ Supabase</h5>
                      <p className="text-[11px] text-slate-400">
                        رفع جميع المهام والموظفين والنظام اليومي الموجود محلياً إلى جداول Supabase دفعة واحدة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncLocalToSupabase}
                      disabled={isSyncingToSupabase}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingToSupabase ? 'animate-spin' : ''}`} />
                      <span>{isSyncingToSupabase ? 'جاري الرفع...' : 'مزامنة الكل الآن'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions Accordion */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>💡 خطوات إنشاء مشروع Supabase خلال دقيقة واحدة:</span>
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>ادخل على <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">supabase.com</a> وسجل مجاناً ثم اضغط New Project.</li>
                  <li>افتح <strong>SQL Editor</strong> من القائمة الجانبية والصق كود الـ SQL (باستخدام زر النسخ أعلاه) واضغط <strong>Run</strong>.</li>
                  <li>من <strong>Project Settings → API</strong> انسخ <strong>Project URL</strong> و <strong>anon public key</strong> والصقهم هنا!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: VERCEL CLOUD (CURRENT DEFAULT) */}
          {activeTab === 'vercel' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <div>
                    <h4 className="font-bold text-white text-xs">سحابة النظام المركزية (Vercel Blob): نشطة ومتصلة تلقائياً 🟢</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      تعمل هذه السحابة تلقائياً بدون أي إعدادات كخيار افتراضي لحفظ وتزامن المهام والموظفين والفيديوهات.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shrink-0">
                  نشط الآن
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h5 className="font-bold text-slate-200">خصائص سحابة Vercel المركزية:</h5>
                <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                  <li>لا تتطلب أي مفاتيح أو إعدادات يدوية على الموبايل أو الكمبيوتر.</li>
                  <li>أي نسخة يتم تثبيتها تسحب البيانات فوراً وتتطابق مع بقية الهواتف.</li>
                  <li>تعمل في الخلفية بنظام فحص سريع وتحديث تلقائي فور تعديل أي مهمة أو دوسيه موظف.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: FIREBASE */}
          {activeTab === 'firebase' && (
            <div className="space-y-3">
              <p className="text-slate-300">
                الصق كود <strong className="text-white">firebaseConfig</strong> المنسوخ من موقع Firebase:
              </p>
              <textarea
                value={rawSnippet}
                onChange={(e) => handleParseSnippet(e.target.value)}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500 resize-none dir-ltr text-left"
              />
              {firebaseError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {firebaseError}
                </div>
              )}
              {isFirebaseConnected && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                  <span>✓ متصل بمشروع Firebase: <strong>{projectId}</strong></span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveFirebase}
                  disabled={isFirebaseSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 text-xs cursor-pointer"
                >
                  {isFirebaseSaving ? 'جاري الحفظ...' : 'تفعيل اتصال Firebase'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {isSupabaseConfigured && activeTab === 'supabase' && (
              <button
                type="button"
                onClick={handleDisconnectSupabase}
                className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>فصل ربط Supabase</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
