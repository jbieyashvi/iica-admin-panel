import type { MembershipCategory } from '../types';
import type {
  AccountType,
  DataState,
  MembershipRecord,
  MembershipStatus,
  PaymentInfo,
  PricingRow,
  PurchasePlatform,
  PurchaseStatus,
  ReceiptStatus,
  TimelineEvent,
  UserRecord,
} from '../types/users';
import { buildCategorySeed, buildPortfolioSeed } from './seedPortfolios';
import { buildArchiveSeed, buildEventSeed, buildOrderSeed, buildEventCategories, EVENT_SETTINGS } from './seedEvents';
import { buildProductCategories, buildProducts } from './seedProducts';
import { buildProductOrders } from './seedOrders';
import { buildCollaborations, DEFAULT_COLLAB_SETTINGS } from './seedCollaborations';
import { buildReviews } from './seedReviews';
import { buildBanners } from './seedBanners';
import { buildCommissionSettings, buildCommissionOverrides, buildPayoutSettings, buildPayouts } from './seedPayouts';
import { buildAdminUsers } from './seedAdmins';
import { buildMembershipPricing } from './seedPricing';
import { buildRecommendedSection } from './seedRecommended';
import { buildMusicSubmissions } from './seedNewMusic';
import { buildTalkShowEpisodes, buildGuestResumes } from './seedTalkShow';
import { buildDonationListings, buildDonationOrders } from './seedDonations';

// Region → currency mapping for payment records.
const CURRENCY: Record<string, { region: string; code: string; symbol: string; amount: number }> = {
  India: { region: 'India', code: 'INR', symbol: '₹', amount: 3999 },
  'United States': { region: 'United States', code: 'USD', symbol: '$', amount: 99 },
  'United Kingdom': { region: 'United Kingdom', code: 'GBP', symbol: '£', amount: 99 },
  UAE: { region: 'United Arab Emirates', code: 'USD', symbol: '$', amount: 99 },
};
const currencyFor = (country: string) => CURRENCY[country] ?? CURRENCY.India;

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  accountType: AccountType;
  category?: MembershipCategory;
  status: MembershipStatus;
  iicaNum?: number; // 3-digit for IICA ID
  guestId?: string;
  platform?: PurchasePlatform;
  purchase?: PurchaseStatus;
  joinedAt: string;
  lastActiveAt: string;
  suspendedReason?: string;
}

// Statuses at which an IICA ID exists (generated pre-payment for Registered
// Users, retained through the Creator Member lifecycle). Never for guests /
// not-started / form-submitted.
const HAS_IICA = new Set<MembershipStatus>([
  'iica_id_generated', 'purchase_link_sent', 'purchase_pending', 'active', 'renewal_due', 'expired', 'cancelled', 'suspended',
]);

