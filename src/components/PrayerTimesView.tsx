import React, { useState, useEffect } from 'react';
import {
  Compass,
  Volume2,
  Bell,
  Check,
  Clock,
  MapPin,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Play,
  Square,
  Smartphone,
  Radio,
  Send,
  CheckCircle2,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { PrayerInfo, PrayerSettings, PrayerId } from '../types';
import { mobileBackgroundService } from '../services/mobileBackgroundService';

interface PrayerTimesViewProps {
  prayerTimes: PrayerInfo[];
  nextPrayer: PrayerInfo;
  remainingTime: { hours: number; minutes: number; seconds: number; formatted: string };
  prayerSettings: PrayerSettings;
  setPrayerSettings: React.Dispatch<React.SetStateAction<PrayerSettings>>;
  onPlayAzan: (reciter?: 'takbeerat' | 'mishary' | 'abdulbasit' | 'makkah' | 'custom') => void;
  onStopAudio: () => void;
  isSpeaking: boolean;
  qiblaDirection: number;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  prayerTimes,
  nextPrayer,
  remainingTime,
  prayerSettings,
  setPrayerSettings,
  onPlayAzan,
  onStopAudio,
  isSpeaking,
  qiblaDirection,
}) => {
  const [isKeepAlive, setIsKeepAlive] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  useEffect(() => {
    mobileBackgroundService.setKeepAliveMode(true);
    setIsKeepAlive(true);

    mobileBackgroundService.isSubscribed().then((sub) => {
      setIsSubscribed(sub);
      if (!sub) {
        mobileBackgroundService.autoInitPush().then((success) => {
          if (success) setIsSubscribed(true);
        });
      }
    });
  }, []);

  const handleToggleKeepAlive = () => {
    const nextVal = !isKeepAlive;
    setIsKeepAlive(nextVal);
    mobileBackgroundService.setKeepAliveMode(nextVal);
  };

  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    setTestResultMsg(null);
    try {
      const res = await mobileBackgroundService.subscribeToPush();
      setIsSubscribed(res.success);
      setTestResultMsg(res.message);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    setTestResultMsg(null);
    try {
      const res = await mobileBackgroundService.sendTestPush();
      setTestResultMsg(res.message);
    } finally {
      setIsTestingPush(false);
    }
  };

  const getPrayerIcon = (id: PrayerId) => {
    switch (id) {
      case 'fajr':
        return <Moon className="w-5 h-5 text-indigo-300" strokeWidth={1.75} />;
      case 'sunrise':
        return <Sunrise className="w-5 h-5 text-[#E7C66C]" strokeWidth={1.75} />;
      case 'dhuhr':
        return <Sun className="w-5 h-5 text-[#E7C66C]" strokeWidth={1.75} />;
      case 'asr':
        return <Sun className="w-5 h-5 text-amber-300" strokeWidth={1.75} />;
      case 'maghrib':
        return <Sunset className="w-5 h-5 text-rose-300" strokeWidth={1.75} />;
      case 'isha':
        return <Moon className="w-5 h-5 text-emerald-300" strokeWidth={1.75} />;
    }
  };

  const getPrayerDescription = (id: PrayerId) => {
    switch (id) {
      case 'fajr':
        return 'صلاة الصبح — ركعتان فرض وسنة الفجر خير من الدنيا وما فيها';
      case 'sunrise':
        return 'شروق الشمس — انتهاء وقت الفجر وبداية وقت الضحى';
      case 'dhuhr':
        return 'صلاة الظهر — أربع ركعات فرض في زوال الشمس';
      case 'asr':
        return 'صلاة العصر — الصلاة الوسطى (أربع ركعات فرض)';
      case 'maghrib':
        return 'صلاة المغرب — ثلاث ركعات فرض عند غروب الشمس';
      case 'isha':
        return 'صلاة العشاء — أربع ركعات فرض يعقبها الشفع والوتر';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in pb-12">
      {/* Top Location & Next Prayer Hero Banner */}
      <div className="relative rounded-3xl lux-card-emerald p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-right">
            <div className="inline-flex items-center justify-center md:justify-start gap-2 px-3 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.85} />
              <span>
                {prayerSettings.cityName} ({prayerSettings.countryName})
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              الصلاة القادمة: صلاة {nextPrayer.arabicName}
            </h2>

            <p className="text-slate-300 text-sm">
              موعد الأذان:{' '}
              <span className="font-bold text-emerald-300 font-mono tabular-nums text-base">
                {nextPrayer.formatted12h}
              </span>{' '}
              • المتبقي:{' '}
              <span className="font-mono tabular-nums font-bold text-[#E7C66C]">
                {remainingTime.formatted}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSpeaking ? (
              <button
                type="button"
                onClick={onStopAudio}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 border border-rose-400/40 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" strokeWidth={1.75} />
                <span>إيقاف الصوت</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPlayAzan(prayerSettings.azanReciter)}
                className="btn-lux-primary flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" strokeWidth={1.75} />
                <span>
                  سماع الأذان ({prayerSettings.azanReciter === 'takbeerat' ? 'تكبيرات موجزة' : 'أذان كامل'})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Background Azan & Web Push Control Center */}
      <div className="lux-card rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="icon-squircle-emerald w-11 h-11 shrink-0">
              <Smartphone className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  تنبيه الأذان التلقائي على الهاتف المقفل
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-[#E7C66C] font-bold border border-white/[0.09]">
                  Android & iPhone
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                يوقظ الهاتف ويطلق صوت الأذان كاملاً في موعد الصلاة حتى لو كان الجهاز صامتاً أو مقفلاً.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestPush}
            disabled={isTestingPush}
            className="btn-lux-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isTestingPush ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" strokeWidth={1.75} />
            ) : (
              <Send className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            )}
            <span>تجربة إشعار الأذان للهاتف</span>
          </button>
        </div>

        {testResultMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span>{testResultMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Cloud Push Card */}
          <div className="lux-well p-4 rounded-2xl flex flex-col justify-between gap-3.5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
                  إشعارات السحابة الفورية (Web Push)
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                  {isSubscribed ? 'متصل ونشط ✓' : 'مفعّل تلقائياً'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                إشعارات عالية الأولوية تصلك من السحابة فور دخول وقت الصلاة دون الحاجة لإبقاء التطبيق مفتوحاً.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubscribePush}
              disabled={isSubscribing}
              className="btn-lux-secondary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubscribing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
              )}
              <span>{isSubscribed ? 'تم ربط الهاتف بنجاح ✓' : 'تأكيد ربط إشعارات الهاتف'}</span>
            </button>
          </div>

          {/* Keep-Alive Audio Card */}
          <div className="lux-well p-4 rounded-2xl flex flex-col justify-between gap-3.5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#E7C66C]" strokeWidth={1.75} />
                  تشغيل صوت الأذان في الخلفية
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#D4AF37]/15 text-[#E7C66C] border border-[#D4AF37]/25 shrink-0">
                  {isKeepAlive ? 'نشط دائماً' : 'متوقف'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                يحفظ قناة الصوت نشطة لضمان انطلاق تكبيرات الأذان تلقائياً بصوت واضح عند دخول الوقت.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleKeepAlive}
              className="btn-lux-secondary w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-[#E7C66C]" strokeWidth={1.75} />
              <span>{isKeepAlive ? 'الوضع الصوتي الدائم نشط ✓' : 'تفعيل الصوت التلقائي'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Prayer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {prayerTimes.map((prayer) => {
          const isSunrise = prayer.id === 'sunrise';

          return (
            <div
              key={prayer.id}
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 flex flex-col justify-between h-full transition-all ${
                prayer.isNext
                  ? 'lux-card-emerald ring-1 ring-emerald-400/35'
                  : prayer.isPassed
                    ? 'lux-card opacity-65'
                    : 'lux-card-interactive'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                      prayer.isNext
                        ? 'bg-emerald-500/15 border-emerald-500/35'
                        : 'bg-white/[0.04] border-white/[0.08]'
                    }`}
                  >
                    {getPrayerIcon(prayer.id)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                      {prayer.arabicName}
                      {prayer.isNext && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold">
                          القادمة
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isSunrise ? 'وقت الشروق' : 'صلاة مفروضة'}
                    </span>
                  </div>
                </div>

                <div className="text-left font-mono tabular-nums">
                  <div className="text-xl font-extrabold text-white">{prayer.formatted12h}</div>
                  <div className="text-[11px] text-slate-500">{prayer.timeString}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {getPrayerDescription(prayer.id)}
              </p>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                {prayer.isNext ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
                    متبقي {remainingTime.formatted}
                  </span>
                ) : prayer.isPassed ? (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
                    انقضى وقتها
                  </span>
                ) : (
                  <span className="text-slate-400">لاحقاً اليوم</span>
                )}

                {!isSunrise && (
                  <button
                    type="button"
                    onClick={() => onPlayAzan(prayerSettings.azanReciter)}
                    className="text-xs text-emerald-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>سماع الأذان</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration & Qibla Compass Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Audio & Azan Configuration */}
        <div className="lg:col-span-2 lux-card rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="icon-squircle-emerald w-10 h-10">
              <Bell className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات التنبيه الصوتي والأذان</h3>
              <p className="text-[11px] text-slate-400">تخصيص صوت المؤذن والتنبيه الاستباقي للوضوء</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="lux-well p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-slate-200">
                صوت الأذان والتكبير
              </label>
              <select
                value={prayerSettings.azanReciter}
                onChange={(e) =>
                  setPrayerSettings((prev) => ({
                    ...prev,
                    azanReciter: e.target.value as any,
                  }))
                }
                className="lux-input w-full px-3 py-2 text-xs font-semibold"
              >
                <option value="mishary">الشيخ مشاري راشد العفاسي (كامل)</option>
                <option value="takbeerat">تكبيرات الأذان (موجزة للعمل)</option>
                <option value="abdulbasit">الشيخ عبد الباسط عبد الصمد</option>
                <option value="makkah">الأذان المكي الشريف (علي ملا)</option>
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                في بيئة العيادة أو الاجتماعات، خيار التكبيرات الموجزة يُعلم بدخول الوقت بلباقة.
              </p>
            </div>

            <div className="lux-well p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  تنبيه ما قبل الصلاة
                </label>
                <input
                  type="checkbox"
                  checked={prayerSettings.enablePreAzanAlert}
                  onChange={(e) =>
                    setPrayerSettings((prev) => ({
                      ...prev,
                      enablePreAzanAlert: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      setPrayerSettings((prev) => ({
                        ...prev,
                        preAzanReminderMinutes: mins,
                      }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      prayerSettings.preAzanReminderMinutes === mins
                        ? 'bg-emerald-500/18 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.07] hover:text-white'
                    }`}
                  >
                    قبل {mins} د
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تنبيه صوتي واضح قبل صلاة {nextPrayer.arabicName} بـ {prayerSettings.preAzanReminderMinutes} دقائق للاستعداد.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl lux-card-gold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="icon-squircle-gold w-9 h-9 shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#E7C66C] block mb-1">
                  دعاء ما بعد الأذان
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-serif">
                  «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#E7C66C] bg-[#D4AF37]/12 px-3 py-1 rounded-full border border-[#D4AF37]/25 font-bold shrink-0">
              سنة نبوية
            </span>
          </div>
        </div>

        {/* Luxury Qibla Compass Dial */}
        <div className="lux-card rounded-3xl p-5 sm:p-7 flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-2">
              <Compass className="w-5 h-5 text-[#E7C66C]" strokeWidth={1.75} />
              اتجاه القبلة الشريفة
            </h3>
            <p className="text-xs text-slate-400 mb-6">نحو الكعبة المشرفة بمكة المكرمة</p>

            <div className="relative w-44 h-44 mx-auto rounded-full lux-well border-2 border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.1)]">
              <div className="absolute inset-2 rounded-full border border-white/[0.06]" />
              <span className="absolute top-2.5 text-[10px] font-bold text-rose-400 font-mono">N</span>
              <span className="absolute bottom-2.5 text-[10px] font-bold text-slate-500 font-mono">S</span>
              <span className="absolute right-3 text-[10px] font-bold text-slate-500 font-mono">E</span>
              <span className="absolute left-3 text-[10px] font-bold text-slate-500 font-mono">W</span>

              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-700"
                style={{ transform: `rotate(${qiblaDirection}deg)` }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-14 bg-gradient-to-t from-emerald-500 to-[#E7C66C] rounded-t-full shadow-[0_0_16px_rgba(231,198,108,0.45)]" />
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-[#06080D] shadow" />
                  <div className="w-2 h-9 bg-slate-600/80 rounded-b-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] w-full">
            <span className="text-xs text-slate-300">
              زاوية الانحراف:{' '}
              <span className="font-bold text-[#E7C66C] font-mono tabular-nums text-sm">
                {qiblaDirection}°
              </span>{' '}
              عن الشمال الحقيقي
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
