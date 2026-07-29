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
  portfolio_moderator: {
    id: 'portfolio_moderator',
    label: 'Portfolio Moderator',
    description: 'Reviews portfolios and archive submissions.',
  },
};

const ALL: Permission[] = [
  'view_dashboard',
  'manage_users',
  'manage_memberships',
  'manage_catalogue',
  'moderate_portfolios',
  'manage_commerce',
  'manage_finance',
  'manage_engagement',
  'manage_platform',
  'manage_admins',
  'manage_settings',
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL,
  operations_manager: [
    'view_dashboard',
    'manage_users',
    'manage_memberships',
    'manage_catalogue',
    'moderate_portfolios',
    'manage_commerce',
    'manage_engagement',
    'manage_platform',
  ],
  finance_manager: ['view_dashboard', 'manage_finance', 'manage_commerce'],
  portfolio_moderator: ['view_dashboard', 'moderate_portfolios', 'manage_engagement'],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_OPTIONS: RoleMeta[] = Object.values(ROLES);