// prettier-ignore
const ROWS: Row[] = [
  // --- Guests (browse / guest checkout, no membership) ---
  { id: 'usr_rohit',  name: 'Rohit Sharma',   email: 'rohit.sharma@example.com',   phone: '+91 98200 11223', country: 'India', city: 'Mumbai',    accountType: 'guest', status: 'not_applicable', guestId: 'GST-1012', joinedAt: '2026-07-20', lastActiveAt: '2026-07-26T18:40:00Z' },
  { id: 'usr_sneha',  name: 'Sneha Iyer',     email: 'sneha.iyer@example.com',     phone: '+91 98410 55210', country: 'India', city: 'Chennai',   accountType: 'guest', status: 'not_applicable', guestId: 'GST-1027', joinedAt: '2026-07-18', lastActiveAt: '2026-07-25T09:10:00Z' },
  { id: 'usr_imran',  name: 'Imran Sheikh',   email: 'imran.sheikh@example.com',   phone: '+91 90030 44119', country: 'India', city: 'Hyderabad', accountType: 'guest', status: 'not_applicable', guestId: 'GST-1048', joinedAt: '2026-06-30', lastActiveAt: '2026-07-11T12:00:00Z' },

  // --- Registered buyers (account created, no membership started) ---
  { id: 'usr_nisha',  name: 'Nisha Reddy',    email: 'nisha.reddy@example.com',    phone: '+91 99000 88771', country: 'India', city: 'Bengaluru', accountType: 'registered', status: 'not_started', joinedAt: '2026-05-14', lastActiveAt: '2026-07-27T06:20:00Z' },
  { id: 'usr_arjun',  name: 'Arjun Bhatia',   email: 'arjun.bhatia@example.com',   phone: '+91 98110 23456', country: 'India', city: 'Delhi',     accountType: 'registered', status: 'not_started', joinedAt: '2026-04-02', lastActiveAt: '2026-07-24T14:30:00Z' },
  { id: 'usr_fatima', name: 'Fatima Noor',    email: 'fatima.noor@example.com',    phone: '+971 50 552 3311', country: 'UAE',  city: 'Dubai',     accountType: 'registered', status: 'not_started', joinedAt: '2026-03-21', lastActiveAt: '2026-07-20T08:05:00Z' },
  { id: 'usr_daniel', name: 'Daniel Fernandes', email: 'daniel.f@example.com',     phone: '+91 90070 66554', country: 'India', city: 'Panaji',    accountType: 'registered', status: 'not_started', joinedAt: '2026-02-11', lastActiveAt: '2026-07-19T20:15:00Z' },

  // --- Active creators, all 11 categories covered ---
  { id: 'usr_ananya', name: 'Ananya Rao',        email: 'ananya.rao@example.com',    phone: '+91 98201 33445', country: 'India', city: 'Mumbai',    accountType: 'creator', category: 'Artist',                          status: 'active',      iicaNum: 612, platform: 'apple',          purchase: 'completed', joinedAt: '2025-01-15', lastActiveAt: '2026-07-27T05:50:00Z' },
  { id: 'usr_kabir',  name: 'Kabir Menon',       email: 'kabir.menon@example.com',   phone: '+91 98330 77881', country: 'India', city: 'Delhi',     accountType: 'creator', category: 'Model',                           status: 'active',      iicaNum: 105, platform: 'google',         purchase: 'completed', joinedAt: '2025-02-03', lastActiveAt: '2026-07-26T22:10:00Z' },
  { id: 'usr_abhishek', name: 'Abhishek Singh Chouhan', email: 'abhishek.chouhan@example.com', phone: '+91 94250 11902', country: 'India', city: 'Jaipur', accountType: 'creator', category: 'Athlete',                    status: 'renewal_due', iicaNum: 248, platform: 'google',         purchase: 'completed', joinedAt: '2024-08-19', lastActiveAt: '2026-07-25T16:40:00Z' },
  { id: 'usr_meera',  name: 'Meera Kulkarni',    email: 'meera.kulkarni@example.com', phone: '+91 90280 55667', country: 'India', city: 'Pune',      accountType: 'creator', category: 'Yoga Coach',                      status: 'active',      iicaNum: 334, platform: 'apple',          purchase: 'completed', joinedAt: '2025-03-11', lastActiveAt: '2026-07-27T04:00:00Z' },
  { id: 'usr_aarav',  name: 'Aarav Fitness Collective', email: 'hello@aaravfitness.in', phone: '+91 99860 44220', country: 'India', city: 'Bengaluru', accountType: 'creator', category: 'Fitness Champion',            status: 'active',      iicaNum: 77,  platform: 'prototype_demo', purchase: 'completed', joinedAt: '2025-04-08', lastActiveAt: '2026-07-26T11:25:00Z' },
  { id: 'usr_royal',  name: 'Royal Courtyard',   email: 'events@royalcourtyard.in',  phone: '+91 29412 66880', country: 'India', city: 'Udaipur',   accountType: 'creator', category: 'VIP Venue',                       status: 'active',      iicaNum: 501, platform: 'apple',          purchase: 'completed', joinedAt: '2024-11-30', lastActiveAt: '2026-07-24T19:00:00Z' },
  { id: 'usr_heritage', name: 'Heritage Weaves Co.', email: 'care@heritageweaves.in', phone: '+91 33400 22114', country: 'India', city: 'Kolkata',  accountType: 'creator', category: 'Legacy Brand of Impact',          status: 'active',      iicaNum: 219, platform: 'google',         purchase: 'completed', joinedAt: '2025-05-22', lastActiveAt: '2026-07-23T10:30:00Z' },
  { id: 'usr_vikram', name: 'Vikram Sport Lab',  email: 'coach@vikramsportlab.in',   phone: '+91 90110 99332', country: 'India', city: 'Pune',      accountType: 'creator', category: 'Sports Coach/Trainer/Enthusiast', status: 'active',      iicaNum: 360, platform: 'apple',          purchase: 'completed', joinedAt: '2025-01-28', lastActiveAt: '2026-07-27T07:15:00Z' },
  { id: 'usr_nikhil', name: 'Nikhil Kapoor',     email: 'nikhil.kapoor@example.com', phone: '+91 98207 12345', country: 'India', city: 'Mumbai',    accountType: 'creator', category: 'VIP Host',                        status: 'active',      iicaNum: 288, platform: 'apple',          purchase: 'completed', joinedAt: '2025-06-10', lastActiveAt: '2026-07-26T21:45:00Z' },
  { id: 'usr_aisha',  name: 'Aisha Merchant',    email: 'aisha.merchant@example.com', phone: '+91 98337 88990', country: 'India', city: 'Delhi',     accountType: 'creator', category: 'VIP Connoisseur',                 status: 'active',      iicaNum: 144, platform: 'google',         purchase: 'completed', joinedAt: '2025-02-19', lastActiveAt: '2026-07-25T13:20:00Z' },
  { id: 'usr_devang', name: 'Devang Shah',       email: 'devang.shah@example.com',   phone: '+91 90990 33221', country: 'India', city: 'Ahmedabad', accountType: 'creator', category: 'VIP Manager',                     status: 'active',      iicaNum: 410, platform: 'prototype_demo', purchase: 'completed', joinedAt: '2025-07-01', lastActiveAt: '2026-07-27T03:30:00Z' },

  // --- International creators ---
  { id: 'usr_james',  name: 'James Carter',      email: 'james.carter@example.com',  phone: '+44 7700 900123', country: 'United Kingdom', city: 'London',   accountType: 'creator', category: 'Model',            status: 'active',      iicaNum: 400, platform: 'apple',  purchase: 'completed', joinedAt: '2025-03-30', lastActiveAt: '2026-07-24T09:40:00Z' },
  { id: 'usr_sophia', name: 'Sophia Nguyen',     email: 'sophia.nguyen@example.com', phone: '+1 212 555 0134', country: 'United States',  city: 'New York', accountType: 'creator', category: 'Artist',           status: 'active',      iicaNum: 271, platform: 'google', purchase: 'completed', joinedAt: '2025-04-18', lastActiveAt: '2026-07-26T17:05:00Z' },
  { id: 'usr_leila',  name: 'Leila Ahmed',       email: 'leila.ahmed@example.com',   phone: '+971 50 771 2200', country: 'UAE',           city: 'Dubai',    accountType: 'creator', category: 'VIP Connoisseur',  status: 'renewal_due', iicaNum: 322, platform: 'apple',  purchase: 'completed', joinedAt: '2024-09-25', lastActiveAt: '2026-07-22T12:50:00Z' },

  // --- In-progress applicants ---
  { id: 'usr_priya',  name: 'Priya Nair',        email: 'priya.nair@example.com',    phone: '+91 90420 55110', country: 'India', city: 'Kochi',     accountType: 'registered', category: 'Artist',          status: 'iica_id_generated',  iicaNum: 418, platform: 'apple',  purchase: 'not_started', joinedAt: '2026-07-24', lastActiveAt: '2026-07-27T02:10:00Z' },
  { id: 'usr_rahul',  name: 'Rahul Verma',       email: 'rahul.verma@example.com',   phone: '+91 98991 44556', country: 'India', city: 'Jaipur',    accountType: 'registered', category: 'Model',           status: 'purchase_link_sent', iicaNum: 732, platform: 'google', purchase: 'not_started', joinedAt: '2026-07-19', lastActiveAt: '2026-07-26T15:00:00Z' },
  { id: 'usr_sara',   name: 'Sara Khan',         email: 'sara.khan@example.com',     phone: '+91 90010 22778', country: 'India', city: 'Lucknow',   accountType: 'registered', category: 'Fitness Champion', status: 'purchase_pending',   iicaNum: 660, platform: 'apple', purchase: 'pending',     joinedAt: '2026-07-15', lastActiveAt: '2026-07-27T01:00:00Z' },

  // --- Expired / cancelled / suspended ---
  { id: 'usr_tanvi',  name: 'Tanvi Deshpande',   email: 'tanvi.d@example.com',       phone: '+91 90230 66112', country: 'India', city: 'Nagpur',    accountType: 'creator', category: 'Yoga Coach',       status: 'expired',   iicaNum: 190, platform: 'google', purchase: 'completed', joinedAt: '2024-06-14', lastActiveAt: '2026-06-02T10:00:00Z' },
  { id: 'usr_karan',  name: 'Karan Malhotra',    email: 'karan.malhotra@example.com', phone: '+91 98118 77445', country: 'India', city: 'Chandigarh', accountType: 'creator', category: 'Athlete',        status: 'cancelled', iicaNum: 815, platform: 'apple',  purchase: 'completed', joinedAt: '2024-12-05', lastActiveAt: '2026-05-18T08:30:00Z' },
  { id: 'usr_vivaan', name: 'Vivaan Gupta',      email: 'vivaan.gupta@example.com',  phone: '+91 98204 90011', country: 'India', city: 'Delhi',     accountType: 'creator', category: 'Model',            status: 'suspended', iicaNum: 55,  platform: 'google', purchase: 'completed', joinedAt: '2025-02-27', lastActiveAt: '2026-07-01T09:00:00Z', suspendedReason: 'Reported for policy violation in collaboration chat.' },
];

