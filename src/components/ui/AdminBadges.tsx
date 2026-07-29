import { Badge } from './Badge';
import { ROLES } from '../../config/roles';
import type { AdminAccountStatus } from '../../types/admins';
import type { AdminRole } from '../../types';

export function AdminStatusBadge({ status }: { status: AdminAccountStatus }) {
  return <Badge tone={status === 'active' ? 'green' : 'neutral'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>;
}

const ROLE_TONE: Record<AdminRole, 'magenta' | 'blue' | 'amber' | 'green'> = {
  super_admin: 'magenta',
  operations_manager: 'blue',
  finance_manager: 'amber',
  content_moderator: 'green',
};

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLES[role].label}</Badge>;
}
