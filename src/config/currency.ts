// ---------------------------------------------------------------------------
// Prototype multi-currency + settlement configuration. All exchange rates are
// illustrative (source "Prototype"); no live FX service is called. The platform
// base/settlement currency is INR. Revenue is always reported in the base
// currency — amounts in different currencies are never added together directly.
// ---------------------------------------------------------------------------

export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'AED' | 'EUR';

export const BASE_CURRENCY: CurrencyCode = 'INR';
export const BASE_CURRENCY_NOTE = 'Prototype default — confirm final legal entity and settlement configuration.';
export const PROTOTYPE_BALANCE_NOTE = 'Balance and settlement data shown here is illustrative until the payment-gateway integration is finalized.';
export const REVENUE_TOOLTIP = 'Revenue is reported in INR, the platform base currency.';

export const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'GBP', 'AED', 'EUR'];

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  INR: '₹', USD: '$', GBP: '£', AED: 'AED ', EUR: '€',
};
export const CURRENCY_COUNTRY: Record<CurrencyCode, string> = {
  INR: 'India', USD: 'United States', GBP: 'United Kingdom', AED: 'United Arab Emirates', EUR: 'European Union',
};

// Prototype exchange rates — INR per 1 unit of the currency. Captured once.
export const FX_RATE_TO_INR: Record<CurrencyCode, number> = {
  INR: 1, USD: 83.6, GBP: 105.4, AED: 22.75, EUR: 90.2,
};
export const FX_RATE_TIMESTAMP = '2026-07-01T00:00:00Z';
export const FX_RATE_SOURCE = 'Prototype';

// Prototype provider fee model (illustrative only).
export const PROCESSING_FEE_RATE = 0.025; // 2.5% of settled base amount
export const FX_FEE_RATE = 0.012;         // 1.2% when the customer currency differs from base

export const PAYMENT_PROVIDERS = ['Stripe (Prototype)', 'Razorpay (Prototype)', 'Apple App Store', 'Google Play'] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

/** Convert an amount in `cur` to the INR base amount. */
export function toBase(amount: number, cur: CurrencyCode): number {
  return Math.round(amount * FX_RATE_TO_INR[cur]);
}
/** Convert an INR base amount to `cur` (2 dp for foreign, integer for INR). */
export function fromBase(amountInInr: number, cur: CurrencyCode): number {
  if (cur === 'INR') return Math.round(amountInInr);
  return Math.round((amountInInr / FX_RATE_TO_INR[cur]) * 100) / 100;
}

/** Format an amount with its currency symbol + ISO code, e.g. "$120.00 USD". */
export function formatCurrency(amount: number, cur: CurrencyCode): string {
  const sym = CURRENCY_SYMBOL[cur];
  if (cur === 'INR') return `${sym}${Math.round(amount).toLocaleString('en-IN')} INR`;
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
}
