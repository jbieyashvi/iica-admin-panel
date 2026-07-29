import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Ban,
  Download,
  Eye,
  FolderOpen,
  Activity as ActivityIcon,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tooltip } from '../../components/ui/Tooltip';
import { AccountTypeBadge, MembershipStatusBadge } from '../../components/ui/StatusBadge';
import { AddUserModal } from './AddUserModal';
import { SuspendModal } from './SuspendModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useData, reactivateUser } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { exportCsv } from '../../lib/exportCsv';
import { formatDate, timeAgo } from '../../lib/format';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABEL,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_STATUS_LABEL,
} from '../../config/userLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { UserRecord } from '../../types/users';

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'active', label: 'Recently Active' },
  { key: 'name_az', label: 'Name A–Z' },
  { key: 'name_za', label: 'Name Z–A' },
];
const JOINED = [
  { key: 'any', label: 'Any join date' },
  { key: '7', label: 'Joined ≤ 7 days' },
  { key: '30', label: 'Joined ≤ 30 days' },
  { key: '90', label: 'Joined ≤ 90 days' },
];
const ACTIVE = [
  { key: 'any', label: 'Any activity' },
  { key: '1', label: 'Active ≤ 24h' },
  { key: '7', label: 'Active ≤ 7 days' },
  { key: '30', label: 'Active ≤ 30 days' },
];

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

