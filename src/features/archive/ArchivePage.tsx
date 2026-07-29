import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileWarning,
  FolderOpen,
  History,
  MessageSquareWarning,
  Play,
  RotateCcw,
  Search,
  Upload,
  Video,
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
import { ArchiveStatusBadge, YtStatusBadge } from '../../components/ui/EventBadges';
import { ArchiveRequestChangesModal, ArchiveHideModal, ArchiveGuidelinesDrawer } from './ArchiveModals';
import { AuditHistoryDrawer } from '../catalogue/CatalogueDrawers';
import { useData, publishArchive, restoreArchive } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { exportCsv } from '../../lib/exportCsv';
import { formatDate, formatDuration, timeAgo, formatNumber } from '../../lib/format';
import { isEligible } from '../../data/portfolioLogic';
import {
  ARCHIVE_STATUSES,
  ARCHIVE_STATUS_LABEL,
  YT_STATUSES,
  YT_STATUS_LABEL,
} from '../../config/eventLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { ArchiveRecord } from '../../types/events';
import type { UserRecord } from '../../types/users';

const SORTS = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'views', label: 'Most Viewed' },
  { key: 'reported', label: 'Most Reported' },
  { key: 'creator', label: 'Creator A–Z' },
];
const REPORTED = [
  { key: 'any', label: 'All content' },
  { key: 'reported', label: 'Reported only' },
];
const ADDED = [
  { key: 'any', label: 'Any add date' },
  { key: '30', label: 'Added ≤ 30 days' },
  { key: '90', label: 'Added ≤ 90 days' },
];

function Thumb({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-charcoal/80 text-white">
        <Play className="h-4 w-4" />
      </span>
    );
  }
  return (
    <img
      src={`https://i.ytimg.com/vi/${id}/default.jpg`}
      alt=""
      onError={() => setBroken(true)}
      className="h-10 w-16 shrink-0 rounded-md object-cover"
    />
  );
}

interface Row {
  a: ArchiveRecord;
  u?: UserRecord;
  eligibleToPublish: boolean;
  openReports: number;
}

