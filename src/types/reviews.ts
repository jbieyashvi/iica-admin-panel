// ---------------------------------------------------------------------------
// Reviews domain. Reviews are tied to a completed interaction (product order,
// event booking or completed collaboration) via shared IDs. They need no
// admin approval — visible immediately; admin may only view or delete.
// ---------------------------------------------------------------------------

export type ReviewType = 'creator' | 'product' | 'event' | 'masterclass';
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
  // Reviews require no admin approval — they are visible immediately once submitted.
  submittedAt: string;
  lastUpdatedAt: string;
  source: ReviewSource;
}
