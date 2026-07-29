import { useSyncExternalStore } from 'react';
import type { MembershipCategory } from '../types';
import type {
  AccountType,
  AdminActor,
  DataState,
  MembershipRecord,
  MembershipStatus,
  UserRecord,
} from '../types/users';
import type {
  CategoryRecord,
  CategoryStatus,
  LocationCorrection,
  PortfolioRecord,
  PortfolioStatus,
} from '../types/portfolio';
import type {
  BookingStatus,
  EventCategoryStatus,
  EventFormat,
  EventRecord,
  EventStatus,
  ProposalStatus,
  ReportStatus,
  TicketOrder,
  TicketTier,
  TicketType,
} from '../types/events';
import type {
  DigitalDetails,
  MasterclassDetails,
  PhysicalDetails,
  ProductCategoryStatus,
  ProductRecord,
  ProductStatus,
  ProductType,
} from '../types/products';
import type {
  CommEntry,
  FulfilmentStatus,
  IssueStatus,
  IssueType,
  ProductOrder,
} from '../types/orders';
import type {
  CollaborationRecord,
  CollaborationSettings,
  CommRecord,
  CommType,
  ReportStatus as CollabReportStatus,
} from '../types/collaborations';
import type {
  TestimonialRecord,
  TestimonialPlacement,
  TestimonialSourceType,
  TestimonialStatus,
} from '../types/reviews';
import type { BannerLinkType, BannerRecord } from '../types/banners';
import { readStorage, writeStorage } from '../lib/storage';
import { makeIicaId, uid, initialsOf } from '../lib/id';
import { buildSeedState, SEED_VERSION } from './seed';
import { buildArchiveSeed, buildEventSeed, buildOrderSeed } from './seedEvents';
import { computeActivityScore } from './portfolioLogic';

const STORAGE_KEY = 'data_state';

// ---- Store internals -------------------------------------------------------

function load(): DataState {
  const stored = readStorage<DataState | null>(STORAGE_KEY, null);
  // Reseed on version change, or if a persisted state is missing a required
  // top-level slice (guards against a partially-written state after a schema bump).
  const intact = stored && Array.isArray(stored.collaborations) && Array.isArray(stored.productOrders) && !!stored.collaborationSettings && Array.isArray(stored.reviews) && Array.isArray(stored.testimonials) && Array.isArray(stored.banners);
  if (stored && stored.version === SEED_VERSION && intact) return stored;
  const seeded = buildSeedState();
  writeStorage(STORAGE_KEY, seeded);
  return seeded;
}

let state: DataState = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function commit(next: DataState) {
  state = next;
  writeStorage(STORAGE_KEY, next);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getState() {
  return state;
}

/** Whole-state hook — reference only changes on mutation (stable snapshot). */
export function useData(): DataState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---- Helpers ---------------------------------------------------------------

const now = () => new Date().toISOString();
const addDays = (from: Date, days: number) => new Date(from.getTime() + days * 86400000);

function replaceUser(users: UserRecord[], next: UserRecord) {
  return users.map((u) => (u.id === next.id ? next : u));
}
function replaceMembership(memberships: MembershipRecord[], next: MembershipRecord) {
  return memberships.map((m) => (m.id === next.id ? next : m));
}

// ---- Mutations -------------------------------------------------------------

export interface AddUserInput {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  accountType: AccountType;
  membershipCategory?: MembershipCategory;
}

export function addUser(input: AddUserInput, _actor: AdminActor): UserRecord {
  const id = uid('usr');
  const isCreator = input.accountType === 'creator' && !!input.membershipCategory;
  const iicaId = isCreator ? makeIicaId(input.name, (initialsOf(input.name).charCodeAt(0) * 7 + 313) % 1000) : undefined;
  const user: UserRecord = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    country: input.country,
    city: input.city,
    accountType: input.accountType,
    membershipCategory: isCreator ? input.membershipCategory : undefined,
    membershipStatus: isCreator ? 'form_submitted' : 'not_applicable',
    iicaId,
    joinedAt: now(),
    lastActiveAt: now(),
    suspension: null,
    notes: [],
  };

  let memberships = state.memberships;
  if (isCreator && input.membershipCategory) {
    const membership: MembershipRecord = {
      id: uid('mem'),
      userId: id,
      iicaId,
      category: input.membershipCategory,
      purchasePlatform: 'prototype_demo',
      purchaseStatus: 'not_started',
      membershipStatus: 'form_submitted',
      form: {
        fullName: input.name,
        email: input.email,
        phone: input.phone,
        country: input.country,
        city: input.city,
        category: input.membershipCategory,
        submittedAt: now(),
      },
      idGeneratedAt: iicaId ? now() : null,
      idHistory: iicaId ? [{ id: iicaId, at: now() }] : [],
      payment: {
        platform: 'prototype_demo',
        region: input.country,
        currency: input.country === 'India' ? 'INR' : 'USD',
        amount: input.country === 'India' ? 3999 : 99,
        purchaseStatus: 'not_started',
        receiptStatus: 'none',
        purchaseDate: null,
        renewalDate: null,
      },
      startDate: null,
      renewalDate: null,
      expiryDate: null,
      portfolioUnlocked: false,
      timeline: [
        { id: uid('tl'), key: 'form_submitted', label: 'Membership form submitted', at: now(), detail: `Category: ${input.membershipCategory}` },
        ...(iicaId ? [{ id: uid('tl'), key: 'iica_id_generated', label: 'IICA ID generated', at: now() }] : []),
      ],
      lastUpdatedAt: now(),
    };
    memberships = [membership, ...memberships];
  }

  commit({ ...state, users: [user, ...state.users], memberships });
  return user;
}

export interface SuspendInput {
  reason: string;
  note?: string;
  endDate?: string | null;
  notifyUser: boolean;
}

export function suspendUser(userId: string, input: SuspendInput, actor: AdminActor) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return;
  const updated: UserRecord = {
    ...user,
    membershipStatus: 'suspended',
    suspension: { ...input, endDate: input.endDate ?? null, at: now(), by: actor.name },
    lastActiveAt: user.lastActiveAt,
  };
  let memberships = state.memberships;
  const mem = state.memberships.find((m) => m.userId === userId);
  if (mem) {
    memberships = replaceMembership(memberships, {
      ...mem,
      membershipStatus: 'suspended',
      portfolioUnlocked: false,
      timeline: [...mem.timeline, { id: uid('tl'), key: 'suspended', label: 'Membership suspended by admin', at: now(), detail: input.reason }],
      lastUpdatedAt: now(),
    });
  }
  commit({ ...state, users: replaceUser(state.users, updated), memberships });
}

