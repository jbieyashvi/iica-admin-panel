import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DateRangeKey, RevenuePoint } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatCompactINR, formatINR } from '../../../lib/format';
import { cn } from '../../../lib/cn';

const RANGES: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
];

const COLORS = { gross: '#C2186B', commission: '#0E7490', refunds: '#B45309' };

interface RowTooltip {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: RowTooltip) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cream-200 bg-white px-3 py-2 shadow-drawer">
      <p className="mb-1 text-xs font-medium text-charcoal">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-xs text-charcoal-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-charcoal">{formatINR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: Record<DateRangeKey, RevenuePoint[]> }) {
  const [range, setRange] = useState<DateRangeKey>('30d');
  const points = data[range];

  return (
    <SectionCard
      title="Revenue Overview"
      description="Gross sales, platform commission and refunds"
      actions={
        <div className="flex rounded-lg border border-cream-200 bg-cream-100 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === r.key
                  ? 'bg-white text-charcoal shadow-soft'
                  : 'text-charcoal-muted hover:text-charcoal',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.gross} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLORS.gross} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE7DF" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b6560' }}
              axisLine={{ stroke: '#ECE7DF' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b6560' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactINR}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Area
              type="monotone"
              name="Gross Sales"
              dataKey="grossSales"
              stroke={COLORS.gross}
              strokeWidth={2}
              fill="url(#gross)"
            />
            <Area
              type="monotone"
              name="Commission"
              dataKey="commission"
              stroke={COLORS.commission}
              strokeWidth={2}
              fillOpacity={0}
            />
            <Area
              type="monotone"
              name="Refunds"
              dataKey="refunds"
              stroke={COLORS.refunds}
              strokeWidth={2}
              fillOpacity={0}
              strokeDasharray="4 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
