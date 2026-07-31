import type { CurrencyCode } from '../config/currency';

export type MembershipPlan = 'Monthly' | 'Annual' | 'Lifetime';
export type PricingMethod = 'fixed' | 'conversion'; // Fixed Local Price | Base Price Conversion
export type PriceStatus = 'active' | 'inactive';

export interface MembershipPriceRecord {
  id: string;
  category: string;
  plan: MembershipPlan;
  country: string;       // region label
  currency: CurrencyCode;
  price: number;         // shown local price (customer currency)
  baseCurrency: CurrencyCode;
  basePrice: number;     // in base currency (INR)
  method: PricingMethod;
  status: PriceStatus;
  updatedAt: string;
}
