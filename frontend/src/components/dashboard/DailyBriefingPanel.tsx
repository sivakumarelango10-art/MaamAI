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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-brand-800/40">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-brand-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Automated Morning Executive Briefing
            </span>
            <span className="text-xs text-brand-200/80 font-medium">
              {briefing.date}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            {briefing.greeting}
          </h2>

          <p className="text-sm text-slate-200 leading-relaxed font-normal">
            {briefing.summary}
          </p>

          {briefing.quote && (
            <div className="flex items-start gap-2 pt-1 text-xs text-brand-200/90 italic">
              <Quote className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
              <span>{briefing.quote}</span>
            </div>
          )}

          {/* Key Focus Points */}
          {briefing.key_focus && briefing.key_focus.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-brand-300 uppercase tracking-wider mb-2">
                Today's Core Priorities
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {briefing.key_focus.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-slate-200 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick action stat badges */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0 justify-center">
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 bg-black/20 p-3 rounded-xl border border-white/10">
            <button
              onClick={onNavigateToInbox}
              className="text-center p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="text-lg font-black text-amber-300">
                {briefing.urgent_count}
              </div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold">
                Urgent
              </div>
            </button>
            <button
              onClick={onNavigateToCalendar}
              className="text-center p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="text-lg font-black text-sky-300">
                {briefing.meetings_count}
              </div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold">
                Syncs
              </div>
            </button>
            <button
              onClick={onNavigateToDrafts}
              className="text-center p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="text-lg font-black text-emerald-300">
                {briefing.tasks_count}
              </div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold">
                Tasks
              </div>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToDrafts}
              className="bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs border border-brand-400/30"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Review AI Drafts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToInbox}
              className="text-xs text-white/90 hover:bg-white/10 border border-white/10"
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