export function reactivateUser(userId: string, _actor: AdminActor) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return;
  const mem = state.memberships.find((m) => m.userId === userId);
  const restored: MembershipStatus = mem
    ? mem.purchaseStatus === 'completed'
      ? 'active'
      : mem.iicaId
        ? 'iica_id_generated'
        : 'form_submitted'
    : 'not_applicable';
  const updated: UserRecord = { ...user, membershipStatus: restored, suspension: null };
  let memberships = state.memberships;
  if (mem) {
    memberships = replaceMembership(memberships, {
      ...mem,
      membershipStatus: restored,
      portfolioUnlocked: restored === 'active',
      timeline: [...mem.timeline, { id: uid('tl'), key: 'reactivated', label: 'Membership reactivated by admin', at: now() }],
      lastUpdatedAt: now(),
    });
  }
  commit({ ...state, users: replaceUser(state.users, updated), memberships });
}

export function addNote(userId: string, body: string, actor: AdminActor) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return;
  const updated: UserRecord = {
    ...user,
    notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...user.notes],
  };
  commit({ ...state, users: replaceUser(state.users, updated) });
}

export function updatePricing(rows: DataState['pricing'], _actor: AdminActor) {
  commit({ ...state, pricing: rows });
}

// ---- Prototype simulation (Super Admin) ------------------------------------

type SimKind = 'completed' | 'failed' | 'renewal_due' | 'expired' | 'reset';

export function simulate(membershipId: string, kind: SimKind, _actor: AdminActor) {
  const mem = state.memberships.find((m) => m.id === membershipId);
  if (!mem) return;
  const user = state.users.find((u) => u.id === mem.userId);
  const start = new Date();
  let next: MembershipRecord = mem;

  if (kind === 'completed') {
    next = {
      ...mem,
      purchaseStatus: 'completed',
      membershipStatus: 'active',
      startDate: start.toISOString(),
      renewalDate: addDays(start, 365).toISOString(),
      expiryDate: null,
      portfolioUnlocked: true,
      payment: {
        ...mem.payment,
        purchaseStatus: 'completed',
        receiptStatus: 'available',
        purchaseDate: start.toISOString(),
        renewalDate: addDays(start, 365).toISOString(),
        transactionRef: mem.payment.transactionRef ?? `DEMO-${Math.floor(start.getTime() / 1000)}`,
        sku: mem.payment.sku ?? 'iica.membership.annual',
      },
      timeline: [
        ...mem.timeline,
        { id: uid('tl'), key: 'purchase_confirmed', label: 'Purchase confirmed (simulated)', at: now() },
        { id: uid('tl'), key: 'membership_activated', label: 'Membership activated', at: now() },
        { id: uid('tl'), key: 'portfolio_unlocked', label: 'Portfolio access unlocked', at: now() },
      ],
      lastUpdatedAt: now(),
    };
  } else if (kind === 'failed') {
    next = {
      ...mem,
      purchaseStatus: 'failed',
      membershipStatus: 'purchase_pending',
      portfolioUnlocked: false,
      payment: { ...mem.payment, purchaseStatus: 'failed', receiptStatus: 'none' },
      timeline: [...mem.timeline, { id: uid('tl'), key: 'purchase_failed', label: 'Purchase failed (simulated)', at: now() }],
      lastUpdatedAt: now(),
    };
  } else if (kind === 'renewal_due') {
    next = {
      ...mem,
      membershipStatus: 'renewal_due',
      renewalDate: addDays(start, 7).toISOString(),
      payment: { ...mem.payment, renewalDate: addDays(start, 7).toISOString() },
      timeline: [...mem.timeline, { id: uid('tl'), key: 'renewal_due', label: 'Renewal due soon (simulated)', at: now() }],
      lastUpdatedAt: now(),
    };
  } else if (kind === 'expired') {
    next = {
      ...mem,
      membershipStatus: 'expired',
      expiryDate: start.toISOString(),
      portfolioUnlocked: false,
      timeline: [...mem.timeline, { id: uid('tl'), key: 'expired', label: 'Membership expired (simulated)', at: now() }],
      lastUpdatedAt: now(),
    };
  } else {
    next = {
      ...mem,
      purchaseStatus: 'not_started',
      membershipStatus: mem.iicaId ? 'iica_id_generated' : 'form_submitted',
      startDate: null,
      renewalDate: null,
      expiryDate: null,
      portfolioUnlocked: false,
      payment: {
        ...mem.payment,
        purchaseStatus: 'not_started',
        receiptStatus: 'none',
        purchaseDate: null,
        renewalDate: null,
        cancellationDate: null,
        refundStatus: null,
      },
      timeline: [
        ...mem.timeline.filter((t) => ['form_submitted', 'iica_id_generated'].includes(t.key)),
        { id: uid('tl'), key: 'demo_reset', label: 'Membership demo reset', at: now() },
      ],
      lastUpdatedAt: now(),
    };
  }

  // Keep the linked user's membership status in sync.
  let users = state.users;
  if (user) {
    const uStatus: MembershipStatus = next.membershipStatus;
    users = replaceUser(users, {
      ...user,
      membershipStatus: uStatus,
      accountType: uStatus === 'active' || uStatus === 'renewal_due' || uStatus === 'expired' ? 'creator' : user.accountType,
    });
  }

  commit({ ...state, users, memberships: replaceMembership(state.memberships, next) });
}

/** Wipe all admin changes and re-seed. Used by the "Reset Membership Demo" tools. */
export function resetAllData() {
  commit(buildSeedState());
}

// ===========================================================================
// Phase 3 — Categories
// ===========================================================================

function replaceCategory(list: CategoryRecord[], next: CategoryRecord) {
  return list.map((c) => (c.id === next.id ? next : c));
}

export interface AddCategoryInput {
  name: string;
  description: string;
  icon: string;
  catalogueVisible: boolean;
  status: CategoryStatus;
}

export function categoryNameExists(name: string, exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  return state.categories.some((c) => c.name.toLowerCase() === n && c.id !== exceptId);
}

export function addCategory(input: AddCategoryInput, actor: AdminActor): CategoryRecord | null {
  if (!input.name.trim() || categoryNameExists(input.name)) return null;
  const cat: CategoryRecord = {
    id: uid('cat'),
    name: input.name.trim(),
    description: input.description.trim(),
    icon: input.icon || 'Tag',
    catalogueVisible: input.catalogueVisible,
    status: input.status,
    order: state.categories.length,
    relatedDomains: [],
    history: [{ id: uid('ch'), action: 'Category created', by: actor.name, role: actor.role, at: now() }],
    createdAt: now(),
    updatedAt: now(),
  };
  commit({ ...state, categories: [...state.categories, cat] });
  return cat;
}

export function editCategory(id: string, patch: { description?: string; catalogueVisible?: boolean }, actor: AdminActor) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return;
  const next: CategoryRecord = {
    ...cat,
    description: patch.description ?? cat.description,
    catalogueVisible: patch.catalogueVisible ?? cat.catalogueVisible,
    updatedAt: now(),
    history: [{ id: uid('ch'), action: 'Category updated', by: actor.name, role: actor.role, at: now() }, ...cat.history],
  };
  commit({ ...state, categories: replaceCategory(state.categories, next) });
}

