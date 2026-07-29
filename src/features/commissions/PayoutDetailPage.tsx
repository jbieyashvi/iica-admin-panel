import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Lock, Play, RefreshCw, User as UserIcon, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { PayoutStatusBadge, RevenueTypeBadge, MethodStatusBadge } from '../../components/ui/PayoutBadges';
import { useData } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { formatINR, formatDate, formatDateTime } from '../../lib/format';
import { REVENUE_TYPE_LABEL, PROTOTYPE_NOTE, remainingDays } from '../../config/payoutLabels';
import { MarkFailedModal, MarkPaidModal, RetryPayoutModal, StartProcessingModal } from './payoutModals';
import type { PayoutRecord } from '../../types/payouts';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'calc', label: 'Calculation' },
  { key: 'method', label: 'Payout Method' },
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

export function PayoutDetailPage() {
  const { payoutId } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const { abilities } = useActor();
  const [tab, setTab] = useState('overview');
  const [action, setAction] = useState<'start' | 'paid' | 'failed' | 'retry' | null>(null);

  const payout: PayoutRecord | undefined = useMemo(() => data.payouts.find((p) => p.id === payoutId), [data.payouts, payoutId]);
  const method = useMemo(() => data.payoutSettings.find((s) => s.userId === payout?.creatorUserId), [data.payoutSettings, payout]);

  if (!abilities.payoutsView) {
    return <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Your role does not have access to Commissions & Payouts." /></div>;
  }
  if (!payout) {
    return (
      <div>
        <button onClick={() => navigate('/admin/commissions-payouts?tab=payouts')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Payouts</button>
        <div className="card"><EmptyState title="Payout not found" description="This payout reference could not be resolved." /></div>
      </div>
    );
  }

  const canProcess = abilities.payoutsProcess;
  const relatedRoute = payout.source === 'event' && payout.eventId ? `/admin/events/${payout.eventId}` : payout.productId ? `/admin/products/${payout.productId}` : '/admin/commissions-payouts';

  return (
    <div>
      <button onClick={() => navigate('/admin/commissions-payouts?tab=payouts')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Payouts</button>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-charcoal">{payout.id}</h1>
              <RevenueTypeBadge type={payout.source} />
              <PayoutStatusBadge status={payout.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{payout.creatorName}{payout.iicaId ? ` · ${payout.iicaId}` : ''}</span>
              <span>Created {formatDate(payout.createdAt)}</span>
              <span className="font-medium text-charcoal">{formatINR(payout.payoutAmount)}</span>
            </div>
          </div>
          {canProcess && (
            <div className="flex flex-wrap gap-2">
              {payout.status === 'eligible' && <Button icon={<Play className="h-4 w-4" />} onClick={() => setAction('start')}>Start Processing</Button>}
              {payout.status === 'processing' && <>
                <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setAction('paid')}>Mark Paid</Button>
                <Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setAction('failed')}>Mark Failed</Button>
              </>}
              {payout.status === 'failed' && <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => setAction('retry')}>Retry Payout</Button>}
            </div>
          )}
        </div>
        {payout.status === 'on_hold' && payout.holdNote && (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">On hold — {payout.holdNote}</p>
        )}
      </div>

      <div className="mb-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Payout">
            <Row label="Payout ID">{payout.id}</Row>
            <Row label="Revenue type">{REVENUE_TYPE_LABEL[payout.source]}</Row>
            <Row label="Status">{<PayoutStatusBadge status={payout.status} />}</Row>
            <Row label="Payout amount">{formatINR(payout.payoutAmount)}</Row>
            <Row label="Holding period">{payout.holdingDays} days</Row>
            <Row label="Requirement met">{formatDate(payout.requirementMetAt)}</Row>
            <Row label="Eligibility date">{formatDate(payout.eligibilityDate)}{payout.status === 'on_hold' && !payout.holdNote && ` · in ${remainingDays(payout.eligibilityDate)} days`}</Row>
          </Card>
          <Card title="Creator / Seller">
            <Row label="Name">{payout.creatorName}</Row>
            {payout.iicaId && <Row label="IICA ID">{payout.iicaId}</Row>}
            <Row label="Reference">{payout.refTitle}</Row>
            <Row label="Connected order">{payout.orderId ?? '—'}</Row>
            <Row label="Connected transaction">{payout.transactionRef}</Row>
            {payout.status === 'processing' && <Row label="Processing since">{formatDateTime(payout.processingAt)}</Row>}
            {payout.status === 'paid' && <><Row label="Paid on">{formatDateTime(payout.paidAt)}</Row><Row label="Payout reference">{payout.payoutReference}</Row></>}
            {payout.status === 'failed' && <><Row label="Failed on">{formatDateTime(payout.failedAt)}</Row><Row label="Failure reason">{payout.failureReason}</Row></>}
          </Card>
        </div>
      )}

      {tab === 'calc' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Calculation">
            <Row label="Gross amount">{formatINR(payout.gross)}</Row>
            {payout.refundedAmount > 0 && <Row label="Refunded amount">– {formatINR(payout.refundedAmount)}</Row>}
            <Row label="Net eligible">{formatINR(payout.netEligible)}</Row>
            <Row label="Captured commission rate">{Math.round(payout.capturedRate * 1000) / 10}%</Row>
            <Row label="Platform commission">– {formatINR(payout.commission)}</Row>
            <Row label="Creator payout">{formatINR(payout.payoutAmount)}</Row>
          </Card>
          <div className="space-y-4">
            {payout.refundedAmount > 0 && (
              <Card title="Partial refund">
                <p className="text-sm text-charcoal-muted">This payout is calculated on the retained amount after a completed partial refund. The refunded portion is excluded from the payout base.</p>
              </Card>
            )}
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              Commission rate is captured at purchase time — later changes to commission settings do not rewrite this record. {PROTOTYPE_NOTE}
            </div>
          </div>
        </div>
      )}

      {tab === 'method' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Payout Method">
            {method ? (
              <>
                <Row label="Method">{method.method === 'bank' ? 'Bank Transfer' : method.method === 'upi' ? 'UPI' : method.method === 'stripe' ? 'Stripe Connect' : 'Skydo'}</Row>
                <Row label="Account holder">{method.holderName}</Row>
                <Row label="Institution">{method.institution}</Row>
                <Row label="Account (masked)">{method.masked}</Row>
                <Row label="Method status">{<MethodStatusBadge status={method.status} />}</Row>
              </>
            ) : <p className="text-sm text-charcoal-muted">No payout method on file for this creator.</p>}
          </Card>
          <div className="space-y-4">
            <div className="rounded-lg border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-xs text-charcoal-muted">
              Only an <span className="font-medium text-charcoal">Active</span> payout method can receive a payout. Incomplete or unverified methods keep the payout On Hold. Account details are masked and read-only here.
            </div>
            {payout.status === 'paid' && <Card title="Paid via"><Row label="Method used">{payout.payoutMethodUsed}</Row><Row label="Reference">{payout.payoutReference}</Row><Row label="Paid on">{formatDate(payout.paidAt)}</Row></Card>}
          </div>
        </div>
      )}

      {tab === 'related' && (
        <Card title="Related Record">
          <p className="mb-3 text-sm text-charcoal-muted">Open the connected record in its own module.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(relatedRoute)}>{payout.source === 'event' ? 'Open Event' : 'Open Product'}</Button>
            {payout.source !== 'event' && payout.orderId && <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(`/admin/orders/${payout.orderId}`)}>Open Order</Button>}
            <Button variant="secondary" icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${payout.creatorUserId}`)}>Open Creator Profile</Button>
          </div>
          <p className="mt-4 text-xs text-charcoal-muted">Connected transaction reference: <Badge tone="neutral">{payout.transactionRef}</Badge></p>
        </Card>
      )}

      {action === 'start' && <StartProcessingModal payout={payout} onClose={() => setAction(null)} />}
      {action === 'paid' && <MarkPaidModal payout={payout} method={method} onClose={() => setAction(null)} />}
      {action === 'failed' && <MarkFailedModal payout={payout} onClose={() => setAction(null)} />}
      {action === 'retry' && <RetryPayoutModal payout={payout} onClose={() => setAction(null)} />}
    </div>
  );
}
