import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, Lock, Minus, Pencil, Power } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { AdminStatusBadge, AdminRoleBadge } from '../../components/ui/AdminBadges';
import { useData, isLastActiveSuper } from '../../data/store';
import { useAuth } from '../../context/AuthContext';
import { useActor } from '../../lib/useActor';
import { formatDate, formatDateTime } from '../../lib/format';
import { ROLES, ACCESS_LABEL, hasPermission } from '../../config/roles';
import { abilitiesFor } from '../../lib/abilities';
import type { Abilities } from '../../lib/abilities';
import { EditAdminModal, ResetPasswordModal, StatusModal, CredentialsModal } from './adminModals';
import type { AdminUserRecord } from '../../types/admins';
import type { Permission } from '../../types';

const TABS = [{ key: 'overview', label: 'Overview' }, { key: 'access', label: 'Access' }];

interface ModuleRow {
  label: string;
  perm: Permission;
  edit?: keyof Abilities;
  fin?: keyof Abilities;
  admin?: keyof Abilities;
}
const MODULES: ModuleRow[] = [
  { label: 'Dashboard', perm: 'view_dashboard' },
  { label: 'Users', perm: 'manage_users', edit: 'editUsers' },
  { label: 'Catalogue', perm: 'manage_catalogue', edit: 'manageCatalogue' },
  { label: 'Portfolios', perm: 'moderate_portfolios', edit: 'moderatePortfolio' },
  { label: 'Collaborations', perm: 'manage_collaborations', edit: 'collabBlock' },
  { label: 'Archive', perm: 'manage_archive', edit: 'manageArchive' },
  { label: 'Events', perm: 'manage_events', edit: 'manageEvents' },
  { label: 'Products', perm: 'manage_products', edit: 'manageProducts' },
  { label: 'Orders', perm: 'manage_orders', fin: 'refundReview' },
  { label: 'Transactions', perm: 'manage_transactions', fin: 'txnFinancials' },
  { label: 'Commissions & Payouts', perm: 'manage_payouts', edit: 'commissionsEdit', fin: 'payoutsProcess' },
  { label: 'Reviews', perm: 'manage_reviews', edit: 'reviewsModerate' },
  { label: 'Banners', perm: 'manage_banners', edit: 'manageBanners' },
  { label: 'Membership Categories', perm: 'manage_categories', edit: 'manageCategories' },
  { label: 'Admin Users', perm: 'manage_admins', edit: 'manageAdmins', admin: 'manageAdmins' },
];