export function setCategoryStatus(id: string, status: CategoryStatus, actor: AdminActor, reason?: string) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return;
  const next: CategoryRecord = {
    ...cat,
    status,
    updatedAt: now(),
    history: [{ id: uid('ch'), action: status === 'active' ? 'Category activated' : 'Category deactivated', by: actor.name, role: actor.role, at: now(), detail: reason }, ...cat.history],
  };
  commit({ ...state, categories: replaceCategory(state.categories, next) });
}

export function reorderCategory(id: string, direction: 'up' | 'down', _actor: AdminActor) {
  const sorted = [...state.categories].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= sorted.length) return;
  [sorted[idx].order, sorted[swap].order] = [sorted[swap].order, sorted[idx].order];
  commit({
    ...state,
    categories: state.categories.map((c) => {
      const s = sorted.find((x) => x.id === c.id)!;
      return { ...c, order: s.order };
    }),
  });
}

// Profiles currently using a category (blocks unsafe deletion).
export function categoryUsage(name: string): number {
  return state.users.filter((u) => u.membershipCategory === name).length;
}

// ===========================================================================
// Phase 3 — Portfolios & Catalogue
// ===========================================================================

function replacePortfolio(list: PortfolioRecord[], next: PortfolioRecord) {
  return list.map((p) => (p.id === next.id ? next : p));
}

function recalc(p: PortfolioRecord): PortfolioRecord {
  return { ...p, activityScore: computeActivityScore(p, true), scoreCalculatedAt: now(), lastUpdatedAt: now() };
}

function pushTimeline(p: PortfolioRecord, key: string, label: string, detail?: string): PortfolioRecord {
  return { ...p, timeline: [...p.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}

function commitPortfolio(next: PortfolioRecord) {
  commit({ ...state, portfolios: replacePortfolio(state.portfolios, next) });
}

export function publishPortfolio(portfolioId: string, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc(pushTimeline({ ...p, status: 'published', hiddenFromCatalogue: false }, 'published', 'Portfolio published'));
  commitPortfolio(next);
}

export function unpublishPortfolio(portfolioId: string, reason: string, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc(pushTimeline({ ...p, status: 'draft' }, 'unpublished', 'Portfolio unpublished', reason));
  commitPortfolio(next);
}

export function requestPortfolioChanges(portfolioId: string, input: { sections: string[]; message: string; note?: string }, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc(pushTimeline({ ...p, status: 'changes_requested' }, 'changes', 'Changes requested', `${input.sections.join(', ')} — ${input.message}`));
  commitPortfolio(next);
}

export function setCatalogueHidden(portfolioId: string, hidden: boolean, reason: string, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc({ ...p, hiddenFromCatalogue: hidden, hiddenReason: hidden ? reason : null });
  commitPortfolio(next);
}

export function correctLocation(portfolioId: string, correction: Omit<LocationCorrection, 'at' | 'by'>, actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const full: LocationCorrection = { ...correction, at: now(), by: actor.name };
  const next = recalc(pushTimeline({ ...p, locationCorrection: full }, 'location', 'Location corrected by admin', `${correction.city}, ${correction.country}`));
  commitPortfolio(next);
}

export function revertLocation(portfolioId: string, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p || !p.locationCorrection) return;
  const next = recalc(pushTimeline({ ...p, locationCorrection: null }, 'location_revert', 'Location correction reverted'));
  commitPortfolio(next);
}

type ContentSection = 'testimonials' | 'gallery' | 'watch';

export function setContentHidden(portfolioId: string, section: ContentSection, itemId: string, hidden: boolean, _actor: AdminActor, _reason?: string) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const content = { ...p.content };
  if (section === 'testimonials') content.testimonials = content.testimonials.map((t) => (t.id === itemId ? { ...t, hidden } : t));
  if (section === 'gallery') content.gallery = content.gallery.map((g) => (g.id === itemId ? { ...g, hidden } : g));
  if (section === 'watch') content.watch = content.watch.map((w) => (w.id === itemId ? { ...w, hidden } : w));
  const next = recalc({ ...p, content });
  commit({ ...state, portfolios: replacePortfolio(state.portfolios, next) });
}

export function resolveReport(portfolioId: string, reportId: string, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc({ ...p, reports: p.reports.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)) });
  commitPortfolio(next);
}

export function editDiscovery(portfolioId: string, patch: { domainGenre?: string; skills?: string[] }, _actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = recalc({
    ...p,
    domainGenre: patch.domainGenre ?? p.domainGenre,
    content: { ...p.content, skills: patch.skills ?? p.content.skills },
  });
  commitPortfolio(next);
}

export function addPortfolioNote(portfolioId: string, body: string, actor: AdminActor) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const next = { ...p, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...p.notes] };
  commitPortfolio(next);
}

export type { PortfolioStatus };

// ===========================================================================
// Phase 4 — Events
// ===========================================================================

function replaceEvent(list: EventRecord[], next: EventRecord) {
  return list.map((e) => (e.id === next.id ? next : e));
}
function pushEvtTimeline(e: EventRecord, key: string, label: string, detail?: string): EventRecord {
  return { ...e, timeline: [...e.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}
function commitEvent(next: EventRecord, extra?: Partial<DataState>) {
  commit({ ...state, ...extra, events: replaceEvent(state.events, next) });
}

export function publishEvent(eventId: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent(pushEvtTimeline({ ...e, status: 'published', lastUpdatedAt: now() }, 'published', 'Event published'));
}

export function requestEventChanges(eventId: string, input: { fields: string[]; message: string; note?: string }, actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  const notes = input.note ? [{ id: uid('note'), body: input.note, author: actor.name, role: actor.role, at: now() }, ...e.notes] : e.notes;
  commitEvent(pushEvtTimeline({ ...e, status: 'changes_requested', notes, lastUpdatedAt: now() }, 'changes', 'Changes requested', `${input.fields.join(', ')} — ${input.message}`));
}

export function hideEvent(eventId: string, reason: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent(pushEvtTimeline({ ...e, status: 'hidden', lastUpdatedAt: now() }, 'hidden', 'Event hidden', reason));
}

export function cancelEvent(eventId: string, reason: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent(pushEvtTimeline({ ...e, status: 'cancelled', lastUpdatedAt: now() }, 'cancelled', 'Event cancelled', reason));
}

export function restoreEvent(eventId: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent(pushEvtTimeline({ ...e, status: 'published', lastUpdatedAt: now() }, 'restored', 'Event restored to published'));
}

export function addEventNote(eventId: string, body: string, actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent({ ...e, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...e.notes] });
}

export function eventReportAction(eventId: string, reportId: string, status: ReportStatus, _actor: AdminActor, _reason?: string) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent({ ...e, reports: e.reports.map((r) => (r.id === reportId ? { ...r, status } : r)), lastUpdatedAt: now() });
}

