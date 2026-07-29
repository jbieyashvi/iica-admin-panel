import {
  CalendarDays,
  Flag,
  IdCard,
  ShoppingCart,
  Star,
  Video,
} from 'lucide-react';
import type { ActivityItem, ActivityType } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { timeAgo } from '../../../lib/format';

const icons: Record<ActivityType, { Icon: typeof IdCard; tone: string }> = {
  membership_activated: { Icon: IdCard, tone: 'bg-emerald-50 text-emerald-600' },
  event_submitted: { Icon: CalendarDays, tone: 'bg-sky-50 text-sky-600' },
  archive_added: { Icon: Video, tone: 'bg-red-50 text-red-600' },
  order_received: { Icon: ShoppingCart, tone: 'bg-magenta-50 text-magenta-600' },
  collaboration_reported: { Icon: Flag, tone: 'bg-amber-50 text-amber-600' },
  testimonial_submitted: { Icon: Star, tone: 'bg-violet-50 text-violet-600' },
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <SectionCard title="Recent Platform Activity" description="Latest events across the platform" bodyClassName="p-0">
      <ul className="divide-y divide-cream-200">
        {items.map((item) => {
          const { Icon, tone } = icons[item.type];
          return (
            <li key={item.id} className="flex items-start gap-3 px-5 py-3">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal">{item.title}</p>
                <p className="truncate text-xs text-charcoal-muted">{item.meta}</p>
              </div>
              <span className="shrink-0 text-xs text-charcoal-muted">{timeAgo(item.timestamp)}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
