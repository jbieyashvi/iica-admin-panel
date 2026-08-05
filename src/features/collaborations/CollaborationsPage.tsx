import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Search, Sparkles, User as UserIcon, Users as UsersIcon, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../data/store';
import { formatDate } from '../../lib/format';
import { FORMAT_LABEL } from '../../config/collaborationLabels';
import { collabStatus, MATCH_SOURCE_LABEL, COLLAB_STATUS_KEYS } from '../../config/collabStatus';
import type { CollaborationRecord } from '../../types/collaborations';

const SORTS = [
  { key: 'newest', label: 'Recently Created' },
  { key: 'oldest', label: 'Oldest Requests' },
];

// Admin sees ACTUAL sent collaboration requests only — Suggested Matches (private
// discovery / swipe behaviour) are never surfaced here.
const isSentRequest = (c: CollaborationRecord) => c.requestStatus !== 'suggested';

export function CollaborationsPage() {
  const { collaborations } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const status = get('status', 'all');
  const src = get('src', 'all');
  const cat = get('cat', 'all');
  const sort = get('sort', 'newest');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (!v || v === 'all') next.delete(k); else next.set(k, v); });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const requests = useMemo(() => collaborations.filter(isSentRequest), [collaborations]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((c) => { if (c.invited.primaryCategory) set.add(c.invited.primaryCategory); if (c.initiator.primaryCategory) set.add(c.initiator.primaryCategory); });
    return [...set].sort();
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests.filter((c) => {
      if (q) { const hay = `${c.id} ${c.initiator.name} ${c.invited.name} ${c.proposalTitle}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
      if (status !== 'all' && collabStatus(c).key !== status) return false;
      if (src !== 'all' && c.matchSource !== src) return false;
      if (cat !== 'all' && c.invited.primaryCategory !== cat && c.initiator.primaryCategory !== cat) return false;
      return true;
    });
    list = [...list].sort((a, b) => (sort === 'oldest' ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt)));
    return list;
  }, [requests, q, status, src, cat, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (status !== 'all') chips.push({ key: 'status', label: COLLAB_STATUS_KEYS.find((s) => s.key === status)?.label ?? status });
  if (src !== 'all') chips.push({ key: 'src', label: MATCH_SOURCE_LABEL[src as never] });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/collaborations/${id}`, { state: { from: `/admin/collaborations?${params.toString()}` } });
  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader title="Collaborations" description="Actual collaboration requests sent between creators — via natural-language match or a direct profile request." />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search collaboration ID, requirement or creator…" aria-label="Search collaborations" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {COLLAB_STATUS_KEYS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <Select className={selectCls} value={src} onChange={(e) => update({ src: e.target.value })}>
            <option value="all">All match sources</option>
            <option value="natural_language">Natural Language Match</option>
            <option value="direct_profile">Direct Profile Request</option>
          </Select>
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All genres / skills</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> request{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Requirement / Title</th>
                <th className="px-4 py-3">Sender</th>
                <th className="px-4 py-3">Selected Creator</th>
                <th className="px-4 py-3">Genre / Skill</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Match Source</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((c) => {
                const st = collabStatus(c);
                return (
                  <tr key={c.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-2.5">
                      <button onClick={() => detail(c.id)} className="text-left">
                        <span className="block max-w-[220px] truncate font-medium text-charcoal group-hover:text-magenta-700">{c.proposalTitle}</span>
                        <span className="block font-mono text-xs text-charcoal-muted">{c.id}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Avatar name={c.initiator.name} size="sm" /><span className="block max-w-[130px] truncate text-charcoal">{c.initiator.name}</span></span></td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Avatar name={c.invited.name} size="sm" /><span className="block max-w-[130px] truncate text-charcoal">{c.invited.name}</span></span></td>
                    <td className="px-4 py-2.5 text-charcoal">{c.invited.primaryCategory}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{FORMAT_LABEL[c.preferredFormat]}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted"><span className="block max-w-[160px] truncate">{c.preferredLocation}</span></td>
                    <td className="px-4 py-2.5"><Badge tone={c.matchSource === 'natural_language' ? 'magenta' : 'blue'}>{MATCH_SOURCE_LABEL[c.matchSource]}</Badge></td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-2.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <DropdownMenu items={[
                          { label: 'View Collaboration', icon: <Eye className="h-4 w-4" />, onClick: () => detail(c.id) },
                          { label: 'Open Sender Profile', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${c.initiator.userId}`) },
                          { label: 'Open Selected Creator Profile', icon: <UsersIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${c.invited.userId}`) },
                        ]} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No collaboration requests match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>
    </div>
  );
}
