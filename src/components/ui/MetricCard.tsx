import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { MetricCardData } from '../../types';
import { Tooltip } from './Tooltip';
import { cn } from '../../lib/cn';

export function MetricCard({ metric }: { metric: MetricCardData }) {
  const { label, value, change, direction, hint } = metric;
  const isUp = direction === 'up';
  const isDown = direction === 'down';

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-charcoal-muted">{label}</p>
        {hint && (
          <Tooltip label={hint} side="bottom">
            <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-cream-200 text-[10px] font-semibold text-charcoal-muted">
              i
            </span>
          </Tooltip>
        )}
      </div>
      <p className="mt-2 font-serif text-2xl font-medium tracking-tight text-charcoal">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
            isUp && 'bg-emerald-50 text-emerald-700',
            isDown && 'bg-red-50 text-red-700',
            !isUp && !isDown && 'bg-cream-100 text-charcoal-muted',
          )}
        >
          {isUp && <ArrowUpRight className="h-3 w-3" />}
          {isDown && <ArrowDownRight className="h-3 w-3" />}
          {!isUp && !isDown && <Minus className="h-3 w-3" />}
          {change === 0 ? '0%' : `${Math.abs(change)}%`}
        </span>
        <span className="text-xs text-charcoal-muted">vs last period</span>
      </div>
    </div>
  );
}
