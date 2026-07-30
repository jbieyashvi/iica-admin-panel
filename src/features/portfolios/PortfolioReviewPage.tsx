import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, CircleDot, Monitor, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortfolioStatusBadge, VisibilityBadge } from '../../components/ui/PortfolioBadges';
import { MembershipStatusBadge } from '../../components/ui/StatusBadge';
import { PortfolioPreview } from './PortfolioPreview';
import { PortfolioGuidelinesDrawer } from './PortfolioModals';
import { useData } from '../../data/store';
import { catalogueVisibility, completionChecklist, completionPercent, isEligible } from '../../data/portfolioLogic';
import { cn } from '../../lib/cn';
import type { Tier } from '../../data/portfolioLogic';

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const TIER_LABEL: Record<Tier, string> = { required: 'Required', recommended: 'Recommended', optional: 'Optional' };

export function PortfolioReviewPage() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { portfolios, users, memberships } = useData();

  const portfolio = portfolios.find((p) => p.id === portfolioId);
  const user = users.find((u) => u.id === portfolio?.userId);
  const membership = memberships.find((m) => m.userId === portfolio?.userId);

  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const backSearch = (location.state as { from?: string } | null)?.from ?? '/admin/users-profiles?tab=portfolios';

  const checklist = useMemo(
    () => (portfolio ? completionChecklist(portfolio.content, true, true) : []),
    [portfolio],
  );

  if (!portfolio) {
    return (
      <div>
        <Link to="/admin/users-profiles?tab=portfolios" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Users & Profiles
        </Link>
        <div className="card"><EmptyState title="Portfolio not found" description="This record may have been removed." /></div>
      </div>
    );
  }

  const eligible = isEligible(user, membership);
  const completion = portfolio.status === 'not_started' ? 0 : completionPercent(checklist);
  const visibility = catalogueVisibility(portfolio, user, membership);

  const grouped: Record<Tier, typeof checklist> = {
    required: checklist.filter((i) => i.tier === 'required'),
    recommended: checklist.filter((i) => i.tier === 'recommended'),
    optional: checklist.filter((i) => i.tier === 'optional'),
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate(backSearch)} className="inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Users & Profiles
        </button>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-cream-200 bg-cream-100 p-0.5">
            <button onClick={() => setDevice('desktop')} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', device === 'desktop' ? 'bg-white text-charcoal shadow-soft' : 'text-charcoal-muted')}>
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button onClick={() => setDevice('mobile')} className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', device === 'mobile' ? 'bg-white text-charcoal shadow-soft' : 'text-charcoal-muted')}>
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>
          <Button variant="secondary" size="sm" icon={<BookOpen className="h-4 w-4" />} onClick={() => setGuidelinesOpen(true)}>Guidelines</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* LEFT — read-only preview */}
        <div className="order-2 xl:order-1">
          <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-muted">
            {device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
            Public portfolio preview ({device}) · read-only
          </div>
          <div className="rounded-xl bg-cream-100/60 p-4">
            <PortfolioPreview portfolio={portfolio} user={user} device={device} moderate={{ canModerate: false, onToggle: () => {} }} />
          </div>
        </div>

        {/* RIGHT — read-only details */}
        <div className="order-1 space-y-4 xl:order-2">
          <Card title="Creator">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name ?? '—'} size="lg" />
              <div className="min-w-0">
                <p className="font-medium text-charcoal">{user?.name ?? 'Unknown'}</p>
                <p className="text-xs text-charcoal-muted">{portfolio.category} · {portfolio.iicaId ?? '—'}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <PortfolioStatusBadge status={portfolio.status} />
                  <VisibilityBadge visibility={visibility} />
                </div>
              </div>
            </div>
            {user && (
              <button onClick={() => navigate(`/admin/users/${user.id}`)} className="mt-3 text-xs font-medium text-magenta-600 hover:text-magenta-700">
                View full user profile →
              </button>
            )}
          </Card>

          <Card title="Membership Eligibility">
            <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5', eligible ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')}>
              <CircleDot className={cn('mt-0.5 h-4 w-4 shrink-0', eligible ? 'text-emerald-600' : 'text-amber-600')} />
              <div className="text-sm">
                <p className={cn('font-medium', eligible ? 'text-emerald-700' : 'text-amber-800')}>
                  {eligible ? 'Active creator — portfolio editing enabled' : 'Portfolio editing disabled'}
                </p>
                <p className={cn('mt-0.5 flex flex-wrap items-center gap-1.5 text-xs', eligible ? 'text-emerald-700/80' : 'text-amber-800/80')}>
                  Membership: {membership ? <MembershipStatusBadge status={membership.membershipStatus} /> : 'none'}
                  {!eligible && ' — publishing and editing are creator-controlled and require an active membership.'}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Completion" action={<span className="text-sm font-semibold text-charcoal">{completion}%</span>}>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-cream-100">
              <div className="h-full rounded-full bg-magenta-500" style={{ width: `${completion}%` }} />
            </div>
            {(['required', 'recommended', 'optional'] as Tier[]).map((tier) => (
              <div key={tier} className="mb-2 last:mb-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">{TIER_LABEL[tier]}</p>
                <ul className="space-y-1">
                  {grouped[tier].map((item) => (
                    <li key={item.key} className="flex items-center gap-2 text-sm">
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', item.done ? 'bg-emerald-500 text-white' : 'border border-cream-200 bg-white')}>
                        {item.done && <Check className="h-3 w-3" />}
                      </span>
                      <span className={item.done ? 'text-charcoal' : 'text-charcoal-muted'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="mt-2 text-xs text-charcoal-muted">Read-only. Portfolio content, publishing and visibility are creator-controlled.</p>
          </Card>
        </div>
      </div>

      <PortfolioGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </div>
  );
}
