import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { requestEventChanges, hideEvent, cancelEvent } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { useData } from '../../data/store';
import { formatMoney } from '../../lib/format';
import type { EventRecord } from '../../types/events';

const FIELDS = ['Title', 'Description', 'Category', 'Format', 'Date & Time', 'Location', 'Tickets', 'Cover Image'];

export function EventRequestChangesModal({ event, onClose }: { event: EventRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [fields, setFields] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (event && event.id !== lastId) {
    setLastId(event.id);
    setFields([]);
    setMessage('');
    setNote('');
    setError(null);
  }
  if (!event) return null;

  const toggle = (f: string) => setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const submit = () => {
    if (fields.length === 0) return setError('Select at least one affected field.');
    if (!message.trim()) return setError('A message to the creator is required.');
    requestEventChanges(event.id, { fields, message: message.trim(), note: note.trim() || undefined }, actor);
    toast('Change request sent to creator.', 'info');
    onClose();
  };

  return (
    <Modal open={!!event} onClose={onClose} title="Request Changes" description="Ask the host to update event details." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send request</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-charcoal">Affected fields</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-lg border border-cream-200 px-2.5 py-1.5 text-sm text-charcoal">
                <input type="checkbox" checked={fields.includes(f)} onChange={() => toggle(f)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
                {f}
              </label>
            ))}
          </div>
        </div>
        <Field label="Message to creator" htmlFor="ev-msg" required><Textarea id="ev-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="Internal note" htmlFor="ev-note" hint="Admins only."><Input id="ev-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

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
