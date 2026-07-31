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
import type { CollaborationSettings } from '../types/collaborations';
import type { BannerLinkType, BannerRecord } from '../types/banners';
import type { CommissionConfig, CommissionOverride, PayoutRecord, PayoutStatus, RevenueType } from '../types/payouts';
import type { AdminAccountStatus, AdminUserRecord } from '../types/admins';
import type { AdminRole } from '../types';
import { readStorage, writeStorage } from '../lib/storage';
import { makeIicaId, uid, initialsOf } from '../lib/id';
import { buildSeedState, SEED_VERSION } from './seed';
import { buildArchiveSeed, buildEventSeed, buildOrderSeed } from './seedEvents';
import { computeActivityScore } from './portfolioLogic';

const STORAGE_KEY = 'data_state';

// ---- Store internals -------------------------------------------------------

// One-time safe migrations (idempotent — a no-op on already-clean data):
//  - Review-queue statuses (Awaiting Review / Changes Requested / Submitted) → Draft.
//  - User/membership lifecycle: drop Guest accounts from Users, remap retired
//    membership statuses, and ensure an IICA ID + Creator Member only exist once
//    a purchase has completed (Paid).
function migrateStatuses(s: DataState): DataState {
  const REMOVED = new Set(['awaiting_review', 'changes_requested', 'submitted']);
  const map = <T extends string>(st: T): T => (REMOVED.has(st as string) ? ('draft' as T) : st);
  let changed = false;
  const products = s.products.map((p) => (REMOVED.has(p.status as string) ? ((changed = true), { ...p, status: map(p.status) }) : p));
  const events = s.events.map((e) => (REMOVED.has(e.status as string) ? ((changed = true), { ...e, status: map(e.status) }) : e));
  const portfolios = s.portfolios.map((p) => (REMOVED.has(p.status as string) ? ((changed = true), { ...p, status: map(p.status) }) : p));

  // Creator Member = paid lifecycle; IICA ID exists from "IICA ID Generated" on.
  const CREATOR = new Set(['active', 'renewal_due', 'expired', 'cancelled', 'suspended']);
  const HAS_IICA = new Set(['iica_id_generated', 'purchase_link_sent', 'purchase_pending', 'active', 'renewal_due', 'expired', 'cancelled', 'suspended']);

  let guestSeq = 0;
  const users = s.users.map((u) => {
    // Guests stay guests: Not Applicable, no IICA, keep/assign an internal Guest ID.
    if (u.accountType === 'guest') {
      const guestId = u.guestId ?? `GST-${1000 + (guestSeq++)}`;
      if (u.membershipStatus !== 'not_applicable' || u.iicaId || guestId !== u.guestId) changed = true;
      return { ...u, membershipStatus: 'not_applicable' as MembershipStatus, iicaId: undefined, guestId };
    }
    const ms = u.membershipStatus;
    const accountType: AccountType = CREATOR.has(ms) ? 'creator' : 'registered';
    const iicaId = HAS_IICA.has(ms) ? u.iicaId : undefined;
    if (accountType !== u.accountType || iicaId !== u.iicaId) changed = true;
    return { ...u, accountType, iicaId };
  });

  const memberships = s.memberships.map((m) => {
    const iicaId = HAS_IICA.has(m.membershipStatus) ? m.iicaId : undefined;
    if (iicaId !== m.iicaId) changed = true;
    return { ...m, iicaId, idGeneratedAt: iicaId ? m.idGeneratedAt : null, idHistory: iicaId ? m.idHistory : [] };
  });

  // Portfolios: only paid Creator Members keep a record; historical (expired /
  // cancelled / suspended) portfolios are preserved but hidden from catalogue.
  const paidUserIds = new Set(memberships.filter((m) => m.purchaseStatus === 'completed' && m.iicaId).map((m) => m.userId));
  const msByUser = new Map(memberships.map((m) => [m.userId, m.membershipStatus as string]));
  let portfolios2 = portfolios.filter((p) => paidUserIds.has(p.userId));
  if (portfolios2.length !== portfolios.length) changed = true;
  portfolios2 = portfolios2.map((p) => {
    const ms = msByUser.get(p.userId);
    const historical = !!ms && ['expired', 'cancelled', 'suspended'].includes(ms);
    const status = ((p.status as string) === 'archived' ? 'published' : p.status) as typeof p.status;
    const hiddenFromCatalogue = historical ? true : p.hiddenFromCatalogue;
    if (status !== p.status || hiddenFromCatalogue !== p.hiddenFromCatalogue) changed = true;
    return { ...p, status, hiddenFromCatalogue };
  });

  if (!changed) return s;
  const next = { ...s, products, events, portfolios: portfolios2, users, memberships };
  writeStorage(STORAGE_KEY, next);
  return next;
}