const SKU = 'iica.membership.annual';

function buildTimeline(row: Row): TimelineEvent[] {
  const t: TimelineEvent[] = [];
  const base = new Date(row.joinedAt).getTime();
  const day = 86400000;
  const push = (key: string, label: string, offset: number, detail?: string) =>
    t.push({ id: `${row.id}_tl_${key}`, key, label, at: new Date(base + offset * day).toISOString(), detail });

  if (row.category) push('form_submitted', 'Membership form submitted', 0, `Category: ${row.category}`);
  // IICA ID is generated after the membership form is submitted (pre-payment).
  if (row.iicaNum != null && HAS_IICA.has(row.status)) push('iica_id_generated', 'IICA ID generated', 1);
  if (['purchase_link_sent', 'purchase_pending', 'active', 'renewal_due', 'expired', 'cancelled', 'suspended'].includes(row.status))
    push('purchase_link_sent', 'Purchase link sent to registered email', 2);

  const reachedPurchase = ['purchase_pending', 'active', 'renewal_due', 'expired', 'cancelled', 'suspended'];
  if (reachedPurchase.includes(row.status)) push('purchase_initiated', 'Purchase initiated', 2);

  const activated = ['active', 'renewal_due', 'expired', 'suspended'];
  if (activated.includes(row.status) && row.purchase === 'completed') {
    push('purchase_confirmed', 'Purchase confirmed', 3);
    push('membership_activated', 'Membership activated', 3);
    push('portfolio_unlocked', 'Portfolio access unlocked', 3);
  }
  if (row.status === 'renewal_due') push('renewal_due', 'Renewal due soon', 360);
  if (row.status === 'expired') push('expired', 'Membership expired', 365);
  if (row.status === 'cancelled') push('cancelled', 'Membership cancelled by user', 120);
  if (row.status === 'suspended') push('suspended', 'Membership suspended by admin', 500);
  return t;
}

