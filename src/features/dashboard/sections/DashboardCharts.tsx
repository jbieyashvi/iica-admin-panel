import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SectionCard } from '../../../components/ui/SectionCard';

const MAGENTA = '#C2186B';
const MAGENTA_LIGHT = '#E9A5C6';

interface TipRow {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}
function ChartTip({ active, payload, label }: TipRow) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cream-200 bg-white px-3 py-2 shadow-drawer">
      <p className="mb-0.5 text-xs font-medium text-charcoal">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs text-charcoal-muted">
          {p.name}: <span className="font-medium text-charcoal">{p.value.toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
}

export function UserGrowthChart({ data }: { data: { label: string; users: number }[] }) {
  return (
    <SectionCard title="User Growth" description="Cumulative registered users">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MAGENTA} stopOpacity={0.18} />
                <stop offset="100%" stopColor={MAGENTA} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DF" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={{ stroke: '#ECE7DF' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" name="Users" dataKey="users" stroke={MAGENTA} strokeWidth={2} fill="url(#ug)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function ProfilesByCategoryChart({ data }: { data: { category: string; count: number }[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <SectionCard title="Profiles by Category" description="Members per membership category">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#3a3634' }} axisLine={false} tickLine={false} width={150} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#F4F1EC' }} />
            <Bar dataKey="count" name="Profiles" radius={[0, 6, 6, 0]} barSize={12}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={i === 0 ? MAGENTA : MAGENTA_LIGHT} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function EventsOverviewChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <SectionCard title="Events Overview" description="Events by status">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DF" vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#6b6560' }} axisLine={{ stroke: '#ECE7DF' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#F4F1EC' }} />
            <Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]} barSize={26} fill={MAGENTA} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
