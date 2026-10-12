import React, { useState } from 'react';
import {
  Mail,
  MailOpen,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { EmailItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSkeleton, EmptyState } from '../ui/States';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailListProps {
  emails: EmailItem[];
  isLoading: boolean;
  onToggleRead: (id: number) => void;
  onGenerateDraft: (emailId: number) => void;
  onViewDraft: () => void;
  isGeneratingDraftId: number | null;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  isLoading,
  onToggleRead,
  onGenerateDraft,
  onViewDraft,
  isGeneratingDraftId,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', 'Student Inquiries', 'Department', 'Research', 'Grants'];

  const filteredEmails = emails.filter((e) => {
    if (categoryFilter === 'All') return true;
    return e.category === categoryFilter;
  });

  if (isLoading) {
    return <LoadingSkeleton rows={4} height="h-20" />;
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No emails found"
        description="Your faculty mailbox is currently clean. Demo emails will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        {filteredEmails.map((email) => {
          const isGeneratingThis = isGeneratingDraftId === email.id;

          return (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                !email.is_read
                  ? 'bg-brand-50/30 dark:bg-brand-950/20 font-medium'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Left Column: Read marker & Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRead(email.id);
                  }}
                  className="mt-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-shrink-0"
                  title={email.is_read ? 'Mark unread' : 'Mark read'}
                >
                  {email.is_read ? (
                    <MailOpen className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Mail className="w-4 h-4 text-brand-600 dark:text-brand-400 font-bold" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {email.sender_name}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      • {email.sender_email}
                    </span>
                    <Badge
                      variant={email.priority === 'high' ? 'high' : 'medium'}
                      size="sm"
                    >
                      {email.priority}
                    </Badge>
                    <Badge variant="purple" size="sm">
                      {email.category}
                    </Badge>
                    <Badge variant="demo" size="sm">
                      {email.demo_label}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {email.subject}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {email.snippet}
                  </p>
                </div>
              </div>

              {/* Right Column: Time & Quick Action */}
              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {email.received_at}
                </span>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {email.has_draft ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDraft()}
                      className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Draft Ready
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={isGeneratingThis}
                      onClick={() => onGenerateDraft(email.id)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                      icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    >
                      AI Reply
                    </Button>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onToggleRead={(id) => {
            onToggleRead(id);
            setSelectedEmail((prev) => (prev ? { ...prev, is_read: !prev.is_read } : null));
          }}
          onGenerateDraft={(id) => {
            onGenerateDraft(id);
            setSelectedEmail((prev) => (prev ? { ...prev, has_draft: true } : null));
          }}
          onViewDraft={onViewDraft}
          isGeneratingDraft={isGeneratingDraftId === selectedEmail.id}
        />
      )}
    </div>
  );
};
