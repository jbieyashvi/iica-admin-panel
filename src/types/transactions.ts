import type { OrderPaymentStatus } from './orders';
import type { ProductType } from './products';
import type { CurrencyCode } from '../config/currency';
import type { SettlementStatus } from './paymentProvider';

// ---------------------------------------------------------------------------
// Transactions are a VIEW-MODEL derived from existing Memberships, Product
// Orders and Event Ticket bookings — never stored separately. The shared data
// layer stays the single source of truth. Free (₹0) records produce no
// transaction. Statuses reuse the order payment-status vocabulary.
// ---------------------------------------------------------------------------

export type TxnSource = 'membership' | 'product' | 'event';
export type TxnStatus = OrderPaymentStatus; // initiated|pending|paid|failed|cancelled|partially_refunded|refunded
export type BuyerKind = 'guest' | 'registered' | 'creator';

export type PaymentMethod =
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking'
  | 'Apple App Store'
  | 'Google Play'
  | 'Stripe'
  | 'Skydo'
  | 'Prototype Demo';

export interface Transaction {
  id: string; // TXN-IICA-1077
  source: TxnSource;
  date: string; // ISO
  lastUpdatedAt: string;
  status: TxnStatus;

  buyerName: string;
  buyerType: BuyerKind;
  buyerUserId?: string | null;
  email?: string;
  phone?: string;

  currency: string; // 'INR'
  // Amounts (retained = gross - refunded).
  base: number;
  discount: number;
  tax: number;
  shipping: number;
  gross: number;
  refundedAmount: number;
  netCollected: number;
  commissionRate: number; // 0 for membership
  commission: number;
  earnings: number; // seller / host earnings (gross - commission); 0 for membership
  commissionLabel: string;

  paymentMethod: PaymentMethod;
  paymentMasked: string; // e.g. •••• 4242
  paymentRef: string;

  // Reference display (title + connected record id).
  refTitle: string;
  refSub: string;

  refundRef?: string | null;
  refundCompletedAt?: string | null;

  // ---- Multi-currency + settlement (prototype, illustrative) ----
  customerCurrency: CurrencyCode;   // presentment currency the buyer paid in
  customerCountry: string;
  originalAmount: number;           // gross in the customer's currency
  baseCurrency: CurrencyCode;       // platform base = INR
  baseAmount: number;               // gross converted to base (INR)
  exchangeRate: number;             // customer → base (INR per 1 unit)
  exchangeRateAt: string;
  provider: string;                 // payment provider (prototype)
  providerFee: number;              // base currency
  fxFee: number;                    // base currency
  grossSettlement: number;          // retained base amount before provider fees
  netSettlement: number;            // grossSettlement - provider fees
  settlementCurrency: CurrencyCode; // = base (INR)
  settlementStatus: SettlementStatus;
  availableOn?: string | null;
  settlementDate?: string | null;
  isInternational: boolean;         // customerCurrency !== settlementCurrency

  membership?: { userId: string; iicaId?: string; category?: string; plan: string; platform: string; startDate?: string | null; renewalDate?: string | null };
  product?: { orderId: string; productId: string; productTitle: string; productType: ProductType; quantity: number; sellerName: string; sellerUserId: string };
  event?: { bookingId: string; eventId: string; eventTitle: string; tier: string; quantity: number; hostName: string; hostUserId?: string | null };
}