export interface AddEventInput {
  title: string;
  hostName: string;
  hostUserId?: string | null;
  category: string;
  description: string;
  format: EventFormat;
  startAt: string;
  endAt: string;
  timezone: string;
  venue?: string;
  platform?: string;
  city?: string;
  country?: string;
  ticketType: TicketType;
  tiers: { name: string; price: number; capacity: number }[];
  refundPolicy: string;
  publish: boolean;
}

export function addAdminEvent(input: AddEventInput, _actor: AdminActor): EventRecord {
  const id = uid('evt');
  const tiers: TicketTier[] = input.tiers.map((t, i) => ({
    id: `${id}_tier${i}`, name: t.name, price: t.price, capacity: t.capacity, sold: 0, reserved: 0,
    perUserLimit: input.ticketType === 'free' ? 4 : 6, salesStart: now(), salesEnd: input.startAt, refundEligible: t.price > 0,
  }));
  const host = input.hostUserId ? state.users.find((u) => u.id === input.hostUserId) : undefined;
  const ev: EventRecord = {
    id, title: input.title, hostUserId: input.hostUserId ?? null, hostName: input.hostName,
    hostCategory: host?.membershipCategory ?? null, category: input.category, customCategoryPending: false,
    format: input.format, ticketType: input.ticketType, status: input.publish ? 'published' : 'draft',
    description: input.description, coverImage: null, startAt: input.startAt, endAt: input.endAt,
    timezone: input.timezone, durationMins: Math.max(30, Math.round((new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 60000)),
    ageRestriction: 'All ages', language: 'English / Hindi', coHosts: [],
    location: input.format === 'online' ? {} : { venue: input.venue, address: input.venue, city: input.city, country: input.country },
    online: input.format === 'in_person' ? {} : { platform: input.platform ?? 'IICA Live Stream', joinLinkStatus: 'not_set', linkReleaseTiming: '1 hour before start' },
    externalBookingUrl: null, tiers, refundPolicy: input.refundPolicy,
    reports: [], notes: [],
    timeline: [
      { id: uid('tl'), key: 'created', label: 'Event created by admin', at: now() },
      ...(input.publish ? [{ id: uid('tl'), key: 'published', label: 'Event published', at: now() }] : []),
    ],
    submittedAt: input.publish ? now() : null, lastUpdatedAt: now(),
  };
  commit({ ...state, events: [ev, ...state.events] });
  return ev;
}

// ===========================================================================
// Phase 4 — Ticket orders
// ===========================================================================

function replaceOrder(list: TicketOrder[], next: TicketOrder) {
  return list.map((o) => (o.id === next.id ? next : o));
}

export function checkInOrder(orderId: string, _actor: AdminActor) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return;
  const next: TicketOrder = { ...o, checkInStatus: 'checked_in', bookingStatus: 'checked_in' };
  commit({ ...state, orders: replaceOrder(state.orders, next) });
}

export function cancelBooking(orderId: string, _reason: string, _actor: AdminActor) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return;
  const next: TicketOrder = { ...o, bookingStatus: 'cancelled' };
  commit({ ...state, orders: replaceOrder(state.orders, next) });
}

// Refund REVIEW only — never silently completes a refund.
export function initiateRefundReview(orderId: string, amount: number, reason: string, actor: AdminActor) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return;
  const next: TicketOrder = {
    ...o,
    refundHistory: [{ id: uid('ref'), amount, at: now(), by: actor.name, reason, status: 'requested' }, ...o.refundHistory],
  };
  commit({ ...state, orders: replaceOrder(state.orders, next) });
}

// ===========================================================================
// Phase 4 — Custom category proposals & event settings
// ===========================================================================

function setProposal(id: string, patch: Partial<{ status: ProposalStatus; note: string | null; mappedTo: string | null }>) {
  return state.categoryProposals.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function approveProposal(proposalId: string, _actor: AdminActor) {
  const p = state.categoryProposals.find((x) => x.id === proposalId);
  if (!p) return;
  const exists = state.eventCategories.some((c) => c.name.toLowerCase() === p.proposedName.toLowerCase());
  const newCat = { id: uid('ecat'), name: p.proposedName, description: 'Created from a creator proposal.', order: state.eventCategories.length, isDefault: false, status: 'active' as const, createdAt: now() };
  const newCats = exists
    ? state.eventCategories
    : [...state.eventCategories.filter((c) => c.name !== 'Others'), newCat, ...state.eventCategories.filter((c) => c.name === 'Others')];
  const events = state.events.map((e) => (e.id === p.eventId ? { ...e, customCategoryPending: false, category: p.proposedName } : e));
  commit({ ...state, eventCategories: newCats, categoryProposals: setProposal(proposalId, { status: 'approved' }), events });
}

export function mapProposal(proposalId: string, targetName: string, _actor: AdminActor) {
  const p = state.categoryProposals.find((x) => x.id === proposalId);
  if (!p) return;
  const events = state.events.map((e) => (e.id === p.eventId ? { ...e, customCategoryPending: false, category: targetName } : e));
  commit({ ...state, categoryProposals: setProposal(proposalId, { status: 'mapped', mappedTo: targetName }), events });
}

export function requestProposalName(proposalId: string, note: string, _actor: AdminActor) {
  const p = state.categoryProposals.find((x) => x.id === proposalId);
  if (!p) return;
  commit({ ...state, categoryProposals: setProposal(proposalId, { status: 'needs_name', note }) });
}

export function rejectProposal(proposalId: string, reason: string, _actor: AdminActor) {
  const p = state.categoryProposals.find((x) => x.id === proposalId);
  if (!p) return;
  commit({ ...state, categoryProposals: setProposal(proposalId, { status: 'rejected', note: reason }) });
}

// ---- Event category CRUD ---------------------------------------------------

export function eventCategoryNameExists(name: string, exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  return state.eventCategories.some((c) => c.name.toLowerCase() === n && c.id !== exceptId);
}

// Number of events currently assigned to a category name.
export function eventCategoryUsage(name: string): number {
  return state.events.filter((e) => e.category === name).length;
}

export function addEventCategory(input: { name: string; description: string; status: EventCategoryStatus }, _actor: AdminActor) {
  if (!input.name.trim() || eventCategoryNameExists(input.name)) return null;
  const cat = {
    id: uid('ecat'),
    name: input.name.trim(),
    description: input.description.trim(),
    order: state.eventCategories.length,
    isDefault: false,
    status: input.status,
    createdAt: now(),
  };
  // Keep "Others" last for a tidy list.
  const cats = [...state.eventCategories.filter((c) => c.name !== 'Others'), cat, ...state.eventCategories.filter((c) => c.name === 'Others')].map((c, i) => ({ ...c, order: i }));
  commit({ ...state, eventCategories: cats });
  return cat;
}

export function editEventCategory(id: string, patch: { name?: string; description?: string }, _actor: AdminActor) {
  const cat = state.eventCategories.find((c) => c.id === id);
  if (!cat) return;
  if (patch.name && eventCategoryNameExists(patch.name, id)) return;
  const next = { ...cat, name: patch.name?.trim() ?? cat.name, description: patch.description?.trim() ?? cat.description };
  commit({ ...state, eventCategories: state.eventCategories.map((c) => (c.id === id ? next : c)) });
}

export function setEventCategoryStatus(id: string, status: EventCategoryStatus, _actor: AdminActor) {
  const cat = state.eventCategories.find((c) => c.id === id);
  if (!cat) return;
  commit({ ...state, eventCategories: state.eventCategories.map((c) => (c.id === id ? { ...c, status } : c)) });
}

export function updateEventSettings(patch: Partial<DataState['eventSettings']>, _actor: AdminActor) {
  commit({ ...state, eventSettings: { ...state.eventSettings, ...patch } });
}

// ===========================================================================
// Phase 4 — Prototype tools (Super Admin)
// ===========================================================================

function recomputeEventStatusFromTiers(e: EventRecord): EventStatus {
  if (e.tiers.length && e.tiers.every((t) => t.sold >= t.capacity) && ['published', 'sold_out'].includes(e.status)) return 'sold_out';
  return e.status;
}

export function simTicketPurchase(eventId: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e || e.ticketType === 'external') return;
  const tier = e.tiers.find((t) => t.price > 0) ?? e.tiers[0];
  if (!tier) return;
  const qty = 2;
  const subtotal = tier.price * qty;
  const taxes = Math.round(subtotal * 0.18);
  const order: TicketOrder = {
    id: uid('ord'), eventId, tierId: tier.id, tierName: tier.name,
    buyerName: 'Prototype Buyer', buyerEmail: 'prototype.buyer@example.com', buyerPhone: '+91 90000 00000',
    guest: false, userId: null, quantity: qty, subtotal, taxes: tier.price ? taxes : 0, total: tier.price ? subtotal + taxes : 0,
    paymentStatus: tier.price ? 'paid' : 'paid', bookingStatus: 'confirmed', checkInStatus: 'not_checked',
    ticketIds: [uid('TKT'), uid('TKT')], bookingDate: now(), refundHistory: [],
  };
  const events = state.events.map((x) => {
    if (x.id !== eventId) return x;
    const updated = { ...x, tiers: x.tiers.map((t) => (t.id === tier.id ? { ...t, sold: Math.min(t.capacity, t.sold + qty) } : t)), lastUpdatedAt: now() };
    return { ...updated, status: recomputeEventStatusFromTiers(updated) };
  });
  commit({ ...state, events, orders: [order, ...state.orders] });
}

