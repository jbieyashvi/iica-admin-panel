import type { MembershipCategory } from './index';
export type { MembershipCategory } from './index';

// ---------------------------------------------------------------------------
// Users & Membership domain types. Kept API-ready: a real backend would return
// these shapes verbatim. User and Membership records are linked by `userId`.
// ---------------------------------------------------------------------------

export type AccountType = 'guest' | 'registered' | 'creator';

// Membership lifecycle. An IICA ID is generated for a Registered User after the
// form is submitted (pre-payment); the account only becomes a Creator Member
// once payment succeeds (Active). Guests are Not Applicable.
export type MembershipStatus =
  | 'not_applicable'
  | 'not_started'
  | 'form_submitted'
  | 'iica_id_generated'
  | 'purchase_link_sent'
  | 'purchase_pending'
  | 'active'
  | 'renewal_due'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export type PurchasePlatform = 'apple' | 'google' | 'prototype_demo';

export type PurchaseStatus =
  | 'not_started'
  | 'initiated'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'restored';

export type ReceiptStatus = 'none' | 'available' | 'pending';

export interface SuspensionInfo {
  reason: string;
  note?: string;
  endDate?: string | null;
  notifyUser: boolean;
  at: string;
  by: string;
}

export interface InternalNote {
  id: string;
  body: string;
  author: string;
  role: string;
  at: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  accountType: AccountType;
  membershipCategory?: MembershipCategory;
  membershipStatus: MembershipStatus;
  iicaId?: string;
  guestId?: string; // internal admin identifier for Guests (GST-1048); not an IICA ID
  joinedAt: string;
  lastActiveAt: string;
  suspension?: SuspensionInfo | null;
  notes: InternalNote[];
}

export interface TimelineEvent {
  id: string;
  key: string;
  label: string;
  at: string;
  detail?: string;
}

export interface PaymentInfo {
  platform: PurchasePlatform;
  transactionRef?: string;
  sku?: string;
  region: string;
  currency: string;
  amount: number;
  purchaseDate?: string | null;
  purchaseStatus: PurchaseStatus;
  receiptStatus: ReceiptStatus;
  renewalDate?: string | null;
  cancellationDate?: string | null;
  refundStatus?: string | null;
}

export interface MembershipForm {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  category: MembershipCategory;
  submittedAt: string;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  iicaId?: string;
  category: MembershipCategory;
  purchasePlatform: PurchasePlatform;
  purchaseStatus: PurchaseStatus;
  membershipStatus: MembershipStatus;
  form: MembershipForm;
  idGeneratedAt?: string | null;
  idHistory: { id: string; at: string }[];
  purchaseLinkSentAt?: string | null; // prototype purchase-link sent to registered email
  payment: PaymentInfo;
  startDate?: string | null;
  renewalDate?: string | null;
  expiryDate?: string | null;
  portfolioUnlocked: boolean;
  timeline: TimelineEvent[];
  lastUpdatedAt: string;
}

export interface PricingRow {
  country: string;
  currencyCode: string;
  symbol: string;
  amount: number;
  period: string;
}

export interface DataState {
  users: UserRecord[];
  memberships: MembershipRecord[];
  pricing: PricingRow[];
  categories: import('./portfolio').CategoryRecord[];
  portfolios: import('./portfolio').PortfolioRecord[];
  archives: import('./events').ArchiveRecord[];
  events: import('./events').EventRecord[];
  orders: import('./events').TicketOrder[];
  eventCategories: import('./events').EventCategoryRecord[];
  categoryProposals: import('./events').CustomCategoryProposal[];
  eventSettings: import('./events').EventSettings;
  products: import('./products').ProductRecord[];
  productCategories: import('./products').ProductCategoryRecord[];
  productOrders: import('./orders').ProductOrder[];
  collaborations: import('./collaborations').CollaborationRecord[];
  collaborationSettings: import('./collaborations').CollaborationSettings;
  reviews: import('./reviews').ReviewRecord[];
  banners: import('./banners').BannerRecord[];
  commissionSettings: import('./payouts').CommissionConfig[];
  commissionOverrides: import('./payouts').CommissionOverride[];
  payoutSettings: import('./payouts').CreatorPayoutSettings[];
  payouts: import('./payouts').PayoutRecord[];
  adminUsers: import('./admins').AdminUserRecord[];
  membershipPricing: import('./pricing').MembershipPriceRecord[];
  version: number;
}

// Actor performing a mutation.
export interface AdminActor {
  name: string;
  role: string; // human label, e.g. "Super Admin"
}
