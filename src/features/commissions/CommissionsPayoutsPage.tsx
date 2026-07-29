import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Eye, ExternalLink, Lock, Pencil, Play, Plus, RefreshCw, Search, Trash2, User as UserIcon, Wallet, X, XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { Tabs } from '../../components/ui/Tabs';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import type { MenuItem } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PayoutStatusBadge, RevenueTypeBadge, ConfigStatusBadge } from '../../components/ui/PayoutBadges';
import { useData } from '../../data/store';
import { removeCommissionOverride } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { formatINR, formatDate } from '../../lib/format';
import {
  PAYOUT_STATUSES, PAYOUT_STATUS_LABEL, REVENUE_TYPE_LABEL, REVENUE_TYPE_ORDER, PAYOUT_SORTS, PROTOTYPE_NOTE, remainingDays,
} from '../../config/payoutLabels';
import { EditCommissionModal, OverrideModal } from './commissionModals';
import { MarkFailedModal, MarkPaidModal, RetryPayoutModal, StartProcessingModal } from './payoutModals';
import type { CommissionConfig, CommissionOverride, PayoutRecord, RevenueType } from '../../types/payouts';

function payoutRelatedRoute(p: PayoutRecord): string {
  if (p.source === 'event' && p.eventId) return `/admin/events/${p.eventId}`;
  if (p.productId) return `/admin/products/${p.productId}`;
  return '/admin/commissions-payouts';
}

export function CommissionsPayoutsPage() {
  const data = useData();
  const { abilities } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const get = (k: string, d = '') => params.get(k) ?? d;
  const tab = get('tab') === 'payouts' ? 'payouts' : 'commissions';
  const setTab = (t: string) => update({ tab: t === 'commissions' ? '' : t }, false);

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (!v || v === 'all') next.delete(k); else next.set(k, v); });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  // ---- Modal state ----
  const [editConfig, setEditConfig] = useState<CommissionConfig | null>(null);
  const [overrideModal, setOverrideModal] = useState<{ open: boolean; override: CommissionOverride | null } | null>(null);
  const [action, setAction] = useState<{ kind: 'start' | 'paid' | 'failed' | 'retry'; payout: PayoutRecord } | null>(null);

  const overridesByType = useMemo(() => {
    const m: Record<RevenueType, CommissionOverride[]> = { masterclass: [], digital: [], physical: [], event: [] };
    data.commissionOverrides.forEach((o) => m[o.type].push(o));
    return m;
  }, [data.commissionOverrides]);
  const payoutSettingsByUser = useMemo(() => new Map(data.payoutSettings.map((s) => [s.userId, s])), [data.payoutSettings]);

  const categoriesByType = useMemo(() => {
    const m: Record<RevenueType, string[]> = { masterclass: [], digital: [], physical: [], event: [] };
    data.productCategories.filter((c) => c.status === 'active').forEach((c) => {
      if (c.type === 'masterclass' || c.type === 'digital' || c.type === 'physical') m[c.type].push(c.name);
    });
    data.eventCategories.filter((c) => c.status === 'active').forEach((c) => m.event.push(c.name));
    return m;
  }, [data.productCategories, data.eventCategories]);

  if (!abilities.payoutsView) {
    return (
      <div>
        <PageHeader title="Commissions & Payouts" description="Commission settings and creator payouts." />
        <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Your role does not have access to Commissions & Payouts." /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Commissions & Payouts" description="Platform commission settings and creator / seller payouts." />
      <div className="mb-5"><Tabs tabs={[{ key: 'commissions', label: 'Commission Settings' }, { key: 'payouts', label: 'Payouts', count: data.payouts.length }]} active={tab} onChange={setTab} /></div>

      {tab === 'commissions' ? (
        <CommissionSettings
          settings={data.commissionSettings}
          overridesByType={overridesByType}
          canEdit={abilities.commissionsEdit}
          onEditConfig={setEditConfig}
          onAddOverride={() => setOverrideModal({ open: true, override: null })}
          onEditOverride={(o) => setOverrideModal({ open: true, override: o })}
        />
      ) : (
        <PayoutsTab
          payouts={data.payouts}
          get={get}
          update={update}
          setParams={setParams}
          canProcess={abilities.payoutsProcess}
          navigate={navigate}
          onAction={(kind, payout) => setAction({ kind, payout })}
        />
      )}

      {editConfig && <EditCommissionModal config={editConfig} onClose={() => setEditConfig(null)} />}
      {overrideModal?.open && <OverrideModal override={overrideModal.override} categoriesByType={categoriesByType} onClose={() => setOverrideModal(null)} />}
      {action?.kind === 'start' && <StartProcessingModal payout={action.payout} onClose={() => setAction(null)} />}
      {action?.kind === 'paid' && <MarkPaidModal payout={action.payout} method={payoutSettingsByUser.get(action.payout.creatorUserId)} onClose={() => setAction(null)} />}
      {action?.kind === 'failed' && <MarkFailedModal payout={action.payout} onClose={() => setAction(null)} />}
      {action?.kind === 'retry' && <RetryPayoutModal payout={action.payout} onClose={() => setAction(null)} />}
    </div>
  );
}

