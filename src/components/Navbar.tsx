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
  MapPin
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
    <header className="sticky top-0 z-40 pt-safe bg-[#07090F]/88 backdrop-blur-2xl border-b border-white/[0.065] shadow-[0_8px_32px_rgba(0,0,0,0.65)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-h-[3.85rem] sm:h-[4.5rem] py-2 sm:py-0">
          {/* Brand Identity & Dates (Clean non-wrapping layout on mobile) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 text-right cursor-pointer group"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl p-[1.5px] bg-gradient-to-br from-[#F1D583] via-[#D4AF37] to-[#8C6A1B] shadow-[0_4px_16px_rgba(212,175,55,0.22)]">
                <img
                  src="/logo.png"
                  alt="شعار د. عبد العزيز الرسمي"
                  className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px] bg-[#06080D]"
                />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#07090F] shadow-sm"
                title="متصل ونشط"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-lg font-extrabold text-white tracking-tight whitespace-nowrap group-hover:text-[#F1D583] transition-colors">
                  د. عبد العزيز
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/12 text-[#E7C66C] border border-[#D4AF37]/25 font-bold shrink-0">
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
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-emerald-400 font-semibold shrink-0">
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
              <Clock className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
              <span dir="ltr">{formatTime(currentTime)}</span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">
                {isSpeaking ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    صوت نشط
                  </span>
                ) : (
                  <span className="text-slate-400">الصوت جاهز</span>
                )}
              </span>
              <div className="flex items-end gap-0.5 h-4 w-8 justify-center">
                <span className={`w-0.5 rounded-full bg-emerald-400/80 ${isSpeaking ? 'animate-wave-1' : 'h-1.5'}`} />
                <span className={`w-0.5 rounded-full bg-emerald-400/80 ${isSpeaking ? 'animate-wave-2' : 'h-2.5'}`} />
                <span className={`w-0.5 rounded-full bg-emerald-400/80 ${isSpeaking ? 'animate-wave-3' : 'h-1.5'}`} />
                <span className={`w-0.5 rounded-full bg-emerald-400/80 ${isSpeaking ? 'animate-wave-4' : 'h-3'}`} />
                <span className={`w-0.5 rounded-full bg-emerald-400/80 ${isSpeaking ? 'animate-wave-5' : 'h-1'}`} />
              </div>
            </div>
          </div>

          {/* Uniform Control Capsule */}
          <div className="flex items-center gap-1 p-1 rounded-2xl lux-well shrink-0">
            {onOpenCloudModal && (
              <button
                type="button"
                onClick={onOpenCloudModal}
                title={isCloudConnected ? 'السحابة متصلة ومتزامنة لحظياً' : 'إعداد الاتصال السحابي'}
                className={`relative btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 cursor-pointer ${
                  isCloudConnected
                    ? '!bg-emerald-500/12 !border-emerald-500/25 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cloud className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
                {isCloudConnected && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            )}

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isManualSyncing}
                title="مزامنة سحابية فورية"
                className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 text-slate-300 hover:text-emerald-300 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-[15px] h-[15px] sm:w-4 sm:h-4 ${isManualSyncing ? 'animate-spin text-emerald-400' : ''}`}
                  strokeWidth={1.75}
                />
              </button>
            )}

            <button
              type="button"
              onClick={onTestAudio}
              title="تجربة الصوت والتنبيه"
              className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 text-emerald-400 hover:text-emerald-300 cursor-pointer"
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
                audioSettings.soundMuted
                  ? '!bg-rose-500/15 !border-rose-500/30 text-rose-400'
                  : 'text-slate-300 hover:text-white'
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
                className="btn-lux-icon !w-8 !h-8 sm:!w-9 sm:!h-9 !bg-[#D4AF37]/15 !border-[#D4AF37]/35 text-[#E7C66C] cursor-pointer"
              >
                <Bell className="w-[15px] h-[15px] sm:w-4 sm:h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Refined Navigation Strip */}
        <nav className="hidden md:flex items-center justify-center gap-1 pb-3 pt-0.5 overflow-x-auto scrollbar-none">
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
                    ? 'bg-emerald-500/14 text-emerald-300 border-emerald-500/30 shadow-[0_4px_16px_-6px_rgba(16,185,129,0.45)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[#E7C66C] text-[#06080D] tabular-nums leading-none">
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
