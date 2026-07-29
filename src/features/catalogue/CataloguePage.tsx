import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Gauge,
  History,
  Info,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { PortfolioStatusBadge, VisibilityBadge } from '../../components/ui/PortfolioBadges';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input } from '../../components/ui/Field';
import { CorrectLocationModal, EditDiscoveryModal, ActivityScoreDrawer, AuditHistoryDrawer } from './CatalogueDrawers';
import { useData, setCatalogueHidden } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { exportCsv } from '../../lib/exportCsv';
import { timeAgo, formatNumber } from '../../lib/format';
import { catalogueVisibility, effectiveLocation } from '../../data/portfolioLogic';
import { PORTFOLIO_STATUSES, PORTFOLIO_STATUS_LABEL, VISIBILITIES, VISIBILITY_LABEL } from '../../config/portfolioLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { PortfolioRecord } from '../../types/portfolio';
import type { MembershipRecord, UserRecord } from '../../types/users';

const SORTS = [
  { key: 'updated', label: 'Recently Updated' },
  { key: 'views', label: 'Most Viewed' },
  { key: 'activity', label: 'Highest Activity' },
  { key: 'name_az', label: 'Name A–Z' },
  { key: 'name_za', label: 'Name Z–A' },
];
const ACTIVITY_LEVELS = [
  { key: 'any', label: 'Any activity' },
  { key: 'high', label: 'High (70+)' },
  { key: 'medium', label: 'Medium (40–69)' },
  { key: 'low', label: 'Low (<40)' },
];
const UPDATED = [
  { key: 'any', label: 'Any update' },
  { key: '7', label: 'Updated ≤ 7 days' },
  { key: '30', label: 'Updated ≤ 30 days' },
];

interface Row {
  p: PortfolioRecord;
  u?: UserRecord;
  m?: MembershipRecord;
  visibility: ReturnType<typeof catalogueVisibility>;
}

