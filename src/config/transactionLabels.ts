import type { PaymentMethod, TxnSource } from '../types/transactions';
import type { SettlementStatus } from '../types/paymentProvider';

export const SOURCE_LABEL: Record<TxnSource, string> = {
  membership: 'Membership',
  product: 'Product Order',
  event: 'Event Ticket',
};
export const SOURCE_TONE: Record<TxnSource, 'magenta' | 'blue' | 'amber'> = {
  membership: 'magenta',
  product: 'blue',
  event: 'amber',
};

export const SOURCES: TxnSource[] = ['membership', 'product', 'event'];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Apple App Store', 'Google Play', 'Stripe', 'Skydo', 'Prototype Demo',
];

// Provisional event-ticket platform commission (prototype).
export const EVENT_COMMISSION_RATE = 0.1;

// Settlement is distinct from payment: a Paid payment can still be Pending
// settlement. "International" is derived (customer vs settlement currency), not a status.
export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  pending: 'Pending',
  available: 'Available',
  settled: 'Settled',
  failed: 'Failed',
  na: 'Not Applicable',
};
export const SETTLEMENT_STATUS_TONE: Record<SettlementStatus, 'neutral' | 'amber' | 'blue' | 'green' | 'red'> = {
  pending: 'amber',
  available: 'blue',
  settled: 'green',
  failed: 'red',
  na: 'neutral',
};
export const SETTLEMENT_STATUSES: SettlementStatus[] = ['pending', 'available', 'settled', 'failed', 'na'];

export const SORTS = [
  { key: 'newest', label: 'Newest Transactions' },
  { key: 'oldest', label: 'Oldest Transactions' },
  { key: 'high', label: 'Highest Amount' },
  { key: 'low', label: 'Lowest Amount' },
  { key: 'updated', label: 'Recently Updated' },
];

export const DATE_RANGES = [
  { key: 'any', label: 'Any date' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];
