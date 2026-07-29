import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Package, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge, FulfilmentBadge, OrderStatusBadge } from '../../components/ui/OrderBadges';
import { useData } from '../../data/store';
import { buildTransactions } from '../../data/transactions';
import { formatDate, formatMoney, priceLabel } from '../../lib/format';
import { PRODUCT_TYPE_LABEL, COMMISSION_RATE, COMMISSION_NOTE } from '../../config/productLabels';
import { BUYER_TYPE_LABEL } from '../../config/orderLabels';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'payment', label: 'Payment' },
];
const VALID_TABS = new Set(TABS.map((t) => t.key));

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card p-5"><h3 className="mb-2 text-sm font-semibold text-charcoal">{title}</h3>{children}</div>;
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
  const data = useData();
  const { productOrders, memberships } = data;

  // Accept only the four valid tabs; any old removed tab in the URL → Overview.
  const urlTab = new URLSearchParams(location.search).get('tab');
  const [tab, setTab] = useState(urlTab && VALID_TABS.has(urlTab) ? urlTab : 'overview');

  const order = productOrders.find((o) => o.id === orderId);
  const membership = memberships.find((m) => m.userId === order?.sellerUserId);

  // Connected transaction (derived) — used for payment method + a valid link.
  const txn = useMemo(
    () => (order ? buildTransactions(data).find((t) => t.product?.orderId === order.id) : undefined),
    [data, order],
  );

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/orders';

  if (!order) {
    return (
      <div>
        <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Orders</Link>
        <div className="card"><EmptyState title="Order not found" description="This order may have been removed." /></div>
      </div>
    );
  }

  const isGuest = order.buyerType === 'guest';
  const isFree = order.total === 0;
  const commission = Math.round(order.total * COMMISSION_RATE[order.productType]);
  const earnings = order.total - commission;

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Orders</button>

      {/* Header — identity + read-only status only, no actions */}
      <div className="card mb-6 p-5">
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

      <div className="mb-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <Card title="Order Summary">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-cream-100 text-charcoal-muted"><Package className="h-6 w-6" /></span>
            <div>
              <p className="font-medium text-charcoal">{order.productTitle}</p>
              <p className="text-xs text-charcoal-muted">{PRODUCT_TYPE_LABEL[order.productType]}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            <div>
              <Row label="Product type">{PRODUCT_TYPE_LABEL[order.productType]}</Row>
              <Row label="Quantity">{order.quantity}</Row>
              <Row label="Price per item">{priceLabel(order.unitPrice)}</Row>
              <Row label="Order total">{priceLabel(order.total)}</Row>
              <Row label="Buyer type">{BUYER_TYPE_LABEL[order.buyerType]}</Row>
            </div>
            <div>
              <Row label="Order date">{formatDate(order.orderedAt)}</Row>
              <Row label="Order status">{<OrderStatusBadge status={order.orderStatus} />}</Row>
              <Row label="Payment status">{<PaymentStatusBadge status={order.paymentStatus} />}</Row>
              <Row label="Fulfilment status">{<FulfilmentBadge status={order.fulfilmentStatus} />}</Row>
            </div>
          </div>
        </Card>
      )}

      {/* BUYER */}
      {tab === 'buyer' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Buyer">
            {isGuest && <div className="mb-3 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-sm"><span className="font-medium text-charcoal">Guest Purchase</span> · order reference {order.id}</div>}
            <Row label="Buyer name">{order.buyerName}</Row>
            <Row label="Buyer type">{BUYER_TYPE_LABEL[order.buyerType]}</Row>
            <Row label="Email">{order.buyerEmail}</Row>
            <Row label="Phone">{order.buyerPhone}</Row>
            {!isGuest && <Row label="Account ID">{order.buyerUserId ?? '—'}</Row>}
            <Row label="Billing">{order.billing ?? '—'}</Row>
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
        <Card title="Seller">
          <div className="mb-3 flex items-center gap-3"><Avatar name={order.sellerName} size="lg" /><div><p className="font-medium text-charcoal">{order.sellerName}</p><p className="text-xs text-charcoal-muted">{order.sellerIicaId ?? '—'}</p></div></div>
          <Row label="IICA ID">{order.sellerIicaId ?? '—'}</Row>
          <Row label="Membership category">{membership?.category ?? '—'}</Row>
          <Row label="Membership status">{membership?.membershipStatus ?? '—'}</Row>
          <Row label="Email">{membership?.form.email ?? '—'}</Row>
          <Row label="Phone">{membership?.form.phone ?? '—'}</Row>
          {order.sellerAcceptedAt && <Row label="Seller acceptance date">{formatDate(order.sellerAcceptedAt)}</Row>}
          <div className="mt-3">
            <Button size="sm" variant="secondary" icon={<Store className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${order.sellerUserId}`)}>Open Seller Profile</Button>
          </div>
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
            <Row label="Payment method">{txn?.paymentMethod ?? '—'}</Row>
            <Row label="Payment status">{<PaymentStatusBadge status={order.paymentStatus} />}</Row>
            <Row label="Payment date">{formatDate(order.paymentDate)}</Row>
          </Card>
          <div className="space-y-6">
            <Card title="Commission & Earnings">
              <Row label="Platform commission">{isFree ? '—' : formatMoney(commission, '₹')}</Row>
              <Row label="Seller earnings">{isFree ? 'Free' : formatMoney(earnings, '₹')}</Row>
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {order.productType === 'masterclass' ? '20% — Proposed, pending final approval' : COMMISSION_NOTE[order.productType].replace('provisional', 'Provisional')}
              </div>
              <p className="mt-2 text-xs text-charcoal-muted">Payment records are read-only.</p>
            </Card>
            {txn && (
              <Card title="Connected Transaction">
                <Row label="Transaction">{txn.id}</Row>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/transactions/${txn.id}`)}>Open Transaction</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
