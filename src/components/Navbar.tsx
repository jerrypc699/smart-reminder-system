import React from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Compass,
  CheckSquare,
  Settings,
  Sparkles,
  Play,
  Layers,
  Film,
  Cloud,
  RefreshCw,
  Award,
  MapPin,
  Sun,
  Moon
} from 'lucide-react';
import { PrayerSettings, AudioSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentTime: Date;
  hijriDate: string;
  prayerSettings: PrayerSettings;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  isSpeaking: boolean;
  onTestAudio: () => void;
  hasNotificationPermission: boolean;
  onRequestNotification: () => void;
  pendingTasksCount: number;
  scheduledAudiosCount?: number;
  onOpenInstallModal?: () => void;
  isCloudConnected?: boolean;
  onOpenCloudModal?: () => void;
  onManualSync?: () => void;
  isManualSyncing?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentTime,
  hijriDate,
  prayerSettings,
  audioSettings,
  setAudioSettings,
  isSpeaking,
  onTestAudio,
  hasNotificationPermission,
  onRequestNotification,
  pendingTasksCount,
  scheduledAudiosCount = 0,
  isCloudConnected = false,
  onOpenCloudModal,
  onManualSync,
  isManualSyncing = false,
  theme = 'light',
  onToggleTheme,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatGregorianDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Layers },
    { id: 'daily_system', label: 'نظامي اليومي', icon: Award },
    { id: 'prayers', label: 'مواقيت الصلاة', icon: Compass },
    {
      id: 'tasks',
      label: 'مهام العمل',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'audio_scheduler',
      label: 'الوسائط المجدولة',
      icon: Film,
      badge: scheduledAudiosCount > 0 ? scheduledAudiosCount : undefined,
    },
    { id: 'athkar', label: 'أذكاري والسبحة', icon: Sparkles },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 pt-safe lux-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-h-[3.85rem] sm:h-[4.5rem] py-2 sm:py-0">
          {/* Brand Identity & Dates */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 text-right cursor-pointer group"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl p-[1.5px] bg-gradient-to-br from-[#ECC764] via-[#C59014] to-[#9E6E0B] shadow-[0_4px_14px_rgba(183,129,12,0.25)]">
                <img
                  src="/logo.png"
                  alt="شعار د. عبد العزيز الرسمي"
                  className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px] bg-white"
                />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                title="متصل ونشط"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-lg font-extrabold text-white tracking-tight whitespace-nowrap group-hover:text-[var(--lux-accent)] transition-colors">
                  د. عبد العزيز
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#9E6E0B] border border-[#D4AF37]/30 font-bold shrink-0">
                  <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                  المساعد التنفيذي
                </span>
              </div>

              <div className="mt-0.5 flex flex-col leading-tight">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate">
                  {hijriDate}
                </span>
                <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
                  <span className="tabular-nums truncate">{formatGregorianDate(currentTime)} م</span>
                  <span className="text-slate-400 hidden sm:inline">•</span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-[var(--lux-accent)] font-bold shrink-0">
                    <MapPin className="w-3 h-3" strokeWidth={1.75} />
                    {prayerSettings.cityName}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Center Chronometer Pill (Desktop) */}
          <div className="hidden lg:flex items-center gap-5 lux-well px-4 py-2 rounded-2xl">
            <div className="flex items-center gap-2 text-base font-mono font-bold text-white tabular-nums tracking-wide">
              <Clock className="w-4 h-4 text-[var(--lux-accent)]" strokeWidth={1.75} />
              <span dir="ltr">{formatTime(currentTime)}</span>
            </div>

            <div className="h-4 w-px bg-slate-500/20" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">
                {isSpeaking ? (
                  <span className="text-[var(--lux-accent)] flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                    صوت نشط
                  </span>
                ) : (
                  <span className="text-slate-400">الصوت جاهز</span>
                )}
              </span>
              <div className="flex items-end gap-0.5 h-4 w-8 justify-center">
                <span className={`w-0.5 rounded-full bg-[var(--lux-accent)] ${isSpeaking ? 'animate-wave-1' : 'h-1.5 opacity-60'}`} />
                <span className={`w-0.5 rounded-full bg-[var(--lux-accent)] ${isSpeaking ? 'animate-wave-2' : 'h-2.5 opacity-60'}`} />
                <span className={`w-0.5 rounded-full bg-[var(--lux-accent)] ${isSpeaking ? 'animate-wave-3' : 'h-1.5 opacity-60'}`} />
                <span className={`w-0.5 rounded-full bg-[var(--lux-accent)] ${isSpeaking ? 'animate-wave-4' : 'h-3 opacity-60'}`} />
                <span className={`w-0.5 rounded-full bg-[var(--lux-accent)] ${isSpeaking ? 'animate-wave-5' : 'h-1 opacity-60'}`} />
              </div>
            </div>
          </div>

          {/* Uniform Control Capsule */}
          <div className="flex items-center gap-1 p-1 rounded-2xl lux-well shrink-0">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title={theme === 'light' ? 'التبديل للوضع الليلي' : 'التبديل للوضع النهاري اللؤلؤي'}
                className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 text-[#B7810C] cursor-pointer"
              >
                {theme === 'light' ? (
                  <Moon className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
                ) : (
                  <Sun className="w-[15px] h-[15px] sm:w-4 sm:h-4 text-[#ECC764]" strokeWidth={1.75} />
                )}
              </button>
            )}

            {onOpenCloudModal && (
              <button
                type="button"
                onClick={onOpenCloudModal}
                title={isCloudConnected ? 'السحابة متصلة ومتزامنة لحظياً' : 'إعداد الاتصال السحابي'}
                className={`relative btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer ${
                  isCloudConnected ? 'text-[var(--lux-accent)]' : 'text-slate-400'
                }`}
              >
                <Cloud className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
                {isCloudConnected && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            )}

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isManualSyncing}
                title="مزامنة سحابية فورية"
                className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-[15px] h-[15px] sm:w-4 sm:h-4 ${isManualSyncing ? 'animate-spin text-[var(--lux-accent)]' : ''}`}
                  strokeWidth={1.75}
                />
              </button>
            )}

            <button
              type="button"
              onClick={onTestAudio}
              title="تجربة الصوت والتنبيه"
              className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 text-[var(--lux-accent)] cursor-pointer"
            >
              <Play className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.85} />
            </button>

            <button
              type="button"
              onClick={() =>
                setAudioSettings((prev) => ({
                  ...prev,
                  soundMuted: !prev.soundMuted,
                }))
              }
              title={audioSettings.soundMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
              className={`btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer ${
                audioSettings.soundMuted ? 'text-rose-500 border-rose-500/35' : ''
              }`}
            >
              {audioSettings.soundMuted ? (
                <VolumeX className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
              ) : (
                <Volume2 className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
              )}
            </button>

            {!hasNotificationPermission && (
              <button
                type="button"
                onClick={onRequestNotification}
                title="تفعيل إذن الإشعارات"
                className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 text-[#B7810C] cursor-pointer"
              >
                <Bell className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Refined Navigation Strip */}
        <nav className="hidden md:flex items-center justify-center gap-1.5 pb-3 pt-0.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none border ${
                  isActive
                    ? 'btn-lux-primary'
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-500/10'
                }`}
              >
                <Icon
                  className="w-4 h-4"
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums leading-none ${
                      isActive
                        ? 'bg-white text-[#0066CC]'
                        : 'bg-[#D69E24] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