export function simFreeBooking(eventId: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  const tier = e.tiers[0];
  if (!tier) return;
  const order: TicketOrder = {
    id: uid('ord'), eventId, tierId: tier.id, tierName: tier.name,
    buyerName: 'Guest — Prototype', buyerEmail: 'guest.prototype@example.com', buyerPhone: '+91 90000 00001',
    guest: true, userId: null, quantity: 1, subtotal: 0, taxes: 0, total: 0,
    paymentStatus: 'paid', bookingStatus: 'confirmed', checkInStatus: 'not_checked',
    ticketIds: [uid('TKT')], bookingDate: now(), refundHistory: [],
  };
  const events = state.events.map((x) => (x.id === eventId ? { ...x, tiers: x.tiers.map((t, i) => (i === 0 ? { ...t, sold: Math.min(t.capacity, t.sold + 1) } : t)), lastUpdatedAt: now() } : x));
  commit({ ...state, events, orders: [order, ...state.orders] });
}

export function simSoldOut(eventId: string, _actor: AdminActor) {
  const e = state.events.find((x) => x.id === eventId);
  if (!e) return;
  commitEvent({ ...e, status: 'sold_out' as EventStatus, tiers: e.tiers.map((t) => ({ ...t, sold: t.capacity })), lastUpdatedAt: now() });
}

export function simEventCancellation(eventId: string, actor: AdminActor) {
  cancelEvent(eventId, 'Prototype simulation — event cancellation', actor);
}

// Rebuild only Archive + Event data from seed, keeping users/portfolios intact.
export function resetArchiveEventDemo(_actor: AdminActor) {
  const nowMs = Date.now();
  const { events, proposals } = buildEventSeed(state.users, nowMs);
  commit({
    ...state,
    archives: buildArchiveSeed(state.portfolios),
    events,
    orders: buildOrderSeed(events, nowMs),
    categoryProposals: proposals,
  });
}

export type { EventStatus, BookingStatus };

// ===========================================================================
// Products & Product categories
// ===========================================================================

export function productCategoryNameExists(name: string, type: ProductType, exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  return state.productCategories.some((c) => c.type === type && c.name.toLowerCase() === n && c.id !== exceptId);
}

export function productCategoryUsage(name: string, type: ProductType): number {
  return state.products.filter((p) => p.type === type && p.category === name).length;
}

export function addProductCategory(input: { name: string; type: ProductType; description: string; status: ProductCategoryStatus }, _actor: AdminActor) {
  if (!input.name.trim() || productCategoryNameExists(input.name, input.type)) return null;
  const cat = {
    id: uid('pcat'),
    name: input.name.trim(),
    type: input.type,
    description: input.description.trim(),
    status: input.status,
    createdAt: now(),
  };
  commit({ ...state, productCategories: [...state.productCategories, cat] });
  return cat;
}

export function editProductCategory(id: string, patch: { name?: string; description?: string }, _actor: AdminActor) {
  const cat = state.productCategories.find((c) => c.id === id);
  if (!cat) return;
  if (patch.name && productCategoryNameExists(patch.name, cat.type, id)) return;
  const next = { ...cat, name: patch.name?.trim() ?? cat.name, description: patch.description?.trim() ?? cat.description };
  commit({ ...state, productCategories: state.productCategories.map((c) => (c.id === id ? next : c)) });
}

export function setProductCategoryStatus(id: string, status: ProductCategoryStatus, _actor: AdminActor) {
  const cat = state.productCategories.find((c) => c.id === id);
  if (!cat) return;
  commit({ ...state, productCategories: state.productCategories.map((c) => (c.id === id ? { ...c, status } : c)) });
}

