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
  Calendar,
  Layers,
  Radio,
  Film,
  Cloud,
  RefreshCw,
  Award
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
  onOpenInstallModal,
  isCloudConnected = false,
  onOpenCloudModal,
  onManualSync,
  isManualSyncing = false,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', {
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
    { id: 'daily_system', label: 'نظامي اليومي 📊', icon: Award },
    { id: 'prayers', label: 'مواقيت الصلاة', icon: Compass },
    {
      id: 'tasks',
      label: 'مهام العمل',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined
    },
    {
      id: 'audio_scheduler',
      label: 'الوسائط المجدولة',
      icon: Film,
      badge: scheduledAudiosCount > 0 ? scheduledAudiosCount : undefined
    },
    { id: 'athkar', label: 'أذكاري والسبحة 📿', icon: Sparkles },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4rem] sm:h-20 py-1.5 sm:py-0">

          {/* Logo & Clock Info */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative group shrink-0">
                <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-[2px] shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40 overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="شعار د. عبد العزيز الرسمي"
                    className="w-full h-full object-cover rounded-[14px] bg-slate-950"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[7px] sm:text-[8px] text-white font-black shadow">✓</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-xl font-black bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent truncate">
                    د. عبد العزيز
                  </h1>
                  <span className="hidden sm:inline-flex text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold items-center gap-1 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                    المساعد الذكي
                  </span>
                </div>
                <div className="mt-0.5 flex flex-col text-[10px] sm:text-xs leading-snug">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="truncate">{hijriDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
                    <span className="text-slate-300">{formatGregorianDate(currentTime)} م</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400 font-semibold truncate">{prayerSettings.cityName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time & Audio Live Waves */}
          <div className="hidden lg:flex items-center gap-6 bg-slate-800/60 px-5 py-2.5 rounded-2xl border border-slate-700/60 shadow-inner">
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-white tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                {formatTime(currentTime)}
              </div>
            </div>

            {/* Speaking Audio Visualizer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
              <div className="text-xs text-slate-400 ml-1">
                {isSpeaking ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    صوت نشط
                  </span>
                ) : (
                  'جاهز للتنبيه'
                )}
              </div>
              <div className="flex items-end gap-1 h-5 w-12 justify-center">
                <span className={`w-1 rounded-full bg-emerald-400 ${isSpeaking ? 'animate-wave-1' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-emerald-400 ${isSpeaking ? 'animate-wave-2' : 'h-2'}`}></span>
                <span className={`w-1 rounded-full bg-emerald-400 ${isSpeaking ? 'animate-wave-3' : 'h-1.5'}`}></span>
                <span className={`w-1 rounded-full bg-emerald-400 ${isSpeaking ? 'animate-wave-4' : 'h-2.5'}`}></span>
                <span className={`w-1 rounded-full bg-emerald-400 ${isSpeaking ? 'animate-wave-5' : 'h-1'}`}></span>
              </div>
            </div>
          </div>

          {/* Symmetrical Action Pill Toolbar */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-md gap-1 shrink-0">
            {onOpenCloudModal && (
              <button
                type="button"
                onClick={onOpenCloudModal}
                title={isCloudConnected ? "السحابة متصلة وتعمل بالمزامنة الفورية بين PC والموبايل" : "ربط قاعدة البيانات السحابية (Firebase)"}
                className={`relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isCloudConnected
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-4 h-4" />
                {isCloudConnected && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )}

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isManualSyncing}
                title="مزامنة فورية الآن لجميع الفيديوهات والمهام بين الكمبيوتر والموبايل"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onTestAudio}
              title="اختبار الصوت والتنبيه الصوتي"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
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
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                audioSettings.soundMuted
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
            >
              {audioSettings.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {!hasNotificationPermission && (
              <button
                type="button"
                onClick={onRequestNotification}
                title="تفعيل الإشعارات والأذان على الهاتف"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Desktop only - Mobile uses bottom nav) */}
        <nav className="hidden md:flex items-center justify-center gap-1.5 overflow-x-auto pb-3 pt-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
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
