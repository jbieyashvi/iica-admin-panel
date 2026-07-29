import type {
  AccountType,
  MembershipStatus,
  PurchasePlatform,
  PurchaseStatus,
} from '../types/users';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  guest: 'Guest',
  registered: 'Registered User',
  creator: 'Creator Member',
};

export const ACCOUNT_TYPE_TONE: Record<AccountType, Tone> = {
  guest: 'neutral',
  registered: 'blue',
  creator: 'magenta',
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  not_started: 'Not Started',
  form_submitted: 'Form Submitted',
  purchase_pending: 'Purchase Pending',
  active: 'Active',
  renewal_due: 'Renewal Due',
  expired: 'Expired',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
};

export const MEMBERSHIP_STATUS_TONE: Record<MembershipStatus, Tone> = {
  not_started: 'neutral',
  form_submitted: 'blue',
  purchase_pending: 'amber',
  active: 'green',
  renewal_due: 'amber',
  expired: 'neutral',
  cancelled: 'red',
  suspended: 'red',
};

export const PURCHASE_PLATFORM_LABEL: Record<PurchasePlatform, string> = {
  apple: 'Apple App Store',
  google: 'Google Play',
  prototype_demo: 'Prototype Demo',
};

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  not_started: 'Not Started',
  initiated: 'Initiated',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  restored: 'Restored',
};

export const PURCHASE_STATUS_TONE: Record<PurchaseStatus, Tone> = {
  not_started: 'neutral',
  initiated: 'blue',
  pending: 'amber',
  completed: 'green',
  failed: 'red',
  cancelled: 'red',
  refunded: 'amber',
  restored: 'blue',
};

// Ordered lists for filter dropdowns. Guests are not registered records, so the
// Users table only filters Registered User + Creator Member.
export const ACCOUNT_TYPES: AccountType[] = ['registered', 'creator'];
export const MEMBERSHIP_STATUSES: MembershipStatus[] = [
  'not_started',
  'form_submitted',
  'purchase_pending',
  'active',
  'renewal_due',
  'expired',
  'cancelled',
  'suspended',
];
export const PURCHASE_PLATFORMS: PurchasePlatform[] = ['apple', 'google', 'prototype_demo'];
export const PURCHASE_STATUSES: PurchaseStatus[] = [
  'not_started',
  'initiated',
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'restored',
];
