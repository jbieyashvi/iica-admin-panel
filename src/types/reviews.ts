// ---------------------------------------------------------------------------
// Reviews & Testimonials domain. Reviews are tied to a completed interaction
// (product order, event booking or completed collaboration) via shared IDs.
// Testimonials are curated display quotes that may originate from a review.
// ---------------------------------------------------------------------------

export type ReviewType = 'creator' | 'product' | 'event' | 'masterclass';
export type ReviewStatus = 'pending' | 'published' | 'hidden';
export type ReviewerType = 'guest' | 'registered';

// The completed interaction a review is anchored to (shown as source context —
// no "verified" badge).
export type ReviewSourceKind = 'order' | 'booking' | 'collaboration';

export interface ReviewSource {
  kind: ReviewSourceKind;
  id: string; // Order ID / Event Booking ID / Collaboration ID
}

export interface ReviewRecord {
  id: string;
  reviewerName: string;
  reviewerType: ReviewerType;
  reviewerUserId?: string | null; // null for guests
  reviewerEmail?: string; // masked when displayed for guests
  type: ReviewType;
  targetId: string; // product id / event id / creator userId
  targetName: string;
  rating: number; // 1-5
  title?: string;
  body: string;
  images: string[]; // placeholder ids, may be empty
  status: ReviewStatus;
  hiddenReason?: string | null;
  submittedAt: string;
  lastUpdatedAt: string;
  source: ReviewSource;
}

export type TestimonialStatus = 'draft' | 'published' | 'hidden';
export type TestimonialSourceType = 'creator_review' | 'product_review' | 'event_review' | 'direct';
export type TestimonialPlacement = 'mobile_app' | 'website' | 'creator_discovery' | 'events' | 'shop';

export interface TestimonialRecord {
  id: string;
  personName: string;
  role: string; // creator category / role label
  profileImage?: string;
  body: string; // display excerpt, max 300 chars
  sourceType: TestimonialSourceType;
  connectedReviewId?: string | null; // preserved link to the original review
  placement: TestimonialPlacement;
  displayOrder: number;
  status: TestimonialStatus;
  hiddenReason?: string | null;
  addedByAdmin: boolean; // true for Direct Testimonials
  createdAt: string;
  lastUpdatedAt: string;
}