function replaceProduct(list: ProductRecord[], next: ProductRecord) {
  return list.map((p) => (p.id === next.id ? next : p));
}
function pushProdTimeline(p: ProductRecord, key: string, label: string, detail?: string): ProductRecord {
  return { ...p, timeline: [...p.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}
function commitProduct(next: ProductRecord) {
  commit({ ...state, products: replaceProduct(state.products, next) });
}

export interface AddProductInput {
  type: ProductType;
  sellerUserId: string;
  category: string;
  title: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  physical?: PhysicalDetails;
  masterclass?: MasterclassDetails;
  digital?: DigitalDetails;
  publish: boolean;
}

export function addProduct(input: AddProductInput, _actor: AdminActor): ProductRecord {
  const id = uid('prod');
  const seller = state.users.find((u) => u.id === input.sellerUserId);
  const product: ProductRecord = {
    id,
    sellerUserId: input.sellerUserId,
    sellerName: seller?.name ?? 'Creator',
    sellerIicaId: seller?.iicaId,
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    images: ['img_new_1', 'img_new_2', 'img_new_3'],
    price: input.price,
    discountPrice: input.discountPrice ?? null,
    currency: 'INR',
    status: input.publish ? 'published' : 'draft',
    createdAt: now(),
    lastUpdatedAt: now(),
    timeline: [
      { id: uid('tl'), key: 'created', label: 'Product created by admin', at: now() },
      ...(input.publish ? [{ id: uid('tl'), key: 'published', label: 'Product published', at: now() }] : []),
    ],
    notes: [],
    physical: input.physical,
    masterclass: input.masterclass,
    digital: input.digital,
  };
  commit({ ...state, products: [product, ...state.products] });
  return product;
}

export function publishProduct(productId: string, _actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  commitProduct(pushProdTimeline({ ...p, status: 'published', lastUpdatedAt: now() }, 'published', 'Product published'));
}

export function requestProductChanges(productId: string, input: { fields: string[]; message: string; note?: string }, actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const notes = input.note ? [{ id: uid('note'), body: input.note, author: actor.name, role: actor.role, at: now() }, ...p.notes] : p.notes;
  commitProduct(pushProdTimeline({ ...p, status: 'changes_requested', notes, lastUpdatedAt: now() }, 'changes', 'Changes requested', `${input.fields.join(', ')} — ${input.message}`));
}

export function hideProduct(productId: string, reason: string, _actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  commitProduct(pushProdTimeline({ ...p, status: 'hidden', lastUpdatedAt: now() }, 'hidden', 'Hidden from Shop', reason));
}

export function restoreProduct(productId: string, _actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  commitProduct(pushProdTimeline({ ...p, status: 'published', lastUpdatedAt: now() }, 'restored', 'Restored to Shop'));
}

export function archiveProduct(productId: string, reason: string, _actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  commitProduct(pushProdTimeline({ ...p, status: 'archived', lastUpdatedAt: now() }, 'archived', 'Product archived', reason));
}

export function addProductNote(productId: string, body: string, actor: AdminActor) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  commitProduct({ ...p, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...p.notes] });
}

export type { ProductStatus };

// ===========================================================================
// Product Orders
// ===========================================================================

function replaceOrderRecord(list: ProductOrder[], next: ProductOrder) {
  return list.map((o) => (o.id === next.id ? next : o));
}
function pushOrderTimeline(o: ProductOrder, key: string, label: string, detail?: string): ProductOrder {
  return { ...o, timeline: [...o.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}
function commitOrder(next: ProductOrder) {
  commit({ ...state, productOrders: replaceOrderRecord(state.productOrders, next) });
}

function deriveOrderStatus(to: FulfilmentStatus): ProductOrder['orderStatus'] {
  if (['delivered', 'buyer_confirmed', 'completed', 'returned'].includes(to)) return 'completed';
  return 'processing';
}

export function advanceFulfilment(orderId: string, to: FulfilmentStatus, _actor: AdminActor, reason?: string) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  let next: ProductOrder = {
    ...o,
    fulfilmentStatus: to,
    orderStatus: deriveOrderStatus(to),
    sellerAcceptedAt: o.sellerAcceptedAt ?? (to !== 'awaiting_acceptance' ? now() : null),
    lastUpdatedAt: now(),
  };
  // Type-specific timestamps.
  if (next.shipment) {
    const s = { ...next.shipment };
    if (to === 'dispatched' && !s.dispatchedAt) s.dispatchedAt = now();
    if (to === 'delivered') s.deliveredAt = now();
    next.shipment = s;
  }
  if (next.digital) {
    const d = { ...next.digital };
    if (to === 'delivery_sent' && !d.deliverySentAt) d.deliverySentAt = now();
    if (to === 'buyer_confirmed') d.buyerAccessConfirmed = true;
    next.digital = d;
  }
  if (next.masterclass) {
    const m = { ...next.masterclass };
    if (to === 'delivery_sent' && !m.linkSentAt) m.linkSentAt = now();
    if (to === 'buyer_confirmed') m.buyerAccessConfirmed = true;
    next.masterclass = m;
  }
  next = pushOrderTimeline(next, 'fulfilment', `Fulfilment: ${to.replace(/_/g, ' ')}`, reason);
  commitOrder(next);
}

export function correctTracking(orderId: string, patch: { courier?: string; trackingId?: string; trackingUrl?: string; estimatedDeliveryAt?: string | null }, reason: string, _actor: AdminActor) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o || !o.shipment) return;
  const shipment = {
    ...o.shipment,
    courier: patch.courier ?? o.shipment.courier,
    trackingId: patch.trackingId ?? o.shipment.trackingId,
    trackingUrl: patch.trackingUrl ?? o.shipment.trackingUrl,
    estimatedDeliveryAt: patch.estimatedDeliveryAt ?? o.shipment.estimatedDeliveryAt,
  };
  commitOrder(pushOrderTimeline({ ...o, shipment, lastUpdatedAt: now() }, 'tracking', 'Tracking details corrected', reason));
}

export function markOrderDelivered(orderId: string, reason: string, actor: AdminActor) {
  advanceFulfilment(orderId, 'delivered', actor, `Marked delivered: ${reason}`);
}

export function addOrderCommunication(orderId: string, entry: { channel: 'Email' | 'Phone'; recipient: string; messageType: string; body?: string }, actor: AdminActor) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  const comm: CommEntry = {
    id: uid('comm'),
    at: now(),
    sender: actor.name,
    recipient: entry.recipient,
    channel: entry.channel,
    messageType: entry.messageType,
    deliveryStatus: entry.channel === 'Email' ? 'Sent' : 'Logged',
    body: entry.body,
  };
  commitOrder({ ...o, communications: [comm, ...o.communications], lastUpdatedAt: now() });
}

export function addOrderNote(orderId: string, body: string, actor: AdminActor) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  commitOrder({ ...o, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...o.notes] });
}

export function openIssue(orderId: string, input: { type: IssueType; reason: string }, actor: AdminActor) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  const issue = {
    id: uid('iss'),
    type: input.type,
    buyerReason: input.reason,
    sellerResponse: null,
    status: 'new' as IssueStatus,
    assignedAdmin: actor.name,
    evidence: [] as string[],
    notes: [],
    decisions: [],
    createdAt: now(),
  };
  commitOrder(pushOrderTimeline({ ...o, issues: [issue, ...o.issues], lastUpdatedAt: now() }, 'issue', `Issue opened: ${input.type.replace(/_/g, ' ')}`));
}

// Move an issue to a new status with a logged decision. Approving NEVER changes
// payment status; refunds are handled separately (Sent to Finance → …).
export function setIssueStatus(orderId: string, issueId: string, action: string, statusAfter: IssueStatus, actor: AdminActor, reason?: string) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  const issues = o.issues.map((i) =>
    i.id === issueId
      ? {
          ...i,
          status: statusAfter,
          assignedAdmin: i.assignedAdmin ?? actor.name,
          decisions: [...i.decisions, { id: uid('dec'), action, reason, by: actor.name, at: now(), statusAfter }],
        }
      : i,
  );
  commitOrder({ ...o, issues, lastUpdatedAt: now() });
}

