import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, CalendarClock, Search, Sparkles, ShieldAlert, User as UserIcon, Users as UsersIcon, X, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { RequestStatusBadge, MeetingStatusBadge, MatchScore } from '../../components/ui/CollaborationBadges';
import { useData } from '../../data/store';
import { formatDate } from '../../lib/format';
import {
  INTENT_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUSES,
  PROGRESS_LABEL,
  PROGRESS_STATUSES,
  MEETING_STATUS_LABEL,
  MEETING_STATUSES,
  SCORE_RANGES,
} from '../../config/collaborationLabels';
import type { CollaborationRecord } from '../../types/collaborations';

const SORTS = [
  { key: 'newest', label: 'Recently Created' },
  { key: 'score', label: 'Highest Match Score' },
  { key: 'oldest', label: 'Oldest Requests' },
  { key: 'meeting', label: 'Upcoming Meetings' },
  { key: 'updated', label: 'Recently Updated' },
];

const isPending = (c: CollaborationRecord) => c.requestStatus === 'request_sent' || c.requestStatus === 'pending_response';
const isActive = (c: CollaborationRecord) => ['discussion_scheduled', 'in_discussion', 'confirmed'].includes(c.progress);
const isMeetingScheduled = (c: CollaborationRecord) => c.meeting?.status === 'scheduled';
const openReports = (c: CollaborationRecord) => c.reports.filter((r) => r.status !== 'dismissed').length;

