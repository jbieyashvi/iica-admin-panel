// ---------------------------------------------------------------------------
// Mock auth service. Authenticates against the Admin Users stored in the shared
// data layer. Single-step: valid email + password of an active admin mints a
// session immediately (no OTP on the web Admin Panel).
// ---------------------------------------------------------------------------

import type { AdminUser, AuthSession } from '../types';
import type { AdminUserRecord } from '../types/admins';
import type { DataState } from '../types/users';
import { readStorage, writeStorage, removeStorage } from '../lib/storage';

const SESSION_KEY = 'auth_session';
const DATA_KEY = 'data_state';

// Demo credentials — the seeded Super Admin (kept working for the prototype).
const DEMO_EMAIL = 'admin@iica.app';
const DEMO_PASSWORD = 'Admin123';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AuthError extends Error {}

function adminUsers(): AdminUserRecord[] {
  return readStorage<DataState | null>(DATA_KEY, null)?.adminUsers ?? [];
}
function findAdminByEmail(email: string): AdminUserRecord | undefined {
  const e = email.trim().toLowerCase();
  return adminUsers().find((a) => a.email.toLowerCase() === e);
}

/** Validate email + password and mint a session for an active admin. */
export async function login(email: string, password: string): Promise<AuthSession> {
  await delay(600);
  const admin = findAdminByEmail(email);
  if (!admin || admin.password !== password) {
    throw new AuthError('Incorrect email or password.');
  }
  if (admin.status !== 'active') {
    throw new AuthError('Your Admin account is inactive. Please contact the Super Admin.');
  }
  const user: AdminUser = { id: admin.id, name: admin.name, email: admin.email, role: admin.role, lastLoginAt: new Date().toISOString() };
  const session: AuthSession = { user, token: `demo-token-${Date.now()}`, issuedAt: new Date().toISOString() };
  writeStorage(SESSION_KEY, session);
  return session;
}

export function getSession(): AuthSession | null {
  const session = readStorage<AuthSession | null>(SESSION_KEY, null);
  if (!session) return null;
  // Invalidate the session if the admin was deactivated or removed.
  const admin = adminUsers().find((a) => a.id === session.user.id);
  if (!admin || admin.status !== 'active') {
    removeStorage(SESSION_KEY);
    return null;
  }
  return session;
}

/** True when the current session's admin is still active. */
export function isSessionActive(): boolean {
  const session = readStorage<AuthSession | null>(SESSION_KEY, null);
  if (!session) return false;
  const admin = adminUsers().find((a) => a.id === session.user.id);
  return !!admin && admin.status === 'active';
}

/** Clears admin authentication state. */
export function logout(): void {
  removeStorage(SESSION_KEY);
}

export const DEMO = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