export function addIssueNote(orderId: string, issueId: string, body: string, actor: AdminActor) {
  const o = state.productOrders.find((x) => x.id === orderId);
  if (!o) return;
  const issues = o.issues.map((i) => (i.id === issueId ? { ...i, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...i.notes] } : i));
  commitOrder({ ...o, issues });
}

export type { FulfilmentStatus, IssueStatus };

// ===========================================================================
// Collaborations & Meetings
// ===========================================================================

function replaceCollab(list: CollaborationRecord[], next: CollaborationRecord) {
  return list.map((c) => (c.id === next.id ? next : c));
}
function pushCollabTimeline(c: CollaborationRecord, key: string, label: string, detail?: string): CollaborationRecord {
  return { ...c, timeline: [...c.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}
function addComm(c: CollaborationRecord, type: CommType, sender: string, recipient: string, channel: 'in_app' | 'email', body?: string): CollaborationRecord {
  const entry: CommRecord = { id: uid('cm'), at: now(), sender, recipient, type, channel, delivery: channel === 'email' ? 'sent' : 'delivered', body };
  return { ...c, communications: [entry, ...c.communications] };
}
function commitCollab(next: CollaborationRecord) {
  commit({ ...state, collaborations: replaceCollab(state.collaborations, { ...next, lastUpdatedAt: now() }) });
}
function findCollab(id: string) {
  return state.collaborations.find((c) => c.id === id);
}

// Prototype reminder — logs a notification record only. No real email/push.
export function sendCollabReminder(collabId: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  let next = addComm(c, 'request_reminder', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'in_app', 'Reminder to respond to the pending collaboration request.');
  next = pushCollabTimeline(next, 'reminder', 'Request reminder sent', 'Prototype notification — no real message sent.');
  commitCollab(next);
}

export function extendCollabExpiry(collabId: string, days: number, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  const base = c.expiryDate && new Date(c.expiryDate).getTime() > Date.now() ? new Date(c.expiryDate) : new Date();
  const nextExpiry = addDays(base, days).toISOString();
  // Reopen an expired request when its window is extended.
  const requestStatus = c.requestStatus === 'expired' ? 'pending_response' : c.requestStatus;
  let next: CollaborationRecord = { ...c, expiryDate: nextExpiry, requestStatus };
  next = pushCollabTimeline(next, 'expiry_extended', 'Request expiry extended', `Extended by ${days} day${days === 1 ? '' : 's'}.`);
  commitCollab(next);
}

// Safety/policy block — preserves the record, stops further activity and cancels
// any pending meeting proposals.
export function blockCollaboration(collabId: string, reason: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  const preBlock = c.blocked ? c.preBlock : { requestStatus: c.requestStatus, progress: c.progress };
  let meeting = c.meeting;
  if (meeting && ['proposed', 'scheduled', 'reschedule_requested', 'not_scheduled'].includes(meeting.status)) {
    meeting = { ...meeting, status: 'cancelled', cancellationReason: `Collaboration blocked: ${reason}`, lastUpdatedAt: now() };
  }
  let next: CollaborationRecord = { ...c, blocked: true, blockReason: reason, preBlock, requestStatus: 'blocked', progress: 'cancelled', meeting };
  next = addComm(next, 'cancellation_notice', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'email', `Collaboration blocked for safety/policy review: ${reason}`);
  next = pushCollabTimeline(next, 'blocked', 'Collaboration blocked by admin', reason);
  commitCollab(next);
}

export function restoreCollaboration(collabId: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  const restoredReq = c.preBlock?.requestStatus ?? 'pending_response';
  const restoredProg = c.preBlock?.progress ?? 'not_started';
  let next: CollaborationRecord = { ...c, blocked: false, blockReason: null, preBlock: null, requestStatus: restoredReq, progress: restoredProg };
  next = pushCollabTimeline(next, 'restored', 'Collaboration restored by admin');
  commitCollab(next);
}

export function sendMeetingReminder(collabId: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c || !c.meeting) return;
  let next = addComm(c, 'meeting_reminder', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'in_app', 'Reminder about the scheduled collaboration meeting.');
  next = pushCollabTimeline(next, 'meeting_reminder', 'Meeting reminder sent', 'Prototype notification — no real message sent.');
  commitCollab(next);
}

// Admin reviews a reschedule request. Admin does NOT change the meeting date or
// accept on behalf of creators — it logs the review and nudges both creators.
export function reviewReschedule(collabId: string, rescheduleId: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c || !c.meeting) return;
  const meeting = { ...c.meeting, reschedules: c.meeting.reschedules.map((r) => (r.id === rescheduleId ? { ...r, status: 'reviewed' as const } : r)), lastUpdatedAt: now() };
  let next: CollaborationRecord = { ...c, meeting };
  next = addComm(next, 'admin_notice', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'in_app', 'Reschedule request reviewed — creators asked to confirm a new time between themselves.');
  next = pushCollabTimeline(next, 'reschedule_reviewed', 'Reschedule request reviewed by admin', 'Creators to agree a new time; date not changed by admin.');
  commitCollab(next);
}

export function cancelMeetingSafety(collabId: string, reason: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c || !c.meeting) return;
  const meeting = { ...c.meeting, status: 'cancelled' as const, cancellationReason: reason, lastUpdatedAt: now() };
  let next: CollaborationRecord = { ...c, meeting };
  next = addComm(next, 'cancellation_notice', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'email', `Meeting cancelled for safety/policy reason: ${reason}`);
  next = pushCollabTimeline(next, 'meeting_cancelled', 'Meeting cancelled by admin (safety)', reason);
  commitCollab(next);
}

export function sendAdminNotice(collabId: string, body: string, _actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  let next = addComm(c, 'admin_notice', 'IICA Admin', `${c.initiator.name} & ${c.invited.name}`, 'in_app', body);
  next = pushCollabTimeline(next, 'admin_notice', 'Admin notice sent', body);
  commitCollab(next);
}

export function addCollabNote(collabId: string, body: string, actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  commitCollab({ ...c, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...c.notes] });
}

export function reviewReport(collabId: string, reportId: string, statusAfter: CollabReportStatus, actor: AdminActor, reason?: string) {
  const c = findCollab(collabId);
  if (!c) return;
  const reports = c.reports.map((r) => (r.id === reportId ? { ...r, status: statusAfter, decisionReason: reason ?? r.decisionReason ?? null } : r));
  let next: CollaborationRecord = { ...c, reports };
  const label = statusAfter === 'dismissed' ? 'Report dismissed' : statusAfter === 'action_taken' ? 'Report marked action taken' : 'Report under review';
  next = pushCollabTimeline(next, 'report', label, reason);
  commitCollab(next);
  void actor;
}

