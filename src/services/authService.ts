// ---------------------------------------------------------------------------
// Mock auth service. This is the single seam that a real API will replace.
// Every function returns a Promise and simulates latency so the UI exercises
// its loading / error states realistically.
// ---------------------------------------------------------------------------

import type { AdminUser, AuthSession } from '../types';
import { readStorage, writeStorage, removeStorage } from '../lib/storage';

const SESSION_KEY = 'auth_session';
const PENDING_KEY = 'auth_pending';

// Demo credentials — Super Admin.
const DEMO_EMAIL = 'admin@iica.app';
const DEMO_PASSWORD = 'Admin123';
const DEMO_OTP = '123456';

const DEMO_ADMIN: AdminUser = {
  id: 'adm_001',
  name: 'Aparna Menon',
  email: DEMO_EMAIL,
  role: 'super_admin',
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AuthError extends Error {}

interface PendingLogin {
  email: string;
  createdAt: string;
}

/** Step 1 — validate email + password, stage an OTP challenge. */
export async function login(email: string, password: string): Promise<{ email: string }> {
  await delay(700);
  const normalized = email.trim().toLowerCase();
  if (normalized !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    throw new AuthError('Invalid email or password. Try the demo credentials.');
  }
  const pending: PendingLogin = { email: normalized, createdAt: new Date().toISOString() };
  writeStorage(PENDING_KEY, pending);
  return { email: normalized };
}

/** Returns the email awaiting OTP, if any. Guards the /verify route. */
export function getPendingEmail(): string | null {
  return readStorage<PendingLogin | null>(PENDING_KEY, null)?.email ?? null;
}

/** Step 2 — verify the 6-digit OTP and mint a session. */
export async function verifyOtp(code: string): Promise<AuthSession> {
  await delay(700);
  const pending = readStorage<PendingLogin | null>(PENDING_KEY, null);
  if (!pending) {
    throw new AuthError('Your login session expired. Please sign in again.');
  }
  if (code.trim() !== DEMO_OTP) {
    throw new AuthError('Incorrect verification code. The demo code is 123456.');
  }
  const session: AuthSession = {
    user: { ...DEMO_ADMIN, lastLoginAt: new Date().toISOString() },
    token: `demo-token-${Date.now()}`,
    issuedAt: new Date().toISOString(),
  };
  writeStorage(SESSION_KEY, session);
  removeStorage(PENDING_KEY);
  return session;
}

/** Re-send the OTP (no-op in the mock, but drives the UI feedback). */
export async function resendOtp(): Promise<void> {
  await delay(500);
}

export function getSession(): AuthSession | null {
  return readStorage<AuthSession | null>(SESSION_KEY, null);
}

/** Clears ONLY admin authentication state. */
export function logout(): void {
  removeStorage(SESSION_KEY);
  removeStorage(PENDING_KEY);
}

export const DEMO = { email: DEMO_EMAIL, password: DEMO_PASSWORD, otp: DEMO_OTP };
