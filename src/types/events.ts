import type { MembershipCategory } from './index';
import type { InternalNote, TimelineEvent } from './users';

// ===========================================================================
// Phase 4 — Archive, Events & Ticketing. Linked to Users/Portfolios by IDs.
// Archive is synchronised with Portfolio Watch (Watch = source of truth).
// ===========================================================================

export type ReportStatus = 'new' | 'under_review' | 'action_taken' | 'dismissed';

// ---- Archive ---------------------------------------------------------------
// Read-only directory of YouTube videos sourced from creators' Portfolio Watch.

export interface ArchiveRecord {
  id: string;
  portfolioId: string;
  userId: string;
  watchItemId: string;
  iicaId?: string;
  category: MembershipCategory;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  publishedAt: string;
}

// ---- Events ----------------------------------------------------------------

export type EventStatus =
  | 'draft'
  | 'published'
  | 'sold_out'
  | 'completed'
  | 'cancelled'
  | 'hidden';

export type EventFormat = 'in_person' | 'online' | 'hybrid';
export type TicketType = 'free' | 'paid' | 'external';

export interface TicketTier {
  id: string;
  name: string;
  price: number; // 0 for free
  capacity: number;
  sold: number;
  reserved: number;
  perUserLimit: number;
  salesStart: string;
  salesEnd: string;
  refundEligible: boolean;
}

export interface EventLocation {
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  accessibility?: string;
}

export interface EventOnline {
  platform?: string;
  joinLinkStatus?: 'not_set' | 'scheduled' | 'released';
  linkReleaseTiming?: string;
}

export type EventReportReason = 'inappropriate' | 'safety' | 'misleading' | 'ticket_dispute' | 'spam' | 'other';

export interface EventReport {
  id: string;
  reporterType: string;
  reason: EventReportReason;
  description: string;
  at: string;
  status: ReportStatus;
  assignedTo?: string | null;
}

export interface EventRecord {
  id: string;
  title: string;
  hostUserId?: string | null;
  hostName: string;
  hostCategory?: MembershipCategory | null;
  category: string; // controlled name or custom
  customCategoryPending?: boolean;
  format: EventFormat;
  ticketType: TicketType;
  status: EventStatus;
  description: string;
  coverImage?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMins: number;
  ageRestriction: string;
  language: string;
  coHosts: string[];
  location: EventLocation;
  online: EventOnline;
  externalBookingUrl?: string | null;
  tiers: TicketTier[];
  refundPolicy: string;
  reports: EventReport[];
  notes: InternalNote[];
  timeline: TimelineEvent[];
  submittedAt?: string | null;
  lastUpdatedAt: string;
}

// ---- Ticket orders ---------------------------------------------------------

export type PaymentStatus = 'initiated' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'refunded' | 'checked_in' | 'no_show';
export type CheckInStatus = 'not_checked' | 'checked_in' | 'no_show';

export interface RefundEntry {
  id: string;
  amount: number;
  at: string;
  by: string;
  reason: string;
  status: 'requested' | 'approved' | 'completed' | 'rejected';
}

export interface TicketOrder {
  id: string;
  eventId: string;
  tierId: string;
  tierName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  guest: boolean;
  userId?: string | null;
  quantity: number;
  subtotal: number;
  taxes: number;
  total: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  checkInStatus: CheckInStatus;
  ticketIds: string[];
  bookingDate: string;
  refundHistory: RefundEntry[];
}

// ---- Event categories & proposals -----------------------------------------

export type EventCategoryStatus = 'active' | 'inactive';

export interface EventCategoryRecord {
  id: string;
  name: string;
  description: string;
  order: number;
  isDefault: boolean;
  status: EventCategoryStatus;
  createdAt: string;
}

export type ProposalStatus = 'pending' | 'approved' | 'mapped' | 'rejected' | 'needs_name';

export interface CustomCategoryProposal {
  id: string;
  proposedName: string;
  eventId: string;
  proposedBy: string;
  at: string;
  status: ProposalStatus;
  note?: string | null;
  mappedTo?: string | null;
}

export interface EventSettings {
  defaultPerUserLimit: number;
  cancellationReasons: string[];
  reportReasons: string[];
  moderationGuidelines: string[];
}
