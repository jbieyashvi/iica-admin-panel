import type { MembershipCategory } from './index';
import type { InternalNote, TimelineEvent } from './users';

// ---------------------------------------------------------------------------
// Phase 3 domain: membership categories, catalogue + portfolio records.
// Portfolios link to Users / Memberships by userId. API-ready shapes.
// ---------------------------------------------------------------------------

export type PortfolioStatus =
  | 'not_started'
  | 'draft'
  | 'published';

export type CatalogueVisibility = 'visible' | 'hidden' | 'ineligible';

export type CategoryStatus = 'active' | 'inactive';

export interface CategoryChange {
  id: string;
  action: string;
  by: string;
  role: string;
  at: string;
  detail?: string;
}

export interface CategoryRecord {
  id: string;
  name: MembershipCategory | string;
  description: string;
  icon: string; // lucide icon name (suggested)
  catalogueVisible: boolean;
  status: CategoryStatus;
  order: number;
  relatedDomains: string[];
  history: CategoryChange[];
  createdAt: string;
  updatedAt: string;
}

// ---- Location correction ---------------------------------------------------

export interface LocationValue {
  country: string;
  state?: string;
  city: string;
}

export interface LocationCorrection extends LocationValue {
  reason: string;
  note?: string;
  notifyCreator: boolean;
  at: string;
  by: string;
}

// ---- Portfolio content sections -------------------------------------------

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  spotify?: string;
}

export interface HighlightEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface AwardEntry {
  id: string;
  title: string;
  organisation: string;
  year: string;
  details?: string;
}

export interface WatchVideo {
  id: string;
  youtubeUrl: string;
  title: string;
  description: string;
  publishDate: string;
  thumbnail: string;
  linkValid: boolean;
  hidden: boolean;
}

export interface SpotifyBlock {
  type: 'embed' | 'external' | 'none';
  embedUrl?: string;
  externalUrl?: string;
}

export interface EventEntry {
  id: string;
  title: string;
  date: string;
  city: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  hidden?: boolean;
}

export interface TestimonialEntry {
  id: string;
  author: string;
  rating: number;
  body: string;
  reported: boolean;
  hidden?: boolean;
}

export interface WhatsNewEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  ctaLabel: string;
  destination: string;
}

export interface CollaborationEntry {
  id: string;
  collaborator: string;
  project: string;
  date: string;
  awardWon: boolean;
  awardDetails?: string;
}

export interface PortfolioContent {
  profileImage?: string;
  coverImage?: string;
  socials: SocialLinks;
  about: string;
  domains: string[];
  skills: string[];
  highlights: HighlightEntry[];
  awards: AwardEntry[];
  watch: WatchVideo[];
  spotify: SpotifyBlock;
  events: EventEntry[];
  gallery: GalleryItem[];
  testimonials: TestimonialEntry[];
  whatsNew: WhatsNewEntry[];
  collaborations: CollaborationEntry[];
}

export interface ActivitySignals {
  portfolioCompleteness: number; // 0-100
  profileViews: number;
  productsListed: number;
  archiveVideos: number;
  eventsPublished: number;
  collaborationAttempts: number;
  recentActivity: number; // 0-100
}

export interface PortfolioReport {
  id: string;
  section: string;
  item: string;
  reason: string;
  status: 'open' | 'resolved';
  reportedBy: string;
  at: string;
}

export interface PortfolioRecord {
  id: string;
  userId: string;
  iicaId?: string;
  category: MembershipCategory;
  domainGenre: string;
  status: PortfolioStatus;
  hiddenFromCatalogue: boolean;
  hiddenReason?: string | null;
  locationCorrection?: LocationCorrection | null;
  content: PortfolioContent;
  activity: ActivitySignals;
  profileViews: number;
  activityScore: number;
  scoreCalculatedAt: string;
  reports: PortfolioReport[];
  notes: InternalNote[];
  timeline: TimelineEvent[];
  lastSubmittedAt?: string | null;
  lastUpdatedAt: string;
}
