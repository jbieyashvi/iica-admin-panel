import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileWarning,
  FolderOpen,
  History,
  MessageSquareWarning,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PortfolioStatusBadge, VisibilityBadge } from '../../components/ui/PortfolioBadges';
import { RequestChangesModal, UnpublishModal, PortfolioGuidelinesDrawer } from './PortfolioModals';
import { useData, publishPortfolio } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { formatDate, timeAgo } from '../../lib/format';
import {
  catalogueVisibility,
  completionChecklist,
  completionPercent,
  requiredComplete,
  isEligible,
} from '../../data/portfolioLogic';
import { PORTFOLIO_STATUSES, PORTFOLIO_STATUS_LABEL } from '../../config/portfolioLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { RESTRICTED_HINT } from '../../lib/abilities';
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
const REPORTED = [
  { key: 'any', label: 'All content' },
  { key: 'reported', label: 'Reported only' },
];
const SUBMITTED = [
  { key: 'any', label: 'Any submission' },
  { key: '7', label: 'Submitted ≤ 7 days' },
  { key: '30', label: 'Submitted ≤ 30 days' },
];

interface Row {
  p: PortfolioRecord;
  u?: UserRecord;
  m?: MembershipRecord;
  completion: number;
  eligible: boolean;
  requiredDone: boolean;
  openReports: number;
}

export function PortfoliosPage() {
  const { portfolios, users, memberships } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [changesTarget, setChangesTarget] = useState<Row | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<PortfolioRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<Row | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const completion = get('completion', 'any');
  const status = get('status', 'all');
  const vis = get('vis', 'all');
  const reported = get('reported', 'any');
  const submitted = get('submitted', 'any');
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
        return {
          p,
          u,
          m,
          completion: completionPercent(items),
          eligible: isEligible(u, m),
          requiredDone: requiredComplete(items),
          openReports: p.reports.filter((r) => r.status === 'open').length,
        };
      }),
    [portfolios, users, memberships],
  );

  const filtered = useMemo(() => {
    let list = rows.filter((row) => {
      const { p, u, completion: c, openReports } = row;
      if (q) {
        const hay = `${u?.name ?? ''} ${p.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && p.category !== cat) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (vis !== 'all' && catalogueVisibility(p, u, row.m) !== vis) return false;
      if (reported === 'reported' && openReports === 0) return false;
      if (completion === 'low' && c >= 50) return false;
      if (completion === 'mid' && (c < 50 || c > 80)) return false;
      if (completion === 'high' && c <= 80) return false;
      if (submitted !== 'any') {
        if (!p.lastSubmittedAt) return false;
        if ((Date.now() - new Date(p.lastSubmittedAt).getTime()) / 86400000 > Number(submitted)) return false;
      }
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
  }, [rows, q, cat, status, vis, reported, completion, submitted, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (status !== 'all') chips.push({ key: 'status', label: PORTFOLIO_STATUS_LABEL[status as never] });
  if (vis !== 'all') chips.push({ key: 'vis', label: vis });
  if (completion !== 'any') chips.push({ key: 'completion', label: COMPLETION.find((c) => c.key === completion)!.label });
  if (reported !== 'any') chips.push({ key: 'reported', label: 'Reported only' });
  if (submitted !== 'any') chips.push({ key: 'submitted', label: SUBMITTED.find((s) => s.key === submitted)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const review = (id: string) => navigate(`/admin/portfolios/${id}`, { state: { from: `/admin/portfolios?${params.toString()}` } });

  const doPublish = () => {
    if (!publishTarget) return;
    publishPortfolio(publishTarget.p.id, actor);
    toast(`${publishTarget.u?.name ?? 'Portfolio'} published.`);
    setPublishTarget(null);
  };

  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Portfolios"
        description="Review portfolio completeness, publishing state and reported content."
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

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
          <Select className={selectCls} value={reported} onChange={(e) => update({ reported: e.target.value })}>
            {REPORTED.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <Select className={selectCls} value={submitted} onChange={(e) => update({ submitted: e.target.value })}>
            {SUBMITTED.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Reported</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((row) => {
                const { p, u } = row;
                return (
                  <tr key={p.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => review(p.id)} className="flex items-center gap-3 text-left">
                        <Avatar name={u?.name ?? '—'} size="sm" />
                        <span>
                          <span className="block font-medium text-charcoal group-hover:text-magenta-700">{u?.name ?? 'Unknown'}</span>
                          <span className="block text-xs">
                            {row.eligible ? <span className="text-emerald-600">Eligible</span> : <span className="text-charcoal-muted">Ineligible membership</span>}
                          </span>
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
                    <td className="px-4 py-3"><VisibilityBadge visibility={catalogueVisibility(p, u, row.m)} /></td>
                    <td className="px-4 py-3">
                      {row.openReports > 0 ? <Badge tone="red">{row.openReports} reported</Badge> : <span className="text-charcoal-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(p.lastSubmittedAt)}</td>
                    <td className="px-4 py-3 text-charcoal-muted">{timeAgo(p.lastUpdatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'Review Portfolio', icon: <Eye className="h-4 w-4" />, onClick: () => review(p.id) },
                            { label: 'Preview Public Portfolio', icon: <FolderOpen className="h-4 w-4" />, onClick: () => review(p.id) },
                            { label: 'View Reports', icon: <MessageSquareWarning className="h-4 w-4" />, onClick: () => review(p.id) },
                            { label: 'View History', icon: <History className="h-4 w-4" />, onClick: () => review(p.id) },
                            { divider: true, label: 'd' },
                            {
                              label: 'Request Changes',
                              icon: <FileWarning className="h-4 w-4" />,
                              disabled: !abilities.moderatePortfolio,
                              disabledHint: RESTRICTED_HINT,
                              onClick: () => setChangesTarget(row),
                            },
                            p.status === 'published'
                              ? {
                                  label: 'Unpublish',
                                  icon: <FolderOpen className="h-4 w-4" />,
                                  danger: true,
                                  disabled: !abilities.publishPortfolio,
                                  disabledHint: RESTRICTED_HINT,
                                  onClick: () => setUnpublishTarget(p),
                                }
                              : {
                                  label: 'Publish',
                                  icon: <Upload className="h-4 w-4" />,
                                  disabled: !abilities.publishPortfolio || !row.eligible || !row.requiredDone,
                                  disabledHint: !abilities.publishPortfolio
                                    ? RESTRICTED_HINT
                                    : !row.eligible
                                      ? 'Requires an active creator membership.'
                                      : 'Required sections are incomplete.',
                                  onClick: () => setPublishTarget(row),
                                },
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

      <RequestChangesModal portfolio={changesTarget?.p ?? null} creatorName={changesTarget?.u?.name} onClose={() => setChangesTarget(null)} />
      <UnpublishModal portfolio={unpublishTarget} onClose={() => setUnpublishTarget(null)} />
      <PortfolioGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <ConfirmDialog
        open={!!publishTarget}
        title={`Publish ${publishTarget?.u?.name ?? 'portfolio'}?`}
        description="Makes the portfolio catalogue-visible. This is a content status, not creator verification."
        confirmLabel="Publish"
        onConfirm={doPublish}
        onCancel={() => setPublishTarget(null)}
      />
    </div>
  );
}
