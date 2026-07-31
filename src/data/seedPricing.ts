import type { MembershipPriceRecord, MembershipPlan } from '../types/pricing';
import type { CurrencyCode } from '../config/currency';
import { fromBase } from '../config/currency';

// Base (INR) prices per plan.
const BASE_PRICE: Record<MembershipPlan, number> = { Monthly: 499, Annual: 3999, Lifetime: 24999 };

// Region → currency.
const REGIONS: { country: string; currency: CurrencyCode }[] = [
  { country: 'India', currency: 'INR' },
  { country: 'United States', currency: 'USD' },
  { country: 'United Kingdom', currency: 'GBP' },
  { country: 'United Arab Emirates', currency: 'AED' },
  { country: 'European Union', currency: 'EUR' },
];

// Fixed local prices (Admin-entered) for some regions; the rest use base conversion.
const FIXED: Partial<Record<string, Record<MembershipPlan, number>>> = {
  USD: { Monthly: 6, Annual: 49, Lifetime: 299 },
  GBP: { Monthly: 5, Annual: 45, Lifetime: 279 },
};

export function buildMembershipPricing(now: number): MembershipPriceRecord[] {
  const categories = ['Artist', 'Model'];
  const plans: MembershipPlan[] = ['Annual', 'Monthly', 'Lifetime'];
  const out: MembershipPriceRecord[] = [];
  const at = new Date(now - 20 * 86400000).toISOString();
  categories.forEach((category) => {
    plans.forEach((plan) => {
      REGIONS.forEach((r) => {
        const basePrice = BASE_PRICE[plan];
        let method: MembershipPriceRecord['method'] = 'conversion';
        let price: number;
        if (r.currency === 'INR') { method = 'fixed'; price = basePrice; }
        else if (FIXED[r.currency]) { method = 'fixed'; price = FIXED[r.currency]![plan]; }
        else { method = 'conversion'; price = fromBase(basePrice, r.currency); }
        // Keep Lifetime for Artist only (fewer rows, still believable).
        if (plan === 'Lifetime' && category !== 'Artist') return;
        out.push({
          id: `mpr_${category}_${plan}_${r.currency}`.toLowerCase(),
          category,
          plan,
          country: r.country,
          currency: r.currency,
          price,
          baseCurrency: 'INR',
          basePrice,
          method,
          status: 'active',
          updatedAt: at,
        });
      });
    });
  });
  return out;
}
