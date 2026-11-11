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
    <div className="fixed bottom-0 inset-x-0 z-40 px-2 pb-safe md:hidden pointer-events-none">
      <nav
        aria-label="شريط التنقل السفلي للهاتف"
        className="pointer-events-auto max-w-md mx-auto mb-1.5 rounded-2xl lux-dock px-1 py-1.5"
      >
        <div className="grid grid-cols-7 items-center">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center justify-center h-[52px] rounded-xl transition-all cursor-pointer select-none"
              >
                <div className="relative">
                  <div
                    className={`w-8 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'btn-lux-primary shadow-md'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-[16px] h-[16px]" strokeWidth={isActive ? 2.1 : 1.75} />
                  </div>
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-[#C59014] text-[9px] font-black text-white ring-2 ring-white tabular-nums">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9.5px] mt-1 tracking-tight leading-none truncate max-w-full ${
                    isActive ? 'font-extrabold text-[var(--lux-accent)]' : 'font-semibold text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
