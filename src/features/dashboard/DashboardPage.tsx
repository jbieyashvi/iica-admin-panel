import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import type { DashboardData, MetricCardData, PendingAction } from '../../types';
import { getDashboard } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../data/store';
import { formatNumber } from '../../lib/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PendingActions } from './sections/PendingActions';
import { RecentActivity } from './sections/RecentActivity';
import { cn } from '../../lib/cn';

const RANGE_LABELS = [
  { key: 'today', label: 'Today' },
  { key: 'wtd', label: 'This week' },
  { key: 'mtd', label: 'This month' },
  { key: 'qtd', label: 'This quarter' },
] as const;

type RangeKey = (typeof RANGE_LABELS)[number]['key'];

function MetricSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { users, memberships, portfolios, events, archives } = useData();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('mtd');

  // Live counts from the shared data store.
  const counts = useMemo(() => {
    const activeCreators = memberships.filter((m) => m.membershipStatus === 'active').length;
    const publishedProfiles = portfolios.filter((p) => p.status === 'published').length;
    const pendingReviews = portfolios.filter((p) => p.status === 'submitted').length;
    const archiveVideos = archives.filter((a) => a.archiveStatus === 'published').length;
    const archiveAwaiting = archives.filter((a) => a.archiveStatus === 'awaiting_review').length;
    const reportedReviews = portfolios.reduce((s, p) => s + p.reports.filter((r) => r.status === 'open').length, 0);
    const purchasePending = memberships.filter((m) => m.membershipStatus === 'purchase_pending').length;
    const upcomingEvents = events.filter((e) => new Date(e.startAt).getTime() > Date.now() && ['published', 'sold_out'].includes(e.status)).length;
    return { activeCreators, publishedProfiles, pendingReviews, archiveVideos, archiveAwaiting, reportedReviews, purchasePending, upcomingEvents };
  }, [memberships, portfolios, archives, events]);

  const metrics: MetricCardData[] = useMemo(() => {
    const m = (id: string, label: string, value: number, change: number, hint: string): MetricCardData => ({
      id, label, value: formatNumber(value), rawValue: value, change, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', hint,
    });
    return [
      m('users', 'Total Users', users.length, 6.4, 'All registered app users'),
      m('creators', 'Active Creators', counts.activeCreators, 4.1, 'Memberships currently active'),
      m('profiles', 'Published Profiles', counts.publishedProfiles, 3.2, 'Catalogue-visible portfolios'),
      m('reviews', 'Pending Portfolio Reviews', counts.pendingReviews, 12.5, 'Submitted, awaiting review'),
      m('archive', 'Archive Videos', counts.archiveVideos, 5.1, 'Published Archive videos'),
      m('events', 'Upcoming Events', counts.upcomingEvents, 0, 'Published & scheduled ahead'),
    ];
  }, [users.length, counts]);

  const pendingActions: PendingAction[] = useMemo(
    () => [
      { id: 'pa_portfolios', label: 'Portfolios awaiting review', count: counts.pendingReviews, route: '/admin/portfolios?status=submitted', severity: 'high' },
      { id: 'pa_archive', label: 'Archive videos awaiting moderation', count: counts.archiveAwaiting, route: '/admin/archive?status=awaiting_review', severity: 'medium' },
      { id: 'pa_reviews', label: 'Reported reviews', count: counts.reportedReviews, route: '/admin/portfolios?reported=reported', severity: 'medium' },
      { id: 'pa_memberships', label: 'Purchase-pending memberships', count: counts.purchasePending, route: '/admin/users?status=purchase_pending', severity: 'low' },
    ],
    [counts],
  );

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await getDashboard();
      setData(result);
    } catch {
      setError('Could not load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader
        title={`Good day, ${firstName}`}
        description="Here's what's happening across IICA today."
        actions={
          <>
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
            <Button
              variant="secondary"
              onClick={() => load('refresh')}
              disabled={refreshing || loading}
              icon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {loading ? (
        <MetricSkeletons />
      ) : error ? (
        <div className="card">
          <EmptyState
            icon={<AlertCircle className="h-6 w-6 text-red-500" />}
            title="Something went wrong"
            description={error}
            action={
              <Button onClick={() => load('refresh')} icon={<RefreshCw className="h-4 w-4" />}>
                Retry
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PendingActions actions={pendingActions} />
            {data && <RecentActivity items={data.activity} />}
          </div>
        </div>
      )}
    </div>
  );
}
