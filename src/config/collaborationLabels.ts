import type {
  CollabFormat,
  CollabIntent,
  CollabProgress,
  MatchDimensionKey,
  MeetingMode,
  MeetingPlatform,
  MeetingStatus,
  RequestStatus,
} from '../types/collaborations';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  suggested: 'Suggested Match',
  request_sent: 'Request Sent',
  pending_response: 'Pending Response',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  blocked: 'Blocked',
};
export const REQUEST_STATUS_TONE: Record<RequestStatus, Tone> = {
  suggested: 'blue',
  request_sent: 'blue',
  pending_response: 'amber',
  accepted: 'green',
  declined: 'red',
  withdrawn: 'neutral',
  expired: 'neutral',
  blocked: 'red',
};

export const PROGRESS_LABEL: Record<CollabProgress, string> = {
  not_started: 'Not Started',
  discussion_scheduled: 'Discussion Scheduled',
  in_discussion: 'In Discussion',
  confirmed: 'Collaboration Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export const PROGRESS_TONE: Record<CollabProgress, Tone> = {
  not_started: 'neutral',
  discussion_scheduled: 'blue',
  in_discussion: 'blue',
  confirmed: 'green',
  completed: 'green',
  cancelled: 'red',
};

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  not_scheduled: 'Not Scheduled',
  proposed: 'Proposed',
  scheduled: 'Scheduled',
  reschedule_requested: 'Reschedule Requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};
export const MEETING_STATUS_TONE: Record<MeetingStatus, Tone> = {
  not_scheduled: 'neutral',
  proposed: 'blue',
  scheduled: 'green',
  reschedule_requested: 'amber',
  completed: 'green',
  cancelled: 'red',
  no_show: 'red',
};

export const INTENT_LABEL: Record<CollabIntent, string> = {
  content: 'Content Collaboration',
  performance: 'Performance',
  workshop: 'Workshop',
  brand: 'Brand Collaboration',
  mentorship: 'Mentorship',
  creative_project: 'Creative Project',
  event: 'Event Collaboration',
  other: 'Other',
};

export const FORMAT_LABEL: Record<CollabFormat, string> = {
  in_person: 'In Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

export const MEETING_MODE_LABEL: Record<MeetingMode, string> = {
  online: 'Online',
  in_person: 'In Person',
};

export const MEETING_PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  ms_teams: 'Microsoft Teams',
  other: 'Other',
};

// ---- Match dimensions ------------------------------------------------------

export const DIMENSION_META: Record<MatchDimensionKey, { label: string; blurb: string }> = {
  location: { label: 'Location Compatibility', blurb: 'City proximity, remote preference and travel availability.' },
  social: { label: 'Social Compatibility', blurb: 'Primary platforms, audience-size fit and engagement style.' },
  intent: { label: 'Collaboration Intent', blurb: 'Shared goals, preferred type, availability and collaboration statements.' },
  creative: { label: 'Creative Compatibility', blurb: 'Creative category, skills, content style and complementary portfolio work.' },
};

export const DIMENSION_ORDER: MatchDimensionKey[] = ['location', 'social', 'intent', 'creative'];

// ---- Ordered lists for filters / selects -----------------------------------

export const REQUEST_STATUSES: RequestStatus[] = ['suggested', 'request_sent', 'pending_response', 'accepted', 'declined', 'withdrawn', 'expired', 'blocked'];
export const PROGRESS_STATUSES: CollabProgress[] = ['not_started', 'discussion_scheduled', 'in_discussion', 'confirmed', 'completed', 'cancelled'];
export const MEETING_STATUSES: MeetingStatus[] = ['not_scheduled', 'proposed', 'scheduled', 'reschedule_requested', 'completed', 'cancelled', 'no_show'];
export const INTENTS: CollabIntent[] = ['content', 'performance', 'workshop', 'brand', 'mentorship', 'creative_project', 'event', 'other'];
export const FORMATS: CollabFormat[] = ['in_person', 'online', 'hybrid'];

export const SCORE_RANGES = [
  { key: 'any', label: 'Any match score', min: 0 },
  { key: '90', label: '90 and above', min: 90 },
  { key: '80', label: '80 and above', min: 80 },
  { key: '70', label: '70 and above', min: 70 },
  { key: '60', label: '60 and above', min: 60 },
];

// Prototype default weights (must total 100).
export const DEFAULT_WEIGHTS = { location: 20, social: 20, intent: 30, creative: 30 };

export const scoreTone = (score: number): Tone => (score >= 85 ? 'green' : score >= 70 ? 'blue' : score >= 55 ? 'amber' : 'neutral');
