import { Check } from 'lucide-react';
import type { TimelineEvent } from '../../types/users';
import { formatDateTime } from '../../lib/format';

export function MembershipTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-charcoal-muted">No timeline events yet.</p>;
  }
  const ordered = [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  return (
    <ol className="relative ml-2 space-y-4 border-l border-cream-200 pl-6">
      {ordered.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-magenta-200 bg-magenta-50 text-magenta-600">
            <Check className="h-3 w-3" />
          </span>
          <p className="text-sm font-medium text-charcoal">{e.label}</p>
          <p className="text-xs text-charcoal-muted">
            {formatDateTime(e.at)}
            {e.detail ? ` · ${e.detail}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
