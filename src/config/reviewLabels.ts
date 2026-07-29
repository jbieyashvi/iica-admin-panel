import type { ReviewSourceKind, ReviewType } from '../types/reviews';

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

// Review deletion reasons.
export const DELETE_REASONS = [
  'Inappropriate Content',
  'Spam',
  'Irrelevant Review',
  'Personal Information',
  'Duplicate Review',
  'Other',
];

// Ordered list for filters / selects.
export const REVIEW_TYPES: ReviewType[] = ['creator', 'product', 'event', 'masterclass'];

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
