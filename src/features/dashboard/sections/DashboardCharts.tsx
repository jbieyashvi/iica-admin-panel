import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Activity, CalendarClock, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatINR } from '../../../lib/format';

const MAGENTA = '#C2186B';
const MAGENTA_LIGHT = '#E9A5C6';
// On-brand-leaning categorical palette (muted, cream/white friendly).
export const PALETTE = ['#C2186B', '#E9A5C6', '#3a6ea5', '#c9a227', '#3c7a52', '#6a3fa0', '#b8577f', '#7ec8e3', '#e0a96d', '#9fd8a0', '#c7a6e8', '#9aa0a6'];

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-charcoal-muted">No data available for the selected period.</div>;
}

interface TipRow {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}
function CountTip({ active, payload, label }: TipRow) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cream-200 bg-white px-3 py-2 shadow-drawer">
      <p className="mb-0.5 text-xs font-medium text-charcoal">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-xs text-charcoal-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-charcoal">{p.value.toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
}
function MoneyTip({ active, payload, label }: TipRow) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cream-200 bg-white px-3 py-2 shadow-drawer">
      <p className="mb-0.5 text-xs font-medium text-charcoal">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-xs text-charcoal-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-charcoal">{formatINR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ---- 1. Commerce Snapshot (grouped bar) ------------------------------------
