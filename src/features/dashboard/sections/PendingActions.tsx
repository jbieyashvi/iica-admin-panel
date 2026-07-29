import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { PendingAction } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { cn } from '../../../lib/cn';

const dot: Record<PendingAction['severity'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

export function PendingActions({ actions }: { actions: PendingAction[] }) {
  const navigate = useNavigate();
  const total = actions.reduce((sum, a) => sum + a.count, 0);

  return (
    <SectionCard
      title="Pending Actions"
      description={`${total} items need attention`}
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-cream-200">
        {actions.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => navigate(a.route)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-cream-100"
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dot[a.severity])} />
              <span className="flex-1 text-sm text-charcoal">{a.label}</span>
              <span className="rounded-full bg-cream-100 px-2 py-0.5 text-xs font-semibold text-charcoal">
                {a.count}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-magenta-600">
                View <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
