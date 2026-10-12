import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Shield,
  ChevronDown,
  UserCheck,
  Check,
  Sparkles,
  Smartphone,
  Laptop,
  LogOut,
  Lock,
} from 'lucide-react';
import type { NavigationTab, HealthStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  activeTab: NavigationTab;
  health: HealthStatus | null;
  onToggleSidebar: () => void;
  facultyName: string;
  facultyRole: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  health,
  onToggleSidebar,
}) => {
  const { currentUser, availableStaff, switchStaff, logout, isLoadingAuth, isProduction } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);

  const tabTitles: Record<NavigationTab, string> = {
    overview: 'Faculty Executive Overview',
    inbox: 'Inbox & Correspondence',
    drafts: 'AI Draft Approval Queue',
    calendar: 'Academic Calendar & Schedule',
    tasks: 'Actionable Deliverables',
    activity: 'Audit & Activity Log',
    settings: 'Faculty Workspace Settings',
  };

  const handleSelectStaff = async (username: string) => {
    if (isProduction) return;
    setIsStaffMenuOpen(false);
    if (currentUser?.username !== username) {
      await switchStaff(username);
    }
  };

  const handleLogout = async () => {
    setIsStaffMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
              <span>{tabTitles[activeTab]}</span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                <Sparkles className="w-3 h-3" />
                Staff Workspace
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              {currentUser?.full_name} • {currentUser?.department || 'Faculty Department'}
            </p>
          </div>
        </div>

        {/* Right: Actions, Health, Theme, Staff Profile / Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Health indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            title={`Backend: ${health?.status || 'Active'} (${health?.database || 'SQLite'})`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'ok' || health?.status === 'healthy' || health?.status === 'simulated'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-medium hidden md:inline">
              {health?.status === 'simulated' ? 'SQLite Demo' : 'SQLite DB Active'}
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Staff Profile / Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
              disabled={isLoadingAuth}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {currentUser?.avatar_initials || 'AV'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {currentUser?.full_name || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                  {currentUser?.role ? currentUser.role.split(' ')[0] : 'Faculty'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isStaffMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStaffMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{isProduction ? 'Authenticated Staff' : 'Staff Workspaces'}</span>
                      <Shield className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isProduction
                        ? 'Production session active with cryptographically verified token.'
                        : 'Dev/Demo mode: Switch between staff to verify data isolation.'}
                    </p>
                  </div>

                  {/* Development-only staff switcher list */}
                  {!isProduction && availableStaff.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {availableStaff.map((staff) => {
                        const isSelected = currentUser?.username === staff.username;
                        const isVance = staff.username === 'aris_vance';
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => handleSelectStaff(staff.username)}
                            className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-100'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-transparent'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isVance
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {staff.avatar_initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold truncate">{staff.full_name}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {staff.role}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                <span className="flex items-center gap-0.5">
                                  <Laptop className="w-3 h-3" /> Laptop
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Smartphone className="w-3 h-3" /> Mobile
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Current User Card in Production Mode */}
                  {isProduction && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 mb-2">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {currentUser?.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentUser?.email}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Dedicated Production Session
                      </div>
                    </div>
                  )}

                  {/* Server Logout Action */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 font-semibold text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out (Revoke Server Session)</span>
                    </button>
                  </div>

                  <div className="mt-2 px-2 py-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Row-level server authorization verified</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
