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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={email.priority === 'high' ? 'high' : 'medium'}>
                {email.priority.toUpperCase()} PRIORITY
              </Badge>
              <Badge variant="purple">{email.category}</Badge>
              <Badge variant="demo">{email.demo_label}</Badge>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-1">
              {email.subject}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sender details */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {email.sender_name}
              </span>{' '}
              &lt;{email.sender_email}&gt;
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{email.received_at}</span>
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
          {email.body}
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                icon={<Sparkles className="w-4 h-4 text-amber-300" />}
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
