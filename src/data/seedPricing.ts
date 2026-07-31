import type { MembershipPriceRecord, MembershipPlan } from '../types/pricing';
import type { CurrencyCode } from '../config/currency';

// Final local Membership prices per region (entered directly — no conversion).
const REGIONS: { country: string; currency: CurrencyCode; prices: Record<MembershipPlan, number> }[] = [
  { country: 'India', currency: 'INR', prices: { Monthly: 499, Annual: 3999, Lifetime: 24999 } },
  { country: 'United States', currency: 'USD', prices: { Monthly: 6, Annual: 99, Lifetime: 299 } },
  { country: 'United Kingdom', currency: 'GBP', prices: { Monthly: 5, Annual: 79, Lifetime: 279 } },
  { country: 'United Arab Emirates', currency: 'AED', prices: { Monthly: 15, Annual: 175, Lifetime: 999 } },
  { country: 'European Union', currency: 'EUR', prices: { Monthly: 6, Annual: 89, Lifetime: 269 } },
];

export function buildMembershipPricing(now: number): MembershipPriceRecord[] {
  const categories = ['Artist', 'Model'];
  const plans: MembershipPlan[] = ['Annual', 'Monthly', 'Lifetime'];
  const out: MembershipPriceRecord[] = [];
  const at = new Date(now - 20 * 86400000).toISOString();
  categories.forEach((category) => {
    plans.forEach((plan) => {
      // Keep Lifetime for Artist only (fewer rows, still believable).
      if (plan === 'Lifetime' && category !== 'Artist') return;
      REGIONS.forEach((r) => {
        out.push({
          id: `mpr_${category}_${plan}_${r.currency}`.toLowerCase(),
          category,
          plan,
          country: r.country,
          currency: r.currency,
          price: r.prices[plan],
          status: 'active',
          updatedAt: at,
        });
      });
    });
  });
  return out;
}
