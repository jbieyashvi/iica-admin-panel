import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ExternalLink, MessageSquareQuote, Plus, Search, Star, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { Tabs } from '../../components/ui/Tabs';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReviewStatusBadge, TestimonialStatusBadge, StarRating } from '../../components/ui/ReviewBadges';
import { ReviewDrawer } from './ReviewDrawer';
import { TestimonialDrawer } from './TestimonialDrawer';
import { TestimonialFormModal } from './TestimonialFormModal';
import { ConfirmModal, HideReasonModal } from './reviewModals';
import {
  useData,
  publishReview, hideReview, restoreReview,
  publishTestimonial, hideTestimonial, restoreTestimonial,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import {
  REVIEW_TYPE_LABEL, REVIEW_TYPES, REVIEW_STATUS_LABEL, REVIEW_STATUSES,
  PLACEMENT_LABEL, TESTIMONIAL_SOURCE_LABEL, TESTIMONIAL_STATUS_LABEL, TESTIMONIAL_STATUSES,
  relatedItemRoute, relatedItemLabel,
} from '../../config/reviewLabels';
import type { ReviewRecord, TestimonialRecord } from '../../types/reviews';

const REVIEW_SORTS = [
  { key: 'newest', label: 'Recently Submitted' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'high', label: 'Highest Rating' },
  { key: 'low', label: 'Lowest Rating' },
];
const DATE_RANGES = [
  { key: 'any', label: 'Any date' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

export function ReviewsTestimonialsPage() {
  const { reviews, testimonials } = useData();
  const navigate = useNavigate();
  const { abilities, actor } = useActor();
  const [tab, setTab] = useState('reviews');

  // ---- Reviews filter state (kept across tab switches) ----
  const [rq, setRq] = useState('');
  const [rType, setRType] = useState('all');
  const [rRating, setRRating] = useState('all');
  const [rStatus, setRStatus] = useState('all');
  const [rDate, setRDate] = useState('any');
  const [rSort, setRSort] = useState('newest');
  const [rPage, setRPage] = useState(1);
  const [rSize, setRSize] = useState(10);

  // ---- Testimonials filter state ----
  const [tq, setTq] = useState('');
  const [tStatus, setTStatus] = useState('all');
  const [tPage, setTPage] = useState(1);
  const [tSize, setTSize] = useState(10);

  // ---- Drawers / modals ----
  const [selReview, setSelReview] = useState<ReviewRecord | null>(null);
  const [selTestimonial, setSelTestimonial] = useState<TestimonialRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<{ r: ReviewRecord; kind: 'publish' | 'hide' | 'restore' } | null>(null);
  const [tAction, setTAction] = useState<{ t: TestimonialRecord; kind: 'publish' | 'hide' | 'restore' } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [fromReview, setFromReview] = useState<ReviewRecord | null>(null);

  const canModerate = abilities.reviewsModerate;
  const canManageT = abilities.testimonialsManage;

  // ================= REVIEWS =================
  const reviewSummary = useMemo(() => {
    const published = reviews.filter((r) => r.status === 'published');
    const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0;
    return {
      total: reviews.length,
      published: published.length,
      pending: reviews.filter((r) => r.status === 'pending').length,
      hidden: reviews.filter((r) => r.status === 'hidden').length,
      avg,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let list = reviews.filter((r) => {
      if (rq) {
        const hay = `${r.reviewerName} ${r.title ?? ''} ${r.body} ${r.targetName}`.toLowerCase();
        if (!hay.includes(rq.toLowerCase())) return false;
      }
      if (rType !== 'all' && r.type !== rType) return false;
      if (rRating !== 'all' && r.rating !== Number(rRating)) return false;
      if (rStatus !== 'all' && r.status !== rStatus) return false;
      if (rDate !== 'any' && daysSince(r.submittedAt) > Number(rDate)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (rSort) {
        case 'oldest': return +new Date(a.submittedAt) - +new Date(b.submittedAt);
        case 'high': return b.rating - a.rating || +new Date(b.submittedAt) - +new Date(a.submittedAt);
        case 'low': return a.rating - b.rating || +new Date(b.submittedAt) - +new Date(a.submittedAt);
        default: return +new Date(b.submittedAt) - +new Date(a.submittedAt);
      }
    });
    return list;
  }, [reviews, rq, rType, rRating, rStatus, rDate, rSort]);

  const rTotal = filteredReviews.length;
  const rPaged = filteredReviews.slice((rPage - 1) * rSize, rPage * rSize);

  const reviewCards = [
    { label: 'Total Reviews', value: reviewSummary.total, apply: () => { resetReviewFilters(); } },
    { label: 'Published', value: reviewSummary.published, apply: () => { resetReviewFilters(); setRStatus('published'); } },
    { label: 'Pending Review', value: reviewSummary.pending, apply: () => { resetReviewFilters(); setRStatus('pending'); } },
    { label: 'Hidden', value: reviewSummary.hidden, apply: () => { resetReviewFilters(); setRStatus('hidden'); } },
    { label: 'Average Rating', value: reviewSummary.avg ? reviewSummary.avg.toFixed(1) : '—', apply: () => { resetReviewFilters(); setRSort('high'); }, star: true },
  ];

  function resetReviewFilters() { setRq(''); setRType('all'); setRRating('all'); setRStatus('all'); setRDate('any'); setRSort('newest'); setRPage(1); }

  const rChips: { label: string; clear: () => void }[] = [];
  if (rq) rChips.push({ label: `Search: ${rq}`, clear: () => setRq('') });
  if (rType !== 'all') rChips.push({ label: REVIEW_TYPE_LABEL[rType as never], clear: () => setRType('all') });
  if (rRating !== 'all') rChips.push({ label: `${rRating} star`, clear: () => setRRating('all') });
  if (rStatus !== 'all') rChips.push({ label: REVIEW_STATUS_LABEL[rStatus as never], clear: () => setRStatus('all') });
  if (rDate !== 'any') rChips.push({ label: DATE_RANGES.find((d) => d.key === rDate)!.label, clear: () => setRDate('any') });

  const runReviewAction = () => {
    if (!reviewAction) return;
    const { r, kind } = reviewAction;
    if (kind === 'publish') { publishReview(r.id, actor); toast('Review published.'); }
    if (kind === 'restore') { restoreReview(r.id, actor); toast('Review restored to Published.'); }
    setSelReview(null);
  };

  // ================= TESTIMONIALS =================
  const tSummary = useMemo(() => ({
    total: testimonials.length,
    published: testimonials.filter((t) => t.status === 'published').length,
    draft: testimonials.filter((t) => t.status === 'draft').length,
    hidden: testimonials.filter((t) => t.status === 'hidden').length,
  }), [testimonials]);

  const filteredTestimonials = useMemo(() => {
    let list = testimonials.filter((t) => {
      if (tq) {
        const hay = `${t.personName} ${t.role} ${t.body}`.toLowerCase();
        if (!hay.includes(tq.toLowerCase())) return false;
      }
      if (tStatus !== 'all' && t.status !== tStatus) return false;
      return true;
    });
    return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [testimonials, tq, tStatus]);

  const tTotal = filteredTestimonials.length;
  const tPaged = filteredTestimonials.slice((tPage - 1) * tSize, tPage * tSize);

  const tCards = [
    { label: 'Total Testimonials', value: tSummary.total, apply: () => { setTq(''); setTStatus('all'); setTPage(1); } },
    { label: 'Published', value: tSummary.published, apply: () => { setTq(''); setTStatus('published'); setTPage(1); } },
    { label: 'Draft', value: tSummary.draft, apply: () => { setTq(''); setTStatus('draft'); setTPage(1); } },
    { label: 'Hidden', value: tSummary.hidden, apply: () => { setTq(''); setTStatus('hidden'); setTPage(1); } },
  ];

  const runTestimonialAction = () => {
    if (!tAction) return;
    const { t, kind } = tAction;
    if (kind === 'publish') { publishTestimonial(t.id, actor); toast('Testimonial published.'); }
    if (kind === 'restore') { restoreTestimonial(t.id, actor); toast('Testimonial restored to Published.'); }
    setSelTestimonial(null);
  };

  return (
    <div>
      <PageHeader
        title="Reviews & Testimonials"
        description="Manage user reviews and featured platform testimonials."
        actions={tab === 'testimonials' ? (
          <Button icon={<Plus className="h-4 w-4" />} disabled={!canManageT} title={canManageT ? '' : RESTRICTED_HINT} onClick={() => { setFromReview(null); setAddOpen(true); }}>Add Testimonial</Button>
        ) : undefined}
      />

      <div className="mb-5">
        <Tabs tabs={[{ key: 'reviews', label: 'Reviews', count: reviews.length }, { key: 'testimonials', label: 'Testimonials', count: testimonials.length }]} active={tab} onChange={setTab} />
      </div>

      {/* ============ REVIEWS TAB ============ */}
      {tab === 'reviews' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {reviewCards.map((c) => (
              <button key={c.label} onClick={c.apply} className="card p-4 text-left transition-colors hover:border-magenta-200">
                <p className="text-sm text-charcoal-muted">{c.label}</p>
                <p className="mt-1 flex items-center gap-1 font-serif text-2xl font-medium text-charcoal">{c.value}{c.star && reviewSummary.avg > 0 && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}</p>
              </button>
            ))}
          </div>

          <div className="card mb-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
                <input value={rq} onChange={(e) => { setRq(e.target.value); setRPage(1); }} placeholder="Search reviewer or review text…" aria-label="Search reviews" className="input-base pl-9" />
              </div>
              <Select value={rSort} onChange={(e) => setRSort(e.target.value)} className="lg:w-56">
                {REVIEW_SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
              </Select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Select className="text-sm" value={rType} onChange={(e) => { setRType(e.target.value); setRPage(1); }}>
                <option value="all">All types</option>
                {REVIEW_TYPES.map((t) => <option key={t} value={t}>{REVIEW_TYPE_LABEL[t]}</option>)}
              </Select>
              <Select className="text-sm" value={rRating} onChange={(e) => { setRRating(e.target.value); setRPage(1); }}>
                <option value="all">All ratings</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
              </Select>
              <Select className="text-sm" value={rStatus} onChange={(e) => { setRStatus(e.target.value); setRPage(1); }}>
                <option value="all">All statuses</option>
                {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{REVIEW_STATUS_LABEL[s]}</option>)}
              </Select>
              <Select className="text-sm" value={rDate} onChange={(e) => { setRDate(e.target.value); setRPage(1); }}>
                {DATE_RANGES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{rTotal}</span> review{rTotal === 1 ? '' : 's'}</span>
              {rChips.length > 0 && <span className="text-cream-200">|</span>}
              {rChips.map((chip, i) => (
                <button key={i} onClick={() => { chip.clear(); setRPage(1); }} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
              ))}
              {rChips.length > 0 && <button onClick={() => { resetReviewFilters(); }} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3">Review For</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Review</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {rPaged.map((r) => (
                    <tr key={r.id} className="group hover:bg-cream-100/50">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={r.reviewerName} size="sm" />
                          <span>
                            <span className="flex items-center gap-1.5 text-charcoal">{r.reviewerName}{r.reviewerType === 'guest' && <Badge tone="neutral">Guest</Badge>}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="block max-w-[180px] truncate text-charcoal">{r.targetName}</span></td>
                      <td className="px-4 py-3"><Badge tone="magenta">{REVIEW_TYPE_LABEL[r.type]}</Badge></td>
                      <td className="px-4 py-3"><StarRating value={r.rating} /></td>
                      <td className="px-4 py-3"><button onClick={() => setSelReview(r)} className="block max-w-[220px] truncate text-left text-charcoal-muted group-hover:text-magenta-700">{r.title ? `${r.title} — ` : ''}{r.body}</button></td>
                      <td className="px-4 py-3 text-charcoal-muted">{formatDate(r.submittedAt)}</td>
                      <td className="px-4 py-3"><ReviewStatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu
                            items={[
                              { label: 'View Review', icon: <Eye className="h-4 w-4" />, onClick: () => setSelReview(r) },
                              { label: relatedItemLabel(r.type), icon: <ExternalLink className="h-4 w-4" />, onClick: () => navigate(relatedItemRoute(r.type, r.targetId)) },
                              ...(r.status !== 'published' ? [{ label: 'Publish', onClick: () => setReviewAction({ r, kind: 'publish' as const }), disabled: !canModerate, disabledHint: RESTRICTED_HINT }] : []),
                              ...(r.status !== 'hidden' ? [{ label: 'Hide', onClick: () => setReviewAction({ r, kind: 'hide' as const }), disabled: !canModerate, disabledHint: RESTRICTED_HINT }] : []),
                              ...(r.status === 'hidden' ? [{ label: 'Restore', onClick: () => setReviewAction({ r, kind: 'restore' as const }), disabled: !canModerate, disabledHint: RESTRICTED_HINT }] : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rTotal === 0 && <EmptyState icon={<Star className="h-6 w-6" />} title="No reviews match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={resetReviewFilters}>Clear Filters</Button>} />}
            {rTotal > 0 && <Pagination page={rPage} pageSize={rSize} total={rTotal} onPage={setRPage} onPageSize={(n) => { setRSize(n); setRPage(1); }} />}
          </div>
        </div>
      )}

      {/* ============ TESTIMONIALS TAB ============ */}
      {tab === 'testimonials' && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {tCards.map((c) => (
              <button key={c.label} onClick={c.apply} className="card p-4 text-left transition-colors hover:border-magenta-200">
                <p className="text-sm text-charcoal-muted">{c.label}</p>
                <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
              </button>
            ))}
          </div>

          <div className="card mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
                <input value={tq} onChange={(e) => { setTq(e.target.value); setTPage(1); }} placeholder="Search person or testimonial text…" aria-label="Search testimonials" className="input-base pl-9" />
              </div>
              <Select value={tStatus} onChange={(e) => { setTStatus(e.target.value); setTPage(1); }} className="sm:w-48">
                <option value="all">All statuses</option>
                {TESTIMONIAL_STATUSES.map((s) => <option key={s} value={s}>{TESTIMONIAL_STATUS_LABEL[s]}</option>)}
              </Select>
            </div>
            <div className="mt-3 text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{tTotal}</span> testimonial{tTotal === 1 ? '' : 's'}</div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Testimonial</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Display Placement</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {tPaged.map((t) => (
                    <tr key={t.id} className="group hover:bg-cream-100/50">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={t.personName} size="sm" />
                          <span><span className="block text-charcoal">{t.personName}</span><span className="block text-xs text-charcoal-muted">{t.role}</span></span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><button onClick={() => setSelTestimonial(t)} className="block max-w-[260px] truncate text-left text-charcoal-muted group-hover:text-magenta-700">"{t.body}"</button></td>
                      <td className="px-4 py-3 text-charcoal">{TESTIMONIAL_SOURCE_LABEL[t.sourceType]}</td>
                      <td className="px-4 py-3"><Badge tone="blue">{PLACEMENT_LABEL[t.placement]}</Badge></td>
                      <td className="px-4 py-3"><TestimonialStatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-charcoal-muted">{formatDate(t.lastUpdatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu
                            items={[
                              { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => setSelTestimonial(t) },
                              { label: 'Edit', onClick: () => setSelTestimonial(t), disabled: !canManageT, disabledHint: RESTRICTED_HINT },
                              ...(t.status !== 'published' ? [{ label: 'Publish', onClick: () => setTAction({ t, kind: 'publish' as const }), disabled: !canManageT, disabledHint: RESTRICTED_HINT }] : []),
                              ...(t.status !== 'hidden' ? [{ label: 'Hide', onClick: () => setTAction({ t, kind: 'hide' as const }), disabled: !canManageT, disabledHint: RESTRICTED_HINT }] : []),
                              ...(t.status === 'hidden' ? [{ label: 'Restore', onClick: () => setTAction({ t, kind: 'restore' as const }), disabled: !canManageT, disabledHint: RESTRICTED_HINT }] : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tTotal === 0 && <EmptyState icon={<MessageSquareQuote className="h-6 w-6" />} title="No testimonials" description="Add a testimonial or adjust the filters." action={canManageT ? <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => { setFromReview(null); setAddOpen(true); }}>Add Testimonial</Button> : undefined} />}
            {tTotal > 0 && <Pagination page={tPage} pageSize={tSize} total={tTotal} onPage={setTPage} onPageSize={(n) => { setTSize(n); setTPage(1); }} />}
          </div>
        </div>
      )}

      {/* Drawers */}
      <ReviewDrawer
        review={selReview}
        onClose={() => setSelReview(null)}
        onPublish={(r) => setReviewAction({ r, kind: 'publish' })}
        onHide={(r) => setReviewAction({ r, kind: 'hide' })}
        onRestore={(r) => setReviewAction({ r, kind: 'restore' })}
      />
      <TestimonialDrawer
        testimonial={selTestimonial}
        onClose={() => setSelTestimonial(null)}
        onPublish={(t) => setTAction({ t, kind: 'publish' })}
        onHide={(t) => setTAction({ t, kind: 'hide' })}
        onRestore={(t) => setTAction({ t, kind: 'restore' })}
      />

      {/* Modals */}
      <ConfirmModal open={reviewAction?.kind === 'publish'} title="Publish this review?" description="The review becomes visible on the connected app screen." confirmLabel="Publish" onConfirm={runReviewAction} onClose={() => setReviewAction(null)} />
      <ConfirmModal open={reviewAction?.kind === 'restore'} title="Restore this review?" description="The review returns to Published and becomes visible again." confirmLabel="Restore" onConfirm={runReviewAction} onClose={() => setReviewAction(null)} />
      <HideReasonModal open={reviewAction?.kind === 'hide'} title="Hide Review" onSubmit={(reason) => { if (reviewAction) { hideReview(reviewAction.r.id, reason, actor); toast('Review hidden.'); setSelReview(null); } }} onClose={() => setReviewAction(null)} />

      <ConfirmModal open={tAction?.kind === 'publish'} title="Publish this testimonial?" description="It appears only in its selected placement." confirmLabel="Publish" onConfirm={runTestimonialAction} onClose={() => setTAction(null)} />
      <ConfirmModal open={tAction?.kind === 'restore'} title="Restore this testimonial?" description="The testimonial returns to Published." confirmLabel="Restore" onConfirm={runTestimonialAction} onClose={() => setTAction(null)} />
      <HideReasonModal open={tAction?.kind === 'hide'} title="Hide Testimonial" onSubmit={(reason) => { if (tAction) { hideTestimonial(tAction.t.id, reason, actor); toast('Testimonial hidden.'); setSelTestimonial(null); } }} onClose={() => setTAction(null)} />

      <TestimonialFormModal open={addOpen} fromReview={fromReview} nextOrder={testimonials.length + 1} onClose={() => setAddOpen(false)} />
    </div>
  );
}
