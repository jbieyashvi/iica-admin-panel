import type { MembershipRecord, UserRecord } from '../types/users';

// Deterministic pseudo-random derived data for the read-only detail tabs
// (portfolio stats, orders, collaborations). Not persisted — a real
// backend would serve these. Seeded off the user id so values are stable.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const pick = (seed: number, min: number, max: number) => min + (seed % (max - min + 1));

export interface PortfolioStats {
  completeness: number;
  published: boolean;
  publicUrl: string;
  archiveVideos: number;
  products: number;
  events: number;
  testimonials: number;
}

export interface OrderRow {
  id: string;
  item: string;
  type: 'Physical' | 'Digital' | 'Masterclass' | 'Event Ticket';
  amount: number;
  date: string;
  status: 'Delivered' | 'Processing' | 'Awaiting Tracking' | 'Completed';
}

export interface CollabStats {
  recommendationsReceived: number;
  requestsSent: number;
  requestsAccepted: number;
  savedProfiles: number;
  upcomingMeetings: number;
  reportedInteractions: number;
}

const CATALOGUE: { item: string; type: OrderRow['type'] }[] = [
  { item: 'Signature Print', type: 'Physical' },
  { item: 'Digital Preset Pack', type: 'Digital' },
  { item: 'Masterclass: Studio Lighting', type: 'Masterclass' },
  { item: 'Live Event Ticket', type: 'Event Ticket' },
  { item: 'Portfolio Review', type: 'Masterclass' },
  { item: 'Brand Collab Kit', type: 'Physical' },
];
const ORDER_STATUS: OrderRow['status'][] = ['Delivered', 'Processing', 'Awaiting Tracking', 'Completed'];

export function derivePortfolio(user: UserRecord, mem?: MembershipRecord): PortfolioStats {
  const s = hash(user.id);
  const active = mem?.portfolioUnlocked ?? false;
  return {
    completeness: active ? pick(s, 62, 98) : pick(s, 10, 45),
    published: active,
    publicUrl: `https://iica.app/@${user.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}`,
    archiveVideos: active ? pick(s >> 2, 2, 18) : 0,
    products: active ? pick(s >> 3, 0, 12) : 0,
    events: active ? pick(s >> 4, 0, 6) : 0,
    testimonials: active ? pick(s >> 5, 0, 24) : 0,
  };
}

export function deriveOrders(user: UserRecord): OrderRow[] {
  const s = hash(user.id + 'orders');
  if (user.accountType === 'guest') return [];
  const count = pick(s, 1, 5);
  return Array.from({ length: count }, (_, i) => {
    const k = hash(user.id + i);
    const entry = CATALOGUE[k % CATALOGUE.length];
    return {
      id: `IICA-${10400 + (k % 900)}`,
      item: entry.item,
      type: entry.type,
      amount: [299, 499, 899, 1499, 2499, 3999][k % 6],
      date: new Date(2026, 6, 1 + (k % 26)).toISOString(),
      status: ORDER_STATUS[k % ORDER_STATUS.length],
    };
  });
}

export function deriveCollab(user: UserRecord): CollabStats {
  const s = hash(user.id + 'collab');
  const creator = user.accountType === 'creator';
  return {
    recommendationsReceived: creator ? pick(s, 8, 60) : pick(s, 0, 6),
    requestsSent: creator ? pick(s >> 1, 2, 24) : pick(s >> 1, 0, 3),
    requestsAccepted: creator ? pick(s >> 2, 1, 14) : 0,
    savedProfiles: pick(s >> 3, 0, 20),
    upcomingMeetings: creator ? pick(s >> 4, 0, 4) : 0,
    reportedInteractions: user.membershipStatus === 'suspended' ? pick(s >> 5, 1, 3) : 0,
  };
}

export function totalSpend(orders: OrderRow[]): number {
  return orders.reduce((sum, o) => sum + o.amount, 0);
}
