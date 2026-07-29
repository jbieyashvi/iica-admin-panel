import type { AdminRole } from './index';

// Admin account records (the "admin users" managed by a Super Admin). Stored in
// the shared data layer so the mock auth service can authenticate against them.
export type AdminAccountStatus = 'active' | 'inactive';

export interface AdminUserRecord {
  id: string; // ADM-1042
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: AdminAccountStatus;
  password: string; // prototype only — never rendered in the UI
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deactivationReason?: string | null;
}

// Prototype password rules: min 8 chars, at least one letter and one number.
export function passwordIssue(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw)) return 'Password must include a letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include a number.';
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
