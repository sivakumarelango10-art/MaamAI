import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Quote,
  ArrowRight,
} from 'lucide-react';
import type { BriefingData } from '../../types';
import { Button } from '../ui/Button';

interface DailyBriefingPanelProps {
  briefing: BriefingData;
  onNavigateToInbox: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToDrafts: () => void;
}

export const DailyBriefingPanel: React.FC<DailyBriefingPanelProps> = ({
  briefing,
  onNavigateToInbox,
  onNavigateToCalendar,
  onNavigateToDrafts,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#1A1D22] text-[#111111] dark:text-[#F8F9FA] p-6 sm:p-8 shadow-card border border-[#E5E7EB] dark:border-[#262B33]">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FF] dark:bg-[#16203D] text-[#3157E8] dark:text-[#6085FA] border border-[#D0DBFA] dark:border-[#203264]">
              <Sparkles className="w-3.5 h-3.5" />
              Executive Morning Briefing
            </span>
            <span className="text-xs text-[#626875] dark:text-[#94A3B8] font-medium">
              {briefing.date}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] dark:text-white">
            {briefing.greeting}
          </h2>

          <p className="text-sm text-[#626875] dark:text-[#94A3B8] leading-relaxed font-normal">
            {briefing.summary}
          </p>

          {briefing.quote && (
            <div className="flex items-start gap-2 pt-1 text-xs text-[#626875] dark:text-[#94A3B8] italic border-l-2 border-[#3157E8] pl-3 py-0.5">
              <Quote className="w-3.5 h-3.5 text-[#3157E8] flex-shrink-0 mt-0.5" />
              <span>{briefing.quote}</span>
            </div>
          )}

          {/* Key Focus Points */}
          {briefing.key_focus && briefing.key_focus.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-2">
                Today's Core Priorities
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {briefing.key_focus.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-[#111111] dark:text-[#F8F9FA] bg-[#F7F8FA] dark:bg-[#13161A] rounded-lg px-3 py-2 border border-[#E5E7EB] dark:border-[#262B33]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16803D] flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick action stat badges */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0 justify-center">
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 bg-[#F7F8FA] dark:bg-[#13161A] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#262B33]">
            <button
              onClick={onNavigateToInbox}
              className="text-center p-2 rounded-lg hover:bg-white dark:hover:bg-[#1A1D22] transition-colors"
            >
              <div className="text-xl font-bold text-[#B45309]">
                {briefing.urgent_count}
              </div>
              <div className="text-[10px] text-[#626875] dark:text-[#94A3B8] uppercase font-semibold">
                Urgent
              </div>
            </button>
            <button
              onClick={onNavigateToCalendar}
              className="text-center p-2 rounded-lg hover:bg-white dark:hover:bg-[#1A1D22] transition-colors"
            >
              <div className="text-xl font-bold text-[#3157E8]">
                {briefing.meetings_count}
              </div>
              <div className="text-[10px] text-[#626875] dark:text-[#94A3B8] uppercase font-semibold">
                Syncs
              </div>
            </button>
            <button
              onClick={onNavigateToDrafts}
              className="text-center p-2 rounded-lg hover:bg-white dark:hover:bg-[#1A1D22] transition-colors"
            >
              <div className="text-xl font-bold text-[#16803D]">
                {briefing.tasks_count}
              </div>
              <div className="text-[10px] text-[#626875] dark:text-[#94A3B8] uppercase font-semibold">
                Tasks
              </div>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToDrafts}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Review AI Drafts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToInbox}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open Inbox
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
