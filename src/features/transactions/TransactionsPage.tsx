import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, ExternalLink, Lock, Receipt, Search, User as UserIcon, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge } from '../../components/ui/OrderBadges';
import { useData } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { buildTransactions } from '../../data/transactions';
import { formatINR, formatDate } from '../../lib/format';
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABEL } from '../../config/orderLabels';
import { SOURCE_LABEL, SOURCE_TONE, SOURCES, PAYMENT_METHODS, SORTS, DATE_RANGES } from '../../config/transactionLabels';
import type { Transaction } from '../../types/transactions';

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

function relatedRoute(t: Transaction): string {
  if (t.source === 'membership' && t.membership) return `/admin/users/${t.membership.userId}`;
  if (t.source === 'product' && t.product) return `/admin/orders/${t.product.orderId}`;
  if (t.source === 'event' && t.event) return `/admin/events/${t.event.eventId}`;
  return '/admin/transactions';
}

export function TransactionsPage() {
  const data = useData();
  const { abilities } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const all = useMemo(() => buildTransactions(data), [data]);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const source = get('source', 'all');
  const status = get('status', 'all');
  const method = get('method', 'all');
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
      if (method !== 'all' && t.paymentMethod !== method) return false;
      if (date !== 'any' && daysSince(t.date) > Number(date)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return +new Date(a.date) - +new Date(b.date);
        case 'high': return b.gross - a.gross;
        case 'low': return a.gross - b.gross;
        case 'updated': return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        default: return +new Date(b.date) - +new Date(a.date);
      }
    });
    return list;
  }, [all, q, source, status, method, date, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (source !== 'all') chips.push({ key: 'source', label: SOURCE_LABEL[source as never] });
  if (status !== 'all') chips.push({ key: 'status', label: PAYMENT_STATUS_LABEL[status as never] });
  if (method !== 'all') chips.push({ key: 'method', label: method });
  if (date !== 'any') chips.push({ key: 'date', label: DATE_RANGES.find((d) => d.key === date)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/transactions/${id}`, { state: { from: `/admin/transactions?${params.toString()}` } });
  const selectCls = 'text-sm';
  const showFinancials = abilities.txnFinancials;

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
      <PageHeader title="Transactions" description="View membership, product and event payment transactions." />

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
            <option value="all">All statuses</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={method} onChange={(e) => update({ method: e.target.value })}>
            <option value="all">All payment methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User / Buyer</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Platform Revenue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((t) => (
                <tr key={t.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => detail(t.id)} className="font-medium text-charcoal group-hover:text-magenta-700">{t.id}</button>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-charcoal">{t.buyerName}{t.buyerType === 'guest' && <Badge tone="neutral">Guest</Badge>}</span>
                  </td>
                  <td className="px-4 py-3"><Badge tone={SOURCE_TONE[t.source]}>{SOURCE_LABEL[t.source]}</Badge></td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[180px] truncate text-charcoal">{t.refTitle}</span>
                    <span className="block text-xs text-charcoal-muted">{t.refSub}</span>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{t.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-medium text-charcoal">{formatINR(t.gross)}</td>
                  <td className="px-4 py-3 text-right text-charcoal-muted">{showFinancials ? (t.source === 'membership' ? formatINR(t.netCollected) : formatINR(t.commission)) : '—'}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={t.status} /></td>
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
    </div>
  );
}
