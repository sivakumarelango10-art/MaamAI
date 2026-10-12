import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { NavigationTab, HealthStatus, OAuthStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';

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
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  useEffect(() => {
    api.getOAuthStatus().then(setOauthStatus).catch(() => {});
  }, []);

  const tabTitles: Record<NavigationTab, string> = {
    overview: 'Faculty Executive Overview',
    inbox: 'Inbox & Correspondence',
    drafts: 'AI Draft Approval Queue',
    calendar: 'Academic Calendar & Schedule',
    tasks: 'Actionable Deliverables',
    activity: 'Audit & Activity Log',
    settings: 'Faculty Workspace Settings',
  };

  const handleLogout = async () => {
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

          <img
            src="/logo.png"
            alt="Ma’amAI"
            className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700 md:hidden flex-shrink-0"
          />

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
              <span>{tabTitles[activeTab]}</span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                <Sparkles className="w-3 h-3" />
                Verified Staff Workspace
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              {currentUser?.full_name} • {currentUser?.email}
            </p>
          </div>
        </div>

        {/* Right: Actions, Health, Google Status, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Supabase Database Health indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            title={`Database: ${health?.database || 'Supabase PostgreSQL'} (${health?.status || 'Active'})`}
          >
            <Database className="w-3 h-3 text-emerald-500" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium hidden md:inline">
              Supabase DB
            </span>
          </div>

          {/* Google Workspace Connection status indicator */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              oauthStatus?.is_connected
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
            title={
              oauthStatus?.is_connected
                ? `Google Workspace Connected (${oauthStatus.email_account})`
                : 'Google Workspace Disconnected'
            }
          >
            {oauthStatus?.is_connected ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-500" />
            )}
            <span className="text-[11px] font-medium">
              {oauthStatus?.is_connected ? 'Google Connected' : 'Google Disconnected'}
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

          {/* Staff User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-brand-500/30">
              {currentUser?.picture_url ? (
                <img
                  src={currentUser.picture_url}
                  alt={currentUser.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.avatar_initials || 'ST'
              )}
            </div>

            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {currentUser?.full_name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {currentUser?.role}
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 ml-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
