import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FolderOpen, Lock, Store, User as UserIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge } from '../../components/ui/OrderBadges';
import { useData } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { buildTransactions } from '../../data/transactions';
import { formatINR, formatDate, formatDateTime } from '../../lib/format';
import { PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import { SOURCE_LABEL, SOURCE_TONE } from '../../config/transactionLabels';
import type { Transaction } from '../../types/transactions';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'payment', label: 'Payment Breakdown' },
  { key: 'related', label: 'Related Record' },
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card p-5"><h3 className="mb-2 text-sm font-semibold text-charcoal">{title}</h3>{children}</div>;
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-200 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}
const BUYER_LABEL = { guest: 'Guest', registered: 'Registered User', creator: 'Creator' } as const;

export function TransactionDetailPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const data = useData();
  const { abilities } = useActor();
  const [tab, setTab] = useState('overview');

  const txn: Transaction | undefined = useMemo(() => buildTransactions(data).find((t) => t.id === transactionId), [data, transactionId]);
  const back = (location.state as { from?: string } | null)?.from ?? '/admin/transactions';
  const fin = abilities.txnFinancials;

  if (!abilities.txnView) {
    return <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Your role does not have access to the Transactions module." /></div>;
  }
  if (!txn) {
    return (
      <div>
        <Link to="/admin/transactions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Transactions</Link>
        <div className="card"><EmptyState title="Transaction not found" description="This transaction reference could not be resolved." /></div>
      </div>
    );
  }

  const refunded = txn.refundedAmount > 0;

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Transactions</button>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-medium text-charcoal">{txn.id}</h1>
          <Badge tone={SOURCE_TONE[txn.source]}>{SOURCE_LABEL[txn.source]}</Badge>
          <PaymentStatusBadge status={txn.status} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
          <span>{txn.buyerName}</span>
          <span>{formatDateTime(txn.date)}</span>
          <span className="font-medium text-charcoal">{formatINR(txn.gross)}</span>
        </div>
      </div>

      <div className="mb-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Transaction">
            <Row label="Transaction ID">{txn.id}</Row>
            <Row label="Source">{SOURCE_LABEL[txn.source]}</Row>
            <Row label="Date & time">{formatDateTime(txn.date)}</Row>
            <Row label="Payment status">{<PaymentStatusBadge status={txn.status} />}</Row>
            <Row label="Currency">{txn.currency}</Row>
            <Row label="Gross amount">{formatINR(txn.gross)}</Row>
            <Row label="Payment method">{txn.paymentMethod} · {txn.paymentMasked}</Row>
            <Row label="Payment reference">{fin ? txn.paymentRef : 'Restricted'}</Row>
            <Row label="Connected reference">{txn.refSub}</Row>
          </Card>
          <Card title="Buyer">
            <Row label="Name">{txn.buyerName}{txn.buyerType === 'guest' && <Badge tone="neutral" className="ml-2">Guest</Badge>}</Row>
            <Row label="Buyer type">{BUYER_LABEL[txn.buyerType]}</Row>
            <Row label="Email">{txn.email ?? '—'}</Row>
            <Row label="Phone">{txn.phone ?? '—'}</Row>
            {txn.source === 'membership' && txn.membership && (
              <>
                <Row label="IICA ID">{txn.membership.iicaId ?? '—'}</Row>
                <Row label="Membership category">{txn.membership.category ?? '—'}</Row>
                <Row label="Membership plan">{txn.membership.plan}</Row>
                <Row label="Purchase platform">{txn.membership.platform}</Row>
                <Row label="Start date">{formatDate(txn.membership.startDate)}</Row>
                <Row label="Renewal / expiry">{formatDate(txn.membership.renewalDate)}</Row>
              </>
            )}
            {txn.source === 'product' && txn.product && (
              <>
                <Row label="Product">{txn.product.productTitle}</Row>
                <Row label="Product type">{PRODUCT_TYPE_LABEL[txn.product.productType]}</Row>
                <Row label="Quantity">{txn.product.quantity}</Row>
                <Row label="Seller">{txn.product.sellerName}</Row>
                <Row label="Order ID">{txn.product.orderId}</Row>
              </>
            )}
            {txn.source === 'event' && txn.event && (
              <>
                <Row label="Event">{txn.event.eventTitle}</Row>
                <Row label="Ticket tier">{txn.event.tier}</Row>
                <Row label="Quantity">{txn.event.quantity}</Row>
                <Row label="Event host">{txn.event.hostName}</Row>
                <Row label="Booking / order ID">{txn.event.bookingId}</Row>
              </>
            )}
          </Card>
        </div>
      )}

      {/* PAYMENT BREAKDOWN */}
      {tab === 'payment' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Amounts">
            <Row label="Item / base amount">{formatINR(txn.base)}</Row>
            <Row label="Discount">{txn.discount ? `– ${formatINR(txn.discount)}` : '—'}</Row>
            <Row label="Tax / fees">{txn.tax ? formatINR(txn.tax) : '—'}</Row>
            {txn.source === 'product' && txn.product?.productType === 'physical' && <Row label="Shipping">{txn.shipping ? formatINR(txn.shipping) : '—'}</Row>}
            <Row label="Gross amount">{formatINR(txn.gross)}</Row>
            {refunded && <Row label="Refunded amount">– {formatINR(txn.refundedAmount)}</Row>}
            <Row label="Net collected">{formatINR(txn.netCollected)}</Row>
            <Row label="Currency">{txn.currency}</Row>
          </Card>
          <div className="space-y-6">
            <Card title={txn.source === 'membership' ? 'Platform Revenue' : 'Commission & Earnings'}>
              {txn.source === 'membership' ? (
                <>
                  <Row label="Gross amount">{formatINR(txn.gross)}</Row>
                  <Row label="Tax / fees">{txn.tax ? formatINR(txn.tax) : '—'}</Row>
                  <Row label="Net platform revenue">{formatINR(txn.netCollected)}</Row>
                </>
              ) : fin ? (
                <>
                  <Row label="Platform commission">{formatINR(txn.commission)}</Row>
                  <Row label={txn.source === 'product' ? 'Seller earnings' : 'Host earnings'}>{formatINR(txn.earnings)}</Row>
                  <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">{Math.round(txn.commissionRate * 100)}% — {txn.commissionLabel}</div>
                </>
              ) : (
                <p className="text-sm text-charcoal-muted">Commission breakdown is restricted for your role.</p>
              )}
              <p className="mt-2 text-xs text-charcoal-muted">Regional pricing policy pending final decision.</p>
              <p className="mt-1 text-xs text-charcoal-muted">Payment records are read-only.</p>
            </Card>
            {refunded && (
              <Card title="Refund">
                <Row label="Original paid amount">{formatINR(txn.gross)}</Row>
                <Row label="Refunded amount">{formatINR(txn.refundedAmount)}</Row>
                <Row label="Remaining amount">{formatINR(txn.netCollected)}</Row>
                {fin && <Row label="Refund reference">{txn.refundRef ?? '—'}</Row>}
                <Row label="Refund completed">{formatDate(txn.refundCompletedAt)}</Row>
                <p className="mt-2 text-xs text-charcoal-muted">Refunds are view-only here. Only explicitly completed refunds are shown.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* RELATED RECORD */}
      {tab === 'related' && (
        <Card title="Related Record">
          <p className="mb-3 text-sm text-charcoal-muted">Open the connected record in its own module.</p>
          <div className="flex flex-wrap gap-2">
            {txn.source === 'membership' && txn.membership && (
              <>
                <Button variant="secondary" icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${txn.membership!.userId}`)}>Open User Details</Button>
                <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${txn.membership!.userId}?tab=membership`)}>Open Membership</Button>
              </>
            )}
            {txn.source === 'product' && txn.product && (
              <>
                <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/orders/${txn.product!.orderId}`)}>Open Order</Button>
                <Button variant="secondary" icon={<FolderOpen className="h-4 w-4" />} onClick={() => navigate(`/admin/products/${txn.product!.productId}`)}>Open Product</Button>
                <Button variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${txn.product!.sellerUserId}`)}>Open Seller Profile</Button>
              </>
            )}
            {txn.source === 'event' && txn.event && (
              <>
                <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/events/${txn.event!.eventId}`)}>Open Event</Button>
                <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/events/${txn.event!.eventId}?tab=orders`)}>Open Booking</Button>
                {txn.buyerType !== 'guest' && txn.buyerUserId && (
                  <Button variant="secondary" icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${txn.buyerUserId}`)}>Open Buyer</Button>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
