// ---------------------------------------------------------------------------
// Commissions & Payouts. Commission settings + category overrides are stored
// config. Payout records are stored (statuses are mutated by Finance). Payouts
// exist only for eligible seller/host earnings — never for memberships or free
// records. Historical payouts keep the commission rate captured at purchase.
// ---------------------------------------------------------------------------

export type RevenueType = 'masterclass' | 'digital' | 'physical' | 'event';

export interface CommissionConfig {
  type: RevenueType;
  defaultRate: number; // 0..1
  holdingDays: number;
  minPayout: number;
  status: 'active' | 'inactive';
  label: string; // 'Proposed — pending final approval' | 'Provisional'
}

export interface CommissionOverride {
  id: string;
  type: RevenueType;
  category: string;
  overrideRate: number; // 0..1
  status: 'active';
}

export type PayoutMethodType = 'bank' | 'upi' | 'stripe' | 'skydo';
export type PayoutMethodStatus = 'not_set' | 'pending' | 'active' | 'needs_attention';

export interface CreatorPayoutSettings {
  userId: string;
  method: PayoutMethodType;
  holderName: string;
  institution: string; // bank name / UPI provider / gateway
  masked: string; // masked account/UPI
  status: PayoutMethodStatus;
}

export type PayoutStatus = 'on_hold' | 'eligible' | 'processing' | 'paid' | 'failed';

export interface PayoutRecord {
  id: string; // PO-IICA-2001
  creatorUserId: string;
  creatorName: string;
  iicaId?: string;
  source: RevenueType;
  productId?: string;
  eventId?: string;
  refTitle: string;
  orderId?: string; // connected order / booking id
  transactionRef: string; // connected transaction reference
  currency: string;

  capturedRate: number; // rate captured at purchase time
  gross: number;
  refundedAmount: number;
  netEligible: number; // gross - refunded
  commission: number;
  payoutAmount: number; // net - commission

  holdingDays: number;
  requirementMetAt: string; // delivery / access / completion date
  eligibilityDate: string; // requirementMetAt + holdingDays
  createdAt: string;

  status: PayoutStatus;
  processingAt?: string | null;
  paidAt?: string | null;
  payoutReference?: string | null;
  payoutMethodUsed?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  // Why a completed record is not Eligible (below threshold / method not active).
  holdNote?: string | null;
}
