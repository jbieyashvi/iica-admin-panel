import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  Download,
  Eye,
  RefreshCw,
  Search,
  Settings,
  User as UserIcon,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { MembershipStatusBadge, PurchaseStatusBadge } from '../../components/ui/StatusBadge';
import { MembershipSettingsModal } from './MembershipSettingsModal';
import { useData } from '../../data/store';
import { toast } from '../../components/ui/toast';
import { exportCsv } from '../../lib/exportCsv';
import { formatDate, timeAgo } from '../../lib/format';
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_STATUS_LABEL,
  PURCHASE_PLATFORMS,
  PURCHASE_PLATFORM_LABEL,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABEL,
} from '../../config/userLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import type { MembershipRecord, UserRecord } from '../../types/users';

const SORTS = [
  { key: 'updated', label: 'Recently Updated' },
  { key: 'newest', label: 'Newest' },
  { key: 'name_az', label: 'Name A–Z' },
  { key: 'renewal', label: 'Renewal Soonest' },
];
const RENEWAL = [
  { key: 'any', label: 'Any renewal' },
  { key: '7', label: 'Renewal ≤ 7 days' },
  { key: '30', label: 'Renewal ≤ 30 days' },
  { key: '60', label: 'Renewal ≤ 60 days' },
];

const daysUntil = (iso?: string | null) =>
  iso ? (new Date(iso).getTime() - Date.now()) / 86400000 : Infinity;

interface JoinedRow {
  m: MembershipRecord;
  u?: UserRecord;
}

