import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import type { MetricCardData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../data/store';
import { formatNumber } from '../../lib/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { UserGrowthChart, ProfilesByCategoryChart, EventsOverviewChart } from './sections/DashboardCharts';
import { EVENT_STATUS_LABEL, EVENT_STATUSES } from '../../config/eventLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { cn } from '../../lib/cn';

const RANGE_LABELS = [
  { key: 'today', label: 'Today' },
  { key: 'wtd', label: 'This week' },
  { key: 'mtd', label: 'This month' },
  { key: 'qtd', label: 'This quarter' },
] as const;

type RangeKey = (typeof RANGE_LABELS)[number]['key'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DashboardPage() {
  const { user } = useAuth();
  const { users, memberships, portfolios, archives, events } = useData();
  const [range, setRange] = useState<RangeKey>('mtd');

  const metrics: MetricCardData[] = useMemo(() => {
    const activeCreators = memberships.filter((m) => m.membershipStatus === 'active').length;
    const publishedProfiles = portfolios.filter((p) => p.status === 'published').length;
    const archiveVideos = archives.filter((a) => a.archiveStatus === 'published').length;
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => new Date(e.startAt).getTime() > Date.now() && ['published', 'sold_out'].includes(e.status)).length;
    const freeEvents = events.filter((e) => e.ticketType === 'free').length;
    const paidEvents = events.filter((e) => e.ticketType === 'paid').length;

    const m = (id: string, label: string, value: number, change: number, hint: string): MetricCardData => ({
      id, label, value: formatNumber(value), rawValue: value, change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', hint,
    });
    return [
      m('users', 'Total Users', users.length, 6.4, 'All registered app users'),
      m('creators', 'Active Creators', activeCreators, 4.1, 'Memberships currently active'),
      m('profiles', 'Published Profiles', publishedProfiles, 3.2, 'Catalogue-visible portfolios'),
      m('archive', 'Archive Videos', archiveVideos, 5.1, 'Published Archive videos'),
      m('events_total', 'Total Events', totalEvents, 2.4, 'All events on the platform'),
      m('events_upcoming', 'Upcoming Events', upcomingEvents, 0, 'Published & scheduled ahead'),
      m('events_free', 'Free Events', freeEvents, 1.8, 'Events with free entry'),
      m('events_paid', 'Paid Events', paidEvents, 3.6, 'Events with paid tickets'),
    ];
  }, [users.length, memberships, portfolios, archives, events]);

  // User Growth — cumulative registered users by join month.
  const growth = useMemo(() => {
    const byMonth = new Map<string, number>();
    users.forEach((u) => {
      const d = new Date(u.joinedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    });
    const keys = [...byMonth.keys()].sort();
    let cumulative = 0;
    return keys.map((k) => {
      cumulative += byMonth.get(k) ?? 0;
      const [y, mo] = k.split('-');
      return { label: `${MONTHS[Number(mo) - 1]} ${y.slice(2)}`, users: cumulative };
    });
  }, [users]);

  // Profiles by category.
  const byCategory = useMemo(
    () =>
      MEMBERSHIP_CATEGORIES.map((category) => ({
        category,
        count: users.filter((u) => u.membershipCategory === category).length,
      })).filter((c) => c.count > 0),
    [users],
  );

  // Events overview by status.
  const byStatus = useMemo(
    () =>
      EVENT_STATUSES.map((status) => ({
        status: EVENT_STATUS_LABEL[status],
        count: events.filter((e) => e.status === status).length,
      })).filter((s) => s.count > 0),
    [events],
  );

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader
        title={`Good day, ${firstName}`}
        description="Here's what's happening across IICA today."
        actions={
          <div className="flex items-center rounded-lg border border-cream-200 bg-white p-0.5">
            <Calendar className="mx-2 h-4 w-4 text-charcoal-muted" aria-hidden />
            {RANGE_LABELS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  range === r.key ? 'bg-magenta-50 text-magenta-700' : 'text-charcoal-muted hover:text-charcoal',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <UserGrowthChart data={growth} />
          <EventsOverviewChart data={byStatus} />
        </div>
        <ProfilesByCategoryChart data={byCategory} />
      </div>
    </div>
  );
}
