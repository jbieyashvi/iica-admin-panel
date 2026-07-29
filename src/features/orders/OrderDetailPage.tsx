import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeft,
  Mail,
  Package,
  Phone,
  Store,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Textarea } from '../../components/ui/Field';
import { PaymentStatusBadge, FulfilmentBadge, IssueStatusBadge, OrderStatusBadge } from '../../components/ui/OrderBadges';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import {
  ContactModal,
  FulfilmentModal,
  TrackingModal,
  OpenIssueModal,
  IssueDecisionModal,
} from './OrderModals';
import type { DecisionSpec } from './OrderModals';
import { useData, addOrderCommunication, addOrderNote } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime, formatMoney, priceLabel } from '../../lib/format';
import { PRODUCT_TYPE_LABEL, COMMISSION_RATE, COMMISSION_NOTE } from '../../config/productLabels';
import { BUYER_TYPE_LABEL, ISSUE_TYPE_LABEL, flowFor, FULFILMENT_LABEL } from '../../config/orderLabels';
import type { FulfilmentStatus, IssueRecord } from '../../types/orders';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'payment', label: 'Payment' },
  { key: 'fulfilment', label: 'Fulfilment' },
  { key: 'communication', label: 'Communication' },
  { key: 'issues', label: 'Issues & Requests' },
  { key: 'history', label: 'Status History' },
];

