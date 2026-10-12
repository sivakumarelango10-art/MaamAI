import React from 'react';
import { Mail, Sparkles, Calendar, CheckSquare, ArrowUpRight } from 'lucide-react';
import type { NavigationTab } from '../../types';

interface OverviewStatsProps {
  urgentEmailsCount: number;
  pendingDraftsCount: number;
  todayMeetingsCount: number;
  pendingTasksCount: number;
  onSelectTab: (tab: NavigationTab) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  urgentEmailsCount,
  pendingDraftsCount,
  todayMeetingsCount,
  pendingTasksCount,
  onSelectTab,
}) => {
  const cards = [
    {
      title: 'Urgent Emails',
      value: urgentEmailsCount,
      subtitle: 'Unread high priority',
      icon: Mail,
      tab: 'inbox' as NavigationTab,
      badgeColor: 'text-[#B91C1C] bg-[#FEF2F2] dark:bg-[#3D1414] dark:text-[#FCA5A5]',
      accentColor: 'text-[#B91C1C]',
    },
    {
      title: 'AI Drafts Pending',
      value: pendingDraftsCount,
      subtitle: 'Human approval needed',
      icon: Sparkles,
      tab: 'drafts' as NavigationTab,
      badgeColor: 'text-[#3157E8] bg-[#EEF2FF] dark:bg-[#16203D] dark:text-[#6085FA]',
      accentColor: 'text-[#3157E8]',
    },
    {
      title: 'Today’s Schedule',
      value: todayMeetingsCount,
      subtitle: 'Lectures and meetings',
      icon: Calendar,
      tab: 'calendar' as NavigationTab,
      badgeColor: 'text-[#111111] dark:text-white bg-[#F7F8FA] dark:bg-[#22262B]',
      accentColor: 'text-[#111111] dark:text-white',
    },
    {
      title: 'Active Checklist',
      value: pendingTasksCount,
      subtitle: 'Pending deliverables',
      icon: CheckSquare,
      tab: 'tasks' as NavigationTab,
      badgeColor: 'text-[#16803D] bg-[#F0FDF4] dark:bg-[#0E2E19] dark:text-[#86EFAC]',
      accentColor: 'text-[#16803D]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.title}
            type="button"
            onClick={() => onSelectTab(card.tab)}
            className="p-5 rounded-xl border border-[#E5E7EB] dark:border-[#262B33] bg-white dark:bg-[#1A1D22] text-left transition-all duration-180 hover:shadow-hover hover:border-[#D0DBFA] dark:hover:border-[#3157E8]/40 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2.5 rounded-lg ${card.badgeColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#626875] group-hover:text-[#3157E8] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${card.accentColor}`}>
                {card.value}
              </div>
              <div className="text-xs font-semibold text-[#111111] dark:text-[#F8F9FA] mt-1">
                {card.title}
              </div>
              <div className="text-[11px] text-[#626875] dark:text-[#94A3B8]">
                {card.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