export function CollaborationsPage() {
  const { collaborations } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const bucket = get('bucket', 'all');
  const req = get('req', 'all');
  const prog = get('prog', 'all');
  const meet = get('meet', 'all');
  const cat = get('cat', 'all');
  const score = get('score', 'any');
  const sort = get('sort', 'newest');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all' || v === 'any') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const applyBucket = (b: string) => {
    const next = new URLSearchParams();
    if (b !== 'all') next.set('bucket', b);
    setParams(next, { replace: true });
  };

  const inBucket = (c: CollaborationRecord): boolean => {
    switch (bucket) {
      case 'pending': return isPending(c);
      case 'accepted': return c.requestStatus === 'accepted';
      case 'meetings': return isMeetingScheduled(c);
      case 'active': return isActive(c);
      case 'reported': return openReports(c) > 0;
      default: return true;
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    collaborations.forEach((c) => {
      if (c.initiator.membershipCategory) set.add(c.initiator.membershipCategory);
      if (c.invited.membershipCategory) set.add(c.invited.membershipCategory);
    });
    return [...set].sort();
  }, [collaborations]);

  const filtered = useMemo(() => {
    const minScore = SCORE_RANGES.find((r) => r.key === score)?.min ?? 0;
    let list = collaborations.filter((c) => {
      if (!inBucket(c)) return false;
      if (q) {
        const hay = `${c.id} ${c.initiator.name} ${c.invited.name} ${c.proposalTitle}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (req !== 'all' && c.requestStatus !== req) return false;
      if (prog !== 'all' && c.progress !== prog) return false;
      if (meet !== 'all' && (c.meeting?.status ?? 'not_scheduled') !== meet) return false;
      if (cat !== 'all' && c.initiator.membershipCategory !== cat && c.invited.membershipCategory !== cat) return false;
      if (c.matchScore < minScore) return false;
      return true;
    });
    const meetingTime = (c: CollaborationRecord) => (c.meeting?.confirmedAt || c.meeting?.proposedAt ? +new Date(c.meeting.confirmedAt || c.meeting.proposedAt!) : Infinity);
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'score': return b.matchScore - a.matchScore;
        case 'oldest': return +new Date(a.requestDate) - +new Date(b.requestDate);
        case 'updated': return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        case 'meeting': return meetingTime(a) - meetingTime(b);
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborations, q, bucket, req, prog, meet, cat, score, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(() => ({
    total: collaborations.length,
    pending: collaborations.filter(isPending).length,
    accepted: collaborations.filter((c) => c.requestStatus === 'accepted').length,
    meetings: collaborations.filter(isMeetingScheduled).length,
    active: collaborations.filter(isActive).length,
    reported: collaborations.filter((c) => openReports(c) > 0).length,
  }), [collaborations]);

  const cards = [
    { label: 'Total Collaborations', value: summary.total, bucket: 'all' },
    { label: 'Pending Requests', value: summary.pending, bucket: 'pending' },
    { label: 'Accepted', value: summary.accepted, bucket: 'accepted' },
    { label: 'Meetings Scheduled', value: summary.meetings, bucket: 'meetings' },
    { label: 'Active Collaborations', value: summary.active, bucket: 'active' },
    { label: 'Reported', value: summary.reported, bucket: 'reported' },
  ];

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (bucket !== 'all') chips.push({ key: 'bucket', label: cards.find((c) => c.bucket === bucket)?.label ?? bucket });
  if (req !== 'all') chips.push({ key: 'req', label: REQUEST_STATUS_LABEL[req as never] });
  if (prog !== 'all') chips.push({ key: 'prog', label: PROGRESS_LABEL[prog as never] });
  if (meet !== 'all') chips.push({ key: 'meet', label: MEETING_STATUS_LABEL[meet as never] });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (score !== 'any') chips.push({ key: 'score', label: SCORE_RANGES.find((r) => r.key === score)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string, tab?: string) => navigate(`/admin/collaborations/${id}${tab ? `?tab=${tab}` : ''}`, { state: { from: `/admin/collaborations?${params.toString()}` } });
  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Collaborations"
        description="Monitor creator matches, collaboration requests and scheduled meetings."
        actions={<Button variant="secondary" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => navigate('/admin/collaboration-settings')}>Matching Settings</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => applyBucket(c.bucket)}
            className={`card p-4 text-left transition-colors hover:border-magenta-200 ${bucket === c.bucket ? 'ring-1 ring-magenta-300' : ''}`}
          >
            <p className="text-sm text-charcoal-muted">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search collaboration ID or creator name…" aria-label="Search collaborations" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-56">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select className={selectCls} value={req} onChange={(e) => update({ req: e.target.value })}>
            <option value="all">All request status</option>
            {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={prog} onChange={(e) => update({ prog: e.target.value })}>
            <option value="all">All collaboration status</option>
            {PROGRESS_STATUSES.map((s) => <option key={s} value={s}>{PROGRESS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={meet} onChange={(e) => update({ meet: e.target.value })}>
            <option value="all">All meeting status</option>
            {MEETING_STATUSES.map((s) => <option key={s} value={s}>{MEETING_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All creator categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={score} onChange={(e) => update({ score: e.target.value })}>
            {SCORE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> collaboration{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: chip.key === 'score' ? 'any' : '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Collaboration</th>
                <th className="px-4 py-3">Initiated By</th>
                <th className="px-4 py-3">Invited Creator</th>
                <th className="px-4 py-3">Match Score</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Request Status</th>
                <th className="px-4 py-3">Meeting Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((c) => {
                const reported = openReports(c) > 0;
                return (
                  <tr key={c.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => detail(c.id)} className="text-left">
                        <span className="block max-w-[200px] truncate font-medium text-charcoal group-hover:text-magenta-700">{c.proposalTitle}</span>
                        <span className="block text-xs text-charcoal-muted">{c.id}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar name={c.initiator.name} size="sm" />
                        <span>
                          <span className="block text-charcoal">{c.initiator.name}</span>
                          <span className="block text-xs text-charcoal-muted">{c.initiator.membershipCategory ?? '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar name={c.invited.name} size="sm" />
                        <span>
                          <span className="block text-charcoal">{c.invited.name}</span>
                          <span className="block text-xs text-charcoal-muted">{c.invited.membershipCategory ?? '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><MatchScore score={c.matchScore} size="sm" /></td>
                    <td className="px-4 py-3 text-charcoal">{INTENT_LABEL[c.intent]}</td>
                    <td className="px-4 py-3"><RequestStatusBadge status={c.requestStatus} /></td>
                    <td className="px-4 py-3"><MeetingStatusBadge status={c.meeting?.status ?? 'not_scheduled'} /></td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'View Collaboration', icon: <Eye className="h-4 w-4" />, onClick: () => detail(c.id) },
                            { label: 'Open Initiator Profile', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${c.initiator.userId}`) },
                            { label: 'Open Invited Creator Profile', icon: <UsersIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${c.invited.userId}`) },
                            { label: 'View Meeting', icon: <CalendarClock className="h-4 w-4" />, disabled: !c.meeting, disabledHint: 'No meeting scheduled yet.', onClick: () => detail(c.id, 'meeting') },
                            ...(reported ? [{ label: 'Review Report', icon: <ShieldAlert className="h-4 w-4" />, onClick: () => detail(c.id, 'reports') }] : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No collaborations match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>
    </div>
  );
}
