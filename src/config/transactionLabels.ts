import type { PaymentMethod, TxnSource } from '../types/transactions';

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
