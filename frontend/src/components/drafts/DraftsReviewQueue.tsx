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
  const [savingGmailId, setSavingGmailId] = useState<number | null>(null);

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

  const handleSaveToGmailClick = async (id: number) => {
    if (!onSaveToGmail) return;
    setSavingGmailId(id);
    try {
      await onSaveToGmail(id);
    } finally {
      setSavingGmailId(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={3} height="h-32" />;
  }

  return (
    <div className="space-y-4">
      {/* Human Approval Safety Notice */}
      <div className="bg-cobalt-light border border-cobalt/20 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-cobalt">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 text-cobalt flex-shrink-0" />
          <span>
            <strong className="text-ink">Human-in-the-Loop Safeguard:</strong> No email or communication is ever transmitted without your explicit review and one-click authorization.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-line pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterStatus('pending_review')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
            filterStatus === 'pending_review'
              ? 'bg-ink text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-canvas'
          }`}
        >
          Pending Review ({drafts.filter((d) => d.status === 'pending_review').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
            filterStatus === 'approved'
              ? 'bg-ink text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-canvas'
          }`}
        >
          Approved ({drafts.filter((d) => d.status === 'approved').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
            filterStatus === 'rejected'
              ? 'bg-ink text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-canvas'
          }`}
        >
          Discarded ({drafts.filter((d) => d.status === 'rejected').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
            filterStatus === 'all'
              ? 'bg-ink text-white shadow-xs'
              : 'text-secondary hover:text-ink hover:bg-canvas'
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
                className={`transition-all duration-180 ${
                  isPending
                    ? 'border-line shadow-xs'
                    : 'opacity-90'
                }`}
              >
                <div className="space-y-4">
                  {/* Draft Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            draft.status === 'approved'
                              ? 'emerald'
                              : draft.status === 'rejected'
                              ? 'danger'
                              : 'cobalt'
                          }
                        >
                          {draft.status === 'pending_review'
                            ? 'AWAITING APPROVAL'
                            : draft.status.toUpperCase()}
                        </Badge>
                        <Badge variant="neutral">Tone: {draft.tone}</Badge>
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {draft.confidence_score}% Confidence
                        </span>
                        {draft.demo_label && (
                          <Badge variant="amber" size="sm">
                            {draft.demo_label}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-ink pt-1">
                        Re: {draft.subject}
                      </h4>
                      <div className="text-xs text-secondary flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-secondary" />
                        <span>Recipient: <strong className="text-ink">{draft.recipient}</strong></span>
                        <span className="mx-1 text-slate-300">•</span>
                        <Clock className="w-3.5 h-3.5 text-secondary" />
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
                    <div className="space-y-3 bg-canvas p-4 rounded-xl border border-line">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-ink">
                          Response Tone:
                        </label>
                        <select
                          value={editedTone}
                          onChange={(e) => setEditedTone(e.target.value)}
                          className="text-xs bg-white border border-line rounded-lg px-2.5 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
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
                        className="w-full text-sm font-sans bg-white border border-line rounded-xl p-3 text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
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
                    <div className="p-4 bg-canvas rounded-xl border border-line text-sm text-ink whitespace-pre-line leading-relaxed font-sans">
                      {draft.body}
                    </div>
                  )}

                  {/* Actions for Pending Drafts */}
                  {isPending && !isEditing && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-secondary italic">
                        Authorizing records faculty approval. Sending is never automatic.
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
                            isLoading={savingGmailId === draft.id}
                            onClick={() => handleSaveToGmailClick(draft.id)}
                            icon={<Sparkles className="w-3.5 h-3.5 text-cobalt" />}
                          >
                            Save to Gmail
                          </Button>
                        )}
                        <Button
                          variant="primary"
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
