import type { AdminRole, Permission, RoleMeta } from '../types';

export const ROLES: Record<AdminRole, RoleMeta> = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full access across every module.',
  },
  operations_manager: {
    id: 'operations_manager',
    label: 'Operations Manager',
    description: 'Runs day-to-day operations, users and content.',
  },
  finance_manager: {
    id: 'finance_manager',
    label: 'Finance Manager',
    description: 'Transactions, commissions and payouts.',
  },
  content_moderator: {
    id: 'content_moderator',
    label: 'Content Moderator',
    description: 'Moderates content, profiles and reviews.',
  },
};

// Compact access label shown in the Admin Users table.
export const ACCESS_LABEL: Record<AdminRole, string> = {
  super_admin: 'Full Access',
  operations_manager: 'Operations Access',
  finance_manager: 'Finance Access',
  content_moderator: 'Content Access',
};

const ALL: Permission[] = [
  'view_dashboard',
  'manage_users',
  'manage_catalogue',
  'moderate_portfolios',
  'manage_archive',
  'manage_collaborations',
  'manage_events',
  'manage_products',
  'manage_orders',
  'manage_transactions',
  'manage_payouts',
  'manage_reviews',
  'manage_banners',
  'manage_categories',
  'manage_admins',
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL,
  operations_manager: [
    'view_dashboard',
    'manage_users',
    'manage_catalogue',
    'moderate_portfolios',
    'manage_collaborations',
    'manage_events',
    'manage_products',
    'manage_orders',
    'manage_reviews',
    'manage_banners',
  ],
  finance_manager: ['view_dashboard', 'manage_orders', 'manage_transactions', 'manage_payouts'],
  content_moderator: [
    'view_dashboard',
    'manage_users', // read-only (abilities gate mutations)
    'manage_catalogue',
    'moderate_portfolios',
    'manage_archive',
    'manage_collaborations', // read-only
    'manage_events', // read-only
    'manage_products', // read-only
    'manage_reviews',
    'manage_banners',
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_OPTIONS: RoleMeta[] = Object.values(ROLES);
