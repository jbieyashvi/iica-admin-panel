import type { CurrencyCode } from '../config/currency';

export type MembershipPlan = 'Monthly' | 'Annual' | 'Lifetime';
export type PriceStatus = 'active' | 'inactive';

// Admin enters the final local Membership price for each region directly.
// No base currency, base price, pricing method or exchange-rate conversion.
export interface MembershipPriceRecord {
  id: string;
  category: string;
  plan: MembershipPlan;
  country: string;    // region label
  currency: CurrencyCode;
  price: number;      // final local Membership price
  status: PriceStatus;
  updatedAt: string;
}
