import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import {
  addOrderCommunication,
  advanceFulfilment,
  correctTracking,
  markOrderDelivered,
  openIssue,
  setIssueStatus,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { FULFILMENT_LABEL, ISSUE_TYPES, ISSUE_TYPE_LABEL } from '../../config/orderLabels';
import type { FulfilmentStatus, IssueRecord, IssueStatus, IssueType, ProductOrder } from '../../types/orders';

// ---- Contact buyer / seller -----------------------------------------------
export function ContactModal({ order, role, onClose }: { order: ProductOrder | null; role: 'buyer' | 'seller'; onClose: () => void }) {
  const { actor } = useActor();
  const [channel, setChannel] = useState<'Email' | 'Phone'>('Email');
  const [messageType, setMessageType] = useState('Order update');
  const [body, setBody] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);
  if (order && order.id !== lastId) { setLastId(order.id); setChannel('Email'); setMessageType('Order update'); setBody(''); }
  if (!order) return null;
  const recipient = role === 'buyer' ? order.buyerName : order.sellerName;
  const submit = () => {
    addOrderCommunication(order.id, { channel, recipient, messageType, body: body.trim() || undefined }, actor);
    toast(`Message to ${recipient} logged (prototype — no real ${channel.toLowerCase()} sent).`);
    onClose();
  };
  return (
    <Modal open={!!order} onClose={onClose} title={`Contact ${role === 'buyer' ? 'Buyer' : 'Seller'}`} description={`Prototype — logs a communication record. No real ${channel.toLowerCase()} is sent.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send & log</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Recipient" htmlFor="cm-to"><Input id="cm-to" value={recipient} readOnly /></Field>
          <Field label="Channel" htmlFor="cm-ch"><Select id="cm-ch" value={channel} onChange={(e) => setChannel(e.target.value as 'Email' | 'Phone')}><option>Email</option><option>Phone</option></Select></Field>
        </div>
        <Field label="Message type" htmlFor="cm-type"><Select id="cm-type" value={messageType} onChange={(e) => setMessageType(e.target.value)}>{['Order update', 'Delivery reminder', 'Issue follow-up', 'Refund update', 'General'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Message" htmlFor="cm-body"><Textarea id="cm-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Write to ${recipient}…`} /></Field>
      </div>
    </Modal>
  );
}

// ---- Advance fulfilment status --------------------------------------------
export function FulfilmentModal({ order, to, warn, onClose }: { order: ProductOrder | null; to: FulfilmentStatus | null; warn: boolean; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = order && to ? `${order.id}:${to}` : null;
  if (key !== lastKey) { setLastKey(key); setReason(''); setError(null); }
  if (!order || !to) return null;
  const requireReason = warn || to === 'delivered';
  const submit = () => {
    if (requireReason && !reason.trim()) return setError('A reason is required for this change.');
    if (to === 'delivered') markOrderDelivered(order.id, reason.trim() || 'Confirmed delivered', actor);
    else advanceFulfilment(order.id, to, actor, reason.trim() || undefined);
    toast(`Fulfilment updated to "${FULFILMENT_LABEL[to]}".`);
    onClose();
  };
  return (
    <Modal open={!!order} onClose={onClose} title={`Update fulfilment → ${FULFILMENT_LABEL[to]}`}
      description="Confirm this status change. It updates the order, product order counts and status history."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Confirm</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {warn && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">This skips one or more expected steps. Provide a reason before continuing.</p>
        </div>
      )}
      <Field label="Reason" htmlFor="fm-reason" required={requireReason} hint={requireReason ? undefined : 'Optional'}>
        <Input id="fm-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ---- Correct tracking ------------------------------------------------------
export function TrackingModal({ order, onClose }: { order: ProductOrder | null; onClose: () => void }) {
  const { actor } = useActor();
  const [courier, setCourier] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (order && order.id !== lastId) {
    setLastId(order.id);
    setCourier(order.shipment?.courier ?? '');
    setTrackingId(order.shipment?.trackingId ?? '');
    setTrackingUrl(order.shipment?.trackingUrl ?? '');
    setReason(''); setError(null);
  }
  if (!order) return null;
  const submit = () => {
    if (!reason.trim()) return setError('A reason is required to correct tracking.');
    correctTracking(order.id, { courier, trackingId, trackingUrl }, reason.trim(), actor);
    toast('Tracking details corrected.');
    onClose();
  };
  return (
    <Modal open={!!order} onClose={onClose} title="Correct Tracking Details" description="Correction is saved and added to Status History."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Save correction</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Courier" htmlFor="tk-c"><Input id="tk-c" value={courier} onChange={(e) => setCourier(e.target.value)} /></Field>
          <Field label="Tracking ID" htmlFor="tk-id"><Input id="tk-id" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} /></Field>
        </div>
        <Field label="Tracking URL" htmlFor="tk-url"><Input id="tk-url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} /></Field>
        <Field label="Reason" htmlFor="tk-reason" required><Input id="tk-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---- Open issue ------------------------------------------------------------
export function OpenIssueModal({ order, onClose }: { order: ProductOrder | null; onClose: () => void }) {
  const { actor } = useActor();
  const [type, setType] = useState<IssueType>('refund');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (order && order.id !== lastId) { setLastId(order.id); setType('refund'); setReason(''); setError(null); }
  if (!order) return null;
  const submit = () => {
    if (!reason.trim()) return setError('Describe the issue.');
    openIssue(order.id, { type, reason: reason.trim() }, actor);
    toast('Issue opened.');
    onClose();
  };
  return (
    <Modal open={!!order} onClose={onClose} title="Open Issue / Request" description="Log a buyer or seller issue against this order."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Open issue</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Request type" htmlFor="oi-type"><Select id="oi-type" value={type} onChange={(e) => setType(e.target.value as IssueType)}>{ISSUE_TYPES.map((t) => <option key={t} value={t}>{ISSUE_TYPE_LABEL[t]}</option>)}</Select></Field>
        <Field label="Reason / description" htmlFor="oi-reason" required><Textarea id="oi-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---- Issue decision --------------------------------------------------------
export interface DecisionSpec { action: string; statusAfter: IssueStatus; requireReason: boolean; danger?: boolean }

export function IssueDecisionModal({ order, issue, decision, onClose }: { order: ProductOrder | null; issue: IssueRecord | null; decision: DecisionSpec | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = order && issue && decision ? `${order.id}:${issue.id}:${decision.action}` : null;
  if (key !== lastKey) { setLastKey(key); setReason(''); setError(null); }
  if (!order || !issue || !decision) return null;
  const submit = () => {
    if (decision.requireReason && !reason.trim()) return setError('A decision reason is required.');
    setIssueStatus(order.id, issue.id, decision.action, decision.statusAfter, actor, reason.trim() || undefined);
    toast(`${decision.action}.`);
    onClose();
  };
  return (
    <Modal open={!!decision} onClose={onClose} title={decision.action} description="This decision is recorded in the case history."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={decision.danger ? 'danger' : 'primary'} onClick={submit}>Confirm</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {decision.statusAfter === 'approved' && (
        <p className="mb-3 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Approving does not refund automatically. Approved refunds move separately to <span className="font-medium text-charcoal">Sent to Finance</span>.</p>
      )}
      <Field label="Decision reason" htmlFor="id-reason" required={decision.requireReason} hint={decision.requireReason ? undefined : 'Optional'}>
        <Textarea id="id-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
