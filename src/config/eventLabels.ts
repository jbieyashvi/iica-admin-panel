import type {
  BookingStatus,
  CheckInStatus,
  EventFormat,
  EventStatus,
  PaymentStatus,
  ProposalStatus,
  ReportStatus,
  TicketType,
} from '../types/events';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  sold_out: 'Sold Out',
  completed: 'Completed',
  cancelled: 'Cancelled',
  hidden: 'Hidden',
};
export const EVENT_STATUS_TONE: Record<EventStatus, Tone> = {
  draft: 'blue',
  published: 'green',
  sold_out: 'magenta',
  completed: 'neutral',
  cancelled: 'red',
  hidden: 'amber',
};

export const FORMAT_LABEL: Record<EventFormat, string> = {
  in_person: 'In Person',
  online: 'Online',
  hybrid: 'Hybrid',
};

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  free: 'Free',
  paid: 'Paid',
  external: 'External Booking',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  initiated: 'Initiated',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  initiated: 'blue',
  pending: 'amber',
  paid: 'green',
  failed: 'red',
  refunded: 'neutral',
  partially_refunded: 'amber',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  checked_in: 'Checked In',
  no_show: 'No Show',
};
export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  confirmed: 'green',
  pending: 'amber',
  cancelled: 'red',
  refunded: 'neutral',
  checked_in: 'blue',
  no_show: 'neutral',
};

export const CHECKIN_LABEL: Record<CheckInStatus, string> = {
  not_checked: 'Not checked in',
  checked_in: 'Checked in',
  no_show: 'No show',
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  action_taken: 'Action Taken',
  dismissed: 'Dismissed',
};
export const REPORT_STATUS_TONE: Record<ReportStatus, Tone> = {
  new: 'red',
  under_review: 'amber',
  action_taken: 'green',
  dismissed: 'neutral',
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  mapped: 'Mapped',
  rejected: 'Rejected',
  needs_name: 'Needs Clearer Name',
};
export const PROPOSAL_STATUS_TONE: Record<ProposalStatus, Tone> = {
  pending: 'amber',
  approved: 'green',
  mapped: 'blue',
  rejected: 'red',
  needs_name: 'amber',
};

// Ordered lists
export const EVENT_STATUSES: EventStatus[] = ['draft', 'published', 'sold_out', 'completed', 'cancelled', 'hidden'];
export const EVENT_FORMATS: EventFormat[] = ['in_person', 'online', 'hybrid'];

export const DEFAULT_EVENT_CATEGORIES = ['Concert', 'LIVE Gig', 'Workshop', 'Music Jam', 'In-door Baithak', 'Fan Meet n Greet', 'Painting Session', 'Others'];