export function MembershipsPage() {
  const { memberships, users } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const platform = get('platform', 'all');
  const purchase = get('purchase', 'all');
  const status = get('status', 'all');
  const country = get('country', 'all');
  const renewal = get('renewal', 'any');
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

  const rows: JoinedRow[] = useMemo(
    () => memberships.map((m) => ({ m, u: users.find((u) => u.id === m.userId) })),
    [memberships, users],
  );

  const countries = useMemo(() => [...new Set(rows.map((r) => r.u?.country).filter(Boolean))] as string[], [rows]);

  const filtered = useMemo(() => {
    let list = rows.filter(({ m, u }) => {
      if (q) {
        const hay = `${u?.name ?? ''} ${u?.email ?? ''} ${m.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && m.category !== cat) return false;
      if (platform !== 'all' && m.purchasePlatform !== platform) return false;
      if (purchase !== 'all' && m.purchaseStatus !== purchase) return false;
      if (status !== 'all' && m.membershipStatus !== status) return false;
      if (country !== 'all' && u?.country !== country) return false;
      if (renewal !== 'any') {
        const d = daysUntil(m.renewalDate);
        if (!(d >= 0 && d <= Number(renewal))) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return +new Date(b.m.form.submittedAt) - +new Date(a.m.form.submittedAt);
        case 'name_az':
          return (a.u?.name ?? '').localeCompare(b.u?.name ?? '');
        case 'renewal':
          return daysUntil(a.m.renewalDate) - daysUntil(b.m.renewalDate);
        default:
          return +new Date(b.m.lastUpdatedAt) - +new Date(a.m.lastUpdatedAt);
      }
    });
    return list;
  }, [rows, q, cat, platform, purchase, status, country, renewal, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(
    () => ({
      total: memberships.length,
      active: memberships.filter((m) => m.membershipStatus === 'active').length,
      pending: memberships.filter((m) => m.membershipStatus === 'purchase_pending').length,
      renewal: memberships.filter((m) => m.membershipStatus === 'renewal_due').length,
      ended: memberships.filter((m) => m.membershipStatus === 'expired' || m.membershipStatus === 'cancelled').length,
    }),
    [memberships],
  );

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (platform !== 'all') chips.push({ key: 'platform', label: PURCHASE_PLATFORM_LABEL[platform as never] });
  if (purchase !== 'all') chips.push({ key: 'purchase', label: PURCHASE_STATUS_LABEL[purchase as never] });
  if (status !== 'all') chips.push({ key: 'status', label: MEMBERSHIP_STATUS_LABEL[status as never] });
  if (country !== 'all') chips.push({ key: 'country', label: country });
  if (renewal !== 'any') chips.push({ key: 'renewal', label: RENEWAL.find((r) => r.key === renewal)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const openDetail = (id: string) => navigate(`/admin/memberships/${id}`, { state: { from: location.search } });

  const doExport = () => {
    exportCsv(
      'iica-memberships.csv',
      filtered.map(({ m, u }) => ({
        Creator: u?.name ?? '',
        'IICA ID': m.iicaId ?? '',
        Category: m.category,
        Platform: PURCHASE_PLATFORM_LABEL[m.purchasePlatform],
        'Purchase Status': PURCHASE_STATUS_LABEL[m.purchaseStatus],
        'Membership Status': MEMBERSHIP_STATUS_LABEL[m.membershipStatus],
        Start: formatDate(m.startDate),
        Renewal: formatDate(m.renewalDate),
      })),
    );
    toast(`Exported ${filtered.length} memberships to CSV.`);
  };

  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Memberships"
        description="Track creator applications, IICA IDs and in-app purchases."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={doExport}>
              Export Memberships
            </Button>
            <Button variant="secondary" icon={<Settings className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
              Membership Settings
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total Applications', value: summary.total },
          { label: 'Active Memberships', value: summary.active },
          { label: 'Purchase Pending', value: summary.pending },
          { label: 'Renewal Due', value: summary.renewal },
          { label: 'Expired / Cancelled', value: summary.ended },
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
            <input
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search by creator name, email or IICA ID…"
              aria-label="Search memberships"
              className="input-base pl-9"
            />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                Sort: {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={platform} onChange={(e) => update({ platform: e.target.value })}>
            <option value="all">All platforms</option>
            {PURCHASE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PURCHASE_PLATFORM_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={purchase} onChange={(e) => update({ purchase: e.target.value })}>
            <option value="all">All purchases</option>
            {PURCHASE_STATUSES.map((p) => (
              <option key={p} value={p}>
                {PURCHASE_STATUS_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {MEMBERSHIP_STATUSES.filter((s) => s !== 'not_applicable').map((s) => (
              <option key={s} value={s}>
                {MEMBERSHIP_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={country} onChange={(e) => update({ country: e.target.value })}>
            <option value="all">All countries</option>
            {countries.sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select className={selectCls} value={renewal} onChange={(e) => update({ renewal: e.target.value })}>
            {RENEWAL.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted">
            <span className="font-medium text-charcoal">{total}</span> result{total === 1 ? '' : 's'}
          </span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => update({ [chip.key]: '' })}
              className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {chips.length > 0 && (
            <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">IICA ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Purchase</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Renewal / Expiry</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map(({ m, u }) => (
                <tr key={m.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(m.id)} className="flex items-center gap-3 text-left">
                      <Avatar name={u?.name ?? '—'} size="sm" />
                      <span>
                        <span className="block font-medium text-charcoal group-hover:text-magenta-700">{u?.name ?? 'Unknown'}</span>
                        <span className="block text-xs text-charcoal-muted">{u?.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-charcoal">{m.iicaId ?? '—'}</td>
                  <td className="px-4 py-3 text-charcoal">{m.category}</td>
                  <td className="px-4 py-3 text-charcoal">{PURCHASE_PLATFORM_LABEL[m.purchasePlatform]}</td>
                  <td className="px-4 py-3">
                    <PurchaseStatusBadge status={m.purchaseStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <MembershipStatusBadge status={m.membershipStatus} />
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(m.startDate)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    {m.membershipStatus === 'expired' ? formatDate(m.expiryDate) : formatDate(m.renewalDate)}
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{timeAgo(m.lastUpdatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => openDetail(m.id) },
                          { label: 'View User', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${m.userId}`) },
                          { divider: true, label: 'd' },
                          {
                            label: 'Resend IICA ID',
                            icon: <Bell className="h-4 w-4" />,
                            disabled: !m.iicaId,
                            disabledHint: 'No IICA ID generated yet.',
                            onClick: () => toast('IICA ID notification resent (simulated).', 'info'),
                          },
                          {
                            label: 'Refresh Purchase Status',
                            icon: <RefreshCw className="h-4 w-4" />,
                            onClick: () => toast('Purchase status refreshed from store (simulated).', 'info'),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total === 0 && (
          <EmptyState
            icon={<BadgeCheck className="h-6 w-6" />}
            title="No memberships match your filters"
            description="Try adjusting or clearing the filters above."
            action={
              <Button variant="secondary" onClick={clearAll}>
                Clear All
              </Button>
            }
          />
        )}

        {total > 0 && (
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            onPage={(p) => update({ page: String(p) }, false)}
            onPageSize={(n) => update({ size: String(n) })}
          />
        )}
      </div>

      <MembershipSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
