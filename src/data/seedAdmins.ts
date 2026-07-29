import type { AdminUserRecord } from '../types/admins';

const DAY = 86400000;

// The demo Super Admin (adm_001) keeps the existing login credentials so the
// prototype sign-in continues to work. The header account maps to this record.
export function buildAdminUsers(now: number): AdminUserRecord[] {
  const d = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    {
      id: 'ADM-1001', name: 'Aparna Menon', email: 'admin@iica.app', phone: '+91 98200 10001',
      role: 'super_admin', status: 'active', password: 'Admin123',
      createdAt: d(320), createdBy: 'System', updatedAt: d(2), lastLoginAt: d(0),
    },
    {
      id: 'ADM-1042', name: 'Rohan Desai', email: 'rohan.ops@iica.app', phone: '+91 98200 10042',
      role: 'operations_manager', status: 'active', password: 'Ops12345',
      createdAt: d(210), createdBy: 'Aparna Menon', updatedAt: d(9), lastLoginAt: d(1),
    },
    {
      id: 'ADM-1077', name: 'Priya Kulkarni', email: 'priya.finance@iica.app', phone: '+91 98200 10077',
      role: 'finance_manager', status: 'active', password: 'Fin12345',
      createdAt: d(180), createdBy: 'Aparna Menon', updatedAt: d(14), lastLoginAt: d(3),
    },
    {
      id: 'ADM-1108', name: 'Sameer Khan', email: 'sameer.content@iica.app', phone: '+91 98200 10108',
      role: 'content_moderator', status: 'active', password: 'Mod12345',
      createdAt: d(120), createdBy: 'Aparna Menon', updatedAt: d(20), lastLoginAt: d(6),
    },
    {
      id: 'ADM-1130', name: 'Neha Verma', email: 'neha.ops@iica.app', phone: '+91 98200 10130',
      role: 'operations_manager', status: 'inactive', password: 'Ops54321',
      createdAt: d(95), createdBy: 'Aparna Menon', updatedAt: d(30), lastLoginAt: d(35),
      deactivationReason: 'Left the operations team; account retained for records.',
    },
  ];
}
