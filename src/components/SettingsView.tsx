import React, { useState, useEffect } from 'react';
import {
  Settings,
  MapPin,
  Volume2,
  Bell,
  Compass,
  RotateCcw,
  Check,
  Play,
  Sliders,
  Sparkles,
  Download,
  Upload,
  Globe,
  FileAudio,
  UploadCloud,
  Smartphone,
  Cloud,
  Send,
  MessageCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { PrayerSettings, AudioSettings, CityPreset, StoredAudioMeta, WhatsAppGlobalSettings, WhatsAppGatewayProvider } from '../types';
import { CITY_PRESETS } from '../services/prayerService';
import { audioService } from '../services/audioService';
import { audioStorageService } from '../services/audioStorageService';
import { notificationService } from '../services/notificationService';
import { mobileBackgroundService } from '../services/mobileBackgroundService';
import { whatsappService, normalizeWhatsAppPhone } from '../services/whatsappService';

interface SettingsViewProps {
  prayerSettings: PrayerSettings;
  setPrayerSettings: React.Dispatch<React.SetStateAction<PrayerSettings>>;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  onTestAudio: () => void;
  hasNotificationPermission: boolean;
  onRequestNotification: () => void;
  onResetAllData: () => void;
  onOpenInstallModal?: () => void;
  isCloudConnected?: boolean;
  onOpenCloudModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  prayerSettings,
  setPrayerSettings,
  audioSettings,
  setAudioSettings,
  onTestAudio,
  hasNotificationPermission,
  onRequestNotification,
  onResetAllData,
  onOpenInstallModal,
  isCloudConnected = false,
  onOpenCloudModal,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [savedAlert, setSavedAlert] = useState(false);

  // WhatsApp Settings & Contacts State
  const [waSettings, setWaSettings] = useState<WhatsAppGlobalSettings>(() => whatsappService.getSettings());
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestStatus, setWaTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isWaTesting, setIsWaTesting] = useState(false);

  useEffect(() => {
    return whatsappService.subscribeSettings((updated) => {
      setWaSettings(updated);
    });
  }, []);

  const updateWaSettings = (updates: Partial<WhatsAppGlobalSettings>) => {
    const next = whatsappService.saveSettings(updates);
    setWaSettings(next);
    triggerSaved();
  };

  useEffect(() => {
    const loadVoices = () => {
      const v = audioService.getArabicVoices();
      setVoices(v);
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleCitySelect = (cityName: string) => {
    const preset = CITY_PRESETS.find((c) => c.name === cityName);
    if (preset) {
      setPrayerSettings((prev) => ({
        ...prev,
        cityName: preset.name,
        countryName: preset.country,
        latitude: preset.latitude,
        longitude: preset.longitude,
        method: preset.method as any,
      }));
      triggerSaved();
    }
  };

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      alert('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setPrayerSettings((prev) => ({
          ...prev,
          cityName: 'موقعي الحالي (GPS)',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        }));
        triggerSaved();
      },
      (err) => {
        setGeoLoading(false);
        alert('تعذر جلب إحداثيات الموقع: ' + err.message);
      }
    );
  };

  const triggerSaved = () => {
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2000);
  };

  const testArabicTts = () => {
    audioService.playDoctorWelcome(audioSettings.masterVolume);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            إعدادات النظام والتخصيص
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تخصيص مواقيت الصلاة، الصوت العربي، نبرة الصوت، والإشعارات لسطح مكتب ويندوز
          </p>
        </div>

        {savedAlert && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>تم حفظ التغييرات تلقائياً</span>
          </div>
        )}
      </div>

      {/* Profile Card for Dr. Abdelaziz */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-400 p-[2px] shadow-lg shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black text-amber-400 leading-none">دكتور</span>
              <span className="text-xs font-black text-white leading-tight">عبد العزيز</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                النظام مخصص حصرياً لـ: دكتور عبد العزيز
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                VIP Profile
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              يتم بدء جميع التنبيهات الصوتية والمواعيد التلقائية بمناداتك: «يا دكتور عبد العزيز»
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => audioService.playDoctorWelcome(audioSettings.masterVolume)}
          className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-md"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>تجربة نداء التنبيه: «يا دكتور عبد العزيز»</span>
        </button>
      </div>

      {/* PWA Mobile App Card in Settings */}
      {onOpenInstallModal && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                تطبيق الهاتف المحمول (Android & iOS)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تثبيت النظام كتطبيق أصلي مستقل على هاتفك المحمول بشاشة كاملة وبدون متصفح.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenInstallModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>عرض تعليمات التثبيت</span>
          </button>
        </div>
      )}

      {/* Location & Prayer Calculation Settings */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          الموقع الجغرافي وطريقة حساب مواقيت الصلاة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preset City Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              اختر المدينة
            </label>
            <select
              value={prayerSettings.cityName}
              onChange={(e) => handleCitySelect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              {CITY_PRESETS.map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name} - {city.country}
                </option>
              ))}
            </select>
          </div>

          {/* Auto GPS Button */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              onClick={handleAutoLocation}
              disabled={geoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{geoLoading ? 'جاري تحديد الموقع...' : 'تحديد الموقع تلقائياً عبر GPS'}</span>
            </button>
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">خط العرض (Latitude)</label>
            <input
              type="number"
              step="0.0001"
              value={prayerSettings.latitude}
              onChange={(e) => {
                setPrayerSettings((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }));
                triggerSaved();
              }}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">خط الطول (Longitude)</label>
            <input
              type="number"
              step="0.0001"
              value={prayerSettings.longitude}
              onChange={(e) => {
                setPrayerSettings((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }));
                triggerSaved();
              }}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">طريقة الحساب الفلكي</label>
            <select
              value={prayerSettings.method}
              onChange={(e) => {
                setPrayerSettings((prev) => ({ ...prev, method: e.target.value as any }));
                triggerSaved();
              }}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
            >
              <option value="Egyptian">الهيئة المصرية العامة للمساحة</option>
              <option value="UmmAlQura">جامعة أم القرى (مكة المكرمة)</option>
              <option value="MuslimWorldLeague">رابطة العالم الإسلامي</option>
              <option value="Dubai">دائرة الشؤون الإسلامية (دبي)</option>
              <option value="Qatar">وزارة الأوقاف (قطر)</option>
              <option value="Kuwait">وزارة الأوقاف (الكويت)</option>
              <option value="NorthAmerica">أمريكا الشمالية (ISNA)</option>
              <option value="Karachi">جامعة كراتشي</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">مذهب صلاة العصر</label>
            <select
              value={prayerSettings.madhab}
              onChange={(e) => {
                setPrayerSettings((prev) => ({ ...prev, madhab: e.target.value as any }));
                triggerSaved();
              }}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
            >
              <option value="shafi">الجمهور (الشافعي، المالكي، الحنبلي)</option>
              <option value="hanafi">المذهب الحنفي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio & Speech Synthesizer Settings */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          إعدادات النطق الصوتي العربي والتنبيهات
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>مستوى الصوت العام</span>
              <span className="font-mono text-emerald-400">{Math.round(audioSettings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioSettings.masterVolume}
              onChange={(e) => {
                setAudioSettings((prev) => ({ ...prev, masterVolume: parseFloat(e.target.value) }));
                triggerSaved();
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Voice Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              صوت القارئ الآلي (Speech Voice)
            </label>
            <select
              value={audioSettings.ttsVoiceURI}
              onChange={(e) => {
                setAudioSettings((prev) => ({ ...prev, ttsVoiceURI: e.target.value }));
                triggerSaved();
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="">الصوت العربي التلقائي لنظام ويندوز</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speech Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>سرعة نطق التنبيه</span>
              <span className="font-mono text-emerald-400">{audioSettings.ttsRate}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={audioSettings.ttsRate}
              onChange={(e) => {
                setAudioSettings((prev) => ({ ...prev, ttsRate: parseFloat(e.target.value) }));
                triggerSaved();
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Speech Pitch */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>نبرة الصوت</span>
              <span className="font-mono text-emerald-400">{audioSettings.ttsPitch}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={audioSettings.ttsPitch}
              onChange={(e) => {
                setAudioSettings((prev) => ({ ...prev, ttsPitch: parseFloat(e.target.value) }));
                triggerSaved();
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
          {/* Azan Voice Selector */}
          <div className="space-y-1.5 md:col-span-2 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  صوت الأذان المعتمد
                </label>
                <span className="text-[11px] text-slate-400">
                  الملفات الصوتية محملة محلياً وتعمل 100% بدون انقطاع
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  value={prayerSettings.azanReciter}
                  onChange={(e) => {
                    setPrayerSettings((prev) => ({
                      ...prev,
                      azanReciter: e.target.value as any,
                    }));
                    triggerSaved();
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="mishary">الشيخ مشاري راشد العفاسي (كامل)</option>
                  <option value="takbeerat">تكبيرات الأذان (موجزة - مناسبة للعمل)</option>
                  <option value="abdulbasit">الشيخ عبد الباسط عبد الصمد</option>
                  <option value="makkah">الأذان المكي الشريف (علي ملا)</option>
                  <option value="custom">أذان مخصص (ملف صوتي مرفوع)</option>
                </select>

                <button
                  type="button"
                  onClick={async () => {
                    if (prayerSettings.azanReciter === 'custom' && prayerSettings.customAzanAudioId) {
                      const customUrl = await audioStorageService.getAudioObjectUrl(prayerSettings.customAzanAudioId);
                      audioService.playAzan('custom', audioSettings.masterVolume, undefined, customUrl);
                    } else {
                      audioService.playAzan(prayerSettings.azanReciter, audioSettings.masterVolume);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>تجربة سماع الأذان الآن</span>
                </button>
              </div>

              {/* Custom Azan Upload and Select if chosen */}
              {prayerSettings.azanReciter === 'custom' && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-300">
                    {prayerSettings.customAzanName ? `الملف الحالي: ${prayerSettings.customAzanName}` : 'لم يتم اختيار ملف بعد'}
                  </span>

                  <input
                    id="settings-custom-azan-input"
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const meta = await audioStorageService.saveAudioFile(file, `أذان مخصص (${file.name})`, 'azan');
                        setPrayerSettings((prev) => ({
                          ...prev,
                          customAzanAudioId: meta.id,
                          customAzanName: meta.name,
                        }));
                        triggerSaved();
                      } catch (err: any) {
                        alert('فشل رفع ملف الأذان: ' + err.message);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />

                  <label
                    htmlFor="settings-custom-azan-input"
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>رفع ملف أذان MP3</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Test Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={testArabicTts}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>تجربة نطق التنبيه الصوتي (TTS)</span>
          </button>

          <button
            onClick={onTestAudio}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>اختبار نغمة التنبيه الموسيقية والأذان</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Automated Task Messaging & Quick Contacts */}
      <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-emerald-500/30 p-5 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                إعدادات إرسال المهام عبر واتساب (WhatsApp Integration)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                إرسال المهام المجدولة تلقائياً لأي رقم عند حلول وقتها عبر التطبيق مباشرة أو ببوابة إرسال آلي
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border shrink-0 self-start sm:self-center ${
              waSettings.provider === 'none'
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {waSettings.provider === 'none'
              ? 'الوضع المباشر (بدون API)'
              : `وضع الإرسال الآلي: ${waSettings.provider}`}
          </span>
        </div>

        {/* Default Country Code & Gateway Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              طريقة الإرسال عند حلول موعد المهمة
            </label>
            <select
              value={waSettings.provider}
              onChange={(e) =>
                updateWaSettings({ provider: e.target.value as WhatsAppGatewayProvider })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="none">💬 مباشر عبر واتساب (يفتح المحادثة بالرسالة جاهزة — مجاني 100%)</option>
              <option value="greenapi">🤖 Green-API (إرسال آلي في الخلفية عبر مسح QR مرة واحدة)</option>
              <option value="ultramsg">⚡ UltraMsg API (إرسال آلي في الخلفية عبر مسح QR)</option>
              <option value="callmebot">🆓 CallMeBot (إرسال آلي مجاني للأرقام المفعلة)</option>
              <option value="meta_cloud">🏢 Meta WhatsApp Cloud API (رسمي)</option>
              <option value="webhook">🔗 Webhook مخصص (n8n / Make / خادم خاص)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رمز الدولة الافتراضي للأرقام المحلية
            </label>
            <select
              value={waSettings.defaultCountryCode || '20'}
              onChange={(e) => updateWaSettings({ defaultCountryCode: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="20">🇪🇬 مصر (+20) — يحوّل 010... إلى 2010...</option>
              <option value="966">🇸🇦 السعودية (+966)</option>
              <option value="971">🇦🇪 الإمارات (+971)</option>
              <option value="965">🇰🇼 الكويت (+965)</option>
              <option value="974">🇶🇦 قطر (+974)</option>
              <option value="962">🇯🇴 الأردن (+962)</option>
              <option value="973">🇧🇭 البحرين (+973)</option>
              <option value="968">🇴🇲 عُمان (+968)</option>
            </select>
          </div>
        </div>

        {/* Provider Credentials Panels */}
        {waSettings.provider === 'greenapi' && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/20 space-y-3">
            <p className="text-[11px] text-emerald-300">
              من لوحة تحكم Green-API انسخ رقم الـ Instance ID و ApiTokenInstance بعد ربط هاتفك عبر QR:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                dir="ltr"
                placeholder="Instance ID (مثال: 7103...)"
                value={waSettings.greenApiInstanceId || ''}
                onChange={(e) => updateWaSettings({ greenApiInstanceId: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
              <input
                type="password"
                dir="ltr"
                placeholder="API Token Instance"
                value={waSettings.greenApiToken || ''}
                onChange={(e) => updateWaSettings({ greenApiToken: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="https://api.green-api.com"
                value={waSettings.greenApiHost || 'https://api.green-api.com'}
                onChange={(e) => updateWaSettings({ greenApiHost: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {waSettings.provider === 'ultramsg' && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/20 space-y-3">
            <p className="text-[11px] text-emerald-300">
              أدخل بيانات حساب UltraMsg لإرسال المهام تلقائياً في الخلفية بدون أي ضغطة:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                dir="ltr"
                placeholder="Instance ID (مثال: instance12345)"
                value={waSettings.ultraMsgInstanceId || ''}
                onChange={(e) => updateWaSettings({ ultraMsgInstanceId: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
              <input
                type="password"
                dir="ltr"
                placeholder="UltraMsg Token"
                value={waSettings.ultraMsgToken || ''}
                onChange={(e) => updateWaSettings({ ultraMsgToken: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {waSettings.provider === 'callmebot' && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/20 space-y-2.5">
            <p className="text-[11px] text-emerald-300 leading-relaxed">
              لتفعيل CallMeBot المجاني: أرسل من رقمك المستهدف رسالة «I allow callmebot to send me messages» إلى رقم البوت على واتساب، ثم أدخل الـ API Key المستلم هنا:
            </p>
            <input
              type="text"
              dir="ltr"
              placeholder="CallMeBot API Key"
              value={waSettings.callMeBotApiKey || ''}
              onChange={(e) => updateWaSettings({ callMeBotApiKey: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
            />
          </div>
        )}

        {waSettings.provider === 'meta_cloud' && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                dir="ltr"
                placeholder="Phone Number ID"
                value={waSettings.metaPhoneNumberId || ''}
                onChange={(e) => updateWaSettings({ metaPhoneNumberId: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
              <input
                type="password"
                dir="ltr"
                placeholder="Permanent Access Token"
                value={waSettings.metaAccessToken || ''}
                onChange={(e) => updateWaSettings({ metaAccessToken: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {waSettings.provider === 'webhook' && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="url"
                dir="ltr"
                placeholder="https://your-n8n-or-webhook-url"
                value={waSettings.webhookUrl || ''}
                onChange={(e) => updateWaSettings({ webhookUrl: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
              <input
                type="password"
                dir="ltr"
                placeholder="Bearer Secret (اختياري)"
                value={waSettings.webhookSecret || ''}
                onChange={(e) => updateWaSettings({ webhookSecret: e.target.value })}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Saved Quick Contacts Manager */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              دفتر أرقام واتساب السريعة ({waSettings.savedContacts.length})
            </span>
            <span className="text-[11px] text-slate-500">تظهر للاختيار السريع عند جدولة أي مهمة</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="الاسم (مثال: السكرتارية / د. محمد)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <input
              type="tel"
              dir="ltr"
              placeholder="01012345678"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!normalizeWhatsAppPhone(newContactPhone, waSettings.defaultCountryCode)) {
                  alert('يرجى إدخال رقم واتساب صحيح');
                  return;
                }
                whatsappService.addSavedContact(newContactName, newContactPhone);
                setNewContactName('');
                setNewContactPhone('');
                triggerSaved();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جهة اتصال</span>
            </button>
          </div>

          {waSettings.savedContacts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {waSettings.savedContacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{c.name}</div>
                    <div className="text-[11px] text-emerald-400 font-mono" dir="ltr">
                      +{c.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      whatsappService.removeSavedContact(c.id);
                      triggerSaved();
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live WhatsApp Test Dispatch */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <input
              type="tel"
              dir="ltr"
              placeholder="أدخل رقم للتجربة (مثال: 01012345678)"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              disabled={isWaTesting}
              onClick={async () => {
                const phone = normalizeWhatsAppPhone(waTestPhone, waSettings.defaultCountryCode);
                if (!phone || phone.length < 8) {
                  setWaTestStatus({ ok: false, msg: 'يرجى إدخال رقم واتساب صحيح أولاً.' });
                  return;
                }
                setIsWaTesting(true);
                setWaTestStatus(null);
                const msg = '✅ رسالة اختبار من نظام التذكير الذكي الخاص بالدكتور عبد العزيز.';
                if (waSettings.provider === 'none') {
                  const opened = await whatsappService.openWhatsAppChat(phone, msg);
                  setWaTestStatus({
                    ok: opened,
                    msg: opened
                      ? '💬 تم فتح محادثة واتساب مباشرة بنجاح!'
                      : 'تعذر فتح النافذة تلقائياً، تأكد من تثبيت واتساب.',
                  });
                } else {
                  const res = await whatsappService.sendViaApiGateway({
                    phone,
                    message: msg,
                    taskTitle: 'اختبار البوابة',
                    gatewayOverride: waSettings,
                  });
                  setWaTestStatus({
                    ok: res.success,
                    msg: res.success
                      ? `✅ تم إرسال الرسالة التجريبية تلقائياً عبر ${res.provider}!`
                      : `⚠️ فشل الإرسال عبر البوابة: ${res.error}`,
                  });
                }
                setIsWaTesting(false);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isWaTesting ? 'جاري الإرسال...' : 'إرسال رسالة واتساب تجريبية 🚀'}</span>
            </button>
          </div>

          {waTestStatus && (
            <div
              className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
                waTestStatus.ok
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
              }`}
            >
              {waTestStatus.msg}
            </div>
          )}
        </div>
      </div>

      {/* Windows & Mobile Notifications & Web Push */}
      <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-1 text-center sm:text-right">
          <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            إشعارات الهاتف المحمول والكمبيوتر (Mobile Web Push & Desktop)
          </h3>
          <p className="text-xs text-slate-400">
            تضمن استلام إشعارات الأذان والمهام حتى لو كان الهاتف مقفلاً أو التطبيق في الخلفية.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0 w-full sm:w-auto">
          {hasNotificationPermission ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>الإشعارات مفعلة ✓</span>
            </div>
          ) : (
            <button
              onClick={onRequestNotification}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer animate-pulse"
            >
              منح إذن الإشعارات الآن
            </button>
          )}

          <button
            onClick={async () => {
              const res = await mobileBackgroundService.sendTestPush();
              alert(res.message);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>تجربة إشعار الهاتف</span>
          </button>
        </div>
      </div>

      {/* Realtime Cloud Database (Firebase) */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white">قاعدة البيانات السحابية (Firebase Cloud)</h4>
              {isCloudConnected ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  متصل ومتزامن لحظياً 🟢
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  غير مربوط بالسحابة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مزامنة فورية وتلقائية: أي مهمة أو فيديو ترفعه على الكمبيوتر يظهر فوراً على الموبايل والعكس بدون الحاجة لنقل ملفات يدوياً.
            </p>
          </div>
        </div>

        {onOpenCloudModal && (
          <button
            type="button"
            onClick={onOpenCloudModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Cloud className="w-4 h-4" />
            <span>{isCloudConnected ? 'إدارة الاتصال السحابي' : 'ربط قاعدة بيانات Firebase'}</span>
          </button>
        )}
      </div>

      {/* Data Backup & Device Sync (PC & Mobile) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl space-y-4">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
            <span>المزامنة والنسخ الاحتياطي بين الكمبيوتر والموبايل</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            نظراً لأن النظام يعمل محلياً بالكامل (Offline-First) حفاظاً على خصوصية د. عبد العزيز، يمكنك تصدير بياناتك ومهامك من الكمبيوتر في ملف نسخة احتياطية واستيراده على الموبايل بضغطة زر واحدة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export Backup */}
          <button
            onClick={() => {
              try {
                const tasks = localStorage.getItem('smart_reminder_tasks_v2') || '[]';
                const scheduledMedia = localStorage.getItem('smart_reminder_scheduled_media_v2') || '[]';
                const prayer = localStorage.getItem('smart_reminder_prayer_settings_v1') || '{}';
                const audio = localStorage.getItem('smart_reminder_audio_settings_v1') || '{}';

                const backupData = {
                  version: '2.0',
                  doctor: 'د. عبد العزيز',
                  exportDate: new Date().toISOString(),
                  tasks: JSON.parse(tasks),
                  scheduledMedia: JSON.parse(scheduledMedia),
                  prayerSettings: JSON.parse(prayer),
                  audioSettings: JSON.parse(audio),
                };

                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `dr-abdelaziz-backup-${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                alert('✓ تم تصدير النسخة الاحتياطية بنجاح! يمكنك الآن إرسال هذا الملف لهاتفك واستيراده هناك.');
              } catch (err: any) {
                alert('فشل تصدير النسخة الاحتياطية: ' + err.message);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية من الكمبيوتر</span>
          </button>

          {/* Import Backup */}
          <div>
            <input
              id="import-backup-input"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const content = event.target?.result as string;
                    const data = JSON.parse(content);

                    if (data.tasks) {
                      localStorage.setItem('smart_reminder_tasks_v2', JSON.stringify(data.tasks));
                    }
                    if (data.scheduledMedia) {
                      localStorage.setItem('smart_reminder_scheduled_media_v2', JSON.stringify(data.scheduledMedia));
                    }
                    if (data.prayerSettings) {
                      localStorage.setItem('smart_reminder_prayer_settings_v1', JSON.stringify(data.prayerSettings));
                      setPrayerSettings(data.prayerSettings);
                    }
                    if (data.audioSettings) {
                      localStorage.setItem('smart_reminder_audio_settings_v1', JSON.stringify(data.audioSettings));
                      setAudioSettings(data.audioSettings);
                    }

                    alert('✓ تم استيراد وتحديث كافة البيانات والمهام بنجاح! سيتم تحديث الصفحة الآن.');
                    window.location.reload();
                  } catch (err: any) {
                    alert('الملف غير صالح أو تالف: ' + err.message);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
              className="hidden"
            />
            <label
              htmlFor="import-backup-input"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>استيراد نسخة احتياطية على الموبايل</span>
            </label>
          </div>
        </div>
      </div>

      {/* Data Management & Reset */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">إعادة ضبط البيانات الافتراضية</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            استعادة قائمة المهام النموذجية وإعدادات المواقيت الأصلية
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات والمهام النموذجية؟')) {
              onResetAllData();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة الافتراضي</span>
        </button>
      </div>
    </div>
  );
};
