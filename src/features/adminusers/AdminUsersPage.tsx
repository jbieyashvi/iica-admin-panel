import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, KeyRound, Lock, Pencil, Power, Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import type { MenuItem } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { AdminStatusBadge, AdminRoleBadge } from '../../components/ui/AdminBadges';
import { useData, isLastActiveSuper } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { useActor } from '../../lib/useActor';
import { formatDate } from '../../lib/format';
import { ROLES, ROLE_OPTIONS, ACCESS_LABEL } from '../../config/roles';
import { AddAdminModal, EditAdminModal, ResetPasswordModal, StatusModal, CredentialsModal } from './adminModals';
import type { AdminUserRecord } from '../../types/admins';
import type { AdminRole } from '../../types';

const SORTS = [
  { key: 'added', label: 'Recently Added' },
  { key: 'updated', label: 'Recently Updated' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'login', label: 'Last Login' },
];
const STATUSES = ['active', 'inactive'] as const;

export function AdminUsersPage() {
  const { adminUsers } = useData();
  const { abilities } = useActor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const canManage = abilities.manageAdmins;
  const selfId = user?.id;

  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<AdminUserRecord | null>(null);
  const [reset, setReset] = useState<AdminUserRecord | null>(null);
  const [status, setStatus] = useState<AdminUserRecord | null>(null);
  const [created, setCreated] = useState<{ record: AdminUserRecord; password: string } | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const role = get('role', 'all');
  const st = get('status', 'all');
  const sort = get('sort', 'added');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (!v || v === 'all') next.delete(k); else next.set(k, v); });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = adminUsers.filter((a) => {
      if (q) {
        const hay = `${a.id} ${a.name} ${a.email} ${a.phone}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (role !== 'all' && a.role !== role) return false;
      if (st !== 'all' && a.status !== st) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'updated': return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        case 'name': return a.name.localeCompare(b.name);
        case 'login': return +new Date(b.lastLoginAt ?? 0) - +new Date(a.lastLoginAt ?? 0);
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
  }, [adminUsers, q, role, st, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (role !== 'all') chips.push({ key: 'role', label: ROLES[role as AdminRole].label });
  if (st !== 'all') chips.push({ key: 'status', label: st === 'active' ? 'Active' : 'Inactive' });
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  function rowActions(a: AdminUserRecord): MenuItem[] {
    const items: MenuItem[] = [{ label: 'View Admin', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/admin/admin-users/${a.id}`) }];
    if (!canManage) return items;
    const isSelf = a.id === selfId;
    items.push({ label: 'Edit Admin', icon: <Pencil className="h-4 w-4" />, onClick: () => setEdit(a) });
    if (!isSelf) items.push({ label: 'Reset Password', icon: <KeyRound className="h-4 w-4" />, onClick: () => setReset(a) });
    if (a.status === 'active') {
      const locked = isSelf || isLastActiveSuper(a.id);
      items.push({ label: 'Deactivate', icon: <Power className="h-4 w-4" />, danger: true, disabled: locked, disabledHint: isSelf ? 'You cannot deactivate your own account.' : 'At least one active Super Admin is required.', onClick: () => setStatus(a) });
    } else {
      items.push({ label: 'Activate', icon: <Power className="h-4 w-4" />, onClick: () => setStatus(a) });
    }
    return items;
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Admin Users" description="Manage Admin accounts, roles and platform access." />
        <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Only a Super Admin can manage Admin Users." /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Manage Admin accounts, roles and platform access."
        actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Admin User</Button>}
      />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search name, Admin ID, email or phone…" aria-label="Search admin users" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-56">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={role} onChange={(e) => update({ role: e.target.value })} className="text-sm">
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
          <Select value={st} onChange={(e) => update({ status: e.target.value })} className="text-sm">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'active' ? 'Active' : 'Inactive'}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> admin user{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Admin User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((a) => (
                <tr key={a.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/admin/admin-users/${a.id}`)} className="flex items-center gap-2.5 text-left">
                      <Avatar name={a.name} size="sm" />
                      <span>
                        <span className="block font-medium text-charcoal group-hover:text-magenta-700">{a.name}{a.id === selfId && <span className="ml-1 text-xs text-charcoal-muted">(You)</span>}</span>
                        <span className="block text-xs text-charcoal-muted">{a.id}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-charcoal">{a.email}</span>
                    <span className="block text-xs text-charcoal-muted">{a.phone}</span>
                  </td>
                  <td className="px-4 py-3"><AdminRoleBadge role={a.role} /></td>
                  <td className="px-4 py-3 text-charcoal-muted">{ACCESS_LABEL[a.role]}</td>
                  <td className="px-4 py-3"><AdminStatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-charcoal-muted">{a.lastLoginAt ? formatDate(a.lastLoginAt) : '—'}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><DropdownMenu items={rowActions(a)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No admin users match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />}
        {total > 0 && <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />}
      </div>

      {addOpen && <AddAdminModal onClose={() => setAddOpen(false)} onCreated={(record, password) => { setAddOpen(false); setCreated({ record, password }); }} />}
      {edit && <EditAdminModal admin={edit} onClose={() => setEdit(null)} />}
      {reset && <ResetPasswordModal admin={reset} onClose={() => setReset(null)} onReset={(password) => { setReset(null); setCreated({ record: reset, password }); }} />}
      {status && <StatusModal admin={status} onClose={() => setStatus(null)} />}
      {created && <CredentialsModal record={created.record} password={created.password} onClose={() => setCreated(null)} />}
    </div>
  );
}
