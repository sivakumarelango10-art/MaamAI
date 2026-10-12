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
        title="No correspondence found"
        description="Your faculty mailbox is currently clean. Connected Google Workspace messages will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-[#626875] mr-1 flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#3157E8] text-white shadow-2xs'
                : 'bg-white dark:bg-[#1A1D22] text-[#626875] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#262B33] hover:text-[#111111] dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#262B33] border border-[#E5E7EB] dark:border-[#262B33] rounded-xl overflow-hidden bg-white dark:bg-[#1A1D22] shadow-card">
        {filteredEmails.map((email) => {
          const isGeneratingThis = isGeneratingDraftId === email.id;

          return (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                !email.is_read
                  ? 'bg-[#EEF2FF]/40 dark:bg-[#16203D]/20 font-medium'
                  : 'hover:bg-[#F7F8FA] dark:hover:bg-[#13161A]'
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
                  title={email.is_read ? 'Mark unread' : 'Mark read'}
                  aria-label={email.is_read ? 'Mark unread' : 'Mark read'}
                  className="mt-1 p-1 rounded-md text-[#626875] hover:text-[#3157E8] transition-colors"
                >
                  {email.is_read ? (
                    <MailOpen className="w-4 h-4 text-[#9CA3AF]" />
                  ) : (
                    <Mail className="w-4 h-4 text-[#3157E8]" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#111111] dark:text-white truncate">
                      {email.sender_name}
                    </span>
                    <Badge variant={email.priority === 'high' ? 'high' : 'medium'} size="sm">
                      {email.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="cobalt" size="sm">
                      {email.category}
                    </Badge>
                    {email.has_draft && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3157E8] bg-[#EEF2FF] dark:bg-[#16203D] px-2 py-0.5 rounded-full border border-[#D0DBFA] dark:border-[#203264]">
                        <CheckCircle2 className="w-3 h-3 text-[#3157E8]" />
                        Draft Prepared
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-[#111111] dark:text-white truncate">
                    {email.subject}
                  </h4>
                  <p className="text-xs text-[#626875] dark:text-[#94A3B8] truncate leading-relaxed">
                    {email.snippet}
                  </p>
                </div>
              </div>

              {/* Right Column: Actions & Time */}
              <div className="flex items-center gap-2.5 sm:self-center flex-shrink-0">
                <div className="flex items-center gap-1 text-[11px] text-[#626875] dark:text-[#94A3B8]">
                  <Clock className="w-3 h-3" />
                  <span>{email.received_at}</span>
                </div>

                {!email.has_draft && (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isGeneratingThis}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateDraft(email.id);
                    }}
                    icon={<Sparkles className="w-3 h-3 text-[#3157E8]" />}
                    className="text-xs py-1 px-2.5"
                  >
                    Generate Draft
                  </Button>
                )}

                {email.has_draft && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDraft();
                    }}
                    className="text-xs py-1 px-2.5"
                  >
                    View Draft
                  </Button>
                )}

                <ChevronRight className="w-4 h-4 text-[#9CA3AF] hidden sm:block" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal View for Email Details */}
      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onToggleRead={onToggleRead}
        onGenerateDraft={onGenerateDraft}
        onViewDraft={onViewDraft}
        isGeneratingDraft={isGeneratingDraftId === selectedEmail?.id}
      />
    </div>
  );
};