function load(): DataState {
  const stored = readStorage<DataState | null>(STORAGE_KEY, null);
  // Reseed on version change, or if a persisted state is missing a required
  // top-level slice (guards against a partially-written state after a schema bump).
  const intact = stored && Array.isArray(stored.collaborations) && Array.isArray(stored.productOrders) && !!stored.collaborationSettings && Array.isArray(stored.reviews) && Array.isArray(stored.banners) && Array.isArray(stored.payouts) && Array.isArray(stored.commissionSettings) && Array.isArray(stored.adminUsers) && Array.isArray(stored.membershipPricing);
  if (stored && stored.version === SEED_VERSION && intact) return migrateStatuses(stored);
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

// Generate a unique IICA ID (INITIALS.NNN.IICA), avoiding any already in use.
function uniqueIicaId(name: string): string {
  const taken = new Set(
    [...state.users, ...state.memberships].map((x) => x.iicaId).filter((v): v is string => !!v),
  );
  const seed = (initialsOf(name).charCodeAt(0) * 7 + 313) % 1000;
  for (let i = 0; i < 1000; i++) {
    const id = makeIicaId(name, (seed + i) % 1000);
    if (!taken.has(id)) return id;
  }
  return makeIicaId(name, seed);
}

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
  // New accounts start as Registered Users. Creator Member + IICA ID come only
  // after a successful (Paid) membership purchase.
  const hasApplication = !!input.membershipCategory;
  const user: UserRecord = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    country: input.country,
    city: input.city,
    accountType: 'registered',
    membershipCategory: input.membershipCategory,
    membershipStatus: hasApplication ? 'form_submitted' : 'not_started',
    iicaId: undefined,
    joinedAt: now(),
    lastActiveAt: now(),
    suspension: null,
    notes: [],
  };

  let memberships = state.memberships;
  if (hasApplication && input.membershipCategory) {
    const membership: MembershipRecord = {
      id: uid('mem'),
      userId: id,
      iicaId: undefined,
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
      idGeneratedAt: null,
      idHistory: [],
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
      : mem.membershipStatus === 'purchase_pending'
        ? 'purchase_pending'
        : mem.category
          ? 'form_submitted'
          : 'not_started'
    : 'not_started';
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
    // Payment succeeded → generate the IICA ID once (if not already present).
    const genId = mem.iicaId ?? uniqueIicaId(user?.name ?? mem.form.fullName);
    next = {
      ...mem,
      iicaId: genId,
      idGeneratedAt: mem.idGeneratedAt ?? now(),
      idHistory: mem.iicaId ? mem.idHistory : [...mem.idHistory, { id: genId, at: now() }],
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
    // Reset to pre-purchase: no IICA ID until a payment succeeds again.
    next = {
      ...mem,
      iicaId: undefined,
      idGeneratedAt: null,
      idHistory: [],
      purchaseStatus: 'not_started',
      membershipStatus: 'form_submitted',
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
        ...mem.timeline.filter((t) => t.key === 'form_submitted'),
        { id: uid('tl'), key: 'demo_reset', label: 'Membership demo reset', at: now() },
      ],
      lastUpdatedAt: now(),
    };
  }

  // Keep the linked user's status, account type and IICA ID in sync. Creator
  // Member only after a purchase has completed; IICA ID mirrors the membership.
  let users = state.users;
  if (user) {
    const uStatus: MembershipStatus = next.membershipStatus;
    const paid = ['active', 'renewal_due', 'expired', 'cancelled', 'suspended'].includes(uStatus);
    users = replaceUser(users, {
      ...user,
      membershipStatus: uStatus,
      accountType: paid ? 'creator' : 'registered',
      iicaId: next.iicaId,
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
// Collaborations & Meetings
// ===========================================================================

// Collaborations are view-only in the admin panel. Matching settings persist
// only; existing historical scores are never recalculated automatically.
export function updateCollaborationSettings(patch: Partial<CollaborationSettings>, _actor: AdminActor) {
  commit({ ...state, collaborationSettings: { ...state.collaborationSettings, ...patch } });
}

// ===========================================================================
// Reviews
// ===========================================================================

// Reviews need no approval — they are visible immediately. Admin may only view
// or delete. Deleting removes only the review (never the reviewer/product/etc.).
export function deleteReview(reviewId: string, _reason: string, _actor: AdminActor) {
  if (!state.reviews.some((r) => r.id === reviewId)) return;
  commit({ ...state, reviews: state.reviews.filter((r) => r.id !== reviewId) });
}

// ===========================================================================
// Home banners (Banners)
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

// ===========================================================================
// Commissions & Payouts
// ===========================================================================

// Commission config edits apply only to NEW payouts — historical capturedRate is
// never rewritten. Validation: rate 0–100%, holding >= 0, min >= 0.
export interface CommissionConfigPatch {
  defaultRate?: number; // 0..1
  holdingDays?: number;
  minPayout?: number;
  status?: 'active' | 'inactive';
}

export function updateCommissionConfig(type: RevenueType, patch: CommissionConfigPatch, _reason: string, _actor: AdminActor): boolean {
  const cfg = state.commissionSettings.find((c) => c.type === type);
  if (!cfg) return false;
  if (patch.defaultRate != null && (patch.defaultRate < 0 || patch.defaultRate > 1)) return false;
  if (patch.holdingDays != null && patch.holdingDays < 0) return false;
  if (patch.minPayout != null && patch.minPayout < 0) return false;
  const next: CommissionConfig = {
    ...cfg,
    defaultRate: patch.defaultRate ?? cfg.defaultRate,
    holdingDays: patch.holdingDays ?? cfg.holdingDays,
    minPayout: patch.minPayout ?? cfg.minPayout,
    status: patch.status ?? cfg.status,
  };
  commit({ ...state, commissionSettings: state.commissionSettings.map((c) => (c.type === type ? next : c)) });
  return true;
}

// One active override per category. Adding for an existing category replaces it.
export function upsertCommissionOverride(input: { id?: string; type: RevenueType; category: string; overrideRate: number }, _actor: AdminActor): boolean {
  if (input.overrideRate < 0 || input.overrideRate > 1) return false;
  if (!input.category.trim()) return false;
  const existing = state.commissionOverrides.find(
    (o) => o.id !== input.id && o.type === input.type && o.category.toLowerCase() === input.category.trim().toLowerCase(),
  );
  let list: CommissionOverride[];
  if (input.id) {
    // Edit — drop any duplicate for the same category, then update.
    list = state.commissionOverrides
      .filter((o) => o.id === input.id || !(o.type === input.type && o.category.toLowerCase() === input.category.trim().toLowerCase()))
      .map((o) => (o.id === input.id ? { ...o, type: input.type, category: input.category.trim(), overrideRate: input.overrideRate } : o));
  } else if (existing) {
    list = state.commissionOverrides.map((o) => (o.id === existing.id ? { ...o, overrideRate: input.overrideRate } : o));
  } else {
    list = [...state.commissionOverrides, { id: uid('ovr'), type: input.type, category: input.category.trim(), overrideRate: input.overrideRate, status: 'active' }];
  }
  commit({ ...state, commissionOverrides: list });
  return true;
}

export function removeCommissionOverride(id: string, _actor: AdminActor) {
  commit({ ...state, commissionOverrides: state.commissionOverrides.filter((o) => o.id !== id) });
}

function replacePayout(list: PayoutRecord[], next: PayoutRecord) {
  return list.map((p) => (p.id === next.id ? next : p));
}
function commitPayout(next: PayoutRecord) {
  commit({ ...state, payouts: replacePayout(state.payouts, next) });
}

// Eligible → Processing (records the processing date).
export function startPayoutProcessing(payoutId: string, _actor: AdminActor): boolean {
  const p = state.payouts.find((x) => x.id === payoutId);
  if (!p || p.status !== 'eligible') return false;
  commitPayout({ ...p, status: 'processing', processingAt: now(), failedAt: null, failureReason: null });
  return true;
}

// Processing → Paid (requires reference + method + paid date).
export function markPayoutPaid(payoutId: string, input: { reference: string; method: string }, _actor: AdminActor): boolean {
  const p = state.payouts.find((x) => x.id === payoutId);
  if (!p || p.status !== 'processing') return false;
  if (!input.reference.trim() || !input.method.trim()) return false;
  commitPayout({ ...p, status: 'paid', paidAt: now(), payoutReference: input.reference.trim(), payoutMethodUsed: input.method.trim() });
  return true;
}

// Processing → Failed (requires reason + date).
export function markPayoutFailed(payoutId: string, reason: string, _actor: AdminActor): boolean {
  const p = state.payouts.find((x) => x.id === payoutId);
  if (!p || p.status !== 'processing') return false;
  if (!reason.trim()) return false;
  commitPayout({ ...p, status: 'failed', failedAt: now(), failureReason: reason.trim() });
  return true;
}

// Failed → Processing (retry; keeps the prior failure reason for the record).
export function retryPayout(payoutId: string, _actor: AdminActor): boolean {
  const p = state.payouts.find((x) => x.id === payoutId);
  if (!p || p.status !== 'failed') return false;
  commitPayout({ ...p, status: 'processing', processingAt: now() });
  return true;
}

export type { PayoutStatus };

// ===========================================================================
// Admin Users
// ===========================================================================

export function adminEmailExists(email: string, exceptId?: string): boolean {
  const e = email.trim().toLowerCase();
  return state.adminUsers.some((a) => a.id !== exceptId && a.email.toLowerCase() === e);
}
export function adminPhoneExists(phone: string, exceptId?: string): boolean {
  const p = phone.replace(/\s+/g, '');
  return state.adminUsers.some((a) => a.id !== exceptId && a.phone.replace(/\s+/g, '') === p);
}
export function activeSuperAdminCount(exceptId?: string): number {
  return state.adminUsers.filter((a) => a.id !== exceptId && a.role === 'super_admin' && a.status === 'active').length;
}
// True when this account is the only active Super Admin (locks role change + deactivate).
export function isLastActiveSuper(id: string): boolean {
  const a = state.adminUsers.find((x) => x.id === id);
  return !!a && a.role === 'super_admin' && a.status === 'active' && activeSuperAdminCount(id) === 0;
}

function nextAdminId(): string {
  const nums = state.adminUsers
    .map((a) => Number(/^ADM-(\d{4})$/.exec(a.id)?.[1] ?? 0))
    .filter((n) => n > 0);
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `ADM-${next}`;
}

function replaceAdmin(next: AdminUserRecord) {
  commit({ ...state, adminUsers: state.adminUsers.map((a) => (a.id === next.id ? next : a)) });
}

export interface AddAdminInput {
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  password: string;
  status: AdminAccountStatus;
}

export function addAdminUser(input: AddAdminInput, actor: AdminActor): AdminUserRecord | null {
  if (!input.name.trim() || !input.email.trim() || !input.phone.trim()) return null;
  if (adminEmailExists(input.email) || adminPhoneExists(input.phone)) return null;
  const rec: AdminUserRecord = {
    id: nextAdminId(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role,
    status: input.status,
    password: input.password,
    createdAt: now(),
    createdBy: actor.name,
    updatedAt: now(),
    lastLoginAt: null,
  };
  commit({ ...state, adminUsers: [rec, ...state.adminUsers] });
  return rec;
}

export interface EditAdminInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: AdminRole;
  status?: AdminAccountStatus;
}

export function updateAdminUser(id: string, patch: EditAdminInput, _actor: AdminActor): boolean {
  const a = state.adminUsers.find((x) => x.id === id);
  if (!a) return false;
  if (patch.email && adminEmailExists(patch.email, id)) return false;
  if (patch.phone && adminPhoneExists(patch.phone, id)) return false;
  // Guard the final active Super Admin against role change / deactivation.
  const willChangeRole = patch.role && patch.role !== 'super_admin' && a.role === 'super_admin';
  const willDeactivate = patch.status === 'inactive' && a.status === 'active' && a.role === 'super_admin';
  if ((willChangeRole || willDeactivate) && isLastActiveSuper(id)) return false;
  replaceAdmin({
    ...a,
    name: patch.name?.trim() ?? a.name,
    email: patch.email?.trim() ?? a.email,
    phone: patch.phone?.trim() ?? a.phone,
    role: patch.role ?? a.role,
    status: patch.status ?? a.status,
    updatedAt: now(),
  });
  return true;
}

export function resetAdminPassword(id: string, password: string, _actor: AdminActor): boolean {
  const a = state.adminUsers.find((x) => x.id === id);
  if (!a) return false;
  replaceAdmin({ ...a, password, updatedAt: now() });
  return true;
}

export function setAdminStatus(id: string, status: AdminAccountStatus, reason: string | null, _actor: AdminActor): boolean {
  const a = state.adminUsers.find((x) => x.id === id);
  if (!a) return false;
  if (status === 'inactive' && a.role === 'super_admin' && isLastActiveSuper(id)) return false;
  replaceAdmin({ ...a, status, deactivationReason: status === 'inactive' ? reason : null, updatedAt: now() });
  return true;
}

export function recordAdminLogin(id: string) {
  const a = state.adminUsers.find((x) => x.id === id);
  if (a) replaceAdmin({ ...a, lastLoginAt: now() });
}

export type { AdminUserRecord };

// ===========================================================================
// Membership regional pricing
// ===========================================================================

type MembershipPriceRecord = import('../types/pricing').MembershipPriceRecord;
type PriceStatus = import('../types/pricing').PriceStatus;

// An active price already exists for the same Category + Plan + Country/Region.
export function duplicateActivePrice(input: { category: string; plan: string; country: string }, exceptId?: string): boolean {
  return state.membershipPricing.some((x) =>
    x.id !== exceptId && x.status === 'active' &&
    x.category === input.category && x.plan === input.plan && x.country === input.country);
}

export function addMembershipPrice(input: Omit<MembershipPriceRecord, 'id' | 'updatedAt'>, _actor: AdminActor): boolean {
  if (input.price <= 0) return false;
  if (input.status === 'active' && duplicateActivePrice(input)) return false;
  const rec: MembershipPriceRecord = { ...input, id: uid('mpr'), updatedAt: now() };
  commit({ ...state, membershipPricing: [rec, ...state.membershipPricing] });
  return true;
}

export interface PriceEditInput {
  price?: number;
  status?: PriceStatus;
}

export function updateMembershipPrice(id: string, patch: PriceEditInput, _actor: AdminActor): boolean {
  const p = state.membershipPricing.find((x) => x.id === id);
  if (!p) return false;
  if (patch.price != null && patch.price <= 0) return false;
  // Re-activating must not create a duplicate active price for the same key.
  if (patch.status === 'active' && p.status !== 'active' && duplicateActivePrice(p, id)) return false;
  const next = { ...p, price: patch.price ?? p.price, status: patch.status ?? p.status, updatedAt: now() };
  commit({ ...state, membershipPricing: state.membershipPricing.map((x) => (x.id === id ? next : x)) });
  return true;
}

export function setMembershipPriceStatus(id: string, status: PriceStatus, _actor: AdminActor) {
  const p = state.membershipPricing.find((x) => x.id === id);
  if (!p) return;
  if (status === 'active' && p.status !== 'active' && duplicateActivePrice(p, id)) return;
  commit({ ...state, membershipPricing: state.membershipPricing.map((x) => (x.id === id ? { ...x, status, updatedAt: now() } : x)) });
}
