import React from 'react';
import {
  Layers,
  CheckSquare,
  Film,
  Compass,
  Settings,
  Sparkles,
  Award
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTasksCount: number;
  scheduledAudiosCount: number;
  onOpenInstallModal: () => void;
  isInstallable?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingTasksCount,
  scheduledAudiosCount,
}) => {
  const primaryTabs = [
    { id: 'dashboard', label: 'الرئيسية', icon: Layers },
    { id: 'daily_system', label: 'نظامي', icon: Award },
    { id: 'prayers', label: 'الصلاة', icon: Compass },
    {
      id: 'tasks',
      label: 'المهام',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    { id: 'athkar', label: 'الأذكار', icon: Sparkles },
    {
      id: 'audio_scheduler',
      label: 'الوسائط',
      icon: Film,
      badge: scheduledAudiosCount > 0 ? scheduledAudiosCount : undefined,
    },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav 
      aria-label="شريط التنقل السفلي للهاتف"
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-1 py-1 pb-safe md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-7 items-center max-w-md mx-auto">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 h-[54px] rounded-xl transition-all cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/25 scale-105'
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-slate-950 ring-2 ring-slate-900 shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tighter leading-none truncate max-w-full">
                {tab.label}
              </span>
              <span
                className={`w-1 h-1 rounded-full mt-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 opacity-100 scale-100'
                    : 'bg-transparent opacity-0 scale-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
