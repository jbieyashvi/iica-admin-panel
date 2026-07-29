import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Select, Textarea } from '../../components/ui/Field';
import { HIDE_REASONS } from '../../config/reviewLabels';

// Generic publish / restore confirmation.
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p className="text-sm text-charcoal">{description}</p>
    </Modal>
  );
}

// Hide with a required reason + confirmation.
export function HideReasonModal({
  open,
  title,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(HIDE_REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  if (open && !seen) { setSeen(true); setReason(HIDE_REASONS[0]); setNote(''); setError(null); }
  if (!open && seen) setSeen(false);
  const submit = () => {
    if (!reason) return setError('Select a reason.');
    const full = reason === 'Other' ? (note.trim() || 'Other') : note.trim() ? `${reason} — ${note.trim()}` : reason;
    if (reason === 'Other' && !note.trim()) return setError('Describe the reason.');
    onSubmit(full);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={title} description="Hiding removes public visibility but preserves the record."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Hide</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Reason" htmlFor="hr-reason" required>
          <Select id="hr-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {HIDE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Note" htmlFor="hr-note" required={reason === 'Other'} hint={reason === 'Other' ? undefined : 'Optional'}>
          <Textarea id="hr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context for this decision…" />
        </Field>
      </div>
    </Modal>
  );
}
