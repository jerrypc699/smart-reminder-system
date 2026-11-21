import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wind,
  Droplets,
  Thermometer,
  Cloud,
  Calendar as CalendarIcon,
  X,
  Radio,
  Settings2,
  Edit3
} from 'lucide-react';
import { PrayerInfo, PrayerSettings, PrayerId, CityPreset } from '../types';
import { CITY_PRESETS } from '../services/prayerService';
import { weatherService, WeatherData } from '../services/weatherService';
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

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Calendar columns ordered RTL starting from Saturday
const CALENDAR_HEADERS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

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
  // Current live wall clock time (updates every 1s)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setWeatherLoading(true);
    weatherService.getWeather(prayerSettings.latitude, prayerSettings.longitude)
      .then((data) => {
        if (mounted) {
          setWeather(data);
          setWeatherLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setWeatherLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [prayerSettings.latitude, prayerSettings.longitude]);

  // Calendar Month Navigation
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  // Quick City Selector & Reciter Selector Modals
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isAzanModalOpen, setIsAzanModalOpen] = useState(false);
  const [isQiblaModalOpen, setIsQiblaModalOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // Custom Time Editing for Duha & Qiyam Al-Layl
  const [editingPrayerTarget, setEditingPrayerTarget] = useState<'duha' | 'qiyam' | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState<string>('');

  // Push Notifications State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    mobileBackgroundService.isSubscribed().then((sub) => {
      setIsSubscribed(sub);
      if (!sub) {
        mobileBackgroundService.autoInitPush().then((success) => {
          if (success) setIsSubscribed(true);
        });
      }
    });
  }, []);

  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    try {
      const res = await mobileBackgroundService.subscribeToPush();
      setIsSubscribed(res.success);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Clock Hand Angles
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  // Formatted Date Banner (e.g. الثلاثاء، 17 نوفمبر)
  const formattedDayAndMonth = useMemo(() => {
    const weekday = AR_WEEKDAYS[now.getDay()];
    const dayNum = now.getDate();
    const monthName = AR_MONTHS[now.getMonth()];
    return `${weekday}، ${dayNum} ${monthName}`;
  }, [now]);

  // Full Gregorian String for Prayer Card (e.g. الثلاثاء 17 نوفمبر 2026)
  const fullGregorianDate = useMemo(() => {
    const weekday = AR_WEEKDAYS[now.getDay()];
    const dayNum = now.getDate();
    const monthName = AR_MONTHS[now.getMonth()];
    const year = now.getFullYear();
    return `${weekday}، ${dayNum} ${monthName} ${year}`;
  }, [now]);

  // Hijri Month Range for Calendar Header
  const hijriMonthRange = useMemo(() => {
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        month: 'long',
        year: 'numeric',
      });
      const start = f.format(firstDay);
      const end = f.format(lastDay);

      if (start === end) return `${start}`;
      return `${start} - ${end}`;
    } catch {
      return 'جمادى الأولى 1448 هـ - جمادى الآخرة 1448 هـ';
    }
  }, [calendarDate]);

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    // We want index where 0 = السبت (Saturday), 1 = الأحد (Sunday), ..., 6 = الجمعة (Friday)
    const firstDayIndex = (firstDayOfMonth.getDay() + 1) % 7;

    const slots: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      slots.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      slots.push(d);
    }
    return slots;
  }, [calendarDate]);

  const isTodayDate = (dayNum: number | null) => {
    if (!dayNum) return false;
    return (
      dayNum === now.getDate() &&
      calendarDate.getMonth() === now.getMonth() &&
      calendarDate.getFullYear() === now.getFullYear()
    );
  };

  // Filtered City Presets
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return CITY_PRESETS;
    const q = citySearchQuery.trim().toLowerCase();
    return CITY_PRESETS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [citySearchQuery]);

  // The 8 prayers list including canonical + Duha & Qiyam Al-Layl
  const canonicalPrayers: {
    id: PrayerId;
    name: string;
    sublabel?: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'fajr', name: 'الفجر', icon: <Sunrise className="w-4 h-4 text-amber-300" /> },
    { id: 'sunrise', name: 'الشروق', icon: <Sun className="w-4 h-4 text-[#F5D77F]" /> },
    { id: 'duha', name: 'صلاة الضحى', sublabel: 'سنة مؤكدة', icon: <Sparkles className="w-4 h-4 text-amber-300" /> },
    { id: 'dhuhr', name: 'الظهر', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { id: 'asr', name: 'العصر', icon: <Sun className="w-4 h-4 text-amber-300" /> },
    { id: 'maghrib', name: 'المغرب', icon: <Sunset className="w-4 h-4 text-rose-300" /> },
    { id: 'isha', name: 'العشاء', icon: <Moon className="w-4 h-4 text-emerald-300" /> },
    { id: 'qiyam', name: 'قيام الليل', sublabel: 'الثلث الأخير', icon: <Moon className="w-4 h-4 text-indigo-300" /> },
  ];

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn pb-12 max-w-xl mx-auto" dir="rtl">
      {/* ======================================================== */}
      {/* 1. TOP LUXURY GOLDEN ANALOG WALL CLOCK */}
      {/* ======================================================== */}
      <div className="flex flex-col items-center justify-center pt-2 relative">
        {/* Left & Right Decorative Golden Islamic Star Ornaments */}
        <div className="w-full flex items-center justify-between px-6 pointer-events-none absolute top-24">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="text-amber-500 text-lg">❖</span>
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-amber-500/40" />
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-amber-500/40" />
            <span className="text-amber-500 text-lg">❖</span>
          </div>
        </div>

        {/* Vector Luxury Golden Wall Clock (Impervious to Dark Mode Inversion & Subpixel Glitches) */}
        <svg
          viewBox="0 0 200 200"
          className="w-48 h-48 sm:w-56 sm:h-56 select-none drop-shadow-[0_18px_40px_rgba(180,130,40,0.45)]"
        >
          <defs>
            {/* Outer 3D Gold Rim Gradient */}
            <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4C2" />
              <stop offset="25%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#8C5D14" />
              <stop offset="75%" stopColor="#E5B25D" />
              <stop offset="100%" stopColor="#734A10" />
            </linearGradient>

            {/* Inner Bezel Groove */}
            <linearGradient id="bezelGroove" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5A3A0A" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#3D2605" />
            </linearGradient>

            {/* Cream / Ivory Dial Face Radial Gradient */}
            <radialGradient id="clockDialFace" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#FCF8F0" />
              <stop offset="90%" stopColor="#EFE1C3" />
              <stop offset="100%" stopColor="#D8C49B" />
            </radialGradient>

            {/* Sword Hand Obsidian Body */}
            <linearGradient id="handObsidian" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2A2A2E" />
              <stop offset="50%" stopColor="#0B0C0E" />
              <stop offset="100%" stopColor="#1E2024" />
            </linearGradient>

            {/* Hand Gold Border & Spine */}
            <linearGradient id="handGoldTrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF4C2" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#8C5D14" />
            </linearGradient>

            {/* Center Cap Gold Rosette */}
            <radialGradient id="centerPinionGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFF4C2" />
              <stop offset="45%" stopColor="#D4AF37" />
              <stop offset="85%" stopColor="#734A10" />
              <stop offset="100%" stopColor="#3D2605" />
            </radialGradient>

            {/* Center Ruby Jewel */}
            <radialGradient id="rubyJewelGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FF7A7A" />
              <stop offset="60%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </radialGradient>
          </defs>

          {/* Outer Multi-Layered Gold Bezel */}
          <circle cx="100" cy="100" r="98" fill="url(#goldRimGrad)" stroke="#FFE8A3" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="91" fill="url(#bezelGroove)" stroke="#A67C1E" strokeWidth="1" />

          {/* Ivory Porcelain Dial Face */}
          <circle cx="100" cy="100" r="85" fill="url(#clockDialFace)" stroke="#734A10" strokeWidth="0.8" />

          {/* Concentric Decorative Rings */}
          <circle cx="100" cy="100" r="81" fill="none" stroke="#D4AF37" strokeWidth="0.6" opacity="0.6" />
          <circle cx="100" cy="100" r="54" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" strokeDasharray="1,2" />

          {/* 60 Minute / Second Ticks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const isHour = i % 5 === 0;
            const angle = i * 6;
            const rad = (angle - 90) * (Math.PI / 180);
            const rOuter = 81;
            const rInner = isHour ? 74 : 78;
            const x1 = 100 + rOuter * Math.cos(rad);
            const y1 = 100 + rOuter * Math.sin(rad);
            const x2 = 100 + rInner * Math.cos(rad);
            const y2 = 100 + rInner * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isHour ? '#2A1C08' : '#8C7654'}
                strokeWidth={isHour ? 1.8 : 0.8}
                strokeLinecap="round"
              />
            );
          })}

          {/* 12 Hour Numerals (Trigonometrically Placed) */}
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
            const angle = (num * 30 - 90) * (Math.PI / 180);
            const r = 66;
            const x = 100 + r * Math.cos(angle);
            const y = 100 + r * Math.sin(angle);
            return (
              <text
                key={num}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#111827"
                fontSize={num === 12 || num === 3 || num === 6 || num === 9 ? '13' : '11.5'}
                fontWeight="900"
                fontFamily="Georgia, Times New Roman, serif"
                style={{ userSelect: 'none' }}
              >
                {num}
              </text>
            );
          })}

          {/* Hour Hand (Bold, Distinct, Tapered Sword with Gold Trim) */}
          <g transform={`rotate(${hourAngle} 100 100)`}>
            {/* Shadow */}
            <polygon
              points="96.5,107 103.5,107 102.5,56 100,49 97.5,56"
              fill="rgba(0,0,0,0.28)"
              transform="translate(1, 2)"
            />
            {/* Hand Body */}
            <polygon
              points="96.5,107 103.5,107 102.5,56 100,49 97.5,56"
              fill="url(#handObsidian)"
              stroke="url(#handGoldTrim)"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            {/* Center Spine Ridge */}
            <line x1="100" y1="104" x2="100" y2="52" stroke="#FFF4C2" strokeWidth="0.7" opacity="0.9" />
          </g>

          {/* Minute Hand (Long, Sleek Tapered Sword with Gold Trim) */}
          <g transform={`rotate(${minuteAngle} 100 100)`}>
            {/* Shadow */}
            <polygon
              points="97.5,110 102.5,110 101.8,33 100,25 98.2,33"
              fill="rgba(0,0,0,0.22)"
              transform="translate(1.5, 2.5)"
            />
            {/* Hand Body */}
            <polygon
              points="97.5,110 102.5,110 101.8,33 100,25 98.2,33"
              fill="url(#handObsidian)"
              stroke="url(#handGoldTrim)"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* Center Spine Ridge */}
            <line x1="100" y1="107" x2="100" y2="28" stroke="#FFF4C2" strokeWidth="0.5" opacity="0.9" />
          </g>

          {/* Second Hand (Vibrant Crimson Red Needle with Counterbalance) */}
          <g transform={`rotate(${secondAngle} 100 100)`}>
            {/* Shadow */}
            <line x1="101" y1="121" x2="101" y2="18" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            {/* Tail Counterbalance Ring */}
            <circle cx="100" cy="116" r="3.5" fill="none" stroke="#DC2626" strokeWidth="1.2" />
            {/* Needle Hand */}
            <line x1="100" y1="122" x2="100" y2="17" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" />
            <polygon points="98.5,21 100,15 101.5,21" fill="#DC2626" />
          </g>

          {/* Center Cap Pinion (Gold Rosette with Ruby Core) */}
          <circle cx="100" cy="100" r="5.2" fill="url(#centerPinionGrad)" stroke="#FFE8A3" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="2.4" fill="url(#rubyJewelGrad)" />
        </svg>

        {/* Digital Time & Date Badges (Crystal Clear Live Synchronization) */}
        <div className="mt-3 flex flex-col items-center gap-1.5">
          {/* Live Digital Clock Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-400/40 text-amber-300 font-mono text-sm sm:text-base font-bold shadow-lg shadow-black/20">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span dir="ltr">
              {now.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </span>
          </div>

          {/* Date Pill Badge (e.g. 📅 السبت، 21 نوفمبر) */}
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-2xl bg-gradient-to-r from-[#0d4a41] via-[#09352e] to-[#0d4a41] border border-[#d4af37]/60 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-950/30">
            <CalendarIcon className="w-4 h-4 text-[#F5D77F]" />
            <span>{formattedDayAndMonth}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. LUXURY WEATHER CARD (WEATHER TODAY & 6-DAY FORECAST) */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1b74bd] via-[#105291] to-[#0a386d] border border-sky-300/30 shadow-[0_15px_40px_rgba(10,56,109,0.35)] relative overflow-hidden text-white space-y-4">
        {/* Soft Glass Specular Reflection Highlight */}
        <div className="absolute top-0 right-0 left-0 h-16 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

        {/* Top Weather Row: 3D Sun Artwork + City, Big Temp, Condition */}
        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: 3D Glowing Sun with Soft Clouds */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
            {/* Sun Rays Halo */}
            <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-xl animate-pulse" />
            
            {/* Golden 3D Sun Sphere */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#FFF385] via-[#FFAE19] to-[#E65100] shadow-[0_0_35px_rgba(255,174,25,0.7)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-1 left-2 w-7 h-4 rounded-full bg-white/40 blur-[1px]" />
            </div>

            {/* Realistic Fluffy Cloud overlapping bottom of Sun */}
            <div className="absolute -bottom-1 -right-2 w-20 sm:w-24 h-12 flex items-center justify-center filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)]">
              <div className="relative w-full h-full">
                <div className="absolute bottom-1 right-2 w-14 h-8 bg-gradient-to-b from-white to-sky-100 rounded-full" />
                <div className="absolute bottom-4 right-5 w-9 h-9 bg-gradient-to-b from-white to-sky-100 rounded-full" />
                <div className="absolute bottom-3 left-3 w-8 h-8 bg-gradient-to-b from-white to-sky-200 rounded-full" />
                <div className="absolute bottom-0 right-1 w-18 h-6 bg-gradient-to-b from-white to-slate-200 rounded-full" />
              </div>
            </div>
          </div>

          {/* Right: City with Location Pin, Large Temp Number, Status */}
          <div className="text-left space-y-0.5">
            <button
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-bold text-sky-100 transition-colors cursor-pointer shadow-sm"
              title="اضغط لتغيير المدينة"
            >
              <span>{prayerSettings.cityName}</span>
              <MapPin className="w-3.5 h-3.5 text-sky-200" />
            </button>

            <div className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-white flex items-start justify-end leading-none pt-1">
              <span>{weather ? weather.currentTemp : 16}°</span>
            </div>

            <div className="text-sm font-bold text-sky-100">
              {weather ? weather.weatherText : 'مشمس جزئياً'}
            </div>

            <div className="text-xs text-sky-200/90 font-mono font-bold">
              العظمى: {weather ? weather.maxTemp : 25}° | الصغرى: {weather ? weather.minTemp : 14}°
            </div>
          </div>
        </div>

        {/* Middle Row: 3 Frosted Glass Metrics Pills */}
        <div className="grid grid-cols-3 gap-2 pt-1 relative z-10">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-100">
              <Thermometer className="w-3.5 h-3.5 text-amber-300" />
              <span>الإحساس بـ {weather ? weather.apparentTemp : 17}°</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-100">
              <Droplets className="w-3.5 h-3.5 text-sky-300" />
              <span>الرطوبة {weather ? weather.humidity : 63}%</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-100">
              <Wind className="w-3.5 h-3.5 text-teal-300" />
              <span>الرياح {weather ? weather.windSpeed : 12} كم/س</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: 6-Day Forecast Strip */}
        <div className="pt-2 border-t border-white/15 relative z-10">
          <div className="grid grid-cols-6 gap-1 text-center">
            {(weather?.forecast || []).slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-1 p-1">
                <span className="text-[11px] font-bold text-sky-100 truncate w-full">
                  {item.dayName}
                </span>
                <span className="text-[10px] text-sky-200/80 font-mono">
                  {item.dateStr}
                </span>
                <div className="w-6 h-6 flex items-center justify-center my-0.5">
                  {item.weatherCode === 0 ? (
                    <Sun className="w-4 h-4 text-amber-300" />
                  ) : item.weatherCode <= 3 ? (
                    <div className="relative">
                      <Sun className="w-3.5 h-3.5 text-amber-300" />
                      <Cloud className="w-3 h-3 text-white absolute -bottom-1 -right-1" />
                    </div>
                  ) : (
                    <Cloud className="w-4 h-4 text-sky-200" />
                  )}
                </div>
                <span className="text-xs font-black text-white font-mono leading-none">
                  {item.maxTemp}°
                </span>
                <span className="text-[10px] text-sky-200/80 font-mono leading-none">
                  {item.minTemp}°
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. CORE PRAYER TIMES CARD (EXACT STYLE FROM IMAGE) */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#0c4038] via-[#082e28] to-[#041a17] border border-emerald-400/40 shadow-[0_15px_45px_rgba(4,26,23,0.5)] relative overflow-hidden text-white">
        {/* Soft Mosque Night Atmosphere Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center relative z-10">
          {/* Left Column: Illuminated Mosque & Next Prayer Countdown Hero */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Mosque Graphic with glowing crescent dome and minarets */}
            <div className="relative w-full max-w-[200px] h-28 flex items-end justify-center">
              <svg viewBox="0 0 240 120" className="w-full h-full drop-shadow-[0_4px_15px_rgba(231,198,108,0.35)]">
                {/* Night Sky Stars */}
                <circle cx="30" cy="20" r="1" fill="#FFE59E" opacity="0.8" />
                <circle cx="70" cy="15" r="1.5" fill="#FFE59E" opacity="0.9" />
                <circle cx="170" cy="18" r="1.2" fill="#FFE59E" opacity="0.7" />
                <circle cx="210" cy="25" r="1" fill="#FFE59E" opacity="0.8" />

                {/* Left Minaret */}
                <rect x="35" y="25" width="12" height="95" fill="url(#minaretGrad)" rx="2" />
                <polygon points="35,25 41,8 47,25" fill="#E7C66C" />
                <circle cx="41" cy="7" r="1.5" fill="#FFE8A3" />

                {/* Right Minaret */}
                <rect x="193" y="25" width="12" height="95" fill="url(#minaretGrad)" rx="2" />
                <polygon points="193,25 199,8 205,25" fill="#E7C66C" />
                <circle cx="199" cy="7" r="1.5" fill="#FFE8A3" />

                {/* Mosque Main Body */}
                <rect x="52" y="55" width="136" height="65" fill="url(#buildingGrad)" rx="3" />

                {/* Grand Center Dome */}
                <path d="M 80 55 C 80 15, 160 15, 160 55 Z" fill="url(#domeGrad)" />
                {/* Golden Crescent on Dome */}
                <path
                  d="M 120 12 C 122 8, 122 4, 119 2 C 124 2, 126 6, 124 12 Z"
                  fill="#FFF2B2"
                  filter="drop-shadow(0 0 4px #FFE8A3)"
                />

                {/* Secondary Domes */}
                <path d="M 54 62 C 54 42, 80 42, 80 62 Z" fill="url(#domeGrad)" opacity="0.9" />
                <path d="M 160 62 C 160 42, 186 42, 186 62 Z" fill="url(#domeGrad)" opacity="0.9" />

                {/* Glowing Arched Windows */}
                <rect x="68" y="75" width="10" height="20" rx="5" fill="#FFE59E" opacity="0.85" />
                <rect x="90" y="75" width="12" height="24" rx="6" fill="#FFF2B2" opacity="0.95" />
                <rect x="114" y="70" width="14" height="30" rx="7" fill="#FFE8A3" opacity="0.95" />
                <rect x="138" y="75" width="12" height="24" rx="6" fill="#FFF2B2" opacity="0.95" />
                <rect x="162" y="75" width="10" height="20" rx="5" fill="#FFE59E" opacity="0.85" />

                <defs>
                  <linearGradient id="domeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFF2B2" />
                    <stop offset="40%" stopColor="#E7C66C" />
                    <stop offset="100%" stopColor="#8C651A" />
                  </linearGradient>
                  <linearGradient id="minaretGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#B3862B" />
                    <stop offset="50%" stopColor="#F5D77F" />
                    <stop offset="100%" stopColor="#735212" />
                  </linearGradient>
                  <linearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E463E" />
                    <stop offset="100%" stopColor="#06221D" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* City & Date Info */}
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-200">
                <MapPin className="w-3.5 h-3.5 text-[#F5D77F]" />
                <span>{prayerSettings.cityName}</span>
              </div>
              <div className="text-[11px] text-emerald-300/80 font-medium pt-0.5">
                {fullGregorianDate}
              </div>
            </div>

            {/* Next Prayer Hero Callout */}
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-[#F5D77F] tracking-wide drop-shadow-[0_2px_10px_rgba(245,215,127,0.35)] font-serif">
                {nextPrayer.arabicName}
              </h3>
              <span className="text-xs text-emerald-200/90 font-bold block">
                بعد
              </span>
            </div>

            {/* Glowing Monospace Countdown Box (e.g. 03:33:01) */}
            <div className="px-5 py-2 rounded-2xl bg-slate-950/80 border border-emerald-400/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
              <span className="font-mono text-2xl sm:text-3xl font-black text-[#5eead4] tracking-widest drop-shadow-[0_0_12px_rgba(94,234,212,0.4)]">
                {remainingTime.formatted}
              </span>
            </div>
          </div>

          {/* Right Column: Prayer Times List */}
          <div className="space-y-2">
            {/* Section Title */}
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 text-xs font-black">
              <div className="flex items-center gap-2 text-white">
                <span className="text-amber-400">🕌</span>
                <span>مواقيت الصلاة</span>
              </div>
              <span className="text-[11px] text-emerald-300 font-bold font-mono">
                {prayerSettings.cityName}
              </span>
            </div>

            {/* Prayers Schedule Rows */}
            <div className="space-y-1.5">
              {canonicalPrayers.map((cp) => {
                const info = prayerTimes.find((p) => p.id === cp.id);
                const isCurrent = nextPrayer.id === cp.id;
                const isCustomized =
                  (cp.id === 'duha' && prayerSettings.duhaTimeMode === 'custom') ||
                  (cp.id === 'qiyam' && prayerSettings.qiyamTimeMode === 'custom');

                return (
                  <div
                    key={cp.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-[#ECC86D] via-[#FFE59E] to-[#D4AF37] text-slate-950 font-black shadow-lg shadow-amber-500/25 border border-[#FFF2B2] ring-1 ring-amber-400/50'
                        : 'bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 text-white'
                    }`}
                  >
                    {/* Time Left aligned with Customization Button for Duha & Qiyam */}
                    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold tracking-tight">
                      <span>{info?.formatted12h || '--:--'}</span>

                      {(cp.id === 'duha' || cp.id === 'qiyam') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentVal =
                              cp.id === 'duha'
                                ? prayerSettings.duhaCustomTime || info?.timeString || '07:00'
                                : prayerSettings.qiyamCustomTime || info?.timeString || '02:30';
                            setCustomTimeInput(currentVal);
                            setEditingPrayerTarget(cp.id as 'duha' | 'qiyam');
                          }}
                          className={`p-1 rounded-lg border transition-all cursor-pointer ${
                            isCustomized
                              ? (isCurrent
                                  ? 'bg-slate-950/20 text-slate-900 border-slate-950/30 hover:bg-slate-950/30'
                                  : 'bg-amber-400/25 text-amber-300 border-amber-400/40 hover:bg-amber-400/35')
                              : (isCurrent
                                  ? 'bg-slate-950/10 text-slate-800 border-slate-950/20 hover:bg-slate-950/20'
                                  : 'bg-white/10 text-emerald-200 border-white/15 hover:bg-white/20')
                          }`}
                          title={`تعديل وقت ${cp.name} للدكتور عبد العزيز ✏️`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Prayer Name & Sublabel & Icon Right aligned */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          {isCustomized && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              مخصص ⏱️
                            </span>
                          )}
                          <span className={`text-xs sm:text-sm leading-tight ${isCurrent ? 'font-black' : 'font-bold'}`}>
                            {cp.name}
                          </span>
                        </div>
                        {cp.sublabel && (
                          <span
                            className={`text-[9px] sm:text-[10px] leading-tight ${
                              isCurrent ? 'text-amber-950/90 font-bold' : 'text-emerald-300/80 font-medium'
                            }`}
                          >
                            {isCustomized ? 'توقيت مخصص للدكتور عبد العزيز' : cp.sublabel}
                          </span>
                        )}
                      </div>
                      <div className="w-5 h-5 flex items-center justify-center">
                        {cp.icon}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Audio Azan Play Bar */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    onStopAudio();
                  } else {
                    onPlayAzan(prayerSettings.azanReciter);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isSpeaking
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/40'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-rose-300" />
                    <span>إيقاف الأذان</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-emerald-200" />
                    <span>سماع الأذان ({prayerSettings.azanReciter === 'takbeerat' ? 'تكبيرات' : 'كامل'})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAzanModalOpen(true)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="إعدادات المؤذن والمدينة"
              >
                <Settings2 className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsQiblaModalOpen(true)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="اتجاه القبلة"
              >
                <Compass className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. LUXURY MONTHLY CALENDAR CARD (HIJRI & GREGORIAN) */}
      {/* ======================================================== */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1c2938] via-[#141f2c] to-[#0c141d] border border-slate-700/60 shadow-[0_15px_45px_rgba(12,20,29,0.5)] relative overflow-hidden text-white space-y-4">
        {/* Header: Month Navigator + Hijri Subtitle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const prev = new Date(calendarDate);
              prev.setMonth(prev.getMonth() - 1);
              setCalendarDate(prev);
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="text-center space-y-0.5">
            <h4 className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#F5D77F]" />
              <span>
                {AR_MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </span>
            </h4>
            <div className="text-xs font-bold text-[#E7C66C]/90">
              {hijriMonthRange}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = new Date(calendarDate);
              next.setMonth(next.getMonth() + 1);
              setCalendarDate(next);
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Table Grid */}
        <div className="space-y-2 pt-1">
          {/* Day Names Headers in Gold RTL */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-800 pb-2">
            {CALENDAR_HEADERS.map((dh, idx) => (
              <span
                key={idx}
                className={`text-xs font-black ${
                  dh === 'الجمعة' ? 'text-emerald-400' : 'text-[#E7C66C]'
                }`}
              >
                {dh}
              </span>
            ))}
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarGrid.map((dayNum, idx) => {
              const isToday = isTodayDate(dayNum);
              return (
                <div
                  key={idx}
                  className="h-9 sm:h-10 flex items-center justify-center"
                >
                  {dayNum !== null ? (
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-xs sm:text-sm transition-all ${
                        isToday
                          ? 'bg-[#6ea8fe] text-slate-950 font-black shadow-lg shadow-blue-500/40 ring-2 ring-white/50 scale-105'
                          : 'text-slate-300 hover:bg-slate-800/60 font-bold'
                      }`}
                    >
                      {dayNum}
                    </div>
                  ) : (
                    <span className="w-8 h-8" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CITY SELECTOR MODAL */}
      {/* ======================================================== */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="lux-card w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 border border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">اختر مدينتك</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="ابحث باسم المدينة أو الدولة..."
              value={citySearchQuery}
              onChange={(e) => setCitySearchQuery(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            />

            <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
              {filteredCities.map((c) => {
                const isSelected = prayerSettings.cityName === c.name;
                return (
                  <button
                    key={`${c.name}-${c.country}`}
                    type="button"
                    onClick={() => {
                      setPrayerSettings((prev) => ({
                        ...prev,
                        cityName: c.name,
                        countryName: c.country,
                        latitude: c.latitude,
                        longitude: c.longitude,
                        method: c.method as any,
                      }));
                      setIsCityModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-white font-bold'
                        : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.country}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: AZAN RECITER & BACKGROUND SETTINGS MODAL */}
      {/* ======================================================== */}
      {isAzanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="lux-card w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 border border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">إعدادات الأذان والمؤذن</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAzanModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">صوت الأذان المفضل:</label>
              {[
                { id: 'takbeerat', label: 'تكبيرات الأذان فقط (موجزة - الأسرع)', desc: 'الله أكبر الله أكبر (موصى بها)' },
                { id: 'mishary', label: 'الشيخ مشاري راشد العفاسي', desc: 'أذان كويتي كامل خاشع' },
                { id: 'abdulbasit', label: 'الشيخ عبد الباسط عبد الصمد', desc: 'أذان مصري أصيل وتاريخي' },
                { id: 'makkah', label: 'أذان الحرم المكي الشريف', desc: 'أذان مكة المكرمة' },
              ].map((r) => {
                const isActive = prayerSettings.azanReciter === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setPrayerSettings((prev) => ({ ...prev, azanReciter: r.id as any }));
                    }}
                    className={`w-full p-2.5 rounded-xl text-right flex items-center justify-between transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-white font-bold'
                        : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{r.label}</span>
                      <span className="text-[10px] text-slate-400">{r.desc}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Background Push Alerts Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">إشعارات الأذان في الخلفية</span>
                <span className="text-[10px] text-slate-400">تنبيه بالصوت والأذان حتى والتطبيق مغلق</span>
              </div>
              <button
                type="button"
                disabled={isSubscribing}
                onClick={handleSubscribePush}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSubscribed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isSubscribing ? 'جاري التفعيل...' : isSubscribed ? 'مفعلة ✓' : 'تفعيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: QIBLA DIRECTION MODAL */}
      {/* ======================================================== */}
      {isQiblaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="lux-card w-full max-w-sm rounded-3xl p-6 text-center space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">اتجاه القبلة الشريفة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQiblaModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-40 h-40 mx-auto rounded-full border-4 border-amber-500/30 bg-slate-950 flex items-center justify-center shadow-xl">
              <div
                className="absolute w-2 h-16 bg-gradient-to-t from-transparent via-amber-400 to-amber-300 origin-bottom rounded-full"
                style={{
                  transformOrigin: '50% 100%',
                  top: 'calc(50% - 64px)',
                  transform: `rotate(${qiblaDirection}deg)`,
                }}
              />
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
                🕋
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 block">درجة زاوية القبلة من الشمال:</span>
              <span className="font-mono text-xl font-black text-amber-300">{qiblaDirection}°</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: EDIT DUHA & QIYAM TIME MODAL */}
      {/* ======================================================== */}
      {editingPrayerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="lux-card w-full max-w-sm rounded-3xl p-6 text-right space-y-4 border border-emerald-500/40 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">
                  {editingPrayerTarget === 'duha' ? 'تعديل توقيت صلاة الضحى' : 'تعديل توقيت قيام الليل'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPrayerTarget(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {editingPrayerTarget === 'duha'
                ? 'يمكن لسعادة الدكتور عبد العزيز تحديد موعد مخصص لصلاة الضحى (صلاة الأوابين) أو الإبقاء على التوقيت الشرعي التلقائي (20 دقيقة بعد الشروق).'
                : 'يمكن لسعادة الدكتور عبد العزيز تحديد موعد مخصص لقيام الليل والوتر أو الإبقاء على الحساب الفلكي الشرعي (الثلث الأخير من الليل).'}
            </p>

            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-white">اختر وقت الصلاة المخصص:</label>
              <input
                type="time"
                value={customTimeInput}
                onChange={(e) => setCustomTimeInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-emerald-500/40 text-amber-300 font-mono text-xl text-center focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
              />

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block font-bold">أوقات شائعة مقترحة:</span>
                <div className="grid grid-cols-3 gap-2">
                  {(editingPrayerTarget === 'duha'
                    ? ['07:00', '07:30', '08:00', '08:30', '09:00', '10:00']
                    : ['01:30', '02:00', '02:30', '03:00', '03:30', '04:00']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomTimeInput(preset)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border cursor-pointer transition-all ${
                        customTimeInput === preset
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (editingPrayerTarget === 'duha') {
                    setPrayerSettings((prev) => ({
                      ...prev,
                      duhaTimeMode: 'auto',
                      duhaCustomTime: undefined,
                    }));
                  } else {
                    setPrayerSettings((prev) => ({
                      ...prev,
                      qiyamTimeMode: 'auto',
                      qiyamCustomTime: undefined,
                    }));
                  }
                  setEditingPrayerTarget(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                تلقائي شرعي 🔄
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customTimeInput) return;
                  if (editingPrayerTarget === 'duha') {
                    setPrayerSettings((prev) => ({
                      ...prev,
                      duhaTimeMode: 'custom',
                      duhaCustomTime: customTimeInput,
                    }));
                  } else {
                    setPrayerSettings((prev) => ({
                      ...prev,
                      qiyamTimeMode: 'custom',
                      qiyamCustomTime: customTimeInput,
                    }));
                  }
                  setEditingPrayerTarget(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                حفظ التوقيت المخصص ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
