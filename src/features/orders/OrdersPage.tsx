import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Package, Search, ShoppingBag, User as UserIcon, Store, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentStatusBadge, FulfilmentBadge } from '../../components/ui/OrderBadges';
import { ProductTypeBadge } from '../../components/ui/ProductBadges';
import { useData } from '../../data/store';
import { formatDate, priceLabel } from '../../lib/format';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  BUYER_TYPES,
  BUYER_TYPE_LABEL,
  ALL_FULFILMENT,
  FULFILMENT_LABEL,
} from '../../config/orderLabels';
import type { ProductOrder } from '../../types/orders';

const SORTS = [
  { key: 'newest', label: 'Newest Orders' },
  { key: 'oldest', label: 'Oldest Orders' },
  { key: 'amount', label: 'Highest Amount' },
  { key: 'action', label: 'Awaiting Action First' },
  { key: 'updated', label: 'Recently Updated' },
];
const DATE_RANGES = [
  { key: 'any', label: 'Any date' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

const ACTION_STATES = ['awaiting_acceptance', 'awaiting_delivery', 'delivery_disputed', 'return_requested', 'delivery_failed'];
const openIssues = (o: ProductOrder) => o.issues.filter((i) => !['closed', 'rejected', 'refunded'].includes(i.status)).length;
const needsAction = (o: ProductOrder) => ACTION_STATES.includes(o.fulfilmentStatus) || openIssues(o) > 0;
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

export function OrdersPage() {
  const { productOrders } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const type = get('type', 'all');
  const pay = get('pay', 'all');
  const ful = get('ful', 'all');
  const buyer = get('buyer', 'all');
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
    let list = productOrders.filter((o) => {
      if (q) {
        const hay = `${o.id} ${o.buyerName} ${o.productTitle} ${o.sellerName}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (type !== 'all' && o.productType !== type) return false;
      if (pay !== 'all' && o.paymentStatus !== pay) return false;
      if (ful !== 'all' && o.fulfilmentStatus !== ful) return false;
      if (buyer !== 'all' && o.buyerType !== buyer) return false;
      if (date !== 'any' && daysSince(o.orderedAt) > Number(date)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return +new Date(a.orderedAt) - +new Date(b.orderedAt);
        case 'amount': return b.total - a.total;
        case 'updated': return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        case 'action': return (needsAction(b) ? 1 : 0) - (needsAction(a) ? 1 : 0) || +new Date(b.orderedAt) - +new Date(a.orderedAt);
        default: return +new Date(b.orderedAt) - +new Date(a.orderedAt);
      }
    });
    return list;
  }, [productOrders, q, type, pay, ful, buyer, date, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (type !== 'all') chips.push({ key: 'type', label: PRODUCT_TYPE_LABEL[type as never] });
  if (pay !== 'all') chips.push({ key: 'pay', label: PAYMENT_STATUS_LABEL[pay as never] });
  if (ful !== 'all') chips.push({ key: 'ful', label: FULFILMENT_LABEL[ful as never] });
  if (buyer !== 'all') chips.push({ key: 'buyer', label: BUYER_TYPE_LABEL[buyer as never] });
  if (date !== 'any') chips.push({ key: 'date', label: DATE_RANGES.find((d) => d.key === date)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/orders/${id}`, { state: { from: `/admin/orders?${params.toString()}` } });
  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader title="Orders" description="Track product purchases, seller fulfilment and customer issues." />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search order ID, buyer, product or seller…" aria-label="Search orders" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-56">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select className={selectCls} value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="all">All types</option>
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>)}
          </Select>
          <Select className={selectCls} value={pay} onChange={(e) => update({ pay: e.target.value })}>
            <option value="all">All payments</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={ful} onChange={(e) => update({ ful: e.target.value })}>
            <option value="all">All fulfilment</option>
            {ALL_FULFILMENT.map((s) => <option key={s} value={s}>{FULFILMENT_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={buyer} onChange={(e) => update({ buyer: e.target.value })}>
            <option value="all">All buyers</option>
            {BUYER_TYPES.map((b) => <option key={b} value={b}>{BUYER_TYPE_LABEL[b]}</option>)}
          </Select>
          <Select className={selectCls} value={date} onChange={(e) => update({ date: e.target.value })}>
            {DATE_RANGES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> order{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Fulfilment</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((o) => (
                <tr key={o.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => detail(o.id)} className="text-left">
                      <span className="block font-medium text-charcoal group-hover:text-magenta-700">Order {o.id.replace('ord_', '#')}</span>
                      <span className="block text-xs text-charcoal-muted">{o.id}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-charcoal">{o.buyerName}</span>
                      {o.buyerType === 'guest' && <Badge tone="neutral">Guest</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cream-100 text-charcoal-muted"><Package className="h-4 w-4" /></span>
                      <span className="block max-w-[180px] truncate text-charcoal">{o.productTitle}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={o.sellerName} size="sm" />
                      <span className="text-charcoal">{o.sellerName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><ProductTypeBadge type={o.productType} /></td>
                  <td className="px-4 py-3 font-medium text-charcoal">{priceLabel(o.total)}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={o.paymentStatus} /></td>
                  <td className="px-4 py-3"><FulfilmentBadge status={o.fulfilmentStatus} /></td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(o.orderedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Order', icon: <Eye className="h-4 w-4" />, onClick: () => detail(o.id) },
                          { label: 'Open Product', icon: <Package className="h-4 w-4" />, onClick: () => navigate(`/admin/products/${o.productId}`) },
                          { label: 'Open Buyer', icon: <UserIcon className="h-4 w-4" />, disabled: o.buyerType === 'guest' || !o.buyerUserId, disabledHint: 'Guest purchase — no linked account.', onClick: () => o.buyerUserId && navigate(`/admin/users/${o.buyerUserId}`) },
                          { label: 'Open Seller', icon: <Store className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${o.sellerUserId}`) },
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
          <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="No orders match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>
    </div>
  );
}
