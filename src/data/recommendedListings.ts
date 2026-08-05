import type { DataState } from '../types/users';
import type { ListingType } from '../types/recommended';
import type { ProductRecord } from '../types/products';
import type { EventRecord } from '../types/events';

export interface ListingCard {
  id: string;
  type: ListingType;
  typeLabel: string;
  title: string;
  creator: string;
  creatorUserId?: string | null;
  category: string;
  price: number;
  free: boolean;
  available: boolean;
  reason?: string; // when unavailable
  route: string;   // source record
}

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  physical_product: 'Physical Product',
  digital_product: 'Digital Product',
  masterclass: 'Masterclass',
  event: 'Event',
  donation: 'Donation',
};

const productListingType = (p: ProductRecord): ListingType =>
  p.type === 'physical' ? 'physical_product' : p.type === 'digital' ? 'digital_product' : 'masterclass';

function sellerSuspended(state: DataState, userId?: string | null): boolean {
  if (!userId) return false;
  return state.users.find((u) => u.id === userId)?.membershipStatus === 'suspended';
}

function productCard(state: DataState, p: ProductRecord, now: number): ListingCard {
  const type = productListingType(p);
  const price = p.discountPrice ?? p.price;
  let available = true;
  let reason: string | undefined;
  if (sellerSuspended(state, p.sellerUserId)) { available = false; reason = 'Creator suspended'; }
  else if (p.status === 'draft') { available = false; reason = 'Draft'; }
  else if (p.status === 'hidden') { available = false; reason = 'Hidden'; }
  else if (p.status === 'archived') { available = false; reason = 'Archived'; }
  else if (p.status === 'out_of_stock' || (p.type === 'physical' && (p.physical?.stock ?? 0) <= 0)) { available = false; reason = 'Out of stock'; }
  else if (p.type === 'masterclass' && p.masterclass && new Date(p.masterclass.sessionAt).getTime() < now) { available = false; reason = 'Session ended'; }
  return {
    id: p.id, type, typeLabel: LISTING_TYPE_LABEL[type], title: p.title, creator: p.sellerName, creatorUserId: p.sellerUserId,
    category: p.category, price, free: price === 0, available, reason, route: `/admin/products/${p.id}`,
  };
}

function eventCard(state: DataState, e: EventRecord, now: number): ListingCard {
  const minPrice = e.ticketType === 'free' ? 0 : Math.min(...(e.tiers.length ? e.tiers.map((t) => t.price) : [0]));
  let available = true;
  let reason: string | undefined;
  if (sellerSuspended(state, e.hostUserId)) { available = false; reason = 'Host suspended'; }
  else if (e.status === 'draft') { available = false; reason = 'Draft'; }
  else if (e.status === 'hidden') { available = false; reason = 'Hidden'; }
  else if (e.status === 'cancelled') { available = false; reason = 'Cancelled'; }
  else if (e.status === 'completed') { available = false; reason = 'Completed'; }
  else if (e.status === 'sold_out') { available = false; reason = 'Sold out'; }
  else if (new Date(e.startAt).getTime() < now) { available = false; reason = 'Event ended'; }
  return {
    id: e.id, type: 'event', typeLabel: LISTING_TYPE_LABEL.event, title: e.title, creator: e.hostName, creatorUserId: e.hostUserId,
    category: String(e.category), price: minPrice, free: minPrice === 0, available, reason, route: `/admin/events/${e.id}`,
  };
}

/** All listings (products + events) with resolved availability. */
export function buildListingCatalog(state: DataState, now = Date.now()): ListingCard[] {
  return [
    ...state.products.map((p) => productCard(state, p, now)),
    ...state.events.map((e) => eventCard(state, e, now)),
  ];
}

/** Resolve one selected listing to its live card (null if the source is gone). */
export function resolveListing(state: DataState, listingId: string, type: ListingType, now = Date.now()): ListingCard | null {
  if (type === 'event') {
    const e = state.events.find((x) => x.id === listingId);
    return e ? eventCard(state, e, now) : null;
  }
  const p = state.products.find((x) => x.id === listingId);
  return p ? productCard(state, p, now) : null;
}