function buildPayment(row: Row): PaymentInfo {
  const cur = currencyFor(row.country);
  const platform = row.platform ?? 'apple';
  const purchase = row.purchase ?? 'not_started';
  const base = new Date(row.joinedAt).getTime();
  const day = 86400000;
  const paid = purchase === 'completed' || purchase === 'cancelled' || purchase === 'refunded';
  const receipt: ReceiptStatus = purchase === 'completed' ? 'available' : purchase === 'pending' ? 'pending' : 'none';
  const start = paid ? new Date(base + 3 * day) : null;
  const renewal = start ? new Date(start.getTime() + 365 * day) : null;

  return {
    platform,
    transactionRef:
      purchase === 'not_started'
        ? undefined
        : platform === 'apple'
          ? `APL-${row.iicaNum ?? '000'}-${cur.code}-88213`
          : platform === 'google'
            ? `GPA.${3300 + (row.iicaNum ?? 0)}-6641-2290`
            : `DEMO-${row.iicaNum ?? '000'}-TEST`,
    sku: purchase === 'not_started' ? undefined : SKU,
    region: cur.region,
    currency: cur.code,
    amount: cur.amount,
    purchaseDate: paid || purchase === 'pending' ? new Date(base + 2 * day).toISOString() : null,
    purchaseStatus: purchase,
    receiptStatus: receipt,
    renewalDate: row.status === 'active' || row.status === 'renewal_due' ? renewal?.toISOString() ?? null : null,
    cancellationDate: row.status === 'cancelled' ? new Date(base + 120 * day).toISOString() : null,
    refundStatus: purchase === 'refunded' ? 'Refunded to original payment method' : null,
  };
}

