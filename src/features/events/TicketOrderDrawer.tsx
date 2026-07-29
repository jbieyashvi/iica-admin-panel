import { useState } from 'react';
import { Ban, CheckSquare, Download, Mail, Printer, RefreshCcw, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input } from '../../components/ui/Field';
import { PaymentBadge, BookingBadge } from '../../components/ui/EventBadges';
import { checkInOrder, cancelBooking, initiateRefundReview, logOrderAction } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDateTime, formatDate, formatMoney, priceLabel } from '../../lib/format';
import { CHECKIN_LABEL } from '../../config/eventLabels';
import type { EventRecord, TicketOrder } from '../../types/events';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

function printTicket(order: TicketOrder, event?: EventRecord) {
  const w = window.open('', '_blank', 'width=420,height=640');
  if (!w) return;
  const rows = order.ticketIds.map((t) => `<div style="border:1px dashed #C2186B;border-radius:10px;padding:12px;margin:8px 0"><div style="font:600 13px sans-serif;color:#211E1D">${event?.title ?? 'IICA Event'}</div><div style="font:12px sans-serif;color:#6b6560">${event ? new Date(event.startAt).toLocaleString('en-IN') : ''}</div><div style="font:600 14px monospace;color:#C2186B;margin-top:6px">${t}</div><div style="font:12px sans-serif;color:#6b6560">${order.buyerName} · ${order.tierName} · ${order.total === 0 ? 'Free' : '₹' + order.total}</div></div>`).join('');
  w.document.write(`<html><head><title>Ticket ${order.id}</title></head><body style="font-family:sans-serif;padding:16px;background:#FAF8F5"><h2 style="font-family:Georgia,serif;color:#211E1D">IICA Ticket</h2><p style="color:#6b6560;font-size:12px">Order ${order.id}</p>${rows}<p style="color:#6b6560;font-size:11px;margin-top:16px">Prototype ticket — present at entry for check-in.</p></body></html>`);
  w.document.close();
}

