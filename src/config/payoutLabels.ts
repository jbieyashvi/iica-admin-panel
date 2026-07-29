import type { PayoutMethodStatus, PayoutMethodType, PayoutStatus, RevenueType } from '../types/payouts';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const REVENUE_TYPE_LABEL: Record<RevenueType, string> = {
  masterclass: 'Masterclass',
  digital: 'Digital Product',
  physical: 'Physical Product',
  event: 'Event Tickets',
};
export const REVENUE_TYPE_ORDER: RevenueType[] = ['masterclass', 'digital', 'physical', 'event'];

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  on_hold: 'On Hold',
  eligible: 'Eligible',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
};
export const PAYOUT_STATUS_TONE: Record<PayoutStatus, Tone> = {
  on_hold: 'amber',
  eligible: 'blue',
  processing: 'magenta',
  paid: 'green',
  failed: 'red',
};
export const PAYOUT_STATUSES: PayoutStatus[] = ['on_hold', 'eligible', 'processing', 'paid', 'failed'];

export const METHOD_LABEL: Record<PayoutMethodType, string> = {
  bank: 'Bank Transfer',
  upi: 'UPI',
  stripe: 'Stripe Connect',
  skydo: 'Skydo',
};
export const METHOD_STATUS_LABEL: Record<PayoutMethodStatus, string> = {
  not_set: 'Not Set Up',
  pending: 'Pending Verification',
  active: 'Active',
  needs_attention: 'Needs Attention',
};
export const METHOD_STATUS_TONE: Record<PayoutMethodStatus, Tone> = {
  not_set: 'neutral',
  pending: 'amber',
  active: 'green',
  needs_attention: 'red',
};

export const PAYOUT_SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'high', label: 'Highest Payout' },
  { key: 'low', label: 'Lowest Payout' },
  { key: 'eligibility', label: 'Eligibility Date' },
  { key: 'action', label: 'Action Required First' },
];

export const DATE_RANGES = [
  { key: 'any', label: 'Any eligibility date' },
  { key: '7', label: 'Eligible ≤ 7 days' },
  { key: '30', label: 'Eligible ≤ 30 days' },
  { key: '90', label: 'Eligible ≤ 90 days' },
];

export const PROTOTYPE_NOTE = 'Prototype configuration — final commission and payout policies require approval.';

// Remaining days until eligibility (>= 0). Uses real dates so it decreases over time.
export function remainingDays(eligibilityDate: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(eligibilityDate).getTime() - now) / 86400000));
}