function buildMembership(row: Row): MembershipRecord | null {
  if (!row.category) return null;
  const base = new Date(row.joinedAt).getTime();
  const day = 86400000;
  const payment = buildPayment(row);
  const activated = ['active', 'renewal_due', 'expired', 'suspended'].includes(row.status) && row.purchase === 'completed';
  // IICA ID exists only once a purchase has been completed (Paid) at some point.
  const iicaId = iidOf(row);

  return {
    id: `mem_${row.id.replace('usr_', '')}`,
    userId: row.id,
    iicaId,
    category: row.category,
    purchasePlatform: payment.platform,
    purchaseStatus: payment.purchaseStatus,
    membershipStatus: row.status,
    form: {
      fullName: row.name,
      email: row.email,
      phone: row.phone,
      country: row.country,
      city: row.city,
      category: row.category,
      submittedAt: new Date(base).toISOString(),
    },
    idGeneratedAt: iicaId ? new Date(base + 1 * day).toISOString() : null,
    idHistory: iicaId ? [{ id: iicaId, at: new Date(base + 1 * day).toISOString() }] : [],
    purchaseLinkSentAt: ['purchase_link_sent', 'purchase_pending', 'active', 'renewal_due', 'expired', 'cancelled', 'suspended'].includes(row.status)
      ? new Date(base + 2 * day).toISOString()
      : null,
    payment,
    startDate: activated ? new Date(base + 3 * day).toISOString() : null,
    renewalDate: payment.renewalDate,
    expiryDate: row.status === 'expired' ? new Date(base + 365 * day).toISOString() : null,
    portfolioUnlocked: activated && row.status !== 'suspended',
    timeline: buildTimeline(row),
    lastUpdatedAt: new Date(row.lastActiveAt).getTime() ? row.lastActiveAt : new Date(base).toISOString(),
  };
}

