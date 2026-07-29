import type { CategoryDistribution as CatType } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatNumber } from '../../../lib/format';

export function CategoryDistribution({ data }: { data: CatType[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((d) => d.count));
  const total = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <SectionCard
      title="Membership Category Distribution"
      description={`${formatNumber(total)} active profiles across ${data.length} categories`}
    >
      <ul className="space-y-2.5">
        {sorted.map((d) => (
          <li key={d.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="truncate text-sm text-charcoal">{d.category}</span>
                <span className="ml-2 text-xs font-medium text-charcoal-muted">
                  {formatNumber(d.count)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                <div
                  className="h-full rounded-full bg-magenta-400"
                  style={{ width: `${Math.max((d.count / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
