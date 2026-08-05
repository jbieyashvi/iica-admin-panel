import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useData } from '../../data/store';
import { formatNumber, formatINR } from '../../lib/format';
import { toBase, CURRENCIES, REVENUE_TOOLTIP } from '../../config/currency';
import type { CurrencyCode } from '../../config/currency';
import { PageHeader } from '../../components/ui/PageHeader';
import { catalogueVisibility, effectiveLocation } from '../../data/portfolioLogic';
import {
  CommerceSnapshotChart,
  CollaborationProgressCard,
  ProfilesByLocationChart,
  MembershipCategoryChart,
  RevenueOverviewChart,
} from './sections/DashboardCharts';
import type { CollabProgressRow } from './sections/DashboardCharts';
import { collabStatus } from '../../config/collabStatus';
import { cn } from '../../lib/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANGES = [
  { key: '30d', label: 'Last 30 Days' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '6m', label: 'Last 6 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

function rangeStart(key: RangeKey): number {
  const d = new Date();
  if (key === '30d') return d.getTime() - 30 * 86400000;
  if (key === '3m') { const x = new Date(d); x.setMonth(x.getMonth() - 3); return x.getTime(); }
  if (key === '6m') { const x = new Date(d); x.setMonth(x.getMonth() - 6); return x.getTime(); }
  if (key === 'year') return new Date(d.getFullYear(), 0, 1).getTime();
  return 0;
}
const monthKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (key: string) => { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`; };

// Completed-refund total (product orders use "Completed", event orders use "completed").
const completed = (list: { amount: number; status: string }[]) =>
  list.filter((r) => r.status.toLowerCase() === 'completed').reduce((s, r) => s + r.amount, 0);

const PRODUCT_TYPES = [
  { key: 'physical', label: 'Physical' },
  { key: 'digital', label: 'Digital' },
  { key: 'masterclass', label: 'Masterclass' },
] as const;

export function DashboardPage() {
  const { users, memberships, portfolios, products, productOrders, orders, collaborations, categories, donationOrders } = useData();
  const [range, setRange] = useState<RangeKey>('6m');

  const now = Date.now();
  const start = useMemo(() => rangeStart(range), [range]);
  const inPeriod = (iso?: string | null) => !!iso && new Date(iso).getTime() >= start && new Date(iso).getTime() <= now;

  // ---- Retained (paid) revenue per record ----
  const productRev = (o: (typeof productOrders)[number]) =>
    (o.paymentStatus === 'paid' || o.paymentStatus === 'partially_refunded') ? Math.max(0, o.total - completed(o.refundHistory)) : 0;
  const eventRev = (o: (typeof orders)[number]) =>
    (o.paymentStatus === 'paid' || o.paymentStatus === 'partially_refunded') ? Math.max(0, o.total - completed(o.refundHistory)) : 0;
  // Membership amounts are stored in the member's local currency → convert to base (INR).
  const membershipRev = (m: (typeof memberships)[number]) => {
    if (m.payment.purchaseStatus !== 'completed' || m.payment.refundStatus) return 0;
    const cur = (CURRENCIES as string[]).includes(m.payment.currency) ? (m.payment.currency as CurrencyCode) : 'INR';
    return toBase(m.payment.amount, cur);
  };

  // ---- Summary cards ----
  const cards = useMemo(() => {
    const totalUsers = users.length; // Guests + Registered Users + Creator Members
    const activeCreators = users.filter((u) => u.accountType === 'creator' && u.membershipStatus === 'active').length;
    const totalOrders = productOrders.filter((o) => inPeriod(o.orderedAt)).length;
    let revenue = 0;
    productOrders.forEach((o) => { if (inPeriod(o.orderedAt)) revenue += productRev(o); });
    orders.forEach((o) => { if (inPeriod(o.bookingDate)) revenue += eventRev(o); });
    memberships.forEach((m) => { if (inPeriod(m.payment.purchaseDate)) revenue += membershipRev(m); });
    donationOrders.forEach((d) => { if (d.status === 'paid' && inPeriod(d.date)) revenue += d.amount; });
    return [
      { label: 'Total Users', value: formatNumber(totalUsers) },
      { label: 'Active Creators', value: formatNumber(activeCreators) },
      { label: 'Total Orders', value: formatNumber(totalOrders) },
      { label: 'Total Revenue', value: formatINR(revenue) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, memberships, productOrders, orders, donationOrders, range]);

  // ---- Commerce Snapshot ----
  const commerce = useMemo(() => {
    const rows = PRODUCT_TYPES.map((t) => ({
      type: t.label,
      products: products.filter((p) => p.type === t.key).length,
      orders: productOrders.filter((o) => o.productType === t.key).length,
    }));
    const footnote = [
      { label: 'Published Products', value: products.filter((p) => p.status === 'published').length },
      { label: 'Paid Orders', value: productOrders.filter((o) => o.paymentStatus === 'paid' || o.paymentStatus === 'partially_refunded').length },
      { label: 'Free Orders', value: productOrders.filter((o) => o.total === 0).length },
    ];
    return { rows, footnote };
  }, [products, productOrders]);

  // ---- Collaboration Snapshot (actual sent requests only; 5 statuses) ----
  const collab = useMemo(() => {
    const b = { sent: 0, accepted: 0, completed: 0, closed: 0 };
    collaborations.forEach((c) => {
      if (c.requestStatus === 'suggested') return; // private discovery — never counted
      const k = collabStatus(c).key;
      if (k === 'sent') b.sent++;
      else if (k === 'accepted') b.accepted++;
      else if (k === 'completed') b.completed++;
      else b.closed++; // declined + cancelled
    });
    const rows: CollabProgressRow[] = [
      { key: 'sent', icon: 'pending', label: 'Sent', count: b.sent, filter: 'status=sent' },
      { key: 'accepted', icon: 'active', label: 'Accepted', count: b.accepted, filter: 'status=accepted' },
      { key: 'completed', icon: 'completed', label: 'Completed', count: b.completed, filter: 'status=completed' },
      { key: 'closed', icon: 'suggested', label: 'Declined / Cancelled', count: b.closed, filter: 'status=declined' },
    ];
    return { rows, total: rows.reduce((s, r) => s + r.count, 0) };
  }, [collaborations]);

  // ---- Profiles by Location (visible creator profiles only) ----
  const location = useMemo(() => {
    const counts = new Map<string, number>();
    portfolios.forEach((p) => {
      const u = users.find((x) => x.id === p.userId);
      const m = memberships.find((x) => x.userId === p.userId);
      if (catalogueVisibility(p, u, m) !== 'visible') return;
      const city = effectiveLocation(p, u).city?.trim() || 'Not Specified';
      counts.set(city, (counts.get(city) ?? 0) + 1);
    });
    const specified = [...counts.entries()].filter(([c]) => c !== 'Not Specified').sort((a, b) => b[1] - a[1]);
    const top = specified.slice(0, 6);
    const otherCount = specified.slice(6).reduce((s, [, n]) => s + n, 0);
    const rows = top.map(([city, count]) => ({ city, count }));
    if (otherCount > 0) rows.push({ city: 'Other', count: otherCount });
    const notSpecified = counts.get('Not Specified') ?? 0;
    if (notSpecified > 0) rows.push({ city: 'Not Specified', count: notSpecified });
    return rows;
  }, [portfolios, users, memberships]);

  // ---- Membership Category Distribution (active creators only) ----
  const category = useMemo(() => {
    const activeCreators = users.filter((u) => u.accountType === 'creator' && u.membershipStatus === 'active');
    const data = categories
      .map((c) => ({ name: String(c.name), value: activeCreators.filter((u) => u.membershipCategory === c.name).length }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { data, total: data.reduce((s, d) => s + d.value, 0) };
  }, [users, categories]);

  // ---- Revenue Overview (monthly, 3 sources) ----
  const revenue = useMemo(() => {
    // Effective start for month axis (All Time → earliest paid transaction).
    let axisStart = start;
    if (range === 'all') {
      const dates: number[] = [];
      productOrders.forEach((o) => { if (productRev(o) > 0) dates.push(new Date(o.orderedAt).getTime()); });
      orders.forEach((o) => { if (eventRev(o) > 0) dates.push(new Date(o.bookingDate).getTime()); });
      memberships.forEach((m) => { if (membershipRev(m) && m.payment.purchaseDate) dates.push(new Date(m.payment.purchaseDate).getTime()); });
      axisStart = dates.length ? Math.min(...dates) : new Date(new Date().setMonth(new Date().getMonth() - 6)).getTime();
    }
    // Month key list from axisStart..now.
    const keys: string[] = [];
    const cur = new Date(axisStart); cur.setDate(1);
    const endD = new Date(now);
    while (cur.getFullYear() < endD.getFullYear() || (cur.getFullYear() === endD.getFullYear() && cur.getMonth() <= endD.getMonth())) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    const bucket = new Map<string, { product: number; event: number; membership: number }>();
    keys.forEach((k) => bucket.set(k, { product: 0, event: 0, membership: 0 }));
    const add = (iso: string | null | undefined, field: 'product' | 'event' | 'membership', amt: number) => {
      if (amt <= 0 || !iso) return;
      const k = monthKey(iso);
      const row = bucket.get(k);
      if (row) row[field] += amt;
    };
    productOrders.forEach((o) => { if (inPeriodAxis(o.orderedAt, axisStart)) add(o.orderedAt, 'product', productRev(o)); });
    orders.forEach((o) => { if (inPeriodAxis(o.bookingDate, axisStart)) add(o.bookingDate, 'event', eventRev(o)); });
    memberships.forEach((m) => { if (inPeriodAxis(m.payment.purchaseDate, axisStart)) add(m.payment.purchaseDate, 'membership', membershipRev(m)); });
    const rows = keys.map((k) => ({ month: monthLabel(k), ...bucket.get(k)! }));
    const total = rows.reduce((s, r) => s + r.product + r.event + r.membership, 0);
    return { rows, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOrders, orders, memberships, range]);

  function inPeriodAxis(iso: string | null | undefined, axisStart: number) {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= axisStart && t <= now;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of platform users, commerce, collaborations and revenue."
        actions={
          <div className="flex items-center rounded-lg border border-cream-200 bg-white p-0.5">
            <Calendar className="mx-2 h-4 w-4 text-charcoal-muted" aria-hidden />
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  range === r.key ? 'bg-magenta-50 text-magenta-700' : 'text-charcoal-muted hover:text-charcoal',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6">
        {/* Four summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-cream-200 bg-white p-4" title={c.label === 'Total Revenue' ? REVENUE_TOOLTIP : undefined}>
              <p className="text-sm text-charcoal-muted">{c.label}{c.label === 'Total Revenue' && <span className="ml-1 text-charcoal-muted/60">(INR)</span>}</p>
              <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><CommerceSnapshotChart data={commerce.rows} footnote={commerce.footnote} /></div>
          <CollaborationProgressCard rows={collab.rows} total={collab.total} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfilesByLocationChart data={location} />
          <MembershipCategoryChart data={category.data} total={category.total} />
        </div>

        {/* Row 3 */}
        <RevenueOverviewChart data={revenue.rows} total={revenue.total} />
      </div>
    </div>
  );
}
