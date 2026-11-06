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
  Trash2
} from 'lucide-react';
import { firebaseManager, FirebaseConfigData } from '../services/firebaseConfig';
import { cloudSyncService } from '../services/cloudSyncService';

interface FirebaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const FirebaseSettingsModal: React.FC<FirebaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [rawSnippet, setRawSnippet] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'fields' | 'guide'>('paste');
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = firebaseManager.getConfig();
      if (current) {
        setApiKey(current.apiKey || '');
        setAuthDomain(current.authDomain || '');
        setProjectId(current.projectId || '');
        setStorageBucket(current.storageBucket || '');
        setMessagingSenderId(current.messagingSenderId || '');
        setAppId(current.appId || '');
      }
      setIsConnected(firebaseManager.getIsConnected());
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-parse raw Firebase config snippet if user pastes it
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
        setErrorMsg('');
      }
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setErrorMsg('يرجى ملء حقول apiKey و projectId على الأقل.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    const config: FirebaseConfigData = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    const success = firebaseManager.saveConfig(config);
    setIsSaving(false);

    if (success) {
      setIsConnected(true);
      onConfigChanged();
      alert('✓ تم حفظ بيانات السحابة وتفعيل المزامنة اللحظية بين الكمبيوتر والموبايل بنجاح!');
      onClose();
    } else {
      setErrorMsg('تعذر الاتصال بـ Firebase، يرجى التأكد من صحة المفاتيح.');
    }
  };

  const handleDisconnect = () => {
    if (confirm('هل أنت متأكد من رغبتك في فصل الربط السحابي والعودة للوضع المحلي فقط؟')) {
      firebaseManager.clearConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setIsConnected(false);
      onConfigChanged();
    }
  };

  const handleCopyConfigSnippet = () => {
    const config = firebaseManager.getConfig();
    if (!config) return;
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-400 p-[2px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">قاعدة البيانات السحابية (Firebase)</h2>
                {isConnected ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    متصل ومتزامن 🟢
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    غير متصل
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                مزامنة فورية للمهام والميديا بين كمبيوتر د. عبد العزيز وهاتفه المحمول
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

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            لصق كود الإعدادات السريع
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'fields'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الحقول التفصيلية
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            طريقة الإنشاء (دقيقة واحدة 💡)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <p className="text-slate-300">
                الصق كود <strong className="text-white">firebaseConfig</strong> المنسوخ من موقع Firebase وسيقوم النظام باستخراج المفاتيح تلقائياً:
              </p>
              <textarea
                value={rawSnippet}
                onChange={(e) => handleParseSnippet(e.target.value)}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500 resize-none dir-ltr text-left"
              />
              {apiKey && projectId && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                  <span>✓ تم التعرف على المشروع: <strong>{projectId}</strong></span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">API Key *</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Project ID *</label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="dr-abdelaziz-app"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Storage Bucket (لتخزين الفيديوهات والصوتيات)</label>
                  <input
                    type="text"
                    value={storageBucket}
                    onChange={(e) => setStorageBucket(e.target.value)}
                    placeholder="dr-abdelaziz-app.appspot.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Auth Domain</label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="dr-abdelaziz-app.firebaseapp.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">App ID</label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Messaging Sender ID</label>
                  <input
                    type="text"
                    value={messagingSenderId}
                    onChange={(e) => setMessagingSenderId(e.target.value)}
                    placeholder="123456789"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 leading-relaxed">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                <span>إنشاء مشروع مجاني يستغرق دقيقة واحدة فقط ولا يتطلب بطاقة بنكية</span>
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 text-xs transition-colors shrink-0"
                >
                  <span>فتح موقع Firebase</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>ادخل على <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">console.firebase.google.com</a> واضغط <strong>Add project</strong> باسم مثلاً: <code>dr-abdelaziz</code>.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <span>اضغط على أيقونة الويب <strong>(&lt;/&gt;)</strong> وسجل التطبيق، ثم انسخ كائن <code>firebaseConfig</code> والصقه هنا في تبويب «لصق كود الإعدادات».</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                  <span>من القائمة الجانبية: فعّل <strong>Firestore Database</strong> و <strong>Storage</strong> (في وضع Test Mode).</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Copy Snippet for Mobile */}
          {isConnected && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="text-slate-300">
                <span>تفعيل المزامنة على الهاتف:</span>
                <span className="text-slate-400 mr-1">انسخ الكود ثم الصقه في تطبيق الموبايل</span>
              </div>
              <button
                onClick={handleCopyConfigSnippet}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الكود للموبايل'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>فصل الربط السحابي</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSaving ? 'جاري الاتصال...' : 'حفظ وتفعيل المزامنة السحابية'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

