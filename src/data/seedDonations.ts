import type { UserRecord } from '../types/users';
import type { DonationListing, DonationOrder, DonationPaymentStatus } from '../types/donations';

interface ListingRow {
  id: string;
  creatorUserId: string;
  title: string;
  amount: number;
  description?: string;
  active: boolean;
  portfolioVisible: boolean;
  daysAgo: number;
}

// Fixed support amounts defined by the creator. INR only in the prototype.
const LISTINGS: ListingRow[] = [
  { id: 'don_ananya_1', creatorUserId: 'usr_ananya', title: 'Buy me a canvas', amount: 500, description: 'Helps fund materials for a new series.', active: true, portfolioVisible: true, daysAgo: 40 },
  { id: 'don_ananya_2', creatorUserId: 'usr_ananya', title: 'Support a full studio day', amount: 2000, active: true, portfolioVisible: true, daysAgo: 40 },
  { id: 'don_meera_1', creatorUserId: 'usr_meera', title: 'Fund a free community class', amount: 750, description: 'Sponsors one free yoga class for beginners.', active: true, portfolioVisible: true, daysAgo: 30 },
  { id: 'don_aarav_1', creatorUserId: 'usr_aarav', title: 'Back our next bootcamp', amount: 300, active: true, portfolioVisible: true, daysAgo: 25 },
  { id: 'don_heritage_1', creatorUserId: 'usr_heritage', title: 'Preserve a weaving tradition', amount: 1500, description: 'Supports artisan wages for one week.', active: false, portfolioVisible: false, daysAgo: 60 },
  // Listing from a suspended creator — must never appear publicly.
  { id: 'don_vivaan_1', creatorUserId: 'usr_vivaan', title: 'Support my photography', amount: 400, active: true, portfolioVisible: true, daysAgo: 50 },
];

interface OrderRow {
  id: string;
  listingId: string;
  donorName: string;
  donorUserId?: string;
  donorType: DonationOrder['donorType'];
  status: DonationPaymentStatus;
  method: string;
  daysAgo: number;
}

const ORDERS: OrderRow[] = [
  { id: 'dord_1', listingId: 'don_ananya_1', donorName: 'Rohit Sharma', donorUserId: 'usr_rohit', donorType: 'guest', status: 'paid', method: 'UPI', daysAgo: 12 },
  { id: 'dord_2', listingId: 'don_ananya_1', donorName: 'Nisha Reddy', donorUserId: 'usr_nisha', donorType: 'registered', status: 'paid', method: 'Credit Card', daysAgo: 9 },
  { id: 'dord_3', listingId: 'don_ananya_2', donorName: 'Kabir Menon', donorUserId: 'usr_kabir', donorType: 'creator', status: 'paid', method: 'UPI', daysAgo: 7 },
  { id: 'dord_4', listingId: 'don_meera_1', donorName: 'Arjun Bhatia', donorUserId: 'usr_arjun', donorType: 'registered', status: 'failed', method: 'Debit Card', daysAgo: 6 },
  { id: 'dord_5', listingId: 'don_meera_1', donorName: 'Sneha Iyer', donorUserId: 'usr_sneha', donorType: 'guest', status: 'paid', method: 'UPI', daysAgo: 4 },
  { id: 'dord_6', listingId: 'don_aarav_1', donorName: 'Daniel Fernandes', donorUserId: 'usr_daniel', donorType: 'registered', status: 'pending', method: 'Net Banking', daysAgo: 2 },
  { id: 'dord_7', listingId: 'don_aarav_1', donorName: 'Imran Sheikh', donorUserId: 'usr_imran', donorType: 'guest', status: 'cancelled', method: 'UPI', daysAgo: 3 },
  { id: 'dord_8', listingId: 'don_ananya_2', donorName: 'Fatima Noor', donorUserId: 'usr_fatima', donorType: 'registered', status: 'paid', method: 'Credit Card', daysAgo: 1 },
];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
};
function mask(method: string, seed: string, name: string): string {
  const last4 = String(1000 + (hash(seed) % 9000));
  const handle = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2) || 'us';
  if (method === 'UPI') return `${handle}••••@okhdfc`;
  if (method === 'Net Banking') return `HDFC ••••${last4}`;
  return `•••• ${last4}`;
}

export function buildDonationListings(users: UserRecord[], now: number): DonationListing[] {
  const day = 86400000;
  const byId = new Map(users.map((u) => [u.id, u]));
  return LISTINGS.map((l) => {
    const u = byId.get(l.creatorUserId);
    return {
      id: l.id,
      creatorUserId: l.creatorUserId,
      creatorName: u?.name ?? 'Creator',
      creatorIicaId: u?.iicaId,
      title: l.title,
      amount: l.amount,
      currency: 'INR',
      description: l.description,
      active: l.active,
      portfolioVisible: l.portfolioVisible,
      createdAt: new Date(now - l.daysAgo * day).toISOString(),
      updatedAt: new Date(now - l.daysAgo * day).toISOString(),
    };
  });
}

export function buildDonationOrders(listings: DonationListing[], now: number): DonationOrder[] {
  const day = 86400000;
  const byId = new Map(listings.map((l) => [l.id, l]));
  return ORDERS.map((o) => {
    const l = byId.get(o.listingId)!;
    return {
      id: o.id,
      listingId: o.listingId,
      listingTitle: l.title,
      creatorUserId: l.creatorUserId,
      creatorName: l.creatorName,
      donorName: o.donorName,
      donorUserId: o.donorUserId ?? null,
      donorType: o.donorType,
      amount: l.amount,
      currency: l.currency,
      paymentMethod: o.method,
      paymentMasked: mask(o.method, o.id, o.donorName),
      paymentRef: `PAY-${o.id.toUpperCase()}`,
      status: o.status,
      date: new Date(now - o.daysAgo * day).toISOString(),
    };
  });
}
