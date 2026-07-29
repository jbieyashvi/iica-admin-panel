import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import type { DashboardData } from '../../types';
import { getDashboard } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../data/store';
import { formatNumber } from '../../lib/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { RevenueChart } from './sections/RevenueChart';
import { MembershipFunnel } from './sections/MembershipFunnel';
import { PendingActions } from './sections/PendingActions';
import { RecentActivity } from './sections/RecentActivity';
import { CategoryDistribution } from './sections/CategoryDistribution';
import { LocationDistribution } from './sections/LocationDistribution';
import { CommerceSnapshotCard, CollaborationSnapshotCard } from './sections/SnapshotGrids';
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
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
  const submittedCount = portfolios.filter((p) => p.status === 'submitted').length;
  const reportedReviews = portfolios.reduce((s, p) => s + p.reports.filter((r) => r.status === 'open').length, 0);
  const upcomingEvents = events.filter((e) => new Date(e.startAt).getTime() > Date.now() && ['published', 'sold_out'].includes(e.status)).length;
  const archiveAwaiting = archives.filter((a) => a.archiveStatus === 'awaiting_review').length;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('mtd');

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
                    range === r.key
                      ? 'bg-magenta-50 text-magenta-700'
                      : 'text-charcoal-muted hover:text-charcoal',
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

      {/* Metrics */}
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
        data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {data.metrics.map((m) => {
                // Overlay live counts from the shared data store so Phase 2
                // mutations (add/suspend/simulate) are reflected here.
                let metric = m;
                if (m.id === 'users') {
                  metric = { ...m, value: formatNumber(users.length), rawValue: users.length };
                } else if (m.id === 'creators') {
                  const active = memberships.filter((x) => x.membershipStatus === 'active').length;
                  metric = { ...m, value: formatNumber(active), rawValue: active };
                } else if (m.id === 'reviews') {
                  metric = { ...m, value: formatNumber(submittedCount), rawValue: submittedCount };
                } else if (m.id === 'events') {
                  metric = { ...m, value: formatNumber(upcomingEvents), rawValue: upcomingEvents };
                }
                return <MetricCard key={m.id} metric={metric} />;
              })}
            </div>

            {/* Revenue + Funnel */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <RevenueChart data={data.revenue} />
              </div>
              <MembershipFunnel stages={data.funnel} />
            </div>

            {/* Pending + Recent */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PendingActions
                actions={data.pendingActions.map((a) =>
                  a.id === 'pa_portfolios'
                    ? { ...a, count: submittedCount }
                    : a.id === 'pa_reviews'
                      ? { ...a, count: reportedReviews }
                      : a.id === 'pa_archive'
                        ? { ...a, count: archiveAwaiting }
                        : a,
                )}
              />
              <RecentActivity items={data.activity} />
            </div>

            {/* Category + Location */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CategoryDistribution data={data.categories} />
              <LocationDistribution data={data.locations} />
            </div>

            {/* Commerce + Collaboration */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CommerceSnapshotCard data={data.commerce} />
              <CollaborationSnapshotCard data={data.collaboration} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
