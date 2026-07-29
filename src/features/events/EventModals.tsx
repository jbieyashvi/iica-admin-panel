import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { hideEvent, cancelEvent } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { useData } from '../../data/store';
import { formatMoney } from '../../lib/format';
import type { EventRecord } from '../../types/events';

export function EventHideModal({ event, onClose }: { event: EventRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (event && event.id !== lastId) { setLastId(event.id); setReason(''); setError(null); }
  if (!event) return null;
  const submit = () => {
    if (!reason.trim()) return setError('A reason is required.');
    hideEvent(event.id, reason.trim(), actor);
    toast('Event hidden. Records preserved.', 'info');
    onClose();
  };
  return (
    <Modal open={!!event} onClose={onClose} title="Hide event" description="Removes public visibility. Event and ticket records are preserved."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Hide event</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Reason" htmlFor="ev-hide" required><Input id="ev-hide" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

export function EventCancelModal({ event, onClose }: { event: EventRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const { orders, eventSettings } = useData();
  const [reason, setReason] = useState(eventSettings.cancellationReasons[0]);
  const [confirm, setConfirm] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (event && event.id !== lastId) { setLastId(event.id); setReason(eventSettings.cancellationReasons[0]); setConfirm(false); }
  if (!event) return null;

  const evOrders = orders.filter((o) => o.eventId === event.id && o.bookingStatus !== 'cancelled');
  const ticketsSold = evOrders.reduce((s, o) => s + o.quantity, 0);
  const attendees = evOrders.length;
  const gross = evOrders.reduce((s, o) => s + o.total, 0);
  const refunds = evOrders.filter((o) => o.paymentStatus === 'paid' && o.total > 0).reduce((s, o) => s + o.total, 0);

  const submit = () => {
    if (!confirm) return;
    cancelEvent(event.id, reason, actor);
    toast('Event cancelled. Refunds are NOT auto-completed — review required.', 'info');
    onClose();
  };

  return (
    <Modal open={!!event} onClose={onClose} title={`Cancel "${event.title}"?`} description="Cancelling never marks refunds completed automatically." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Keep event</Button><Button variant="danger" onClick={submit} disabled={!confirm}>Cancel event</Button></>}>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Tickets sold', value: ticketsSold },
          { label: 'Attendees affected', value: attendees },
          { label: 'Gross sales', value: formatMoney(gross, '₹') },
          { label: 'Refunds required', value: formatMoney(refunds, '₹') },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-cream-200 bg-cream-100/50 p-3">
            <p className="font-serif text-lg font-medium text-charcoal">{s.value}</p>
            <p className="text-xs text-charcoal-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">Refunds are recorded as <span className="font-medium">required</span> and must be processed through the refund-review flow. This action does not move money.</p>
      </div>
      <Field label="Cancellation reason" htmlFor="ev-cancel-reason" required>
        <Select id="ev-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {eventSettings.cancellationReasons.map((r) => <option key={r}>{r}</option>)}
        </Select>
      </Field>
      <label className="mt-3 flex items-center gap-2.5 text-sm text-charcoal">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
        I understand attendees will be notified and refunds must be reviewed.
      </label>
    </Modal>
  );
}
