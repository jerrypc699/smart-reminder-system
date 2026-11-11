import React, { useState } from 'react';
import {
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle,
  X,
  Sparkles,
  Download,
  Apple,
  Layers,
  ShieldCheck,
  Zap,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  const isIOSDevice = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios'>(isIOSDevice ? 'ios' : 'android');
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          onInstallSuccess();
          onClose();
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/82 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-lg lux-modal rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Luxury Doctor Emblem */}
        <div className="relative p-5 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-br from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] shadow-[0_6px_20px_rgba(212,175,55,0.2)] overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="شعار د. عبد العزيز الرسمي"
                className="w-full h-full object-cover rounded-[14px] bg-[#06080D]"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>تثبيت التطبيق على الهاتف</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  PWA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                يعمل كتطبيق مستقل على Android و iPhone بشاشة كاملة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-lux-icon text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePlatform === 'android'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>أجهزة Android (سامسونج، شاومي، وغيرها)</span>
          </button>

          <button
            onClick={() => setActivePlatform('ios')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activePlatform === 'ios'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Apple className="w-4 h-4 text-amber-400" />
            <span>أجهزة iPhone & iPad (iOS)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activePlatform === 'android' ? (
            <div className="space-y-4">
              {/* Native APK Direct Download for automatic Azan without opening app */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-600/15 border border-amber-500/40 text-center space-y-3 shadow-lg shadow-amber-500/10">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>تطبيق أندرويد الأصلي (APK) للأذان التلقائي 24/7</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  للأذان بصوت الشيخ مشاري كاملاً وتلقائياً والشاشة مقفلة وبدون الحاجة لفتح التطبيق، نوصي بتحميل ملف الـ APK الأصلي:
                </p>
                <a
                  href="https://github.com/jerrypc699/smart-reminder-system/releases/download/v1.0.0/app-debug.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>تحميل ملف التطبيق الأصلي (DrAbdelaziz.apk)</span>
                </a>
              </div>

              {deferredPrompt ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Download className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">متصفحك جاهز للتثبيت الفوري!</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      اضغط على الزر بالأسفل لإضافة تطبيق د. عبد العزيز لشاشتك الرئيسية كبرنامج مستقل
                    </p>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'جاري التثبيت...' : 'تثبيت التطبيق الآن على الهاتف'}</span>
                  </button>
                </div>
              ) : null}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  طريقة التثبيت اليدوية على أندرويد (Chrome / Edge / Samsung Internet):
                </h4>
                
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    افتح الرابط في متصفح <strong className="text-white">Google Chrome</strong> أو أي متصفح على هاتفك.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    اضغط على قائمة المتصفح (النقاط الثلاث <strong className="text-white">⋮</strong> في الزاوية العلوية).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    اختر <strong className="text-emerald-300">«تثبيت التطبيق» (Install app)</strong> أو <strong className="text-emerald-300">«إضافة إلى الشاشة الرئيسية»</strong>.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Native iOS IPA Download */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-sky-400/10 to-sky-600/15 border border-sky-500/40 text-center space-y-3 shadow-lg shadow-sky-500/10">
                <div className="flex items-center justify-center gap-2 text-sky-300 font-bold text-sm">
                  <Apple className="w-4 h-4 text-sky-400" />
                  <span>تطبيق آيفون الأصلي (iOS IPA)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  إذا أردت تثبيت ملف التطبيق الأصلي عبر الكمبيوتر (ببرنامج Sideloadly أو AltStore مجاناً):
                </p>
                <a
                  href="https://github.com/jerrypc699/smart-reminder-system/releases/download/v1.0.0/DrAbdelaziz-Reminder.ipa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-black text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>تحميل ملف الآيفون (DrAbdelaziz.ipa)</span>
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3">
                <Apple className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-200">
                  على أجهزة iPhone و iPad، يتم التثبيت مباشرة من متصفح <strong>Safari</strong> الرسمي بخطوات سريعة:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    افتح رابط النظام في متصفح <strong className="text-white">Safari</strong> على جهاز iPhone.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    <span>اضغط على أيقونة المشاركة</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-white font-mono text-[11px]">
                      <Share2 className="w-3 h-3 text-sky-400" /> Share
                    </span>
                    <span>في أسفل شاشة Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    <span>مرر للأسفل واضغط على</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                      <PlusSquare className="w-3 h-3" /> إضافة إلى الشاشة الرئيسية (Add to Home Screen)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    اضغط على <strong className="text-white">«إضافة» (Add)</strong> في الزاوية العلوية. سيظهر التطبيق فوراً كأيقونة مستقلة على شاشة جوالك!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Scanner for Instant Phone Installation */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>مسح سريع بكاميرا الهاتف</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[260px]">
                افتح كاميرا هاتفك (آيفون أو أندرويد) ووجهها نحو الكود لفتح الرابط وتثبيته فوراً.
              </p>
            </div>
            <div className="shrink-0 bg-white p-1.5 rounded-xl shadow-lg ring-2 ring-emerald-500/30">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://smart-reminder-system-nu.vercel.app"
                alt="QR Code"
                className="w-20 h-20"
                loading="lazy"
              />
            </div>
          </div>

          {/* Benefits Feature Grid */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>يعمل أوفلاين بدون إنترنت</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>نطق صوتي باسم د. عبد العزيز</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
              <Layers className="w-4 h-4 text-teal-400 shrink-0" />
              <span>شاشة كاملة وتجربة أصلية</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>أمان تام وحفظ محلي</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            رابط التطبيق: <strong className="text-emerald-400 font-mono">smart-reminder-system-nu.vercel.app</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

