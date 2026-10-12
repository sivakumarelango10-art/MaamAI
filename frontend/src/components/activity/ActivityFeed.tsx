import React from 'react';
import {
  CheckCircle,
  FileText,
  Calendar,
  Mail,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { ActivityLogItem } from '../../types';
import { Badge } from '../ui/Badge';
import { LoadingSkeleton, EmptyState } from '../ui/States';

interface ActivityFeedProps {
  activities: ActivityLogItem[];
  isLoading: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ai_draft':
      case 'drafts':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-sky-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-500" />;
      case 'auth':
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={4} height="h-16" />;
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity recorded"
        description="Actions taken in your workspace (approving drafts, updating events, logins) will be logged here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {activities.map((item) => (
          <div
            key={item.id}
            className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
              {getCategoryIcon(item.category)}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {item.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{item.timestamp}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.description}
              </p>

              <div className="pt-1">
                <Badge variant="neutral" size="sm">
                  {item.category.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
