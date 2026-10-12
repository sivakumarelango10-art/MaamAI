import React from 'react';
import {
  LayoutDashboard,
  Mail,
  Sparkles,
  Calendar,
  CheckSquare,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  badgeCounts: {
    inbox: number;
    drafts: number;
    calendar: number;
    tasks: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  badgeCounts,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'cobalt' | 'amber' | 'rose';
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Mail,
      badge: badgeCounts.inbox,
      badgeVariant: 'amber',
    },
    {
      id: 'drafts',
      label: 'AI Drafts',
      icon: Sparkles,
      badge: badgeCounts.drafts,
      badgeVariant: 'cobalt',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      badge: badgeCounts.calendar,
      badgeVariant: 'cobalt',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: badgeCounts.tasks,
      badgeVariant: 'rose',
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (id: NavigationTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#13161A] border-r border-[#E5E7EB] dark:border-[#262B33] transition-colors">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#262B33]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-white p-0.5 border border-[#E5E7EB] dark:border-[#262B33] shadow-xs flex-shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Ma'amAI"
              className="w-8 h-8 rounded-lg object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-[#111111] dark:text-white block truncate">
                Ma’amAI
              </span>
              <span className="text-[10px] text-[#626875] dark:text-[#94A3B8] font-medium tracking-wide uppercase block truncate">
                Academic Executive
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="md:hidden p-1.5 rounded-lg text-[#626875] hover:text-[#111111] hover:bg-[#F7F8FA] dark:hover:bg-[#1A1D22]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group select-none text-left ${
                isActive
                  ? 'bg-[#EEF2FF] text-[#3157E8] dark:bg-[#16203D] dark:text-[#6085FA] font-semibold shadow-2xs'
                  : 'text-[#626875] hover:text-[#111111] hover:bg-[#F7F8FA] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#1A1D22]'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#3157E8] dark:text-[#6085FA]'
                    : 'text-[#626875] group-hover:text-[#111111] dark:text-[#94A3B8] dark:group-hover:text-white'
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeVariant === 'amber'
                          ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] dark:bg-[#362208] dark:text-[#FCD34D]'
                          : item.badgeVariant === 'rose'
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] dark:bg-[#3D1414] dark:text-[#FCA5A5]'
                          : 'bg-[#EEF2FF] text-[#3157E8] border border-[#D0DBFA] dark:bg-[#16203D] dark:text-[#6085FA]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Verified Workspace Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#262B33] bg-[#F7F8FA]/60 dark:bg-[#13161A]">
          <div className="flex items-center gap-2 text-xs text-[#626875] dark:text-[#94A3B8]">
            <ShieldCheck className="w-4 h-4 text-[#16803D] flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-[#111111] dark:text-white block text-[11px] truncate">
                Isolated Workspace
              </span>
              <span className="text-[10px] text-[#626875] dark:text-[#94A3B8] block truncate">
                End-to-end Protected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse desktop toggle */}
      <div className="hidden md:flex items-center justify-between p-2.5 border-t border-[#E5E7EB] dark:border-[#262B33]">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center p-2 rounded-lg text-[#626875] hover:text-[#111111] hover:bg-[#F7F8FA] dark:text-[#94A3B8] dark:hover:text-white dark:hover:bg-[#1A1D22] transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 z-40 transition-all duration-200 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs h-full z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