export interface CommerceRow { type: string; products: number; orders: number }
export function CommerceSnapshotChart({ data, footnote }: { data: CommerceRow[]; footnote?: { label: string; value: number }[] }) {
  const hasData = data.some((d) => d.products > 0 || d.orders > 0);
  return (
    <SectionCard title="Commerce Snapshot" description="Products & orders by product type" className="h-full">
      <div className="h-64 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DF" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={{ stroke: '#ECE7DF' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<CountTip />} cursor={{ fill: '#F4F1EC' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="products" name="Products" radius={[4, 4, 0, 0]} barSize={22} fill={MAGENTA} />
              <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]} barSize={22} fill={MAGENTA_LIGHT} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
      {footnote && footnote.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-cream-200 pt-3 text-xs text-charcoal-muted">
          {footnote.map((f) => (
            <span key={f.label}>{f.label}: <span className="font-medium text-charcoal">{f.value.toLocaleString('en-IN')}</span></span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ---- Donut shared ----------------------------------------------------------
export interface DonutSlice { name: string; value: number }
function Donut({ data, total, centerLabel }: { data: DonutSlice[]; total: number; centerLabel: string }) {
  const slices = data.filter((d) => d.value > 0);
  if (slices.length === 0) return <EmptyChart />;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
              {slices.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<CountTip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl font-medium text-charcoal">{total.toLocaleString('en-IN')}</span>
          <span className="text-xs text-charcoal-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-charcoal">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {s.name}
            </span>
            <span className="text-charcoal-muted">{s.value.toLocaleString('en-IN')}<span className="ml-1 text-xs">({total ? Math.round((s.value / total) * 100) : 0}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- 2. Collaboration Progress (status rows, no chart) ---------------------
export type CollabProgressIcon = 'suggested' | 'pending' | 'meeting' | 'active' | 'completed';
export interface CollabProgressRow {
  key: string;
  label: string;
  count: number;
  icon: CollabProgressIcon;
  filter: string; // querystring applied to /admin/collaborations
}
const ROW_ICON: Record<CollabProgressIcon, typeof Sparkles> = {
  suggested: Sparkles,
  pending: Clock,
  meeting: CalendarClock,
  active: Activity,
  completed: CheckCircle2,
};
// One primary magenta at rising opacity; green reserved for Completed.
const ROW_BAR: Record<CollabProgressIcon, string> = {
  suggested: 'rgba(194,24,107,0.45)',
  pending: 'rgba(194,24,107,0.6)',
  meeting: 'rgba(194,24,107,0.78)',
  active: 'rgba(194,24,107,0.95)',
  completed: '#3c7a52',
};

export function CollaborationProgressCard({ rows, total }: { rows: CollabProgressRow[]; total: number }) {
  return (
    <SectionCard title="Collaboration Progress" description="Current collaboration activity" className="h-full">
      {total === 0 ? (
        <div className="flex h-full min-h-[13rem] items-center justify-center text-sm text-charcoal-muted">No collaboration activity yet</div>
      ) : (
        <div className="flex h-full flex-col">
          <Link to="/admin/collaborations" className="group mb-4 inline-flex w-fit items-baseline gap-2">
            <span className="font-serif text-3xl font-medium text-charcoal group-hover:text-magenta-700">{total.toLocaleString('en-IN')}</span>
            <span className="text-sm text-charcoal-muted">Total Collaborations</span>
          </Link>
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {rows.map((r) => {
              const Icon = ROW_ICON[r.icon];
              const pct = total ? Math.round((r.count / total) * 100) : 0;
              return (
                <Link
                  key={r.key}
                  to={`/admin/collaborations?${r.filter}`}
                  className="group -mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-100"
                >
                  <Icon className="h-4 w-4 shrink-0 text-charcoal-muted group-hover:text-magenta-700" aria-hidden />
                  <span className="w-36 shrink-0 truncate text-sm text-charcoal">{r.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: ROW_BAR[r.icon] }} />
                  </span>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums text-charcoal-muted">
                    <span className="font-medium text-charcoal">{r.count}</span> · {pct}%
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---- 3. Profiles by Location (horizontal bar) ------------------------------
export function ProfilesByLocationChart({ data }: { data: { city: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <SectionCard title="Profiles by Location" description="Top creator cities" className="h-full">
      <div className="h-64 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="city" tick={{ fontSize: 12, fill: '#3a3634' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CountTip />} cursor={{ fill: '#F4F1EC' }} />
              <Bar dataKey="count" name="Creators" radius={[0, 6, 6, 0]} barSize={14}>
                {data.map((_, i) => <Cell key={i} fill={i === 0 ? MAGENTA : MAGENTA_LIGHT} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </SectionCard>
  );
}

// ---- 4. Membership Category Distribution (donut) ---------------------------
export function MembershipCategoryChart({ data, total }: { data: DonutSlice[]; total: number }) {
  return (
    <SectionCard title="Membership Category Distribution" description="Active creators per category" className="h-full">
      <div className="min-h-[13rem]">
        <Donut data={data} total={total} centerLabel="Creators" />
      </div>
    </SectionCard>
  );
}

// ---- 5. Revenue Overview (area, 3 sources) ---------------------------------
export interface RevenueRow { month: string; product: number; event: number; membership: number }
export function RevenueOverviewChart({ data, total }: { data: RevenueRow[]; total: number }) {
  const hasData = data.some((d) => d.product > 0 || d.event > 0 || d.membership > 0);
  return (
    <SectionCard
      title="Revenue Overview"
      description="Paid revenue by source over time"
      actions={<div className="text-right"><p className="font-serif text-lg font-medium text-charcoal">{formatINR(total)}</p><p className="text-[11px] text-charcoal-muted">Total this period</p></div>}
    >
      <div className="h-72 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={MAGENTA} stopOpacity={0.2} /><stop offset="100%" stopColor={MAGENTA} stopOpacity={0} /></linearGradient>
                <linearGradient id="rev-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a6ea5" stopOpacity={0.18} /><stop offset="100%" stopColor="#3a6ea5" stopOpacity={0} /></linearGradient>
                <linearGradient id="rev-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a227" stopOpacity={0.18} /><stop offset="100%" stopColor="#c9a227" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DF" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={{ stroke: '#ECE7DF' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`)} />
              <Tooltip content={<MoneyTip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="product" name="Product Orders" stroke={MAGENTA} strokeWidth={2} fill="url(#rev-p)" />
              <Area type="monotone" dataKey="event" name="Event Tickets" stroke="#3a6ea5" strokeWidth={2} fill="url(#rev-e)" />
              <Area type="monotone" dataKey="membership" name="Memberships" stroke="#c9a227" strokeWidth={2} fill="url(#rev-m)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </SectionCard>
  );
}
