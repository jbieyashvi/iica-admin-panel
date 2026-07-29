import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { MapPin } from 'lucide-react';
import type { LocationDistribution as LocType } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatNumber } from '../../../lib/format';

export function LocationDistribution({ data }: { data: LocType[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <SectionCard title="Profiles by Location" description="Top creator cities">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="city"
              tick={{ fontSize: 12, fill: '#3a3634' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#C2186B' : '#E9A5C6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {sorted.map((d) => (
          <li key={d.city} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-charcoal-muted">
              <MapPin className="h-3 w-3" /> {d.city}
            </span>
            <span className="font-medium text-charcoal">{formatNumber(d.count)}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
