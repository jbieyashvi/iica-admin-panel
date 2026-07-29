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
  ArchiveRecord,
  ArchiveStatus,
  BookingStatus,
  EventFormat,
  EventRecord,
  EventStatus,
  ProposalStatus,
  ReportStatus,
  TicketOrder,
  TicketTier,
  TicketType,
  YouTubeStatus,
} from '../types/events';
import { readStorage, writeStorage } from '../lib/storage';
import { makeIicaId, uid, initialsOf } from '../lib/id';
import { buildSeedState } from './seed';
import { buildArchiveSeed, buildEventSeed, buildOrderSeed } from './seedEvents';
import { computeActivityScore } from './portfolioLogic';

const STORAGE_KEY = 'data_state';
const SEED_VERSION = 4;

// ---- Store internals -------------------------------------------------------

function load(): DataState {
  const stored = readStorage<DataState | null>(STORAGE_KEY, null);
  if (stored && stored.version === SEED_VERSION) return stored;
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

export function setContentHidden(portfolioId: string, section: ContentSection, itemId: string, hidden: boolean, _actor: AdminActor, reason?: string) {
  const p = state.portfolios.find((x) => x.id === portfolioId);
  if (!p) return;
  const content = { ...p.content };
  if (section === 'testimonials') content.testimonials = content.testimonials.map((t) => (t.id === itemId ? { ...t, hidden } : t));
  if (section === 'gallery') content.gallery = content.gallery.map((g) => (g.id === itemId ? { ...g, hidden } : g));
  if (section === 'watch') content.watch = content.watch.map((w) => (w.id === itemId ? { ...w, hidden } : w));
  const next = recalc({ ...p, content });

  // Keep the linked Archive record in sync (Watch is the source of truth).
  let archives = state.archives;
  if (section === 'watch') {
    archives = archives.map((a) =>
      a.watchItemId === itemId
        ? {
            ...a,
            archiveStatus: hidden ? 'hidden' : 'published',
            hiddenReason: hidden ? reason ?? 'Hidden via Portfolio Watch' : null,
            timeline: [...a.timeline, { id: uid('tl'), key: hidden ? 'hidden' : 'restored', label: hidden ? 'Hidden (synced from Watch)' : 'Restored (synced from Watch)', at: now() }],
            lastUpdatedAt: now(),
          }
        : a,
    );
  }

  commit({ ...state, portfolios: replacePortfolio(state.portfolios, next), archives });
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
// Phase 4 — Archive
// ===========================================================================

function replaceArchive(list: ArchiveRecord[], next: ArchiveRecord) {
  return list.map((a) => (a.id === next.id ? next : a));
}
function pushArcTimeline(a: ArchiveRecord, key: string, label: string, detail?: string): ArchiveRecord {
  return { ...a, timeline: [...a.timeline, { id: uid('tl'), key, label, at: now(), detail }] };
}

// Set the public visibility of the linked Portfolio Watch item.
function syncWatchVisibility(portfolioId: string, watchItemId: string, hidden: boolean, portfolios = state.portfolios) {
  return portfolios.map((p) => {
    if (p.id !== portfolioId) return p;
    return { ...p, content: { ...p.content, watch: p.content.watch.map((w) => (w.id === watchItemId ? { ...w, hidden } : w)) }, lastUpdatedAt: now() };
  });
}

export function publishArchive(archiveId: string, _actor: AdminActor) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = pushArcTimeline({ ...a, archiveStatus: 'published', publishedAt: now(), hiddenReason: null, lastUpdatedAt: now() }, 'published', 'Published to Archive');
  commit({
    ...state,
    archives: replaceArchive(state.archives, next),
    portfolios: syncWatchVisibility(a.portfolioId, a.watchItemId, false),
  });
}

export function requestArchiveChanges(archiveId: string, reason: string, message: string, actor: AdminActor, note?: string) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const notes = note ? [{ id: uid('note'), body: note, author: actor.name, role: actor.role, at: now() }, ...a.notes] : a.notes;
  const next = pushArcTimeline({ ...a, archiveStatus: 'changes_requested', notes, lastUpdatedAt: now() }, 'changes', 'Changes requested', `${reason} — ${message}`);
  commit({ ...state, archives: replaceArchive(state.archives, next) });
}

export function hideArchive(archiveId: string, reason: string, _actor: AdminActor) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = pushArcTimeline({ ...a, archiveStatus: 'hidden', hiddenReason: reason, lastUpdatedAt: now() }, 'hidden', 'Hidden from Archive', reason);
  commit({
    ...state,
    archives: replaceArchive(state.archives, next),
    portfolios: syncWatchVisibility(a.portfolioId, a.watchItemId, true),
  });
}

export function restoreArchive(archiveId: string, _actor: AdminActor) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = pushArcTimeline({ ...a, archiveStatus: 'published', hiddenReason: null, lastUpdatedAt: now() }, 'restored', 'Restored to Archive');
  commit({
    ...state,
    archives: replaceArchive(state.archives, next),
    portfolios: syncWatchVisibility(a.portfolioId, a.watchItemId, false),
  });
}

export function setArchiveYoutubeStatus(archiveId: string, status: YouTubeStatus, _actor: AdminActor) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = pushArcTimeline({ ...a, youtubeStatus: status, lastUpdatedAt: now() }, 'yt', `YouTube status set to ${status}`);
  commit({ ...state, archives: replaceArchive(state.archives, next) });
}

export function addArchiveNote(archiveId: string, body: string, actor: AdminActor) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = { ...a, notes: [{ id: uid('note'), body, author: actor.name, role: actor.role, at: now() }, ...a.notes] };
  commit({ ...state, archives: replaceArchive(state.archives, next) });
}

export function archiveReportAction(archiveId: string, reportId: string, status: ReportStatus, _actor: AdminActor, _reason?: string) {
  const a = state.archives.find((x) => x.id === archiveId);
  if (!a) return;
  const next = { ...a, reports: a.reports.map((r) => (r.id === reportId ? { ...r, status } : r)), lastUpdatedAt: now() };
  commit({ ...state, archives: replaceArchive(state.archives, next) });
}

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
  const newCats = exists
    ? state.eventCategories
    : [...state.eventCategories.filter((c) => c.name !== 'Others'), { id: uid('ecat'), name: p.proposedName, order: state.eventCategories.length, isDefault: false }, ...state.eventCategories.filter((c) => c.name === 'Others')];
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

export function simBrokenLink(archiveId: string, actor: AdminActor) {
  setArchiveYoutubeStatus(archiveId, 'unavailable', actor);
}

// Rebuild only Archive + Event data from seed, keeping users/portfolios intact.
export function resetArchiveEventDemo(_actor: AdminActor) {
  const nowMs = Date.now();
  const { events, proposals } = buildEventSeed(state.users, nowMs);
  commit({
    ...state,
    archives: buildArchiveSeed(state.portfolios, state.users),
    events,
    orders: buildOrderSeed(events, nowMs),
    categoryProposals: proposals,
  });
}

export type { ArchiveStatus, EventStatus, BookingStatus };