export function ArchivePage() {
  const { archives, users, memberships, portfolios, audit } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [changesTarget, setChangesTarget] = useState<Row | null>(null);
  const [hideTarget, setHideTarget] = useState<ArchiveRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<Row | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Row | null>(null);
  const [auditTarget, setAuditTarget] = useState<Row | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const status = get('status', 'all');
  const yt = get('yt', 'all');
  const cat = get('cat', 'all');
  const reported = get('reported', 'any');
  const added = get('added', 'any');
  const sort = get('sort', 'recent');
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
      archives.map((a) => {
        const u = users.find((x) => x.id === a.userId);
        const m = memberships.find((x) => x.userId === a.userId);
        const p = portfolios.find((x) => x.id === a.portfolioId);
        return {
          a,
          u,
          eligibleToPublish: isEligible(u, m) && p?.status === 'published',
          openReports: a.reports.filter((r) => r.status !== 'dismissed' && r.status !== 'action_taken').length,
        };
      }),
    [archives, users, memberships, portfolios],
  );

  const filtered = useMemo(() => {
    let list = rows.filter(({ a, u, openReports }) => {
      if (q) {
        const hay = `${a.title} ${u?.name ?? ''} ${a.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (status !== 'all' && a.archiveStatus !== status) return false;
      if (yt !== 'all' && a.youtubeStatus !== yt) return false;
      if (cat !== 'all' && a.category !== cat) return false;
      if (reported === 'reported' && openReports === 0) return false;
      if (added !== 'any' && (Date.now() - new Date(a.addedAt).getTime()) / 86400000 > Number(added)) return false;
      return true;
    });
    list = [...list].sort((x, y) => {
      switch (sort) {
        case 'oldest':
          return +new Date(x.a.addedAt) - +new Date(y.a.addedAt);
        case 'views':
          return y.a.views - x.a.views;
        case 'reported':
          return y.openReports - x.openReports;
        case 'creator':
          return (x.u?.name ?? '').localeCompare(y.u?.name ?? '');
        default:
          return +new Date(y.a.addedAt) - +new Date(x.a.addedAt);
      }
    });
    return list;
  }, [rows, q, status, yt, cat, reported, added, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(
    () => ({
      total: archives.length,
      published: archives.filter((a) => a.archiveStatus === 'published').length,
      awaiting: archives.filter((a) => a.archiveStatus === 'awaiting_review').length,
      hidden: archives.filter((a) => a.archiveStatus === 'hidden').length,
      reported: archives.reduce((s, a) => s + a.reports.filter((r) => r.status !== 'dismissed').length, 0),
      broken: archives.filter((a) => a.youtubeStatus === 'unavailable' || a.youtubeStatus === 'invalid_url').length,
    }),
    [archives],
  );

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (status !== 'all') chips.push({ key: 'status', label: ARCHIVE_STATUS_LABEL[status as never] });
  if (yt !== 'all') chips.push({ key: 'yt', label: YT_STATUS_LABEL[yt as never] });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (reported !== 'any') chips.push({ key: 'reported', label: 'Reported only' });
  if (added !== 'any') chips.push({ key: 'added', label: ADDED.find((a) => a.key === added)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const review = (id: string) => navigate(`/admin/archive/${id}`, { state: { from: `/admin/archive?${params.toString()}` } });

  const doExport = () => {
    exportCsv(
      'iica-archive.csv',
      filtered.map(({ a, u }) => ({
        Title: a.title,
        Creator: u?.name ?? '',
        'IICA ID': a.iicaId ?? '',
        Category: a.category,
        'Archive Status': ARCHIVE_STATUS_LABEL[a.archiveStatus],
        'YouTube Status': YT_STATUS_LABEL[a.youtubeStatus],
        Views: a.views,
        Reports: a.reports.length,
        Added: formatDate(a.addedAt),
      })),
    );
    toast(`Exported ${filtered.length} archive videos to CSV.`);
  };

  const doPublish = () => {
    if (!publishTarget) return;
    publishArchive(publishTarget.a.id, actor);
    toast(`"${publishTarget.a.title}" published to Archive.`);
    setPublishTarget(null);
  };
  const doRestore = () => {
    if (!restoreTarget) return;
    restoreArchive(restoreTarget.a.id, actor);
    toast('Video restored to Archive.');
    setRestoreTarget(null);
  };

  const auditEntries = auditTarget ? audit.filter((x) => x.targetId === auditTarget.a.id || x.targetId === auditTarget.a.portfolioId) : [];
  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Archive"
        description="Moderate YouTube videos shared through creator portfolios."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={doExport}>Export Archive</Button>
            <Button variant="secondary" icon={<BookOpen className="h-4 w-4" />} onClick={() => setGuidelinesOpen(true)}>Archive Guidelines</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Videos', value: summary.total },
          { label: 'Published', value: summary.published },
          { label: 'Awaiting Review', value: summary.awaiting },
          { label: 'Hidden', value: summary.hidden },
          { label: 'Reported', value: summary.reported },
          { label: 'Broken Links', value: summary.broken },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-sm text-charcoal-muted">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search video title, creator or IICA ID…" aria-label="Search archive" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {ARCHIVE_STATUSES.map((s) => <option key={s} value={s}>{ARCHIVE_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={yt} onChange={(e) => update({ yt: e.target.value })}>
            <option value="all">All link states</option>
            {YT_STATUSES.map((s) => <option key={s} value={s}>{YT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={reported} onChange={(e) => update({ reported: e.target.value })}>
            {REPORTED.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <Select className={selectCls} value={added} onChange={(e) => update({ added: e.target.value })}>
            {ADDED.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> result{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear All</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">YouTube</th>
                <th className="px-4 py-3">Archive</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((row) => {
                const { a, u } = row;
                return (
                  <tr key={a.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => review(a.id)} className="flex items-center gap-3 text-left">
                        <Thumb id={a.youtubeId} />
                        <span className="min-w-0">
                          <span className="block max-w-[220px] truncate font-medium text-charcoal group-hover:text-magenta-700">{a.title}</span>
                          <span className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                            <Video className="h-3 w-3" /> YouTube · {formatDuration(a.durationSec)} · {formatNumber(a.views)} views
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar name={u?.name ?? '—'} size="sm" />
                        <span>
                          <span className="block text-charcoal">{u?.name ?? 'Unknown'}</span>
                          <span className="block text-xs text-charcoal-muted">{a.iicaId ?? '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal">{a.category}</td>
                    <td className="px-4 py-3"><YtStatusBadge status={a.youtubeStatus} /></td>
                    <td className="px-4 py-3"><ArchiveStatusBadge status={a.archiveStatus} /></td>
                    <td className="px-4 py-3">{row.openReports > 0 ? <Badge tone="red">{row.openReports}</Badge> : <span className="text-charcoal-muted">—</span>}</td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(a.publishedAt)}</td>
                    <td className="px-4 py-3 text-charcoal-muted">{timeAgo(a.lastUpdatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'Review Video', icon: <Eye className="h-4 w-4" />, onClick: () => review(a.id) },
                            { label: 'Open YouTube', icon: <ExternalLink className="h-4 w-4" />, onClick: () => window.open(a.youtubeUrl, '_blank') },
                            { label: 'Open Creator Portfolio', icon: <FolderOpen className="h-4 w-4" />, onClick: () => navigate(`/admin/portfolios/${a.portfolioId}`) },
                            { label: 'View Reports', icon: <MessageSquareWarning className="h-4 w-4" />, onClick: () => review(a.id) },
                            { label: 'View Audit History', icon: <History className="h-4 w-4" />, onClick: () => setAuditTarget(row) },
                            { divider: true, label: 'd' },
                            { label: 'Request Changes', icon: <FileWarning className="h-4 w-4" />, disabled: !abilities.manageArchive, disabledHint: RESTRICTED_HINT, onClick: () => setChangesTarget(row) },
                            a.archiveStatus === 'hidden'
                              ? { label: 'Restore to Archive', icon: <RotateCcw className="h-4 w-4" />, disabled: !abilities.manageArchive, disabledHint: RESTRICTED_HINT, onClick: () => setRestoreTarget(row) }
                              : a.archiveStatus === 'published'
                                ? { label: 'Hide from Archive', icon: <EyeOff className="h-4 w-4" />, danger: true, disabled: !abilities.manageArchive, disabledHint: RESTRICTED_HINT, onClick: () => setHideTarget(a) }
                                : { label: 'Publish to Archive', icon: <Upload className="h-4 w-4" />, disabled: !abilities.manageArchive || !row.eligibleToPublish, disabledHint: !abilities.manageArchive ? RESTRICTED_HINT : 'Linked portfolio must be published and membership eligible.', onClick: () => setPublishTarget(row) },
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
        {total === 0 && <EmptyState icon={<Video className="h-6 w-6" />} title="No videos match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear All</Button>} />}
        {total > 0 && <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />}
      </div>

      <ArchiveRequestChangesModal archive={changesTarget?.a ?? null} creatorName={changesTarget?.u?.name} onClose={() => setChangesTarget(null)} />
      <ArchiveHideModal archive={hideTarget} onClose={() => setHideTarget(null)} />
      <ArchiveGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <AuditHistoryDrawer open={!!auditTarget} title={auditTarget?.a.title ?? ''} entries={auditEntries} onClose={() => setAuditTarget(null)} />
      <ConfirmDialog open={!!publishTarget} title={`Publish "${publishTarget?.a.title ?? ''}"?`} description="Makes the video visible in the public Archive. Content status only — not creator verification." confirmLabel="Publish" onConfirm={doPublish} onCancel={() => setPublishTarget(null)} />
      <ConfirmDialog open={!!restoreTarget} title="Restore video to Archive?" description="Confirms link validity and restores public Archive and Watch visibility." confirmLabel="Restore" onConfirm={doRestore} onCancel={() => setRestoreTarget(null)} />
    </div>
  );
}
