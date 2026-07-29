import type { FunnelStage } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatNumber } from '../../../lib/format';

export function MembershipFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count));

  return (
    <SectionCard
      title="Membership Funnel"
      description="In-app purchase flow via Apple / Google"
    >
      <ul className="space-y-3">
        {stages.map((stage, i) => {
          const pct = Math.round((stage.count / max) * 100);
          const prev = i > 0 ? stages[i - 1].count : stage.count;
          const conv = i > 0 ? Math.round((stage.count / prev) * 100) : 100;
          return (
            <li key={stage.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-charcoal">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cream-100 text-[11px] font-semibold text-charcoal-muted">
                    {i + 1}
                  </span>
                  {stage.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal">{formatNumber(stage.count)}</span>
                  {i > 0 && (
                    <span className="w-10 text-right text-xs text-charcoal-muted">{conv}%</span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cream-100">
                <div
                  className="h-full rounded-full bg-magenta-500"
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
