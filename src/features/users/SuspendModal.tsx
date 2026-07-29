import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { suspendUser } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { UserRecord } from '../../types/users';

export function SuspendModal({
  user,
  open,
  onClose,
}: {
  user: UserRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason('');
    setNote('');
    setEndDate('');
    setNotify(true);
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!reason.trim()) {
      setError('A reason is required to suspend an account.');
      return;
    }
    if (!user) return;
    suspendUser(user.id, { reason: reason.trim(), note: note.trim() || undefined, endDate: endDate || null, notifyUser: notify }, actor);
    toast(`${user.name}'s account suspended.`, 'info');
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Suspend ${user?.name ?? 'account'}`}
      description="Suspension restricts access but never deletes the account or its data."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit}>
            Suspend Account
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <Field label="Reason" htmlFor="sus-reason" required>
          <Input
            id="sus-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Reported for policy violation"
          />
        </Field>
        <Field label="Internal note" htmlFor="sus-note" hint="Visible to admins only.">
          <Textarea
            id="sus-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Context for the team…"
          />
        </Field>
        <Field label="Suspension end date" htmlFor="sus-end" hint="Optional — leave blank for indefinite.">
          <Input id="sus-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30"
          />
          Notify user by email
        </label>
      </div>
    </Modal>
  );
}
