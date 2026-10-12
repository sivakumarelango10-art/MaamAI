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
    calendar: 'Academic Schedule',
    tasks: 'Actionable Deliverables',
    activity: 'Audit & Activity Log',
    settings: 'Workspace Settings',
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#13161A]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#262B33] px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-[#626875] hover:text-[#111111] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-[#1A1D22] focus:outline-none focus:ring-2 focus:ring-[#3157E8]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <img
            src="/logo.png"
            alt="Ma’amAI"
            className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-xs border border-[#E5E7EB] dark:border-[#262B33] md:hidden flex-shrink-0"
          />

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#111111] dark:text-white truncate flex items-center gap-2">
              <span>{tabTitles[activeTab]}</span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FF] dark:bg-[#16203D] text-[#3157E8] dark:text-[#6085FA] border border-[#D0DBFA] dark:border-[#203264]">
                <Sparkles className="w-3 h-3" />
                Verified Staff Workspace
              </span>
            </h1>
            <p className="text-xs text-[#626875] dark:text-[#94A3B8] hidden sm:block truncate">
              {currentUser?.full_name} • {currentUser?.email}
            </p>
          </div>
        </div>

        {/* Right: Actions, Health, Google Status, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Supabase Database Health indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F7F8FA] dark:bg-[#1A1D22] text-[#626875] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#262B33]"
            title={`Database: ${health?.database || 'Supabase PostgreSQL'} (${health?.status || 'Active'})`}
          >
            <Database className="w-3 h-3 text-[#16803D]" />
            <span className="w-2 h-2 rounded-full bg-[#16803D]" />
            <span className="text-[11px] font-medium hidden md:inline">
              Supabase DB
            </span>
          </div>

          {/* Google Workspace Connection status indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: oauthStatus?.is_connected ? '#F0FDF4' : '#FFFBEB',
              borderColor: oauthStatus?.is_connected ? '#BBF7D0' : '#FDE68A',
              color: oauthStatus?.is_connected ? '#16803D' : '#B45309',
            }}
            title={
              oauthStatus?.is_connected
                ? `Google Connected: ${oauthStatus.email_account || 'Active'}`
                : 'Google Disconnected'
            }
          >
            {oauthStatus?.is_connected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden lg:inline">Google Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden lg:inline">Google Offline</span>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 rounded-lg text-[#626875] hover:text-[#111111] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-[#1A1D22] border border-[#E5E7EB] dark:border-[#262B33] focus:outline-none focus:ring-2 focus:ring-[#3157E8]"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* User Avatar Initials */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB] dark:border-[#262B33]">
            <div className="w-8 h-8 rounded-full bg-[#3157E8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser?.avatar_initials || 'ST'}
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign out of Ma'amAI"
              className="p-1.5 rounded-lg text-[#626875] hover:text-[#B91C1C] dark:text-[#94A3B8] dark:hover:text-rose-400 hover:bg-[#FEF2F2] dark:hover:bg-[#3D1414]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
