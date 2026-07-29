import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Select, Textarea } from '../../components/ui/Field';
import { DELETE_REASONS } from '../../config/reviewLabels';
import type { ReviewRecord } from '../../types/reviews';

// Delete a review with a required reason + confirmation. Shows reviewer +
// related item. Removes only the review, never any connected record.
export function DeleteReviewModal({
  review,
  onSubmit,
  onClose,
}: {
  review: ReviewRecord | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(DELETE_REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seenId, setSeenId] = useState<string | null>(null);
  if (review && review.id !== seenId) { setSeenId(review.id); setReason(DELETE_REASONS[0]); setNote(''); setError(null); }
  if (!review) return null;
  const submit = () => {
    if (reason === 'Other' && !note.trim()) return setError('Provide a short reason.');
    const full = reason === 'Other' ? note.trim() : note.trim() ? `${reason} — ${note.trim()}` : reason;
    onSubmit(full);
    onClose();
  };
  return (
    <Modal open={!!review} onClose={onClose} title="Delete Review" description="This permanently removes the review from the admin table and the connected mobile screen."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Delete Review</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">Deletes only this review. The reviewer account, product, creator, event and order/booking records are not affected.</p>
      </div>
      <div className="mb-4 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-sm">
        <p className="text-charcoal"><span className="text-charcoal-muted">Reviewer:</span> {review.reviewerName}</p>
        <p className="text-charcoal"><span className="text-charcoal-muted">Related item:</span> {review.targetName}</p>
      </div>
      <div className="space-y-4">
        <Field label="Deletion reason" htmlFor="dr-reason" required>
          <Select id="dr-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {DELETE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Note" htmlFor="dr-note" required={reason === 'Other'} hint={reason === 'Other' ? undefined : 'Optional'}>
          <Textarea id="dr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context for this deletion…" />
        </Field>
      </div>
    </Modal>
  );
}