function Mark({ on, na }: { on?: boolean; na?: boolean }) {
  if (na) return <Minus className="mx-auto h-4 w-4 text-cream-200" aria-label="Not applicable" />;
  return on
    ? <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Yes" />
    : <Minus className="mx-auto h-4 w-4 text-charcoal-muted/50" aria-label="No" />;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card p-5"><h3 className="mb-2 text-sm font-semibold text-charcoal">{title}</h3>{children}</div>;
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

export function AdminUserDetailPage() {
  const { adminId } = useParams();
  const navigate = useNavigate();
  const { adminUsers } = useData();
  const { abilities } = useActor();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const [reset, setReset] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [created, setCreated] = useState<{ record: AdminUserRecord; password: string } | null>(null);

  const admin = adminUsers.find((a) => a.id === adminId);
  const canManage = abilities.manageAdmins;

  if (!canManage) {
    return <div className="card"><EmptyState icon={<Lock className="h-6 w-6" />} title="No access" description="Only a Super Admin can view Admin Users." /></div>;
  }
  if (!admin) {
    return (
      <div>
        <button onClick={() => navigate('/admin/admin-users')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Admin Users</button>
        <div className="card"><EmptyState title="Admin not found" description="This admin account could not be found." /></div>
      </div>
    );
  }

  const isSelf = user?.id === admin.id;
  const lockedSuper = isLastActiveSuper(admin.id);
  const roleAbilities = abilitiesFor(admin.role);

  return (
    <div>
      <button onClick={() => navigate('/admin/admin-users')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Admin Users</button>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={admin.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-medium text-charcoal">{admin.name}</h1>
                <AdminRoleBadge role={admin.role} />
                <AdminStatusBadge status={admin.status} />
                {isSelf && <span className="text-xs text-charcoal-muted">(You)</span>}
              </div>
              <p className="mt-1 text-sm text-charcoal-muted">{admin.id} · {ACCESS_LABEL[admin.role]}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEdit(true)}>Edit Admin</Button>
            {!isSelf && <Button variant="secondary" size="sm" icon={<KeyRound className="h-4 w-4" />} onClick={() => setReset(true)}>Reset Password</Button>}
            {admin.status === 'active'
              ? <Button variant="danger" size="sm" icon={<Power className="h-4 w-4" />} disabled={isSelf || lockedSuper} title={isSelf ? 'You cannot deactivate your own account.' : lockedSuper ? 'At least one active Super Admin is required.' : ''} onClick={() => setStatusOpen(true)}>Deactivate</Button>
              : <Button size="sm" icon={<Power className="h-4 w-4" />} onClick={() => setStatusOpen(true)}>Activate</Button>}
          </div>
        </div>
        {lockedSuper && <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">At least one active Super Admin is required.</p>}
      </div>

      <div className="mb-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Admin">
            <Row label="Admin ID">{admin.id}</Row>
            <Row label="Full name">{admin.name}</Row>
            <Row label="Email">{admin.email}</Row>
            <Row label="Phone">{admin.phone}</Row>
            <Row label="Role">{<AdminRoleBadge role={admin.role} />}</Row>
            <Row label="Status">{<AdminStatusBadge status={admin.status} />}</Row>
          </Card>
          <Card title="Account">
            <Row label="Access level">{ACCESS_LABEL[admin.role]}</Row>
            <Row label="Created date">{formatDate(admin.createdAt)}</Row>
            <Row label="Created by">{admin.createdBy}</Row>
            <Row label="Last login">{admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : '—'}</Row>
            {admin.status === 'inactive' && admin.deactivationReason && <Row label="Deactivation reason">{admin.deactivationReason}</Row>}
          </Card>
        </div>
      )}

      {tab === 'access' && (
        <Card title={`Access — ${ROLES[admin.role].label}`}>
          <p className="mb-3 text-sm text-charcoal-muted">Read-only view. Access is defined by the role and cannot be customised per module in this phase.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-3 py-2.5">Module</th>
                  <th className="px-3 py-2.5 text-center">View</th>
                  <th className="px-3 py-2.5 text-center">Create / Edit</th>
                  <th className="px-3 py-2.5 text-center">Financial Actions</th>
                  <th className="px-3 py-2.5 text-center">Admin Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {MODULES.map((m) => {
                  const view = hasPermission(admin.role, m.perm);
                  return (
                    <tr key={m.label}>
                      <td className="px-3 py-2.5 text-charcoal">{m.label}</td>
                      <td className="px-3 py-2.5 text-center"><Mark on={view} /></td>
                      <td className="px-3 py-2.5 text-center">{m.edit ? <Mark on={view && roleAbilities[m.edit]} /> : <Mark na />}</td>
                      <td className="px-3 py-2.5 text-center">{m.fin ? <Mark on={view && roleAbilities[m.fin]} /> : <Mark na />}</td>
                      <td className="px-3 py-2.5 text-center">{m.admin ? <Mark on={view && roleAbilities[m.admin]} /> : <Mark na />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {edit && <EditAdminModal admin={admin} onClose={() => setEdit(false)} />}
      {reset && <ResetPasswordModal admin={admin} onClose={() => setReset(false)} onReset={(password) => { setReset(false); setCreated({ record: admin, password }); }} />}
      {statusOpen && <StatusModal admin={admin} onClose={() => setStatusOpen(false)} />}
      {created && <CredentialsModal record={created.record} password={created.password} onClose={() => setCreated(null)} />}
    </div>
  );
}
