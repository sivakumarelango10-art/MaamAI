import React, { useState } from 'react';
import {
  Sparkles,
  Edit3,
  Save,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import type { AIDraftItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSkeleton, EmptyState } from '../ui/States';

interface DraftsReviewQueueProps {
  drafts: AIDraftItem[];
  isLoading: boolean;
  onApproveDraft: (id: number) => void;
  onRejectDraft: (id: number) => void;
  onUpdateDraft: (id: number, data: Partial<AIDraftItem>) => void;
  onSaveToGmail?: (id: number) => Promise<void>;
}

export const DraftsReviewQueue: React.FC<DraftsReviewQueueProps> = ({
  drafts,
  isLoading,
  onApproveDraft,
  onRejectDraft,
  onUpdateDraft,
  onSaveToGmail,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState<string>('');
  const [editedTone, setEditedTone] = useState<string>('');

  const filteredDrafts = drafts.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  const handleStartEdit = (draft: AIDraftItem) => {
    setEditingDraftId(draft.id);
    setEditedBody(draft.body);
    setEditedTone(draft.tone);
  };

  const handleSaveEdit = (id: number) => {
    onUpdateDraft(id, { body: editedBody, tone: editedTone });
    setEditingDraftId(null);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={3} height="h-32" />;
  }

  return (
    <div className="space-y-4">
      {/* Human Approval Safety Notice */}
      <div className="bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-brand-900 dark:text-brand-200">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
          <span>
            <strong>Human-in-the-Loop Safeguard:</strong> No email or communication is ever transmitted without your explicit review and one-click authorization.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilterStatus('pending_review')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === 'pending_review'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pending Review ({drafts.filter((d) => d.status === 'pending_review').length})
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === 'approved'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Approved ({drafts.filter((d) => d.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === 'rejected'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Discarded ({drafts.filter((d) => d.status === 'rejected').length})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === 'all'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({drafts.length})
        </button>
      </div>

      {filteredDrafts.length === 0 ? (
        <EmptyState
          title={`No ${filterStatus.replace('_', ' ')} drafts`}
          description="AI draft replies generated for student or faculty inquiries will queue here for authorization."
        />
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => {
            const isEditing = editingDraftId === draft.id;
            const isPending = draft.status === 'pending_review';

            return (
              <Card
                key={draft.id}
                className={`transition-all ${
                  isPending
                    ? 'border-brand-200 dark:border-brand-900/80 shadow-xs'
                    : 'opacity-90'
                }`}
              >
                <div className="space-y-4">
                  {/* Draft Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            draft.status === 'approved'
                              ? 'success'
                              : draft.status === 'rejected'
                              ? 'high'
                              : 'purple'
                          }
                        >
                          {draft.status === 'pending_review'
                            ? 'AWAITING APPROVAL'
                            : draft.status.toUpperCase()}
                        </Badge>
                        <Badge variant="blue">Tone: {draft.tone}</Badge>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {draft.confidence_score}% Confidence
                        </span>
                        <Badge variant="demo" size="sm">
                          {draft.demo_label}
                        </Badge>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                        Re: {draft.subject}
                      </h4>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Recipient: <strong>{draft.recipient}</strong></span>
                        <span className="mx-1">•</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{draft.created_at}</span>
                      </div>
                    </div>

                    {isPending && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(draft)}
                        icon={<Edit3 className="w-3.5 h-3.5" />}
                      >
                        Edit Draft
                      </Button>
                    )}
                  </div>

                  {/* Body Content or Edit Form */}
                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Response Tone:
                        </label>
                        <select
                          value={editedTone}
                          onChange={(e) => setEditedTone(e.target.value)}
                          className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white"
                        >
                          <option value="Professional & Academic">Professional & Academic</option>
                          <option value="Encouraging & Direct">Encouraging & Direct</option>
                          <option value="Warm & Concise">Warm & Concise</option>
                          <option value="Formal Committee">Formal Committee</option>
                        </select>
                      </div>

                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        rows={6}
                        className="w-full text-sm font-sans bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Draft response content..."
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDraftId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveEdit(draft.id)}
                          icon={<Save className="w-3.5 h-3.5" />}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                      {draft.body}
                    </div>
                  )}

                  {/* Actions for Pending Drafts */}
                  {isPending && !isEditing && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-slate-400 italic">
                        Authorizing will record faculty approval and stage for transmission.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onRejectDraft(draft.id)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Discard
                        </Button>
                        {onSaveToGmail && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSaveToGmail(draft.id)}
                            icon={<Sparkles className="w-3.5 h-3.5 text-brand-500" />}
                          >
                            Save to Gmail
                          </Button>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => onApproveDraft(draft.id)}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
