import type {
  ReviewSourceKind,
  ReviewType,
  TestimonialPlacement,
  TestimonialSourceType,
  TestimonialStatus,
} from '../types/reviews';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const REVIEW_TYPE_LABEL: Record<ReviewType, string> = {
  creator: 'Creator',
  product: 'Product',
  event: 'Event',
  masterclass: 'Masterclass',
};

export const REVIEW_SOURCE_LABEL: Record<ReviewSourceKind, string> = {
  order: 'Order ID',
  booking: 'Event Booking ID',
  collaboration: 'Collaboration ID',
};

export const TESTIMONIAL_STATUS_LABEL: Record<TestimonialStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  hidden: 'Hidden',
};
export const TESTIMONIAL_STATUS_TONE: Record<TestimonialStatus, Tone> = {
  draft: 'blue',
  published: 'green',
  hidden: 'neutral',
};

export const TESTIMONIAL_SOURCE_LABEL: Record<TestimonialSourceType, string> = {
  creator_review: 'Creator Review',
  product_review: 'Product Review',
  event_review: 'Event Review',
  direct: 'Direct Testimonial',
};

export const PLACEMENT_LABEL: Record<TestimonialPlacement, string> = {
  mobile_app: 'Mobile App',
  website: 'Website',
  creator_discovery: 'Creator Discovery',
  events: 'Events',
  shop: 'Shop',
};

// Testimonial hide reasons (testimonials still support hide/publish/restore).
export const HIDE_REASONS = [
  'Inappropriate Language',
  'Spam',
  'Irrelevant Content',
  'Personal Information',
  'Misleading Content',
  'Other',
];

// Review deletion reasons.
export const DELETE_REASONS = [
  'Inappropriate Content',
  'Spam',
  'Irrelevant Review',
  'Personal Information',
  'Duplicate Review',
  'Other',
];

// Ordered lists for filters / selects.
export const REVIEW_TYPES: ReviewType[] = ['creator', 'product', 'event', 'masterclass'];
export const TESTIMONIAL_STATUSES: TestimonialStatus[] = ['draft', 'published', 'hidden'];
export const TESTIMONIAL_SOURCE_TYPES: TestimonialSourceType[] = ['creator_review', 'product_review', 'event_review', 'direct'];
export const PLACEMENTS: TestimonialPlacement[] = ['mobile_app', 'website', 'creator_discovery', 'events', 'shop'];

export const TESTIMONIAL_MAX = 300;

// Route for a review's related item (Open Related Item).
export function relatedItemRoute(type: ReviewType, targetId: string): string {
  switch (type) {
    case 'creator': return `/admin/users/${targetId}`;
    case 'event': return `/admin/events/${targetId}`;
    case 'product':
    case 'masterclass':
    default: return `/admin/products/${targetId}`;
  }
}

export function relatedItemLabel(type: ReviewType): string {
  switch (type) {
    case 'creator': return 'Open Creator Profile';
    case 'event': return 'Open Event';
    case 'masterclass': return 'Open Masterclass';
    case 'product':
    default: return 'Open Product';
  }
}

// Mask a guest email for display: n***@example.com
export function maskEmail(email?: string): string {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(2, user.length - 1))}@${domain}`;
}
