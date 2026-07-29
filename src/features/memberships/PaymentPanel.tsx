import type { ReactNode } from 'react';
import { Receipt } from 'lucide-react';
import type { MembershipRecord } from '../../types/users';
import { Badge } from '../../components/ui/Badge';
import { PurchaseStatusBadge } from '../../components/ui/StatusBadge';
import { PURCHASE_PLATFORM_LABEL } from '../../config/userLabels';
import { formatDate, formatMoney } from '../../lib/format';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

// Payment information. Never renders any external checkout / payment URL.
export function PaymentPanel({ membership }: { membership: MembershipRecord }) {
  const p = membership.payment;
  const symbol = p.currency === 'INR' ? '₹' : p.currency === 'GBP' ? '£' : '$';

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-charcoal-muted" />
        <h3 className="text-sm font-semibold text-charcoal">Payment Information</h3>
        <Badge tone="neutral">{PURCHASE_PLATFORM_LABEL[p.platform]}</Badge>
      </div>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <div>
          <Row label="Purchase platform">{PURCHASE_PLATFORM_LABEL[p.platform]}</Row>
          <Row label="Transaction / reference">{p.transactionRef ?? '—'}</Row>
          <Row label="Product / SKU">{p.sku ?? '—'}</Row>
          <Row label="Region">{p.region}</Row>
          <Row label="Currency">{p.currency}</Row>
        </div>
        <div>
          <Row label="Purchase amount">{formatMoney(p.amount, symbol)}</Row>
          <Row label="Purchase date">{formatDate(p.purchaseDate)}</Row>
          <Row label="Purchase status">{<PurchaseStatusBadge status={p.purchaseStatus} />}</Row>
          <Row label="Receipt">
            {p.receiptStatus === 'available' ? (
              <Badge tone="green">Available</Badge>
            ) : p.receiptStatus === 'pending' ? (
              <Badge tone="amber">Pending</Badge>
            ) : (
              <Badge tone="neutral">None</Badge>
            )}
          </Row>
          <Row label="Renewal date">{formatDate(p.renewalDate)}</Row>
        </div>
      </div>
      {(p.cancellationDate || p.refundStatus) && (
        <div className="mt-3 rounded-lg border border-cream-200 bg-cream-100/50 p-3 text-sm">
          {p.cancellationDate && (
            <p className="text-charcoal-muted">
              Cancelled on <span className="font-medium text-charcoal">{formatDate(p.cancellationDate)}</span>
            </p>
          )}
          {p.refundStatus && (
            <p className="text-charcoal-muted">
              Refund: <span className="font-medium text-charcoal">{p.refundStatus}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