// ===========================================================================
// Commission Settings tab
// ===========================================================================
function CommissionSettings({
  settings, overridesByType, canEdit, onEditConfig, onAddOverride, onEditOverride,
}: {
  settings: CommissionConfig[];
  overridesByType: Record<RevenueType, CommissionOverride[]>;
  canEdit: boolean;
  onEditConfig: (c: CommissionConfig) => void;
  onAddOverride: () => void;
  onEditOverride: (o: CommissionOverride) => void;
}) {
  const { actor } = useActor();
  const ordered = REVENUE_TYPE_ORDER.map((t) => settings.find((s) => s.type === t)).filter((c): c is CommissionConfig => !!c);

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">{PROTOTYPE_NOTE}</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Revenue Type</th>
                <th className="px-4 py-3">Default Commission</th>
                <th className="px-4 py-3">Category Overrides</th>
                <th className="px-4 py-3">Holding Period</th>
                <th className="px-4 py-3">Minimum Payout</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {ordered.map((c) => (
                <tr key={c.type} className="hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-charcoal">{REVENUE_TYPE_LABEL[c.type]}</div>
                    <div className="text-xs text-charcoal-muted">{c.label}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-charcoal">{Math.round(c.defaultRate * 1000) / 10}%</td>
                  <td className="px-4 py-3 text-charcoal-muted">{overridesByType[c.type].length ? `${overridesByType[c.type].length} active` : '—'}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{c.holdingDays} day{c.holdingDays === 1 ? '' : 's'}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatINR(c.minPayout)}</td>
                  <td className="px-4 py-3"><ConfigStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} disabled={!canEdit} onClick={() => onEditConfig(c)}>Edit</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canEdit && <p className="border-t border-cream-200 px-4 py-2.5 text-xs text-charcoal-muted">Your role can view commission settings but cannot change them.</p>}
      </div>

      {/* Category overrides */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-charcoal">Category Overrides</h3>
            <p className="text-xs text-charcoal-muted">One active override per category. Applies to new transactions only.</p>
          </div>
          {canEdit && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onAddOverride}>Add Override</Button>}
        </div>
        {REVENUE_TYPE_ORDER.every((t) => overridesByType[t].length === 0) ? (
          <p className="py-6 text-center text-sm text-charcoal-muted">No category overrides configured.</p>
        ) : (
          <div className="space-y-4">
            {REVENUE_TYPE_ORDER.filter((t) => overridesByType[t].length > 0).map((t) => (
              <div key={t}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{REVENUE_TYPE_LABEL[t]}</p>
                <div className="flex flex-wrap gap-2">
                  {overridesByType[t].map((o) => (
                    <div key={o.id} className="flex items-center gap-2 rounded-lg border border-cream-200 bg-cream-50 px-3 py-1.5 text-sm">
                      <span className="text-charcoal">{o.category}</span>
                      <span className="font-medium text-magenta-700">{Math.round(o.overrideRate * 1000) / 10}%</span>
                      {canEdit && (
                        <>
                          <button onClick={() => onEditOverride(o)} className="text-charcoal-muted hover:text-charcoal" aria-label={`Edit ${o.category} override`}><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => removeCommissionOverride(o.id, actor)} className="text-charcoal-muted hover:text-red-600" aria-label={`Remove ${o.category} override`}><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Payouts tab
// ===========================================================================
function PayoutsTab({
  payouts, get, update, setParams, canProcess, navigate, onAction,
}: {
  payouts: PayoutRecord[];
  get: (k: string, d?: string) => string;
  update: (patch: Record<string, string>, resetPage?: boolean) => void;
  setParams: (p: URLSearchParams, o?: { replace?: boolean }) => void;
  canProcess: boolean;
  navigate: (to: string) => void;
  onAction: (kind: 'start' | 'paid' | 'failed' | 'retry', payout: PayoutRecord) => void;
}) {
  const q = get('q');
  const source = get('source', 'all');
  const status = get('status', 'all');
  const sort = get('sort', 'newest');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const filtered = useMemo(() => {
    const actionRank = (s: PayoutRecord['status']) => (s === 'failed' ? 0 : s === 'processing' ? 1 : s === 'eligible' ? 2 : s === 'on_hold' ? 3 : 4);
    let list = payouts.filter((p) => {
      if (q) {
        const hay = `${p.id} ${p.creatorName} ${p.iicaId ?? ''} ${p.refTitle} ${p.orderId ?? ''} ${p.transactionRef}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (source !== 'all' && p.source !== source) return false;
      if (status !== 'all' && p.status !== status) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return +new Date(a.createdAt) - +new Date(b.createdAt);
        case 'high': return b.payoutAmount - a.payoutAmount;
        case 'low': return a.payoutAmount - b.payoutAmount;
        case 'eligibility': return +new Date(a.eligibilityDate) - +new Date(b.eligibilityDate);
        case 'action': return actionRank(a.status) - actionRank(b.status) || +new Date(b.createdAt) - +new Date(a.createdAt);
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
  }, [payouts, q, source, status, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (source !== 'all') chips.push({ key: 'source', label: REVENUE_TYPE_LABEL[source as RevenueType] });
  if (status !== 'all') chips.push({ key: 'status', label: PAYOUT_STATUS_LABEL[status as PayoutRecord['status']] });
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const detail = (id: string) => navigate(`/admin/commissions-payouts/${id}`);

  function eligibilityCell(p: PayoutRecord) {
    if (p.status === 'paid') return <span className="text-charcoal-muted">Paid {formatDate(p.paidAt)}</span>;
    if (p.status === 'failed') return <span className="text-red-600">Failed {formatDate(p.failedAt)}</span>;
    if (p.status === 'processing') return <span className="text-charcoal-muted">Processing since {formatDate(p.processingAt)}</span>;
    if (p.status === 'on_hold') {
      const days = remainingDays(p.eligibilityDate);
      if (p.holdNote) return <span className="text-amber-700">On hold</span>;
      return <span className="text-charcoal-muted">Eligible in {days} day{days === 1 ? '' : 's'}</span>;
    }
    return <span className="text-charcoal-muted">Since {formatDate(p.eligibilityDate)}</span>;
  }

  function rowActions(p: PayoutRecord): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'View Payout', icon: <Eye className="h-4 w-4" />, onClick: () => detail(p.id) },
      { label: 'Open Related Record', icon: <ExternalLink className="h-4 w-4" />, onClick: () => navigate(payoutRelatedRoute(p)) },
      { label: 'Open Creator', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${p.creatorUserId}`) },
    ];
    if (!canProcess) return items;
    if (p.status === 'eligible') items.push({ divider: true, label: 'd1' }, { label: 'Start Processing', icon: <Play className="h-4 w-4" />, onClick: () => onAction('start', p) });
    if (p.status === 'processing') items.push(
      { divider: true, label: 'd2' },
      { label: 'Mark Paid', icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => onAction('paid', p) },
      { label: 'Mark Failed', icon: <XCircle className="h-4 w-4" />, danger: true, onClick: () => onAction('failed', p) },
    );
    if (p.status === 'failed') items.push({ divider: true, label: 'd3' }, { label: 'Retry Payout', icon: <RefreshCw className="h-4 w-4" />, onClick: () => onAction('retry', p) });
    return items;
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search payout ID, creator, reference or IICA ID…" aria-label="Search payouts" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-56">
            {PAYOUT_SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={source} onChange={(e) => update({ source: e.target.value })} className="text-sm">
            <option value="all">All sources</option>
            {REVENUE_TYPE_ORDER.map((t) => <option key={t} value={t}>{REVENUE_TYPE_LABEL[t]}</option>)}
          </Select>
          <Select value={status} onChange={(e) => update({ status: e.target.value })} className="text-sm">
            <option value="all">All statuses</option>
            {PAYOUT_STATUSES.map((s) => <option key={s} value={s}>{PAYOUT_STATUS_LABEL[s]}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> payout{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Payout</th>
                <th className="px-4 py-3">Creator / Seller</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Payout Amount</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((p) => (
                <tr key={p.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3"><button onClick={() => detail(p.id)} className="font-medium text-charcoal group-hover:text-magenta-700">{p.id}</button></td>
                  <td className="px-4 py-3">
                    <div className="text-charcoal">{p.creatorName}</div>
                    {p.iicaId && <div className="text-xs text-charcoal-muted">{p.iicaId}</div>}
                  </td>
                  <td className="px-4 py-3"><RevenueTypeBadge type={p.source} /></td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[190px] truncate text-charcoal">{p.refTitle}</span>
                    <span className="block text-xs text-charcoal-muted">{p.orderId}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-charcoal">{formatINR(p.payoutAmount)}</td>
                  <td className="px-4 py-3 text-xs">{eligibilityCell(p)}</td>
                  <td className="px-4 py-3">
                    <PayoutStatusBadge status={p.status} />
                    {p.status === 'on_hold' && p.holdNote && <span className="mt-1 block max-w-[160px] text-[11px] text-charcoal-muted">{p.holdNote}</span>}
                  </td>
                  <td className="px-4 py-3"><div className="flex justify-end"><DropdownMenu items={rowActions(p)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && <EmptyState icon={<Wallet className="h-6 w-6" />} title="No payouts match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />}
        {total > 0 && <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />}
      </div>

      <p className="text-xs text-charcoal-muted">
        Payouts are generated only from eligible seller / host earnings (Physical delivered, Digital confirmed, Masterclass completed, Event completed — all paid, past the holding period, above the minimum). Memberships and free records never generate a payout. <Badge tone="neutral" className="ml-1">{payouts.length} records</Badge>
      </p>
    </div>
  );
}
