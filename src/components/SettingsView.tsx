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
  Smartphone
} from 'lucide-react';
import { PrayerSettings, AudioSettings, CityPreset, StoredAudioMeta } from '../types';
import { CITY_PRESETS } from '../services/prayerService';
import { audioService } from '../services/audioService';
import { audioStorageService } from '../services/audioStorageService';
import { notificationService } from '../services/notificationService';

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
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [savedAlert, setSavedAlert] = useState(false);

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
    audioService.speakAlert('مرحباً بك! نظام التذكير الصوتي والمساعد الشخصي الذكي جاهز ويعمل بكفاءة تامة من أجلك.', {
      volume: audioSettings.masterVolume,
      rate: audioSettings.ttsRate,
      pitch: audioSettings.ttsPitch,
      voiceURI: audioSettings.ttsVoiceURI,
    });
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
          onClick={() => audioService.speakAlert('أهلاً بك يا دكتور عبد العزيز. جميع إعدادات التخصيص والصوت تعمل بدقة عالية من أجلك.')}
          className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>تجربة نداء التنبيه</span>
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

      {/* Windows Desktop Notifications */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            إشعارات سطح المكتب (Windows Notifications)
          </h3>
          <p className="text-xs text-slate-400">
            تضمن استلام التنبيهات المنبثقة حتى لو كان المتصفح مصغراً أو في الخلفية أثناء العمل.
          </p>
        </div>

        <div className="shrink-0">
          {hasNotificationPermission ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>مفعلة على هذا الجهاز</span>
            </div>
          ) : (
            <button
              onClick={onRequestNotification}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer animate-pulse"
            >
              منح الإذن الآن
            </button>
          )}
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
