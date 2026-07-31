import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, ExternalLink, Lock, Receipt, Search, User as UserIcon, Wallet, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge } from '../../components/ui/OrderBadges';
import { useData } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { buildTransactions } from '../../data/transactions';
import { formatDate } from '../../lib/format';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABEL } from '../../config/orderLabels';
import {
  SOURCE_LABEL, SOURCE_TONE, SOURCES, SORTS, DATE_RANGES,
  SETTLEMENT_STATUS_LABEL, SETTLEMENT_STATUS_TONE, SETTLEMENT_STATUSES,
} from '../../config/transactionLabels';
import {
  CURRENCIES, CURRENCY_COUNTRY, PAYMENT_PROVIDERS, PROTOTYPE_BALANCE_NOTE, formatCurrency,
} from '../../config/currency';
import type { CurrencyCode } from '../../config/currency';
import type { Transaction } from '../../types/transactions';
import type { SettlementStatus } from '../../types/paymentProvider';

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

function relatedRoute(t: Transaction): string {
  if (t.source === 'membership' && t.membership) return `/admin/users/${t.membership.userId}`;
  if (t.source === 'product' && t.product) return `/admin/orders/${t.product.orderId}`;
  if (t.source === 'event' && t.event) return `/admin/events/${t.event.eventId}`;
  return '/admin/transactions';
}
function SettlementBadge({ status }: { status: SettlementStatus }) {
  return <Badge tone={SETTLEMENT_STATUS_TONE[status]}>{SETTLEMENT_STATUS_LABEL[status]}</Badge>;
}

