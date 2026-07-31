// ---------------------------------------------------------------------------
// Future payment-provider integration boundary (e.g. Stripe). This is a TYPED
// INTERFACE ONLY — no external API is called from the frontend, and no provider
// secrets (API keys, webhook secrets) are ever stored in the client or
// localStorage. A production backend fetches and verifies this data securely,
// then exposes it through these read-only shapes.
// ---------------------------------------------------------------------------

import type { CurrencyCode } from '../config/currency';

export type SettlementStatus = 'pending' | 'available' | 'settled' | 'failed' | 'na';

// Mirrors a provider "balance transaction" for a single charge.
export interface ProviderPayment {
  providerPaymentId: string;      // e.g. Stripe PaymentIntent id (pi_…)
  balanceTransactionId: string;   // e.g. txn_… — never a card/bank number
  presentmentAmount: number;      // what the customer was charged
  presentmentCurrency: CurrencyCode;
  settlementCurrency: CurrencyCode;
  exchangeRate: number;           // presentment → settlement
  exchangeRateAt: string;         // ISO timestamp of the captured rate
  providerFee: number;            // processing fee, in settlement currency
  fxFee: number;                  // conversion fee, in settlement currency
  netAmount: number;              // amount that reaches the platform balance
  availableOn: string | null;     // when funds become Available
  settlementStatus: SettlementStatus;
}

// Mirrors a provider payout (money leaving the platform balance to a bank).
export interface ProviderPayout {
  payoutId: string;               // e.g. po_…
  currency: CurrencyCode;
  amount: number;
  status: 'pending' | 'in_transit' | 'paid' | 'failed';
  reference: string | null;
  arrivalDate: string | null;
}

// The read-only adapter a real integration will implement on the backend.
// The prototype provides none of these live — data is illustrative seed data.
export interface PaymentProviderAdapter {
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  listBalance(): Promise<Array<{ currency: CurrencyCode; pending: number; available: number; onHold: number; updatedAt: string }>>;
  getPayout(payoutId: string): Promise<ProviderPayout>;
  // Never expose or accept secrets client-side.
}