export function addReportNote(collabId: string, reportId: string, body: string, actor: AdminActor) {
  const c = findCollab(collabId);
  if (!c) return;
  const reports = c.reports.map((r) => (r.id === reportId ? { ...r, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...r.notes] } : r));
  commitCollab({ ...c, reports });
}

// Matching settings — persists only. Existing historical scores are never
// recalculated automatically.
export function updateCollaborationSettings(patch: Partial<CollaborationSettings>, _actor: AdminActor) {
  commit({ ...state, collaborationSettings: { ...state.collaborationSettings, ...patch } });
}

export type { CollaborationRecord };

// ===========================================================================
// Reviews & Testimonials
// ===========================================================================

// Reviews need no approval — they are visible immediately. Admin may only view
// or delete. Deleting removes only the review (never the reviewer/product/etc.).
export function deleteReview(reviewId: string, _reason: string, _actor: AdminActor) {
  if (!state.reviews.some((r) => r.id === reviewId)) return;
  commit({ ...state, reviews: state.reviews.filter((r) => r.id !== reviewId) });
}

function replaceTestimonial(list: TestimonialRecord[], next: TestimonialRecord) {
  return list.map((t) => (t.id === next.id ? next : t));
}
function commitTestimonial(next: TestimonialRecord) {
  commit({ ...state, testimonials: replaceTestimonial(state.testimonials, { ...next, lastUpdatedAt: now() }) });
}

export function testimonialTextExists(body: string, exceptId?: string): boolean {
  const b = body.trim().toLowerCase();
  return state.testimonials.some((t) => t.body.trim().toLowerCase() === b && t.id !== exceptId);
}

export interface AddTestimonialInput {
  personName: string;
  role: string;
  body: string;
  sourceType: TestimonialSourceType;
  connectedReviewId?: string | null;
  placement: TestimonialPlacement;
  displayOrder: number;
  status: TestimonialStatus;
}

export function addTestimonial(input: AddTestimonialInput, _actor: AdminActor): TestimonialRecord | null {
  if (!input.personName.trim() || !input.body.trim() || !input.placement) return null;
  if (testimonialTextExists(input.body)) return null;
  const t: TestimonialRecord = {
    id: uid('tst'),
    personName: input.personName.trim(),
    role: input.role.trim(),
    profileImage: undefined,
    body: input.body.trim(),
    sourceType: input.sourceType,
    connectedReviewId: input.connectedReviewId ?? null,
    placement: input.placement,
    displayOrder: input.displayOrder,
    status: input.status,
    hiddenReason: null,
    addedByAdmin: input.sourceType === 'direct',
    createdAt: now(),
    lastUpdatedAt: now(),
  };
  commit({ ...state, testimonials: [t, ...state.testimonials] });
  return t;
}

export interface EditTestimonialInput {
  personName?: string;
  role?: string;
  body?: string;
  placement?: TestimonialPlacement;
  displayOrder?: number;
}

// Editing a testimonial never touches the connected review record.
export function editTestimonial(id: string, patch: EditTestimonialInput, _actor: AdminActor): boolean {
  const t = state.testimonials.find((x) => x.id === id);
  if (!t) return false;
  if (patch.body != null && testimonialTextExists(patch.body, id)) return false;
  commitTestimonial({
    ...t,
    personName: patch.personName?.trim() ?? t.personName,
    role: patch.role?.trim() ?? t.role,
    body: patch.body?.trim() ?? t.body,
    placement: patch.placement ?? t.placement,
    displayOrder: patch.displayOrder ?? t.displayOrder,
  });
  return true;
}

export function publishTestimonial(id: string, _actor: AdminActor) {
  const t = state.testimonials.find((x) => x.id === id);
  if (!t) return;
  commitTestimonial({ ...t, status: 'published', hiddenReason: null });
}

export function hideTestimonial(id: string, reason: string, _actor: AdminActor) {
  const t = state.testimonials.find((x) => x.id === id);
  if (!t) return;
  commitTestimonial({ ...t, status: 'hidden', hiddenReason: reason });
}

export function restoreTestimonial(id: string, _actor: AdminActor) {
  const t = state.testimonials.find((x) => x.id === id);
  if (!t) return;
  commitTestimonial({ ...t, status: 'published', hiddenReason: null });
}

// ===========================================================================
// Home banners (Home & App Content)
// ===========================================================================

function commitBanners(list: BannerRecord[]) {
  commit({ ...state, banners: list });
}
// Re-number displayOrder 1..n by current order to avoid duplicate/step gaps.
function normalizeOrder(list: BannerRecord[]): BannerRecord[] {
  return [...list].sort((a, b) => a.displayOrder - b.displayOrder).map((b, i) => ({ ...b, displayOrder: i + 1 }));
}

export interface BannerInput {
  title: string;
  supportingText: string;
  image: string;
  label: string;
  ctaLabel: string;
  linkType: BannerLinkType;
  linkedId?: string | null;
  linkedName?: string | null;
  externalUrl?: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
}

export function addBanner(input: BannerInput, _actor: AdminActor): BannerRecord {
  const order = state.banners.reduce((m, b) => Math.max(m, b.displayOrder), 0) + 1;
  const banner: BannerRecord = {
    id: uid('ban'),
    ...input,
    linkedId: input.linkedId ?? null,
    linkedName: input.linkedName ?? null,
    externalUrl: input.externalUrl ?? null,
    displayOrder: order,
    createdAt: now(),
    updatedAt: now(),
  };
  commitBanners(normalizeOrder([...state.banners, banner]));
  return banner;
}

export function updateBanner(id: string, patch: BannerInput, _actor: AdminActor) {
  const b = state.banners.find((x) => x.id === id);
  if (!b) return;
  const next: BannerRecord = {
    ...b,
    ...patch,
    linkedId: patch.linkedId ?? null,
    linkedName: patch.linkedName ?? null,
    externalUrl: patch.externalUrl ?? null,
    updatedAt: now(),
  };
  commitBanners(state.banners.map((x) => (x.id === id ? next : x)));
}

export function deleteBanner(id: string, _actor: AdminActor) {
  commitBanners(normalizeOrder(state.banners.filter((b) => b.id !== id)));
}

// Toggle active. An expired banner cannot be activated without new dates.
export function toggleBanner(id: string, _actor: AdminActor): boolean {
  const b = state.banners.find((x) => x.id === id);
  if (!b) return false;
  if (!b.active && new Date(b.endDate).getTime() < Date.now()) return false; // expired → block activate
  commitBanners(state.banners.map((x) => (x.id === id ? { ...x, active: !x.active, updatedAt: now() } : x)));
  return true;
}

export function moveBanner(id: string, dir: 'up' | 'down', _actor: AdminActor) {
  const sorted = normalizeOrder(state.banners);
  const idx = sorted.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= sorted.length) return;
  [sorted[idx].displayOrder, sorted[swap].displayOrder] = [sorted[swap].displayOrder, sorted[idx].displayOrder];
  commitBanners(normalizeOrder(sorted));
}