function initials(name: string): string {
  const w = name.trim().split(/\s+/);
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
}

// IICA ID exists from the "IICA ID Generated" stage onward (pre-payment for
// Registered Users, retained for Creator Members).
function iidOf(row: Row): string | undefined {
  return row.iicaNum != null && HAS_IICA.has(row.status)
    ? `${initials(row.name)}.${String(row.iicaNum).padStart(3, '0')}.IICA`
    : undefined;
}

function buildUser(row: Row): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    city: row.city,
    accountType: row.accountType,
    membershipCategory: row.category,
    membershipStatus: row.status,
    iicaId: iidOf(row),
    guestId: row.guestId,
    joinedAt: new Date(row.joinedAt).toISOString(),
    lastActiveAt: row.lastActiveAt,
    suspension: row.suspendedReason
      ? {
          reason: row.suspendedReason,
          note: 'Suspended pending review by the trust & safety team.',
          endDate: null,
          notifyUser: true,
          at: '2026-07-01T09:30:00Z',
          by: 'Aparna Menon',
        }
      : null,
    notes:
      row.id === 'usr_ananya'
        ? [
            {
              id: 'note_seed_1',
              body: 'Top-performing artist. Prioritise for homepage rotation once auto-ranking ships.',
              author: 'Aparna Menon',
              role: 'Super Admin',
              at: '2026-07-10T11:00:00Z',
            },
          ]
        : [],
  };
}

const PRICING: PricingRow[] = [
  { country: 'India', currencyCode: 'INR', symbol: '₹', amount: 3999, period: 'year' },
  { country: 'United States', currencyCode: 'USD', symbol: '$', amount: 99, period: 'year' },
  { country: 'United Kingdom', currencyCode: 'GBP', symbol: '£', amount: 99, period: 'year' },
];

// Single source of truth for the persisted-schema version. Bump on any change
// to DataState shape / seed structure so localStorage safely reseeds.
export const SEED_VERSION = 26;

export function buildSeedState(): DataState {
  const users = ROWS.map(buildUser);
  const memberships = ROWS.map(buildMembership).filter((m): m is MembershipRecord => m !== null);
  const portfolios = buildPortfolioSeed(users, memberships);
  const now = Date.now();
  const { events, proposals } = buildEventSeed(users, now);
  const products = buildProducts(users, now);
  const payoutSettings = buildPayoutSettings();
  const donationListings = buildDonationListings(users, now);
  return {
    users,
    memberships,
    pricing: PRICING,
    categories: buildCategorySeed(),
    portfolios,
    archives: buildArchiveSeed(portfolios),
    events,
    orders: buildOrderSeed(events, now),
    eventCategories: buildEventCategories(),
    categoryProposals: proposals,
    eventSettings: EVENT_SETTINGS,
    products,
    productCategories: buildProductCategories(),
    productOrders: buildProductOrders(products, users, now),
    collaborations: buildCollaborations(users, portfolios, now),
    collaborationSettings: DEFAULT_COLLAB_SETTINGS,
    reviews: buildReviews(now),
    banners: buildBanners(now),
    commissionSettings: buildCommissionSettings(),
    commissionOverrides: buildCommissionOverrides(),
    payoutSettings,
    payouts: buildPayouts(payoutSettings, now),
    adminUsers: buildAdminUsers(now),
    membershipPricing: buildMembershipPricing(now),
    recommendedSection: buildRecommendedSection(now),
    membershipPurchaseConfig: {
      membershipPurchaseEnabled: true,
      updatedAt: new Date(now - 30 * 86400000).toISOString(),
      updatedBy: 'Aparna Menon',
    },
    musicSubmissions: buildMusicSubmissions(now),
    talkShowEpisodes: buildTalkShowEpisodes(now),
    guestResumes: buildGuestResumes(now),
    donationListings,
    donationOrders: buildDonationOrders(donationListings, now),
    version: SEED_VERSION,
  };
}
