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
  GraduationCap,
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
    badgeVariant?: 'primary' | 'amber' | 'rose';
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
      badgeVariant: 'primary',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      badge: badgeCounts.calendar,
      badgeVariant: 'primary',
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <div className="min-w-0">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Maam<span className="text-brand-600 dark:text-brand-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                Staff Assistant
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              } ${isCollapsed && !mobileOpen ? 'justify-center px-2' : ''}`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />

              {(!isCollapsed || mobileOpen) && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        isActive
                          ? 'bg-brand-200 dark:bg-brand-800 text-brand-900 dark:text-brand-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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

      {/* Isolation Status Footer */}
      {(!isCollapsed || mobileOpen) && (
        <div className="p-3 mx-2 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict User Isolation</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Tokens and records scoped strictly per staff member.
          </p>
        </div>
      )}

      {/* Collapse Desktop Toggle */}
      <div className="hidden md:block p-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
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
        className={`hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
