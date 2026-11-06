import React from 'react';
import { 
  Compass, 
  Volume2, 
  Bell, 
  Check, 
  Clock, 
  MapPin, 
  Sparkles, 
  Sun, 
  Moon, 
  Sunset, 
  Sunrise,
  Play,
  Square
} from 'lucide-react';
import { PrayerInfo, PrayerSettings, PrayerId } from '../types';

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
  const getPrayerIcon = (id: PrayerId) => {
    switch (id) {
      case 'fajr':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'sunrise':
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'dhuhr':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'asr':
        return <Sun className="w-5 h-5 text-orange-400" />;
      case 'maghrib':
        return <Sunset className="w-5 h-5 text-rose-400" />;
      case 'isha':
        return <Moon className="w-5 h-5 text-blue-400" />;
    }
  };

  const getPrayerDescription = (id: PrayerId) => {
    switch (id) {
      case 'fajr':
        return 'صلاة الصبح - ركعتان فرض وسنة الفجر خير من الدنيا وما فيها';
      case 'sunrise':
        return 'شروق الشمس - انتهاء وقت صلاة الفجر وبدء وقت الضحى';
      case 'dhuhr':
        return 'صلاة الظهر - 4 ركعات فرض';
      case 'asr':
        return 'صلاة العصر - الصلاة الوسطى (4 ركعات)';
      case 'maghrib':
        return 'صلاة المغرب - 3 ركعات فرض عند غروب الشمس';
      case 'isha':
        return 'صلاة العشاء - 4 ركعات فرض يعقبها الشفع والوتر';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner: Location & Next Prayer Highlights */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 p-6 sm:p-8 border border-emerald-500/30 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 text-xs font-bold">
              <MapPin className="w-4 h-4" />
              <span>مواقيت الأذان والصلاة حسب توقيت: {prayerSettings.cityName} ({prayerSettings.countryName})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              الصلاة القادمة: صلاة {nextPrayer.arabicName}
            </h2>
            <p className="text-slate-300 text-sm">
              موعد الأذان: <span className="font-bold text-emerald-400 font-mono text-base">{nextPrayer.formatted12h}</span>
              {' '}• المتبقي:{' '}
              <span className="font-mono font-bold text-amber-400">{remainingTime.formatted}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSpeaking ? (
              <button
                onClick={onStopAudio}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>إيقاف الصوت</span>
              </button>
            ) : (
              <button
                onClick={() => onPlayAzan(prayerSettings.azanReciter)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>سماع الأذان ({prayerSettings.azanReciter === 'takbeerat' ? 'تكبيرات سريعة' : 'أذان كامل'})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6 Prayer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {prayerTimes.map((prayer) => {
          const isSunrise = prayer.id === 'sunrise';

          return (
            <div
              key={prayer.id}
              className={`relative overflow-hidden rounded-3xl p-6 border transition-all duration-300 ${
                prayer.isNext
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50 glow-emerald scale-[1.02]'
                  : prayer.isPassed
                  ? 'bg-slate-900/60 border-slate-800 opacity-75'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                      prayer.isNext
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    {getPrayerIcon(prayer.id)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {prayer.arabicName}
                      {prayer.isNext && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          القادمة
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {isSunrise ? 'وقت الشروق' : 'صلاة مفروضة'}
                    </span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="text-xl font-extrabold text-white">
                    {prayer.formatted12h}
                  </div>
                  <div className="text-xs text-slate-400">
                    {prayer.timeString}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-1">
                {getPrayerDescription(prayer.id)}
              </p>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {prayer.isNext ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    متبقي {remainingTime.formatted}
                  </span>
                ) : prayer.isPassed ? (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    انقضى وقتها
                  </span>
                ) : (
                  <span className="text-slate-400">
                    لاحقاً اليوم
                  </span>
                )}

                {!isSunrise && (
                  <button
                    onClick={() => onPlayAzan(prayerSettings.azanReciter)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>سماع الأذان</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings & Qibla Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Azan & Voice Reminders Configuration */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-900 p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            إعدادات التنبيه الصوتي والأذان
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Azan Voice Selector */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
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
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="mishary">الشيخ مشاري راشد العفاسي (كامل)</option>
                <option value="takbeerat">تكبيرات الأذان (موجزة - مناسبة لبيئة العمل)</option>
                <option value="abdulbasit">الشيخ عبد الباسط عبد الصمد</option>
                <option value="makkah">الأذان المكي الشريف (علي ملا)</option>
              </select>
              <p className="text-[11px] text-slate-400">
                في بيئات العمل المشتركة، خيار التكبيرات الموجزة يعلن دخول الوقت بلباقة.
              </p>
            </div>

            {/* Pre-Azan Warning */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  تنبيه صوتي قبل موعد الصلاة
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
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      prayerSettings.preAzanReminderMinutes === mins
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    قبل {mins} دقيقة
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                ينبهك بصوت واضح: "بقي {prayerSettings.preAzanReminderMinutes} دقائق على صلاة {nextPrayer.arabicName} للاستعداد والوضوء".
              </p>
            </div>
          </div>

          {/* Duaa after Azan card */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 block mb-1">
                دعاء ما بعد الأذان
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-serif">
                «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ»
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                شفاعة النبي ﷺ
              </span>
            </div>
          </div>
        </div>

        {/* Qibla Direction Compass Card */}
        <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              اتجاه القبلة الشريفة
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              نحو الكعبة المشرفة بمكة المكرمة
            </p>

            {/* Compass Visualization */}
            <div className="relative w-44 h-44 mx-auto rounded-full bg-slate-800/80 border-4 border-slate-700/80 flex items-center justify-center shadow-inner">
              {/* Compass markings */}
              <span className="absolute top-2 text-[10px] font-bold text-rose-400">شمال (N)</span>
              <span className="absolute bottom-2 text-[10px] font-bold text-slate-400">جنوب (S)</span>
              <span className="absolute right-2 text-[10px] font-bold text-slate-400">شرق (E)</span>
              <span className="absolute left-2 text-[10px] font-bold text-slate-400">غرب (W)</span>

              {/* Needle rotating towards Qibla */}
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-700"
                style={{ transform: `rotate(${qiblaDirection}deg)` }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-3 h-14 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-full shadow-lg shadow-emerald-500/30"></div>
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow"></div>
                  <div className="w-2.5 h-10 bg-slate-600 rounded-b-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 w-full">
            <span className="text-xs text-slate-300">
              زاوية القبلة: <span className="font-bold text-emerald-400 font-mono text-sm">{qiblaDirection}°</span> من اتجاه الشمال
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