export function TransactionsPage() {
  const data = useData();
  const { abilities } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [balanceOpen, setBalanceOpen] = useState(false);

  const all = useMemo(() => buildTransactions(data), [data]);
  const showFinancials = abilities.txnFinancials;

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const source = get('source', 'all');
  const status = get('status', 'all');
  const settle = get('settle', 'all');
  const ccy = get('ccy', 'all');
  const scy = get('scy', 'all');
  const country = get('country', 'all');
  const provider = get('provider', 'all');
  const date = get('date', 'any');
  const sort = get('sort', 'newest');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all' || v === 'any') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = all.filter((t) => {
      if (q) {
        const hay = `${t.id} ${t.buyerName} ${t.email ?? ''} ${t.refTitle} ${t.refSub} ${t.membership?.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (source !== 'all' && t.source !== source) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (settle !== 'all' && t.settlementStatus !== settle) return false;
      if (ccy !== 'all' && t.customerCurrency !== ccy) return false;
      if (scy !== 'all' && t.settlementCurrency !== scy) return false;
      if (country !== 'all' && t.customerCountry !== country) return false;
      if (provider !== 'all' && t.provider !== provider) return false;
      if (date !== 'any' && daysSince(t.date) > Number(date)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return +new Date(a.date) - +new Date(b.date);
        case 'high': return b.baseAmount - a.baseAmount;
        case 'low': return a.baseAmount - b.baseAmount;
        case 'updated': return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        default: return +new Date(b.date) - +new Date(a.date);
      }
    });
    return list;
  }, [all, q, source, status, settle, ccy, scy, country, provider, date, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (source !== 'all') chips.push({ key: 'source', label: SOURCE_LABEL[source as never] });
  if (status !== 'all') chips.push({ key: 'status', label: PAYMENT_STATUS_LABEL[status as never] });
  if (settle !== 'all') chips.push({ key: 'settle', label: SETTLEMENT_STATUS_LABEL[settle as SettlementStatus] });
  if (ccy !== 'all') chips.push({ key: 'ccy', label: `Customer: ${ccy}` });
  if (scy !== 'all') chips.push({ key: 'scy', label: `Settle: ${scy}` });
  if (country !== 'all') chips.push({ key: 'country', label: country });
  if (provider !== 'all') chips.push({ key: 'provider', label: provider });
  if (date !== 'any') chips.push({ key: 'date', label: DATE_RANGES.find((d) => d.key === date)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/transactions/${id}`, { state: { from: `/admin/transactions?${params.toString()}` } });
  const selectCls = 'text-sm';

  // Per-currency balance overview (prototype). Sums presentment amounts by state.
  const balances = useMemo(() => {
    const m = new Map<CurrencyCode, { pending: number; available: number; onHold: number; updatedAt: number }>();
    all.forEach((t) => {
      const cur = t.customerCurrency;
      const row = m.get(cur) ?? { pending: 0, available: 0, onHold: 0, updatedAt: 0 };
      if (t.settlementStatus === 'pending') row.pending += t.originalAmount;
      if (t.settlementStatus === 'available') row.available += t.originalAmount;
      if (t.refundedAmount > 0 && t.settlementStatus !== 'settled') row.onHold += t.originalAmount;
      row.updatedAt = Math.max(row.updatedAt, +new Date(t.lastUpdatedAt));
      m.set(cur, row);
    });
    return CURRENCIES.filter((c) => m.has(c)).map((c) => ({ cur: c, ...m.get(c)! }));
  }, [all]);

  if (!abilities.txnView) {
    return (
      <div>
        <PageHeader title="Transactions" description="View membership, product and event payment transactions." />
        <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Your role does not have access to the Transactions module." /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="View membership, product and event payments across currencies and settlement states."
        actions={showFinancials ? <Button variant="secondary" icon={<Wallet className="h-4 w-4" />} onClick={() => setBalanceOpen(true)}>Balance Overview</Button> : undefined}
      />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search transaction ID, buyer, email, reference or IICA ID…" aria-label="Search transactions" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-56">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select className={selectCls} value={source} onChange={(e) => update({ source: e.target.value })}>
            <option value="all">All sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All payment status</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={settle} onChange={(e) => update({ settle: e.target.value })}>
            <option value="all">All settlement status</option>
            {SETTLEMENT_STATUSES.map((s) => <option key={s} value={s}>{SETTLEMENT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={ccy} onChange={(e) => update({ ccy: e.target.value })}>
            <option value="all">All customer currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={scy} onChange={(e) => update({ scy: e.target.value })}>
            <option value="all">All settlement currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={country} onChange={(e) => update({ country: e.target.value })}>
            <option value="all">All customer countries</option>
            {CURRENCIES.map((c) => <option key={c} value={CURRENCY_COUNTRY[c]}>{CURRENCY_COUNTRY[c]}</option>)}
          </Select>
          <Select className={selectCls} value={provider} onChange={(e) => update({ provider: e.target.value })}>
            <option value="all">All providers</option>
            {PAYMENT_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select className={selectCls} value={date} onChange={(e) => update({ date: e.target.value })}>
            {DATE_RANGES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> transaction{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: chip.key === 'date' ? 'any' : '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User / Buyer</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Original Amount</th>
                <th className="px-4 py-3 text-right">Settlement Amount</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3">Settlement Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((t) => (
                <tr key={t.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => detail(t.id)} className="font-medium text-charcoal group-hover:text-magenta-700">{t.id}</button>
                    {t.isInternational && <Badge tone="blue" className="ml-2">Intl</Badge>}
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-charcoal">{t.buyerName}{t.buyerType === 'guest' && <Badge tone="neutral">Guest</Badge>}</span>
                  </td>
                  <td className="px-4 py-3"><Badge tone={SOURCE_TONE[t.source]}>{SOURCE_LABEL[t.source]}</Badge></td>
                  <td className="px-4 py-3 text-right font-medium text-charcoal">{formatCurrency(t.originalAmount, t.customerCurrency)}</td>
                  <td className="px-4 py-3 text-right text-charcoal-muted">{showFinancials ? formatCurrency(t.netSettlement, t.settlementCurrency) : '—'}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">{showFinancials ? <SettlementBadge status={t.settlementStatus} /> : <span className="text-charcoal-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Transaction', icon: <Eye className="h-4 w-4" />, onClick: () => detail(t.id) },
                          { label: 'Open Related Record', icon: <ExternalLink className="h-4 w-4" />, onClick: () => navigate(relatedRoute(t)) },
                          ...(t.buyerType !== 'guest' && t.buyerUserId ? [{ label: 'Open User / Buyer', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${t.buyerUserId}`) }] : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="No transactions match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>

      {showFinancials && <p className="mt-3 text-xs text-charcoal-muted">{PROTOTYPE_BALANCE_NOTE}</p>}

      {/* Balance Overview (prototype) */}
      <Modal
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        title="Balance Overview"
        description="Prototype per-currency balances. Not a live provider balance."
        size="lg"
        footer={<>
          <Button variant="secondary" disabled title="Available after Stripe connection">Open Stripe Dashboard</Button>
          <Button onClick={() => setBalanceOpen(false)}>Close</Button>
        </>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-3 py-2.5">Currency</th>
                <th className="px-3 py-2.5 text-right">Pending Balance</th>
                <th className="px-3 py-2.5 text-right">Available Balance</th>
                <th className="px-3 py-2.5 text-right">Funds on Hold</th>
                <th className="px-3 py-2.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {balances.map((b) => (
                <tr key={b.cur}>
                  <td className="px-3 py-2.5 font-medium text-charcoal">{b.cur}</td>
                  <td className="px-3 py-2.5 text-right text-charcoal">{formatCurrency(b.pending, b.cur)}</td>
                  <td className="px-3 py-2.5 text-right text-charcoal">{formatCurrency(b.available, b.cur)}</td>
                  <td className="px-3 py-2.5 text-right text-charcoal-muted">{formatCurrency(b.onHold, b.cur)}</td>
                  <td className="px-3 py-2.5 text-charcoal-muted">{b.updatedAt ? formatDate(new Date(b.updatedAt).toISOString()) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-charcoal-muted">{PROTOTYPE_BALANCE_NOTE} “Open Stripe Dashboard” becomes available after the Stripe connection is configured.</p>
      </Modal>
    </div>
  );
}
