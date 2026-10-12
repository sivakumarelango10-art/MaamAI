import React from 'react';
import {
  X,
  Sparkles,
  Clock,
  User,
  CheckCircle,
} from 'lucide-react';
import type { EmailItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EmailDetailModalProps {
  email: EmailItem | null;
  onClose: () => void;
  onToggleRead: (id: number) => void;
  onGenerateDraft: (id: number) => void;
  onViewDraft: () => void;
  isGeneratingDraft: boolean;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  onClose,
  onToggleRead,
  onGenerateDraft,
  onViewDraft,
  isGeneratingDraft,
}) => {
  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1D22] rounded-2xl shadow-dropdown border border-[#E5E7EB] dark:border-[#262B33] overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] dark:border-[#262B33] flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={email.priority === 'high' ? 'high' : 'medium'}>
                {email.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="cobalt">{email.category}</Badge>
            </div>
            <h3 className="text-lg font-bold text-[#111111] dark:text-white pt-1">
              {email.subject}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#626875] hover:text-[#111111] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-[#13161A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sender details */}
        <div className="px-5 sm:px-6 py-3 bg-[#F7F8FA] dark:bg-[#13161A] border-b border-[#E5E7EB] dark:border-[#262B33] flex flex-wrap items-center justify-between gap-2 text-xs text-[#626875] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1E2228] border border-[#E5E7EB] dark:border-[#262B33] flex items-center justify-center font-bold text-[#111111] dark:text-white">
              <User className="w-3.5 h-3.5 text-[#3157E8]" />
            </div>
            <div>
              <span className="font-semibold text-[#111111] dark:text-white">
                {email.sender_name}
              </span>{' '}
              &lt;{email.sender_email}&gt;
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#626875] dark:text-[#94A3B8]">
            <Clock className="w-3.5 h-3.5" />
            <span>{email.received_at}</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm text-[#111111] dark:text-[#E2E8F0] whitespace-pre-line leading-relaxed font-sans">
          {email.body}
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-6 bg-[#F7F8FA] dark:bg-[#13161A] border-t border-[#E5E7EB] dark:border-[#262B33] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleRead(email.id)}
            >
              {email.is_read ? 'Mark as Unread' : 'Mark as Read'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {email.has_draft ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewDraft();
                }}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                View Pending AI Draft
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                isLoading={isGeneratingDraft}
                onClick={() => onGenerateDraft(email.id)}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Generate AI Reply Draft
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