export function TicketOrderDrawer({ order, event, onClose }: { order: TicketOrder | null; event?: EventRecord; onClose: () => void }) {
  const { actor, abilities } = useActor();
  const [mode, setMode] = useState<'none' | 'cancel' | 'refund'>('none');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(0);
  const [lastId, setLastId] = useState<string | null>(null);

  if (order && order.id !== lastId) {
    setLastId(order.id);
    setMode('none');
    setReason('');
    setAmount(order.total);
  }
  if (!order) return null;

  const paid = order.total > 0;

  return (
    <Drawer open={!!order} onClose={onClose} title="Ticket Order" description={order.id} width="md">
      <div className="space-y-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-charcoal">{event?.title ?? 'Event'}</p>
          <p className="text-xs text-charcoal-muted">{event ? formatDateTime(event.startAt) : ''}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <PaymentBadge status={order.paymentStatus} />
            <BookingBadge status={order.bookingStatus} />
            <Badge tone={order.checkInStatus === 'checked_in' ? 'blue' : 'neutral'}>{CHECKIN_LABEL[order.checkInStatus]}</Badge>
          </div>
        </div>

        <div className="card p-4">
          <Row label="Buyer">{order.buyerName}</Row>
          <Row label="Type">{order.guest ? <Badge tone="neutral">Guest</Badge> : <Badge tone="blue">Registered</Badge>}</Row>
          <Row label="Email">{order.buyerEmail}</Row>
          <Row label="Phone">{order.buyerPhone}</Row>
          <Row label="Ticket tier">{order.tierName}</Row>
          <Row label="Quantity">{order.quantity}</Row>
          <Row label="Subtotal">{paid ? formatMoney(order.subtotal, '₹') : 'Free'}</Row>
          <Row label="Taxes & fees">{paid ? formatMoney(order.taxes, '₹') : '—'}</Row>
          <Row label="Total paid">{paid ? formatMoney(order.total, '₹') : priceLabel(0)}</Row>
          <Row label="Booking date">{formatDate(order.bookingDate)}</Row>
          <Row label="Event date">{event ? formatDate(event.startAt) : '—'}</Row>
        </div>

        <div className="card p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Ticket IDs</p>
          <div className="flex flex-wrap gap-1.5">
            {order.ticketIds.map((t) => <span key={t} className="rounded-md bg-cream-100 px-2 py-0.5 font-mono text-xs text-charcoal">{t}</span>)}
          </div>
        </div>

        {order.refundHistory.length > 0 && (
          <div className="card p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Refund history</p>
            <ul className="space-y-2">
              {order.refundHistory.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal">{formatMoney(r.amount, '₹')}</span>
                    <Badge tone={r.status === 'completed' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-charcoal-muted">{r.by} · {formatDate(r.at)} · {r.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Actions</p>
          {mode === 'cancel' ? (
            <div className="space-y-2">
              <Field label="Cancellation reason" htmlFor="oc-reason" required><Input id="oc-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => { if (reason.trim()) { cancelBooking(order.id, reason.trim(), actor); toast('Booking cancelled.', 'info'); setMode('none'); } }}>Confirm cancel</Button>
                <Button size="sm" variant="ghost" onClick={() => setMode('none')}>Back</Button>
              </div>
            </div>
          ) : mode === 'refund' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Amount ₹" htmlFor="or-amt"><Input id="or-amt" type="number" min={0} max={order.total} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
                <Field label="Reason" htmlFor="or-reason"><Input id="or-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              </div>
              <p className="text-xs text-amber-700">Recorded as a refund <span className="font-medium">request</span> — never auto-completed.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (reason.trim()) { initiateRefundReview(order.id, amount, reason.trim(), actor); toast('Refund review initiated.', 'info'); setMode('none'); } }}>Submit for review</Button>
                <Button size="sm" variant="ghost" onClick={() => setMode('none')}>Back</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" icon={<Mail className="h-4 w-4" />} disabled={!abilities.resendTickets} title={abilities.resendTickets ? '' : RESTRICTED_HINT} onClick={() => { logOrderAction(order.id, 'Ticket resent to buyer', actor); toast('Ticket resent (simulated).'); }}>Resend</Button>
              <Button size="sm" variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => { printTicket(order, event); logOrderAction(order.id, 'Ticket downloaded', actor); }}>Download</Button>
              <Button size="sm" variant="secondary" icon={<Wallet className="h-4 w-4" />} disabled={!abilities.viewOrders} onClick={() => { logOrderAction(order.id, 'Viewed payment record', actor); toast(paid ? `Payment: ${order.paymentStatus}` : 'Free booking — no payment.', 'info'); }}>View Payment</Button>
              <Button size="sm" variant="secondary" icon={<CheckSquare className="h-4 w-4" />} disabled={!abilities.manageTickets || order.checkInStatus === 'checked_in'} title={abilities.manageTickets ? '' : RESTRICTED_HINT} onClick={() => { checkInOrder(order.id, actor); toast('Marked checked in.'); }}>Check In</Button>
              <Button size="sm" variant="secondary" icon={<Ban className="h-4 w-4" />} disabled={!abilities.manageTickets || order.bookingStatus === 'cancelled'} title={abilities.manageTickets ? '' : RESTRICTED_HINT} onClick={() => setMode('cancel')}>Cancel Booking</Button>
              <Button size="sm" variant="secondary" icon={<RefreshCcw className="h-4 w-4" />} disabled={!abilities.refundReview || !paid} title={!abilities.refundReview ? RESTRICTED_HINT : !paid ? 'Free booking — no refund.' : ''} onClick={() => setMode('refund')}>Refund Review</Button>
              <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4 rotate-180" />} disabled={!abilities.contactBuyer} title={abilities.contactBuyer ? '' : RESTRICTED_HINT} onClick={() => { logOrderAction(order.id, 'Contacted buyer', actor); toast('Buyer contacted (simulated).'); }}>Contact Buyer</Button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
