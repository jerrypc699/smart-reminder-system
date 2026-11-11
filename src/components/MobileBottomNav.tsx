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
        className="pointer-events-auto max-w-md mx-auto mb-1.5 rounded-2xl bg-[#0B0F19]/92 backdrop-blur-2xl border border-white/[0.09] px-1 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]"
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
                className={`relative flex flex-col items-center justify-center h-[52px] rounded-xl transition-all cursor-pointer select-none ${
                  isActive ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-8 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/18 text-emerald-400 ring-1 ring-emerald-400/35 shadow-[0_2px_10px_rgba(16,185,129,0.28)]'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-[17px] h-[17px]" strokeWidth={isActive ? 2.1 : 1.75} />
                  </div>
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-[#E7C66C] text-[9px] font-black text-[#06080D] ring-2 ring-[#0B0F19] tabular-nums">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9.5px] mt-1 tracking-tight leading-none truncate max-w-full ${
                    isActive ? 'font-bold text-white' : 'font-medium text-slate-400'
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
