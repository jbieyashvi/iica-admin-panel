import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleDot,
  FolderOpen,
  MapPin,
  Monitor,
  Smartphone,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortfolioStatusBadge, VisibilityBadge } from '../../components/ui/PortfolioBadges';
import { MembershipStatusBadge } from '../../components/ui/StatusBadge';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import { PortfolioPreview } from './PortfolioPreview';
import { UnpublishModal, PortfolioGuidelinesDrawer } from './PortfolioModals';
import { CorrectLocationModal } from '../catalogue/CatalogueDrawers';
import {
  useData,
  publishPortfolio,
  setContentHidden,
  resolveReport,
  addPortfolioNote,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import {
  catalogueVisibility,
  completionChecklist,
  completionPercent,
  requiredComplete,
  isEligible,
} from '../../data/portfolioLogic';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
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
  const { abilities, actor } = useActor();

  const portfolio = portfolios.find((p) => p.id === portfolioId);
  const user = users.find((u) => u.id === portfolio?.userId);
  const membership = memberships.find((m) => m.userId === portfolio?.userId);

  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [hideTarget, setHideTarget] = useState<{ section: 'watch' | 'testimonials' | 'gallery'; itemId: string } | null>(null);
  const [hideReason, setHideReason] = useState('');

  const backSearch = (location.state as { from?: string } | null)?.from ?? '/admin/portfolios';

  const checklist = useMemo(
    () => (portfolio ? completionChecklist(portfolio.content, true, true) : []),
    [portfolio],
  );

  if (!portfolio) {
    return (
      <div>
        <Link to="/admin/portfolios" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Portfolios
        </Link>
        <div className="card"><EmptyState title="Portfolio not found" description="This record may have been removed." /></div>
      </div>
    );
  }

  const eligible = isEligible(user, membership);
  const completion = completionPercent(checklist);
  const requiredDone = requiredComplete(checklist);
  const visibility = catalogueVisibility(portfolio, user, membership);
  const openReports = portfolio.reports.filter((r) => r.status === 'open');

  const canModerate = abilities.moderatePortfolio;

  const onToggleContent = (section: 'watch' | 'testimonials' | 'gallery', itemId: string, hidden: boolean) => {
    if (!canModerate) {
      toast(RESTRICTED_HINT, 'error');
      return;
    }
    if (hidden) {
      setHideTarget({ section, itemId });
      setHideReason('');
    } else {
      setContentHidden(portfolio.id, section, itemId, false, actor, 'Restored after review');
      toast('Content restored.');
    }
  };

  const confirmHide = () => {
    if (!hideTarget) return;
    if (!hideReason.trim()) {
      toast('A reason is required to hide content.', 'error');
      return;
    }
    setContentHidden(portfolio.id, hideTarget.section, hideTarget.itemId, true, actor, hideReason.trim());
    toast(hideTarget.section === 'watch' ? 'Watch video hidden — Archive item hidden too.' : 'Content hidden.', 'info');
    setHideTarget(null);
    setHideReason('');
  };

  const doPublish = () => {
    publishPortfolio(portfolio.id, actor);
    toast('Portfolio published.');
    setPublishOpen(false);
  };

  const submitNote = () => {
    if (!noteBody.trim()) return;
    addPortfolioNote(portfolio.id, noteBody.trim(), actor);
    toast('Note added.');
    setNoteBody('');
  };

  const grouped: Record<Tier, typeof checklist> = {
    required: checklist.filter((i) => i.tier === 'required'),
    recommended: checklist.filter((i) => i.tier === 'recommended'),
    optional: checklist.filter((i) => i.tier === 'optional'),
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate(backSearch)} className="inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Portfolios
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
        {/* LEFT — preview */}
        <div className="order-2 xl:order-1">
          <div className="mb-2 flex items-center gap-2 text-xs text-charcoal-muted">
            {device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
            Public portfolio preview ({device})
          </div>
          <div className="rounded-xl bg-cream-100/60 p-4">
            <PortfolioPreview portfolio={portfolio} user={user} device={device} moderate={{ canModerate, onToggle: onToggleContent }} />
          </div>
        </div>

        {/* RIGHT — review panel */}
        <div className="order-1 space-y-4 xl:order-2">
          {/* Creator summary */}
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

          {/* Membership eligibility */}
          <Card title="Membership Eligibility">
            <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5', eligible ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50')}>
              <CircleDot className={cn('mt-0.5 h-4 w-4 shrink-0', eligible ? 'text-emerald-600' : 'text-amber-600')} />
              <div className="text-sm">
                <p className={cn('font-medium', eligible ? 'text-emerald-700' : 'text-amber-800')}>
                  {eligible ? 'Eligible to publish' : 'Not eligible to publish'}
                </p>
                <p className={cn('text-xs', eligible ? 'text-emerald-700/80' : 'text-amber-800/80')}>
                  Membership: {membership ? <MembershipStatusBadge status={membership.membershipStatus} /> : 'none'}
                  {!eligible && ' — portfolio access requires an active creator membership.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Completion checklist */}
          <Card title="Completion Checklist" action={<span className="text-sm font-semibold text-charcoal">{completion}%</span>}>
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
            {!requiredDone && <p className="mt-2 text-xs text-amber-700">Required sections must be complete before publishing.</p>}
          </Card>

          {/* Reports */}
          <Card title="Reports & Issues">
            {openReports.length === 0 ? (
              <p className="text-sm text-charcoal-muted">No open reports.</p>
            ) : (
              <ul className="space-y-2.5">
                {openReports.map((r) => (
                  <li key={r.id} className="rounded-lg border border-red-100 bg-red-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <Badge tone="red">{r.section}</Badge>
                      <span className="text-xs text-charcoal-muted">{formatDate(r.at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-charcoal">{r.reason}</p>
                    <p className="text-xs text-charcoal-muted">On: "{r.item}"</p>
                    {canModerate && (
                      <button onClick={() => { resolveReport(portfolio.id, r.id, actor); toast('Report resolved.'); }} className="mt-1.5 text-xs font-medium text-magenta-600 hover:text-magenta-700">
                        Mark resolved
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Internal notes */}
          <Card title="Internal Notes">
            {abilities.addNotes && (
              <div className="mb-3">
                <Textarea rows={2} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add an internal note…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={submitNote} disabled={!noteBody.trim()}>Add note</Button>
                </div>
              </div>
            )}
            {portfolio.notes.length === 0 ? (
              <p className="text-sm text-charcoal-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {portfolio.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-2.5">
                    <p className="text-sm text-charcoal">{n.body}</p>
                    <p className="mt-0.5 text-xs text-charcoal-muted">{n.author} · {formatDate(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Timeline */}
          <Card title="Review Timeline">
            <MembershipTimeline events={portfolio.timeline} />
          </Card>

          {/* Moderation actions */}
          <Card title="Moderation Actions">
            <div className="grid grid-cols-1 gap-2">
              <Button
                icon={<Upload className="h-4 w-4" />}
                onClick={() => setPublishOpen(true)}
                disabled={!abilities.publishPortfolio || !eligible || !requiredDone || portfolio.status === 'published'}
                title={
                  !abilities.publishPortfolio ? RESTRICTED_HINT
                  : !eligible ? 'Requires active creator membership.'
                  : !requiredDone ? 'Required sections incomplete.'
                  : portfolio.status === 'published' ? 'Already published.' : ''
                }
              >
                Publish
              </Button>
              <Button variant="secondary" icon={<FolderOpen className="h-4 w-4" />} onClick={() => setUnpublishOpen(true)} disabled={!abilities.publishPortfolio || portfolio.status !== 'published'} title={!abilities.publishPortfolio ? RESTRICTED_HINT : portfolio.status !== 'published' ? 'Only published portfolios can be unpublished.' : ''}>
                Unpublish
              </Button>
              <Button variant="secondary" icon={<MapPin className="h-4 w-4" />} onClick={() => setLocationOpen(true)} disabled={!abilities.correctLocation} title={abilities.correctLocation ? '' : RESTRICTED_HINT}>
                Correct Location
              </Button>
              <p className="mt-1 text-xs text-charcoal-muted">
                Hide or restore individual Watch, Gallery and Testimonial items directly in the preview.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <UnpublishModal portfolio={unpublishOpen ? portfolio : null} onClose={() => setUnpublishOpen(false)} />
      <CorrectLocationModal portfolio={locationOpen ? portfolio : null} user={user} onClose={() => setLocationOpen(false)} />
      <PortfolioGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <ConfirmDialog
        open={publishOpen}
        title={`Publish ${user?.name ?? 'portfolio'}?`}
        description="Makes the portfolio catalogue-visible. Content status only — not creator verification."
        confirmLabel="Publish"
        onConfirm={doPublish}
        onCancel={() => setPublishOpen(false)}
      />
      <Modal
        open={!!hideTarget}
        onClose={() => setHideTarget(null)}
        title="Hide content"
        description="The item is hidden from the public portfolio but preserved for review history."
        footer={
          <>
            <Button variant="secondary" onClick={() => setHideTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmHide}>Hide item</Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="hidec-reason" required>
          <Input id="hidec-reason" value={hideReason} onChange={(e) => setHideReason(e.target.value)} placeholder="Why is this content being hidden?" />
        </Field>
      </Modal>
    </div>
  );
}
