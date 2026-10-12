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
      color: 'rose',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200/80 dark:border-rose-900/60',
    },
    {
      title: 'AI Drafts Awaiting Review',
      value: pendingDraftsCount,
      subtitle: 'Human approval needed',
      icon: Sparkles,
      tab: 'drafts' as NavigationTab,
      color: 'indigo',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200/80 dark:border-indigo-900/60',
    },
    {
      title: "Today's Schedule",
      value: todayMeetingsCount,
      subtitle: 'Lectures & appointments',
      icon: Calendar,
      tab: 'calendar' as NavigationTab,
      color: 'sky',
      textColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40',
      borderColor: 'border-sky-200/80 dark:border-sky-900/60',
    },
    {
      title: 'Active Checklist',
      value: pendingTasksCount,
      subtitle: 'Pending deliverables',
      icon: CheckSquare,
      tab: 'tasks' as NavigationTab,
      color: 'emerald',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200/80 dark:border-emerald-900/60',
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
            className={`p-4 rounded-xl border ${card.borderColor} ${card.bgColor} text-left transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer group flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2 rounded-lg bg-white dark:bg-slate-900 shadow-xs ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <div className={`text-2xl font-black ${card.textColor} tracking-tight`}>
                {card.value}
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {card.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {card.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