export function UsersPage() {
  const { users } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<UserRecord | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<UserRecord | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const type = get('type', 'all');
  const cat = get('cat', 'all');
  const status = get('status', 'all');
  const country = get('country', 'all');
  const city = get('city', 'all');
  const joined = get('joined', 'any');
  const active = get('active', 'any');
  const sort = get('sort', 'newest');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all' || v === 'any' || (k === 'q' && !v)) next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const countries = useMemo(() => [...new Set(users.map((u) => u.country))].sort(), [users]);
  const cities = useMemo(() => [...new Set(users.map((u) => u.city))].sort(), [users]);

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      if (q) {
        const hay = `${u.name} ${u.email} ${u.phone} ${u.iicaId ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (type !== 'all' && u.accountType !== type) return false;
      if (cat !== 'all' && u.membershipCategory !== cat) return false;
      if (status !== 'all' && u.membershipStatus !== status) return false;
      if (country !== 'all' && u.country !== country) return false;
      if (city !== 'all' && u.city !== city) return false;
      if (joined !== 'any' && daysSince(u.joinedAt) > Number(joined)) return false;
      if (active !== 'any' && daysSince(u.lastActiveAt) > Number(active)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return +new Date(a.joinedAt) - +new Date(b.joinedAt);
        case 'active':
          return +new Date(b.lastActiveAt) - +new Date(a.lastActiveAt);
        case 'name_az':
          return a.name.localeCompare(b.name);
        case 'name_za':
          return b.name.localeCompare(a.name);
        default:
          return +new Date(b.joinedAt) - +new Date(a.joinedAt);
      }
    });
    return list;
  }, [users, q, type, cat, status, country, city, joined, active, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(() => {
    return {
      total: users.length,
      guests: users.filter((u) => u.accountType === 'guest').length,
      registered: users.filter((u) => u.accountType === 'registered').length,
      creators: users.filter((u) => u.membershipStatus === 'active').length,
      suspended: users.filter((u) => u.membershipStatus === 'suspended').length,
    };
  }, [users]);

  // Active filter chips
  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (type !== 'all') chips.push({ key: 'type', label: ACCOUNT_TYPE_LABEL[type as never] });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (status !== 'all') chips.push({ key: 'status', label: MEMBERSHIP_STATUS_LABEL[status as never] });
  if (country !== 'all') chips.push({ key: 'country', label: country });
  if (city !== 'all') chips.push({ key: 'city', label: city });
  if (joined !== 'any') chips.push({ key: 'joined', label: JOINED.find((j) => j.key === joined)!.label });
  if (active !== 'any') chips.push({ key: 'active', label: ACTIVE.find((a) => a.key === active)!.label });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const openDetail = (id: string, tab?: string) => {
    navigate(`/admin/users/${id}${tab ? `?tab=${tab}` : ''}`, { state: { from: location.search } });
  };

  const doExport = () => {
    exportCsv(
      'iica-users.csv',
      filtered.map((u) => ({
        Name: u.name,
        Email: u.email,
        Phone: u.phone,
        'Account Type': ACCOUNT_TYPE_LABEL[u.accountType],
        Category: u.membershipCategory ?? '',
        'IICA ID': u.iicaId ?? '',
        Status: MEMBERSHIP_STATUS_LABEL[u.membershipStatus],
        City: u.city,
        Country: u.country,
        Joined: formatDate(u.joinedAt),
      })),
    );
    toast(`Exported ${filtered.length} users to CSV.`);
  };

  const doReactivate = () => {
    if (!reactivateTarget) return;
    reactivateUser(reactivateTarget.id, actor);
    toast(`${reactivateTarget.name}'s account reactivated.`);
    setReactivateTarget(null);
  };

  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage guests, registered users and creator accounts."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={doExport}>
              Export Users
            </Button>
            <Tooltip label={abilities.editUsers ? '' : RESTRICTED_HINT} side="bottom">
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)} disabled={!abilities.editUsers}>
                Add User
              </Button>
            </Tooltip>
          </>
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total Users', value: summary.total },
          { label: 'Guests', value: summary.guests },
          { label: 'Registered Users', value: summary.registered },
          { label: 'Active Creators', value: summary.creators },
          { label: 'Suspended Accounts', value: summary.suspended },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-sm text-charcoal-muted">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search by name, email, phone or IICA ID…"
              aria-label="Search users"
              className="input-base pl-9"
            />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-44">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                Sort: {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <Select className={selectCls} value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="all">All types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {MEMBERSHIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MEMBERSHIP_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={country} onChange={(e) => update({ country: e.target.value })}>
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select className={selectCls} value={city} onChange={(e) => update({ city: e.target.value })}>
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select className={selectCls} value={joined} onChange={(e) => update({ joined: e.target.value })}>
            {JOINED.map((j) => (
              <option key={j.key} value={j.key}>
                {j.label}
              </option>
            ))}
          </Select>
          <Select className={selectCls} value={active} onChange={(e) => update({ active: e.target.value })}>
            {ACTIVE.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Chips + count */}
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((u) => (
                <tr key={u.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(u.id)} className="flex items-center gap-3 text-left">
                      <Avatar name={u.name} />
                      <span>
                        <span className="block font-medium text-charcoal group-hover:text-magenta-700">{u.name}</span>
                        <span className="block text-xs text-charcoal-muted">{u.iicaId ?? '—'}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-charcoal">{u.email}</span>
                    <span className="block text-xs text-charcoal-muted">{u.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AccountTypeBadge type={u.accountType} />
                  </td>
                  <td className="px-4 py-3 text-charcoal">{u.membershipCategory ?? <span className="text-charcoal-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="block text-charcoal">{u.city}</span>
                    <span className="block text-xs text-charcoal-muted">{u.country}</span>
                  </td>
                  <td className="px-4 py-3">
                    <MembershipStatusBadge status={u.membershipStatus} />
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(u.joinedAt)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{timeAgo(u.lastActiveAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => openDetail(u.id) },
                          { label: 'View Portfolio', icon: <FolderOpen className="h-4 w-4" />, onClick: () => openDetail(u.id, 'portfolio') },
                          { label: 'View Orders', icon: <ShoppingCart className="h-4 w-4" />, onClick: () => openDetail(u.id, 'purchases') },
                          { label: 'View Activity', icon: <ActivityIcon className="h-4 w-4" />, onClick: () => openDetail(u.id, 'activity') },
                          { divider: true, label: 'd' },
                          u.membershipStatus === 'suspended'
                            ? {
                                label: 'Reactivate Account',
                                icon: <RotateCcw className="h-4 w-4" />,
                                onClick: () => setReactivateTarget(u),
                                disabled: !abilities.suspendUsers,
                                disabledHint: RESTRICTED_HINT,
                              }
                            : {
                                label: 'Suspend Account',
                                icon: <Ban className="h-4 w-4" />,
                                danger: true,
                                onClick: () => setSuspendTarget(u),
                                disabled: !abilities.suspendUsers,
                                disabledHint: RESTRICTED_HINT,
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
            icon={<UsersIcon className="h-6 w-6" />}
            title="No users match your filters"
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

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SuspendModal user={suspendTarget} open={!!suspendTarget} onClose={() => setSuspendTarget(null)} />
      <ConfirmDialog
        open={!!reactivateTarget}
        title={`Reactivate ${reactivateTarget?.name ?? 'account'}?`}
        description="This restores the account and, where applicable, its active membership."
        confirmLabel="Reactivate"
        onConfirm={doReactivate}
        onCancel={() => setReactivateTarget(null)}
      />
    </div>
  );
}
