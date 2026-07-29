import type { InternalNote, TimelineEvent } from './users';

// ---------------------------------------------------------------------------
// Collaborations & Meetings domain. IICA matches eligible active creators via a
// prototype AI scoring model across four dimensions. Records connect to Users,
// Categories and Portfolios by shared IDs. API-ready shapes.
// ---------------------------------------------------------------------------

export type RequestStatus =
  | 'suggested' // Suggested Match (AI, no request yet)
  | 'request_sent'
  | 'pending_response'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired'
  | 'blocked';

export type CollabProgress =
  | 'not_started'
  | 'discussion_scheduled'
  | 'in_discussion'
  | 'confirmed' // Collaboration Confirmed
  | 'completed'
  | 'cancelled';

export type MeetingStatus =
  | 'not_scheduled'
  | 'proposed'
  | 'scheduled'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type CollabIntent =
  | 'content'
  | 'performance'
  | 'workshop'
  | 'brand'
  | 'mentorship'
  | 'creative_project'
  | 'event'
  | 'other';

export type CollabFormat = 'in_person' | 'online' | 'hybrid';

export type MeetingMode = 'online' | 'in_person';

export type MeetingPlatform = 'zoom' | 'google_meet' | 'ms_teams' | 'other';

export type ReportReason =
  | 'inappropriate_proposal'
  | 'harassment'
  | 'spam'
  | 'misleading_profile'
  | 'unsafe_meeting'
  | 'unwanted_contact'
  | 'other';

export type ReportStatus = 'new' | 'under_review' | 'action_taken' | 'dismissed';

export type CommType =
  | 'collab_request'
  | 'request_reminder'
  | 'request_accepted'
  | 'request_declined'
  | 'meeting_proposal'
  | 'meeting_confirmation'
  | 'reschedule_request'
  | 'meeting_reminder'
  | 'cancellation_notice'
  | 'admin_notice';

export type CommChannel = 'in_app' | 'email';

export type CommDelivery = 'sent' | 'delivered' | 'logged' | 'failed';

export type MatchDimensionKey = 'location' | 'social' | 'intent' | 'creative';

// Snapshot of a creator taken from User + Portfolio at record time. Keeps the
// collaboration record self-contained while still linking back by IDs.
export interface CreatorSnapshot {
  userId: string;
  portfolioId?: string;
  name: string;
  iicaId?: string;
  membershipCategory?: string;
  membershipStatus: string;
  primaryCategory: string; // primary creative category / domain genre
  city: string;
  country: string;
  socials: string[]; // platform names, e.g. ['Instagram', 'YouTube']
  audienceRange: string;
  collaborationStatement: string; // max 500 chars, contributes to matching
  profileImage?: string;
  skills: string[];
}

export interface MatchDimension {
  key: MatchDimensionKey;
  label: string;
  score: number; // 0-100
  weight: number; // percent weight applied at scoring time
  explanation: string;
  signals: string[];
}

export interface CommRecord {
  id: string;
  at: string;
  sender: string;
  recipient: string;
  type: CommType;
  channel: CommChannel;
  delivery: CommDelivery;
  body?: string;
}

export interface RescheduleRequest {
  id: string;
  by: string; // creator who requested
  requestedAt: string;
  proposedAt?: string | null; // new time proposed by the creator
  reason: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
}

export interface Meeting {
  id: string;
  title: string;
  mode: MeetingMode;
  platform?: MeetingPlatform | null;
  proposedBy: string; // creator name
  proposedAt?: string | null;
  confirmedAt?: string | null;
  timezone: string;
  durationMins: number;
  status: MeetingStatus;
  linkStatus: 'pending' | 'added'; // "Link Pending" / "Link Added" — link itself never surfaced in tables
  location?: string | null; // in-person only
  reschedules: RescheduleRequest[];
  cancellationReason?: string | null;
  notes?: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface CollabReport {
  id: string;
  reportedBy: string; // creator name
  reportedCreator: string; // creator name
  reason: ReportReason;
  description: string;
  reportedAt: string;
  status: ReportStatus;
  notes: InternalNote[];
  decisionReason?: string | null;
}

export interface CollaborationRecord {
  id: string;
  initiator: CreatorSnapshot;
  invited: CreatorSnapshot;
  matchScore: number; // overall 0-100
  dimensions: MatchDimension[];
  intent: CollabIntent;
  proposalTitle: string;
  proposalMessage: string;
  expectedOutcome: string;
  preferredFormat: CollabFormat;
  preferredLocation: string;
  preferredMeetingDates: string[];
  requestStatus: RequestStatus;
  progress: CollabProgress;
  requestDate: string;
  responseDate?: string | null;
  declineReason?: string | null;
  withdrawalReason?: string | null;
  expiryDate?: string | null;
  blocked: boolean;
  blockReason?: string | null;
  // Snapshot of status before a block, used to restore cleanly.
  preBlock?: { requestStatus: RequestStatus; progress: CollabProgress } | null;
  meeting: Meeting | null;
  communications: CommRecord[];
  reports: CollabReport[];
  notes: InternalNote[];
  timeline: TimelineEvent[];
  createdAt: string;
  lastUpdatedAt: string;
}

// ---- Matching settings -----------------------------------------------------

export interface MatchingWeights {
  location: number;
  social: number;
  intent: number;
  creative: number;
}

export interface CollaborationSettings {
  weights: MatchingWeights;
  activeMembershipRequired: boolean;
  statementRequired: boolean;
  completePortfolioRequired: boolean;
  allowOnline: boolean;
  allowInPerson: boolean;
  defaultExpiryDays: number;
  reminderBeforeDays: number;
}