export function CataloguePage() {
  const { portfolios, users, memberships, audit } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<Row | null>(null);
  const [discoveryTarget, setDiscoveryTarget] = useState<PortfolioRecord | null>(null);
  const [activityTarget, setActivityTarget] = useState<Row | null>(null);
  const [auditTarget, setAuditTarget] = useState<Row | null>(null);
  const [hideTarget, setHideTarget] = useState<Row | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Row | null>(null);
  const [hideReason, setHideReason] = useState('');

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const domain = get('domain', 'all');
  const country = get('country', 'all');
  const city = get('city', 'all');
  const status = get('status', 'all');
  const vis = get('vis', 'all');
  const level = get('level', 'any');
  const updated = get('updated', 'any');
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
        return { p, u, m, visibility: catalogueVisibility(p, u, m) };
      }),
    [portfolios, users, memberships],
  );

  const domains = useMemo(() => [...new Set(rows.map((r) => r.p.domainGenre))].sort(), [rows]);
  const countries = useMemo(() => [...new Set(rows.map((r) => r.u?.country).filter(Boolean))] as string[], [rows]);
  const cities = useMemo(() => [...new Set(rows.map((r) => effectiveLocation(r.p, r.u).city))].sort(), [rows]);

  const filtered = useMemo(() => {
    let list = rows.filter(({ p, u, visibility }) => {
      const loc = effectiveLocation(p, u);
      if (q) {
        const hay = `${u?.name ?? ''} ${p.iicaId ?? ''} ${p.domainGenre} ${p.content.skills.join(' ')} ${loc.city} ${loc.country}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && p.category !== cat) return false;
      if (domain !== 'all' && p.domainGenre !== domain) return false;
      if (country !== 'all' && loc.country !== country) return false;
      if (city !== 'all' && loc.city !== city) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (vis !== 'all' && visibility !== vis) return false;
      if (level !== 'any') {
        const s = p.activityScore;
        if (level === 'high' && s < 70) return false;
        if (level === 'medium' && (s < 40 || s >= 70)) return false;
        if (level === 'low' && s >= 40) return false;
      }
      if (updated !== 'any' && (Date.now() - new Date(p.lastUpdatedAt).getTime()) / 86400000 > Number(updated)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'views':
          return b.p.profileViews - a.p.profileViews;
        case 'activity':
          return b.p.activityScore - a.p.activityScore;
        case 'name_az':
          return (a.u?.name ?? '').localeCompare(b.u?.name ?? '');
        case 'name_za':
          return (b.u?.name ?? '').localeCompare(a.u?.name ?? '');
        default:
          return +new Date(b.p.lastUpdatedAt) - +new Date(a.p.lastUpdatedAt);
      }
    });
    return list;
  }, [rows, q, cat, domain, country, city, status, vis, level, updated, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(() => {
    const published = rows.filter((r) => r.p.status === 'published').length;
    const draft = rows.filter((r) => r.p.status === 'draft').length;
    const hidden = rows.filter((r) => r.visibility === 'hidden').length;
    const attention = rows.filter((r) => r.p.status === 'submitted' || r.p.status === 'changes_requested' || r.p.reports.some((x) => x.status === 'open')).length;
    const recent = rows.filter((r) => (Date.now() - new Date(r.p.lastUpdatedAt).getTime()) / 86400000 <= 7).length;
    return { published, draft, hidden, attention, recent };
  }, [rows]);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (domain !== 'all') chips.push({ key: 'domain', label: domain });
  if (country !== 'all') chips.push({ key: 'country', label: country });
  if (city !== 'all') chips.push({ key: 'city', label: city });
  if (status !== 'all') chips.push({ key: 'status', label: PORTFOLIO_STATUS_LABEL[status as never] });
  if (vis !== 'all') chips.push({ key: 'vis', label: VISIBILITY_LABEL[vis as never] });
  if (level !== 'any') chips.push({ key: 'level', label: ACTIVITY_LEVELS.find((l) => l.key === level)!.label });
  if (updated !== 'any') chips.push({ key: 'updated', label: UPDATED.find((u) => u.key === updated)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const openReview = (id: string) => navigate(`/admin/portfolios/${id}`, { state: { from: '/admin/catalogue' } });

  const doExport = () => {
    exportCsv(
      'iica-catalogue.csv',
      filtered.map(({ p, u }) => {
        const loc = effectiveLocation(p, u);
        return {
          Profile: u?.name ?? '',
          'IICA ID': p.iicaId ?? '',
          Category: p.category,
          'Domain / Genre': p.domainGenre,
          City: loc.city,
          Country: loc.country,
          'Portfolio Status': PORTFOLIO_STATUS_LABEL[p.status],
          Visibility: catalogueVisibility(p, u, memberships.find((m) => m.userId === p.userId)),
          'Activity Score': p.activityScore,
          'Profile Views': p.profileViews,
        };
      }),
    );
    toast(`Exported ${filtered.length} catalogue profiles to CSV.`);
  };

  const doHide = () => {
    if (!hideTarget) return;
    if (!hideReason.trim()) {
      toast('A reason is required to hide a profile.', 'error');
      return;
    }
    setCatalogueHidden(hideTarget.p.id, true, hideReason.trim(), actor);
    toast(`${hideTarget.u?.name ?? 'Profile'} hidden from catalogue.`, 'info');
    setHideTarget(null);
    setHideReason('');
  };
  const doRestore = () => {
    if (!restoreTarget) return;
    setCatalogueHidden(restoreTarget.p.id, false, 'Restored to catalogue', actor);
    toast(`${restoreTarget.u?.name ?? 'Profile'} restored to catalogue.`);
    setRestoreTarget(null);
  };

  const selectCls = 'text-sm';
  const auditEntries = auditTarget
    ? audit.filter((a) => a.targetId === auditTarget.p.id || a.targetId === auditTarget.p.userId)
    : [];

  return (
    <div>
      <PageHeader
        title="Profile Catalogue"
        description="Manage catalogue visibility, profile information and discovery data."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={doExport}>
              Export Catalogue
            </Button>
            <Button variant="secondary" icon={<Settings className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
              Catalogue Settings
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Published Profiles', value: summary.published },
          { label: 'Draft Profiles', value: summary.draft },
          { label: 'Hidden Profiles', value: summary.hidden },
          { label: 'Needing Attention', value: summary.attention },
          { label: 'Recently Updated', value: summary.recent },
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
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search name, IICA ID, skill, genre or location…" aria-label="Search catalogue" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>Sort: {s.label}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={domain} onChange={(e) => update({ domain: e.target.value })}>
            <option value="all">All domains</option>
            {domains.map((d) => <option key={d}>{d}</option>)}
          </Select>
          <Select className={selectCls} value={country} onChange={(e) => update({ country: e.target.value })}>
            <option value="all">All countries</option>
            {countries.sort().map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={city} onChange={(e) => update({ city: e.target.value })}>
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {PORTFOLIO_STATUSES.map((s) => <option key={s} value={s}>{PORTFOLIO_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={vis} onChange={(e) => update({ vis: e.target.value })}>
            <option value="all">All visibility</option>
            {VISIBILITIES.map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
          </Select>
          <Select className={selectCls} value={level} onChange={(e) => update({ level: e.target.value })}>
            {ACTIVITY_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </Select>
          <Select className={selectCls} value={updated} onChange={(e) => update({ updated: e.target.value })}>
            {UPDATED.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Domain / Genre</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Portfolio</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((row) => {
                const { p, u } = row;
                const loc = effectiveLocation(p, u);
                return (
                  <tr key={p.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => openReview(p.id)} className="flex items-center gap-3 text-left">
                        <Avatar name={u?.name ?? '—'} size="sm" />
                        <span>
                          <span className="block font-medium text-charcoal group-hover:text-magenta-700">{u?.name ?? 'Unknown'}</span>
                          <span className="block text-xs text-charcoal-muted">{p.iicaId ?? '—'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-charcoal">{p.category}</td>
                    <td className="px-4 py-3 text-charcoal">{p.domainGenre}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-charcoal">
                        {loc.city}
                        {loc.corrected && (
                          <span title="Admin-corrected (internal)" className="text-magenta-500"><MapPin className="h-3 w-3" /></span>
                        )}
                      </span>
                      <span className="block text-xs text-charcoal-muted">{loc.country}</span>
                    </td>
                    <td className="px-4 py-3"><PortfolioStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3"><VisibilityBadge visibility={row.visibility} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setActivityTarget(row)} className="inline-flex items-center gap-1.5 font-medium text-charcoal hover:text-magenta-700">
                        <Gauge className="h-3.5 w-3.5 text-magenta-500" />{p.activityScore}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatNumber(p.profileViews)}</td>
                    <td className="px-4 py-3 text-charcoal-muted">{timeAgo(p.lastUpdatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'View Catalogue Profile', icon: <Eye className="h-4 w-4" />, onClick: () => openReview(p.id) },
                            { label: 'Open Portfolio', icon: <FolderOpen className="h-4 w-4" />, onClick: () => openReview(p.id) },
                            { label: 'View Activity Breakdown', icon: <ActivityIcon className="h-4 w-4" />, onClick: () => setActivityTarget(row) },
                            { label: 'View Audit History', icon: <History className="h-4 w-4" />, onClick: () => setAuditTarget(row) },
                            { divider: true, label: 'd' },
                            { label: 'Edit Discovery Data', icon: <Pencil className="h-4 w-4" />, disabled: !abilities.manageCatalogue, disabledHint: RESTRICTED_HINT, onClick: () => setDiscoveryTarget(p) },
                            { label: 'Correct Location', icon: <MapPin className="h-4 w-4" />, disabled: !abilities.correctLocation, disabledHint: RESTRICTED_HINT, onClick: () => setLocationTarget(row) },
                            row.visibility === 'hidden'
                              ? { label: 'Restore to Catalogue', icon: <RotateCcw className="h-4 w-4" />, disabled: !abilities.manageCatalogue, disabledHint: RESTRICTED_HINT, onClick: () => setRestoreTarget(row) }
                              : { label: 'Hide from Catalogue', icon: <EyeOff className="h-4 w-4" />, danger: true, disabled: !abilities.manageCatalogue || row.visibility === 'ineligible', disabledHint: row.visibility === 'ineligible' ? 'Ineligible profiles are already excluded.' : RESTRICTED_HINT, onClick: () => setHideTarget(row) },
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
          <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No profiles match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear All</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>

      {/* Modals & drawers */}
      <CorrectLocationModal portfolio={locationTarget?.p ?? null} user={locationTarget?.u} onClose={() => setLocationTarget(null)} />
      <EditDiscoveryModal portfolio={discoveryTarget} onClose={() => setDiscoveryTarget(null)} />
      <ActivityScoreDrawer portfolio={activityTarget?.p ?? null} user={activityTarget?.u} onClose={() => setActivityTarget(null)} />
      <AuditHistoryDrawer open={!!auditTarget} title={auditTarget?.u?.name ?? ''} entries={auditEntries} onClose={() => setAuditTarget(null)} />

      <ConfirmDialog
        open={!!restoreTarget}
        title={`Restore ${restoreTarget?.u?.name ?? 'profile'} to catalogue?`}
        description="The profile becomes visible in discovery again (subject to eligibility)."
        confirmLabel="Restore"
        onConfirm={doRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <Modal
        open={!!hideTarget}
        onClose={() => { setHideTarget(null); setHideReason(''); }}
        title={`Hide ${hideTarget?.u?.name ?? 'profile'} from catalogue?`}
        description="The profile stays intact but won't appear in discovery."
        footer={
          <>
            <Button variant="secondary" onClick={() => { setHideTarget(null); setHideReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={doHide}>Hide profile</Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="hide-reason" required>
          <Input id="hide-reason" value={hideReason} onChange={(e) => setHideReason(e.target.value)} placeholder="Why is this profile being hidden?" />
        </Field>
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Catalogue Settings" description="How discovery & catalogue visibility work.">
        <div className="space-y-3 text-sm text-charcoal">
          <div className="flex items-start gap-2.5 rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-muted" />
            <p className="text-charcoal-muted">
              Catalogue visibility is computed automatically. A profile is <span className="font-medium text-charcoal">Ineligible</span> when
              membership is inactive, the portfolio is not published, or the account is suspended. Eligible profiles are
              <span className="font-medium text-charcoal"> Visible</span> unless an admin hides them.
            </p>
          </div>
          <ul className="list-inside list-disc space-y-1 text-charcoal-muted">
            <li>Featured placement is earned automatically through activity — there is no manual "featured" override.</li>
            <li>Discovery ranking uses activity signals, never follower count.</li>
            <li>Admins may correct inaccurate self-reported locations through the logged correction flow.</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
