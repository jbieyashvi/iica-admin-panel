// ---------------------------------------------------------------------------
// Mock auth service. Authenticates against the Admin Users stored in the shared
// data layer, so accounts created in the Admin Users module can sign in. This
// is the single seam a real API would replace.
// ---------------------------------------------------------------------------

import type { AdminUser, AuthSession } from '../types';
import type { AdminUserRecord } from '../types/admins';
import type { DataState } from '../types/users';
import { readStorage, writeStorage, removeStorage } from '../lib/storage';

const SESSION_KEY = 'auth_session';
const PENDING_KEY = 'auth_pending';
const DATA_KEY = 'data_state';

// Demo credentials — the seeded Super Admin (kept working for the prototype).
const DEMO_EMAIL = 'admin@iica.app';
const DEMO_PASSWORD = 'Admin123';
const DEMO_OTP = '123456';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AuthError extends Error {}

interface PendingLogin {
  email: string;
  createdAt: string;
}

function adminUsers(): AdminUserRecord[] {
  return readStorage<DataState | null>(DATA_KEY, null)?.adminUsers ?? [];
}
function findAdminByEmail(email: string): AdminUserRecord | undefined {
  const e = email.trim().toLowerCase();
  return adminUsers().find((a) => a.email.toLowerCase() === e);
}

/** Step 1 — validate email + password against admin records, stage an OTP. */
export async function login(email: string, password: string): Promise<{ email: string }> {
  await delay(700);
  const normalized = email.trim().toLowerCase();
  const admin = findAdminByEmail(normalized);
  if (!admin || admin.password !== password) {
    throw new AuthError('Invalid email or password. Try the demo credentials.');
  }
  if (admin.status !== 'active') {
    throw new AuthError('This admin account is inactive. Contact a Super Admin.');
  }
  const pending: PendingLogin = { email: normalized, createdAt: new Date().toISOString() };
  writeStorage(PENDING_KEY, pending);
  return { email: normalized };
}

/** Returns the email awaiting OTP, if any. Guards the /verify route. */
export function getPendingEmail(): string | null {
  return readStorage<PendingLogin | null>(PENDING_KEY, null)?.email ?? null;
}

/** Step 2 — verify the 6-digit OTP and mint a session for the matched admin. */
export async function verifyOtp(code: string): Promise<AuthSession> {
  await delay(700);
  const pending = readStorage<PendingLogin | null>(PENDING_KEY, null);
  if (!pending) {
    throw new AuthError('Your login session expired. Please sign in again.');
  }
  if (code.trim() !== DEMO_OTP) {
    throw new AuthError('Incorrect verification code. The demo code is 123456.');
  }
  const admin = findAdminByEmail(pending.email);
  if (!admin || admin.status !== 'active') {
    throw new AuthError('This admin account is no longer active. Please sign in again.');
  }
  const user: AdminUser = { id: admin.id, name: admin.name, email: admin.email, role: admin.role, lastLoginAt: new Date().toISOString() };
  const session: AuthSession = { user, token: `demo-token-${Date.now()}`, issuedAt: new Date().toISOString() };
  writeStorage(SESSION_KEY, session);
  removeStorage(PENDING_KEY);
  return session;
}

/** Re-send the OTP (no-op in the mock, but drives the UI feedback). */
export async function resendOtp(): Promise<void> {
  await delay(500);
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

/** Clears ONLY admin authentication state. */
export function logout(): void {
  removeStorage(SESSION_KEY);
  removeStorage(PENDING_KEY);
}

export const DEMO = { email: DEMO_EMAIL, password: DEMO_PASSWORD, otp: DEMO_OTP };
