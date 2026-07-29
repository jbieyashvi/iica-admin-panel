import { useMemo, useState } from 'react';
import { Eye, Search, Star, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { StarRating } from '../../components/ui/ReviewBadges';
import { ReviewDrawer } from './ReviewDrawer';
import { DeleteReviewModal } from './reviewModals';
import { useData, deleteReview } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import { REVIEW_TYPE_LABEL, REVIEW_TYPES } from '../../config/reviewLabels';
import type { ReviewRecord } from '../../types/reviews';

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

export function ReviewsPage() {
  const { reviews } = useData();
  const { abilities, actor } = useActor();

  const [rq, setRq] = useState('');
  const [rType, setRType] = useState('all');
  const [rRating, setRRating] = useState('all');
  const [rDate, setRDate] = useState('any');
  const [rSort, setRSort] = useState('newest');
  const [rPage, setRPage] = useState(1);
  const [rSize, setRSize] = useState(10);

  const [selReview, setSelReview] = useState<ReviewRecord | null>(null);
  const [reviewDelete, setReviewDelete] = useState<ReviewRecord | null>(null);

  const canModerate = abilities.reviewsModerate;

  const filtered = useMemo(() => {
    let list = reviews.filter((r) => {
      if (rq) {
        const hay = `${r.reviewerName} ${r.title ?? ''} ${r.body} ${r.targetName}`.toLowerCase();
        if (!hay.includes(rq.toLowerCase())) return false;
      }
      if (rType !== 'all' && r.type !== rType) return false;
      if (rRating !== 'all' && r.rating !== Number(rRating)) return false;
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
  }, [reviews, rq, rType, rRating, rDate, rSort]);

  const total = filtered.length;
  const paged = filtered.slice((rPage - 1) * rSize, rPage * rSize);

  function resetFilters() { setRq(''); setRType('all'); setRRating('all'); setRDate('any'); setRSort('newest'); setRPage(1); }

  const chips: { label: string; clear: () => void }[] = [];
  if (rq) chips.push({ label: `Search: ${rq}`, clear: () => setRq('') });
  if (rType !== 'all') chips.push({ label: REVIEW_TYPE_LABEL[rType as never], clear: () => setRType('all') });
  if (rRating !== 'all') chips.push({ label: `${rRating} star`, clear: () => setRRating('all') });
  if (rDate !== 'any') chips.push({ label: DATE_RANGES.find((d) => d.key === rDate)!.label, clear: () => setRDate('any') });

  const runDelete = (reason: string) => {
    if (!reviewDelete) return;
    deleteReview(reviewDelete.id, reason, actor);
    toast('Review deleted.');
    setSelReview(null);
    setReviewDelete(null);
  };

  return (
    <div>
      <PageHeader title="Reviews" description="View and manage reviews submitted by users." />

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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select className="text-sm" value={rType} onChange={(e) => { setRType(e.target.value); setRPage(1); }}>
            <option value="all">All types</option>
            {REVIEW_TYPES.map((t) => <option key={t} value={t}>{REVIEW_TYPE_LABEL[t]}</option>)}
          </Select>
          <Select className="text-sm" value={rRating} onChange={(e) => { setRRating(e.target.value); setRPage(1); }}>
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
          </Select>
          <Select className="text-sm" value={rDate} onChange={(e) => { setRDate(e.target.value); setRPage(1); }}>
            {DATE_RANGES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> review{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip, i) => (
            <button key={i} onClick={() => { chip.clear(); setRPage(1); }} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={resetFilters} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Review For</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((r) => (
                <tr key={r.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={r.reviewerName} size="sm" />
                      <span className="flex items-center gap-1.5 text-charcoal">{r.reviewerName}{r.reviewerType === 'guest' && <Badge tone="neutral">Guest</Badge>}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="block max-w-[180px] truncate text-charcoal">{r.targetName}</span></td>
                  <td className="px-4 py-3"><Badge tone="magenta">{REVIEW_TYPE_LABEL[r.type]}</Badge></td>
                  <td className="px-4 py-3"><StarRating value={r.rating} /></td>
                  <td className="px-4 py-3"><button onClick={() => setSelReview(r)} className="block max-w-[220px] truncate text-left text-charcoal-muted group-hover:text-magenta-700">{r.title ? `${r.title} — ` : ''}{r.body}</button></td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(r.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Review', icon: <Eye className="h-4 w-4" />, onClick: () => setSelReview(r) },
                          { label: 'Delete Review', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setReviewDelete(r), disabled: !canModerate, disabledHint: RESTRICTED_HINT },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && <EmptyState icon={<Star className="h-6 w-6" />} title="No reviews match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={resetFilters}>Clear Filters</Button>} />}
        {total > 0 && <Pagination page={rPage} pageSize={rSize} total={total} onPage={setRPage} onPageSize={(n) => { setRSize(n); setRPage(1); }} />}
      </div>

      <ReviewDrawer review={selReview} onClose={() => setSelReview(null)} onDelete={(r) => setReviewDelete(r)} />
      <DeleteReviewModal review={reviewDelete} onSubmit={runDelete} onClose={() => setReviewDelete(null)} />
    </div>
  );
}
