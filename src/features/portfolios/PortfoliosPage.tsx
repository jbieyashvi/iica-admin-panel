import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  Search,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortfolioStatusBadge, VisibilityBadge } from '../../components/ui/PortfolioBadges';
import { MembershipStatusBadge } from '../../components/ui/StatusBadge';
import { PortfolioGuidelinesDrawer } from './PortfolioModals';
import { useData } from '../../data/store';
import { formatDate, timeAgo } from '../../lib/format';
import {
  catalogueVisibility,
  completionChecklist,
  completionPercent,
  isEligible,
} from '../../data/portfolioLogic';
import { PORTFOLIO_STATUSES, PORTFOLIO_STATUS_LABEL } from '../../config/portfolioLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import type { PortfolioRecord } from '../../types/portfolio';
import type { MembershipRecord, UserRecord } from '../../types/users';

const SORTS = [
  { key: 'updated', label: 'Recently Updated' },
  { key: 'submitted', label: 'Recently Submitted' },
  { key: 'completion', label: 'Completion' },
  { key: 'name_az', label: 'Name A–Z' },
];
const COMPLETION = [
  { key: 'any', label: 'Any completion' },
  { key: 'low', label: '< 50%' },
  { key: 'mid', label: '50–80%' },
  { key: 'high', label: '> 80%' },
];
interface Row {
  p: PortfolioRecord;
  u?: UserRecord;
  m?: MembershipRecord;
  completion: number;
  eligible: boolean;
}

export function PortfoliosPage() {
  const { portfolios, users, memberships } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const completion = get('completion', 'any');
  const status = get('status', 'all');
  const vis = get('vis', 'all');
  const sort = get('sort', 'updated');
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

  const rows: Row[] = useMemo(
    () =>
      portfolios.map((p) => {
        const u = users.find((x) => x.id === p.userId);
        const m = memberships.find((x) => x.userId === p.userId);
        const items = completionChecklist(p.content, true, true);
        // A not-started portfolio always reads 0% — completion measures actual
        // portfolio fields, never membership/registration progress.
        return {
          p,
          u,
          m,
          completion: p.status === 'not_started' ? 0 : completionPercent(items),
          eligible: isEligible(u, m),
        };
      }),
    [portfolios, users, memberships],
  );

  // Visibility shown in the table: eligible members use catalogue visibility;
  // historical (expired / cancelled / suspended) records read Hidden.
  const visOf = (row: Row) => (row.eligible ? catalogueVisibility(row.p, row.u, row.m) : 'hidden');

  const filtered = useMemo(() => {
    let list = rows.filter((row) => {
      const { p, u, completion: c } = row;
      if (q) {
        const hay = `${u?.name ?? ''} ${p.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && p.category !== cat) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (vis !== 'all' && visOf(row) !== vis) return false;
      if (completion === 'low' && c >= 50) return false;
      if (completion === 'mid' && (c < 50 || c > 80)) return false;
      if (completion === 'high' && c <= 80) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'submitted':
          return +new Date(b.p.lastSubmittedAt ?? 0) - +new Date(a.p.lastSubmittedAt ?? 0);
        case 'completion':
          return b.completion - a.completion;
        case 'name_az':
          return (a.u?.name ?? '').localeCompare(b.u?.name ?? '');
        default:
          return +new Date(b.p.lastUpdatedAt) - +new Date(a.p.lastUpdatedAt);
      }
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, cat, status, vis, completion, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (status !== 'all') chips.push({ key: 'status', label: PORTFOLIO_STATUS_LABEL[status as never] });
  if (vis !== 'all') chips.push({ key: 'vis', label: vis });
  if (completion !== 'any') chips.push({ key: 'completion', label: COMPLETION.find((c) => c.key === completion)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const view = (id: string) => navigate(`/admin/portfolios/${id}`, { state: { from: `/admin/portfolios?${params.toString()}` } });

  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Portfolios"
        description="View creator portfolios, completion and visibility."
        actions={
          <Button variant="secondary" icon={<BookOpen className="h-4 w-4" />} onClick={() => setGuidelinesOpen(true)}>Portfolio Guidelines</Button>
        }
      />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search creator or IICA ID…" aria-label="Search portfolios" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {PORTFOLIO_STATUSES.map((s) => <option key={s} value={s}>{PORTFOLIO_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={vis} onChange={(e) => update({ vis: e.target.value })}>
            <option value="all">All visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="ineligible">Ineligible</option>
          </Select>
          <Select className={selectCls} value={completion} onChange={(e) => update({ completion: e.target.value })}>
            {COMPLETION.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> result{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">
              {chip.label}<X className="h-3 w-3" />
            </button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear All</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">IICA ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3">Portfolio Status</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Membership Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((row) => {
                const { p, u } = row;
                const memberStatus = u?.membershipStatus ?? 'not_started';
                const subLabel = row.eligible
                  ? 'Eligible'
                  : memberStatus === 'expired' ? 'Membership Expired'
                  : memberStatus === 'cancelled' ? 'Membership Cancelled'
                  : memberStatus === 'suspended' ? 'Membership Suspended'
                  : 'Ineligible';
                return (
                  <tr key={p.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => view(p.id)} className="flex items-center gap-3 text-left">
                        <Avatar name={u?.name ?? '—'} size="sm" />
                        <span>
                          <span className="block font-medium text-charcoal group-hover:text-magenta-700">{u?.name ?? 'Unknown'}</span>
                          <span className={`block text-xs ${row.eligible ? 'text-emerald-600' : 'text-charcoal-muted'}`}>{subLabel}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">{p.iicaId ?? '—'}</td>
                    <td className="px-4 py-3 text-charcoal">{p.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cream-100">
                          <span className="block h-full rounded-full bg-magenta-500" style={{ width: `${row.completion}%` }} />
                        </span>
                        <span className="text-xs font-medium text-charcoal">{row.completion}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PortfolioStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3"><VisibilityBadge visibility={visOf(row)} /></td>
                    <td className="px-4 py-3"><MembershipStatusBadge status={memberStatus} /></td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(p.lastSubmittedAt)}</td>
                    <td className="px-4 py-3 text-charcoal-muted">{timeAgo(p.lastUpdatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'View Portfolio', icon: <Eye className="h-4 w-4" />, onClick: () => view(p.id) },
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
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No portfolios match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear All</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>

      <PortfolioGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </div>
  );
}