const OWNER: Record<FulfilmentStatus, { owner: string; next: string }> = {
  awaiting_acceptance: { owner: 'Seller', next: 'Seller accepts the order' },
  accepted: { owner: 'Seller', next: 'Seller prepares delivery' },
  preparing: { owner: 'Seller', next: 'Seller dispatches the item' },
  dispatched: { owner: 'Courier', next: 'Package in transit' },
  in_transit: { owner: 'Courier', next: 'Delivery to buyer' },
  awaiting_delivery: { owner: 'Seller', next: 'Seller sends delivery / link' },
  delivery_sent: { owner: 'Buyer', next: 'Buyer confirms access' },
  buyer_confirmed: { owner: 'Admin', next: 'Mark order completed' },
  delivered: { owner: '—', next: 'Order complete' },
  completed: { owner: '—', next: 'None' },
  delivery_disputed: { owner: 'Admin', next: 'Resolve the dispute' },
  return_requested: { owner: 'Admin', next: 'Review return request' },
  return_approved: { owner: 'Seller', next: 'Process the return' },
  returned: { owner: '—', next: 'None' },
  delivery_failed: { owner: 'Admin', next: 'Re-attempt or resolve' },
};

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-charcoal">{title}</h3>{action}</div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('overview');
  const { productOrders, memberships } = useData();
  const { abilities, actor } = useActor();

  const order = productOrders.find((o) => o.id === orderId);
  const membership = memberships.find((m) => m.userId === order?.sellerUserId);

  const [contactRole, setContactRole] = useState<'buyer' | 'seller' | null>(null);
  const [fulfilTo, setFulfilTo] = useState<{ to: FulfilmentStatus; warn: boolean } | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [decision, setDecision] = useState<{ issue: IssueRecord; spec: DecisionSpec } | null>(null);
  const [note, setNote] = useState('');

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/orders';

  if (!order) {
    return (
      <div>
        <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link>
        <div className="card"><EmptyState title="Order not found" description="This order may have been removed." /></div>
      </div>
    );
  }

  const canManage = abilities.manageProducts;
  const isGuest = order.buyerType === 'guest';
  const commissionRate = COMMISSION_RATE[order.productType];
  const commission = Math.round(order.total * commissionRate);
  const earnings = order.total - commission;
  const flow = flowFor(order.productType);
  const curIdx = flow.indexOf(order.fulfilmentStatus);
  const remaining = curIdx >= 0 ? flow.slice(curIdx + 1) : [];
  const ownerInfo = OWNER[order.fulfilmentStatus];

  const remind = (what: string) => {
    addOrderCommunication(order.id, { channel: 'Email', recipient: order.sellerName, messageType: 'Delivery reminder', body: what }, actor);
    toast('Reminder logged to seller.');
  };
  const submitNote = () => {
    if (!note.trim()) return;
    addOrderNote(order.id, note.trim(), actor);
    toast('Note added.');
    setNote('');
  };

  const decisionBtn = (issue: IssueRecord, label: string, spec: DecisionSpec, disabled = false) => (
    <Button key={label} size="sm" variant={spec.danger ? 'danger' : 'secondary'} disabled={!canManage || disabled} title={canManage ? '' : RESTRICTED_HINT} onClick={() => setDecision({ issue, spec })}>{label}</Button>
  );

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Orders</button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-charcoal">Order {order.id.replace('ord_', '#')}</h1>
              <PaymentStatusBadge status={order.paymentStatus} />
              <FulfilmentBadge status={order.fulfilmentStatus} />
              {isGuest && <Badge tone="neutral">Guest</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{order.productTitle}</span>
              <span>Buyer: {order.buyerName}</span>
              <span>Seller: {order.sellerName}</span>
              <span>{formatDate(order.orderedAt)}</span>
              <span className="font-medium text-charcoal">{priceLabel(order.total)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => setContactRole('buyer')} disabled={isGuest && !order.buyerEmail}>Contact Buyer</Button>
            <Button variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => setContactRole('seller')}>Contact Seller</Button>
            <Button icon={<AlertOctagon className="h-4 w-4" />} onClick={() => setIssueOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Open Issue</Button>
          </div>
        </div>
      </div>

      <div className="mb-5"><Tabs tabs={TABS.map((t) => (t.key === 'issues' ? { ...t, count: order.issues.length || undefined } : t))} active={tab} onChange={setTab} /></div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Order Summary">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream-100 text-charcoal-muted"><Package className="h-5 w-5" /></span>
              <div>
                <p className="font-medium text-charcoal">{order.productTitle}</p>
                <p className="text-xs text-charcoal-muted">{PRODUCT_TYPE_LABEL[order.productType]}</p>
              </div>
            </div>
            <Row label="Quantity">{order.quantity}</Row>
            <Row label="Price per item">{priceLabel(order.unitPrice)}</Row>
            <Row label="Order total">{priceLabel(order.total)}</Row>
            <Row label="Buyer type">{BUYER_TYPE_LABEL[order.buyerType]}</Row>
            <Row label="Order status">{<OrderStatusBadge status={order.orderStatus} />}</Row>
            <Row label="Payment status">{<PaymentStatusBadge status={order.paymentStatus} />}</Row>
            <Row label="Fulfilment status">{<FulfilmentBadge status={order.fulfilmentStatus} />}</Row>
            <Row label="Current action owner">{ownerInfo.owner}</Row>
            <Row label="Next expected action">{ownerInfo.next}</Row>
          </Card>
          <Card title="Order Timeline"><MembershipTimeline events={order.timeline} /></Card>
        </div>
      )}

      {/* BUYER */}
      {tab === 'buyer' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Buyer" action={<Button size="sm" variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => setContactRole('buyer')}>Contact Buyer</Button>}>
            {isGuest && <div className="mb-3 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-sm"><span className="font-medium text-charcoal">Guest Purchase</span> · order reference {order.id}</div>}
            <Row label="Buyer name">{order.buyerName}</Row>
            <Row label="Buyer type">{BUYER_TYPE_LABEL[order.buyerType]}</Row>
            <Row label="Email">{order.buyerEmail}</Row>
            <Row label="Phone">{order.buyerPhone}</Row>
            <Row label="Account ID">{order.buyerUserId ?? (isGuest ? 'Guest — no account' : '—')}</Row>
            <Row label="Billing">{order.billing ?? '—'}</Row>
            {!isGuest && order.buyerUserId && (
              <button onClick={() => navigate(`/admin/users/${order.buyerUserId}`)} className="mt-3 text-xs font-medium text-magenta-600 hover:text-magenta-700">Open buyer account →</button>
            )}
          </Card>
          {order.productType === 'physical' && order.shipment && (
            <Card title="Shipping Address">
              <Row label="Recipient">{order.shipment.recipient}</Row>
              <Row label="Phone">{order.shipment.phone}</Row>
              <Row label="Address">{order.shipment.address}</Row>
              <Row label="City">{order.shipment.city}</Row>
              <Row label="State">{order.shipment.state}</Row>
              <Row label="PIN">{order.shipment.pin}</Row>
              <Row label="Country">{order.shipment.country}</Row>
              <Row label="Delivery notes">{order.shipment.deliveryNotes}</Row>
            </Card>
          )}
        </div>
      )}

      {/* SELLER */}
      {tab === 'seller' && (
        <Card title="Seller" action={<Button size="sm" variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => setContactRole('seller')}>Contact Seller</Button>}>
          <div className="mb-3 flex items-center gap-3"><Avatar name={order.sellerName} size="lg" /><div><p className="font-medium text-charcoal">{order.sellerName}</p><p className="text-xs text-charcoal-muted">{order.sellerIicaId ?? '—'}</p></div></div>
          <Row label="IICA ID">{order.sellerIicaId ?? '—'}</Row>
          <Row label="Membership category">{membership?.category ?? '—'}</Row>
          <Row label="Membership status">{membership?.membershipStatus ?? '—'}</Row>
          <Row label="Email">{membership?.form.email ?? '—'}</Row>
          <Row label="Phone">{membership?.form.phone ?? '—'}</Row>
          <Row label="Seller response">{order.orderStatus === 'new' ? 'Awaiting acceptance' : 'Accepted'}</Row>
          <Row label="Acceptance date">{formatDate(order.sellerAcceptedAt)}</Row>
          <button onClick={() => navigate(`/admin/users/${order.sellerUserId}`)} className="mt-3 text-xs font-medium text-magenta-600 hover:text-magenta-700">Open Seller Profile →</button>
        </Card>
      )}

      {/* PAYMENT */}
      {tab === 'payment' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Payment">
            <Row label="Subtotal">{formatMoney(order.subtotal, '₹')}</Row>
            <Row label="Discount">{order.discount ? `– ${formatMoney(order.discount, '₹')}` : '—'}</Row>
            <Row label="Tax">{order.tax ? formatMoney(order.tax, '₹') : '—'}</Row>
            <Row label="Shipping">{order.shippingFee ? formatMoney(order.shippingFee, '₹') : '—'}</Row>
            <Row label="Total">{priceLabel(order.total)}</Row>
            <Row label="Currency">{order.currency}</Row>
            <Row label="Payment reference">{order.paymentRef ?? '—'}</Row>
            <Row label="Payment status">{<PaymentStatusBadge status={order.paymentStatus} />}</Row>
            <Row label="Payment date">{formatDate(order.paymentDate)}</Row>
          </Card>
          <div className="space-y-6">
            <Card title="Commission & Earnings">
              <Row label="Platform commission">{order.total === 0 ? '—' : formatMoney(commission, '₹')}</Row>
              <Row label="Estimated seller earnings">{order.total === 0 ? 'Free' : formatMoney(earnings, '₹')}</Row>
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {order.productType === 'masterclass' ? '20% — Proposed, pending final approval' : COMMISSION_NOTE[order.productType].replace('provisional', 'Provisional')}
              </div>
              <p className="mt-2 text-xs text-charcoal-muted">Regional pricing policy pending final decision.</p>
              <p className="mt-1 text-xs text-charcoal-muted">Payment records are read-only.</p>
            </Card>
            {order.refundHistory.length > 0 && (
              <Card title="Refund History">
                <ul className="space-y-2">
                  {order.refundHistory.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-charcoal">{formatMoney(r.amount, '₹')} · {formatDate(r.at)}</span>
                      <Badge tone={r.status === 'Completed' ? 'green' : 'amber'}>{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* FULFILMENT */}
      {tab === 'fulfilment' && (
        <div className="space-y-6">
          <Card title="Fulfilment">
            {order.productType === 'physical' && order.shipment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Row label="Recipient">{order.shipment.recipient}</Row>
                  <Row label="Phone">{order.shipment.phone}</Row>
                  <Row label="Address">{order.shipment.address}, {order.shipment.city}</Row>
                  <Row label="Delivery notes">{order.shipment.deliveryNotes}</Row>
                </div>
                <div>
                  <Row label="Courier">{order.shipment.courier ?? '—'}</Row>
                  <Row label="Tracking ID">{order.shipment.trackingId ?? '—'}</Row>
                  <Row label="Dispatched">{formatDate(order.shipment.dispatchedAt)}</Row>
                  <Row label="Est. delivery">{formatDate(order.shipment.estimatedDeliveryAt)}</Row>
                  <Row label="Delivered">{formatDate(order.shipment.deliveredAt)}</Row>
                </div>
              </div>
            )}
            {order.productType === 'digital' && order.digital && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Row label="Seller accepted">{formatDate(order.sellerAcceptedAt)}</Row>
                  <Row label="Delivery method">Email</Row>
                  <Row label="Buyer email">{order.digital.buyerEmail}</Row>
                  <Row label="Expected delivery">{formatDate(order.digital.expectedDeliveryAt)}</Row>
                </div>
                <div>
                  <Row label="Seller delivery confirmation">{order.digital.deliverySentAt ? 'Reported sent' : 'Not yet'}</Row>
                  <Row label="Delivery sent">{formatDateTime(order.digital.deliverySentAt)}</Row>
                  <Row label="Evidence / reference">{order.digital.evidenceNote ?? '—'}</Row>
                  <Row label="Buyer access confirmed">{order.digital.buyerAccessConfirmed ? 'Yes' : 'No'}</Row>
                  <Row label="Dispute status">{order.digital.disputeStatus ?? '—'}</Row>
                </div>
              </div>
            )}
            {order.productType === 'masterclass' && order.masterclass && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Row label="Session date">{formatDate(order.masterclass.sessionAt)}</Row>
                  <Row label="Start time">{formatDateTime(order.masterclass.sessionAt).split(', ')[1]}</Row>
                  <Row label="Timezone">{order.masterclass.timezone}</Row>
                  <Row label="Duration">{order.masterclass.durationMins} mins</Row>
                  <Row label="Delivery mode">{order.masterclass.deliveryMode}</Row>
                </div>
                <div>
                  <Row label="Seller accepted">{formatDate(order.sellerAcceptedAt)}</Row>
                  <Row label="Joining-link status">{order.masterclass.linkSentAt ? 'Reported sent' : 'Pending'}</Row>
                  <Row label="Link sent">{formatDateTime(order.masterclass.linkSentAt)}</Row>
                  <Row label="Buyer access confirmed">{order.masterclass.buyerAccessConfirmed ? 'Yes' : 'No'}</Row>
                  <Row label="Attendance">{order.masterclass.attendance ?? '—'}</Row>
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-charcoal-muted">
              {order.productType === 'digital' ? 'The seller emails the digital file directly to the buyer. "Delivery Sent by Seller" does not confirm the buyer received or accessed it.'
                : order.productType === 'masterclass' ? 'The seller emails the joining link to the buyer. Link delivery does not confirm access.'
                : 'The seller dispatches the item; shipping is required.'}
            </p>
          </Card>

          {/* Actions */}
          <Card title="Fulfilment Actions">
            <div className="flex flex-wrap gap-2">
              {order.productType === 'physical' && (
                <>
                  {order.shipment?.trackingUrl && <Button size="sm" variant="secondary" icon={<Truck className="h-4 w-4" />} onClick={() => window.open(order.shipment!.trackingUrl!, '_blank', 'noopener,noreferrer')}>View Tracking</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setTrackingOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Correct Tracking Details</Button>
                  {order.fulfilmentStatus === 'return_requested' && <Button size="sm" variant="secondary" onClick={() => setFulfilTo({ to: 'return_approved', warn: false })} disabled={!canManage}>Review Return Request</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setIssueOpen(true)} disabled={!canManage}>Escalate Delivery Issue</Button>
                </>
              )}
              {order.productType === 'digital' && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => remind('Please deliver the digital file to the buyer.')} disabled={!canManage}>Remind Seller to Deliver</Button>
                  <Button size="sm" variant="secondary" onClick={() => setFulfilTo({ to: 'delivery_sent', warn: false })} disabled={!canManage}>Mark Seller Delivery Reported</Button>
                  <Button size="sm" variant="secondary" onClick={() => setFulfilTo({ to: 'buyer_confirmed', warn: false })} disabled={!canManage}>Confirm Buyer Access</Button>
                </>
              )}
              {order.productType === 'masterclass' && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => remind('Please send the joining link to the buyer.')} disabled={!canManage}>Remind Seller to Send Link</Button>
                  <Button size="sm" variant="secondary" onClick={() => setFulfilTo({ to: 'delivery_sent', warn: false })} disabled={!canManage}>Mark Link Delivery Reported</Button>
                  <Button size="sm" variant="secondary" onClick={() => setFulfilTo({ to: 'buyer_confirmed', warn: false })} disabled={!canManage}>Confirm Buyer Access</Button>
                </>
              )}
              <Button size="sm" variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => setContactRole('buyer')} disabled={isGuest && !order.buyerEmail}>Contact Buyer</Button>
              <Button size="sm" variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => setContactRole('seller')}>Contact Seller</Button>
            </div>

            {remaining.length > 0 && (
              <div className="mt-4 border-t border-cream-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Advance status</p>
                <div className="flex flex-wrap gap-2">
                  {remaining.map((s, i) => (
                    <Button key={s} size="sm" variant={i === 0 ? 'primary' : 'secondary'} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={() => setFulfilTo({ to: s, warn: i > 0 })}>
                      → {FULFILMENT_LABEL[s]}
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-charcoal-muted">Skipping a step requires a reason.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* COMMUNICATION */}
      {tab === 'communication' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Communication Log" action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => setContactRole('buyer')}>Contact Buyer</Button>
                <Button size="sm" variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => setContactRole('seller')}>Contact Seller</Button>
              </div>
            }>
              {order.communications.length === 0 ? <p className="text-sm text-charcoal-muted">No communications yet.</p> : (
                <ul className="space-y-3">
                  {order.communications.map((c) => (
                    <li key={c.id} className="rounded-lg border border-cream-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-charcoal">{c.channel === 'Email' ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}{c.messageType}</span>
                        <span className="text-xs text-charcoal-muted">{formatDateTime(c.at)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-charcoal-muted">{c.sender} → {c.recipient} · {c.deliveryStatus}</p>
                      {c.body && <p className="mt-1 text-sm text-charcoal">{c.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card title="Internal Notes">
            {abilities.addNotes && (
              <div className="mb-3">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
                <div className="mt-2 flex justify-end"><Button size="sm" onClick={submitNote} disabled={!note.trim()}>Add note</Button></div>
              </div>
            )}
            {order.notes.length === 0 ? <p className="text-sm text-charcoal-muted">No notes.</p> : (
              <ul className="space-y-2">{order.notes.map((n) => (<li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-2.5"><p className="text-sm text-charcoal">{n.body}</p><p className="mt-0.5 text-xs text-charcoal-muted">{n.author} · {formatDateTime(n.at)}</p></li>))}</ul>
            )}
          </Card>
        </div>
      )}

      {/* ISSUES */}
      {tab === 'issues' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button icon={<AlertOctagon className="h-4 w-4" />} onClick={() => setIssueOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Open Issue</Button>
          </div>
          {order.issues.length === 0 ? (
            <div className="card"><EmptyState title="No issues or requests" description="This order has no open cases." /></div>
          ) : (
            order.issues.map((issue) => (
              <div key={issue.id} className="card p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><Badge tone="magenta">{ISSUE_TYPE_LABEL[issue.type]}</Badge><IssueStatusBadge status={issue.status} /></div>
                  <span className="text-xs text-charcoal-muted">Opened {formatDate(issue.createdAt)} · {issue.assignedAdmin ?? 'Unassigned'}</span>
                </div>
                <Row label="Buyer reason">{issue.buyerReason}</Row>
                <Row label="Seller response">{issue.sellerResponse ?? '—'}</Row>
                <Row label="Evidence">{issue.evidence.length ? issue.evidence.map((_, i) => <Badge key={i} tone="neutral" className="ml-1">Evidence {i + 1}</Badge>) : '—'}</Row>
                {issue.decisions.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Decision history</p>
                    <ul className="space-y-1.5">
                      {issue.decisions.map((d) => (
                        <li key={d.id} className="text-xs text-charcoal-muted">{d.action} · {d.by} · {formatDate(d.at)}{d.reason ? ` · ${d.reason}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-cream-200 pt-3">
                  {decisionBtn(issue, 'Request Buyer Information', { action: 'Requested buyer information', statusAfter: 'waiting_buyer', requireReason: false })}
                  {decisionBtn(issue, 'Request Seller Response', { action: 'Requested seller response', statusAfter: 'waiting_seller', requireReason: false })}
                  {decisionBtn(issue, 'Approve Request', { action: 'Approved request', statusAfter: 'approved', requireReason: true })}
                  {decisionBtn(issue, 'Reject Request', { action: 'Rejected request', statusAfter: 'rejected', requireReason: true, danger: true })}
                  {decisionBtn(issue, 'Send to Finance', { action: 'Sent to Finance', statusAfter: 'sent_to_finance', requireReason: false }, issue.status !== 'approved')}
                  {decisionBtn(issue, 'Close Case', { action: 'Closed case', statusAfter: 'closed', requireReason: false })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* STATUS HISTORY */}
      {tab === 'history' && (
        <Card title="Status History"><MembershipTimeline events={order.timeline} /></Card>
      )}

      {/* Modals */}
      <ContactModal order={contactRole ? order : null} role={contactRole ?? 'buyer'} onClose={() => setContactRole(null)} />
      <FulfilmentModal order={fulfilTo ? order : null} to={fulfilTo?.to ?? null} warn={fulfilTo?.warn ?? false} onClose={() => setFulfilTo(null)} />
      <TrackingModal order={trackingOpen ? order : null} onClose={() => setTrackingOpen(false)} />
      <OpenIssueModal order={issueOpen ? order : null} onClose={() => setIssueOpen(false)} />
      <IssueDecisionModal order={decision ? order : null} issue={decision?.issue ?? null} decision={decision?.spec ?? null} onClose={() => setDecision(null)} />
    </div>
  );
}
