// ---------------------------------------------------------------------------
// Recommended Listings — an admin-curated promotional section on the Mobile App
// Home screen. Card content is RESOLVED from existing product/event records; we
// store only the selected listing IDs + display order, never duplicated data.
// ---------------------------------------------------------------------------

export type ListingType =
  | 'physical_product'
  | 'digital_product'
  | 'masterclass'
  | 'event'
  | 'second_hand_instrument'
  | 'donation';

export interface SelectedListing {
  listingId: string;
  listingType: ListingType;
  displayOrder: number;
}

// Editable working config + the last-published snapshot (so a Draft save never
// changes what the Mobile App currently shows).
export interface RecommendedConfig {
  heading: string;
  description?: string;
  isVisible: boolean;
  startAt?: string | null;
  endAt?: string | null;
  selectedListings: SelectedListing[];
}

export interface PublishedSnapshot extends RecommendedConfig {
  publishedAt: string;
  updatedBy: string;
}

export interface RecommendedSection extends RecommendedConfig {
  id: string;
  state: 'draft' | 'published';
  updatedAt: string;
  publishedAt?: string | null;
  updatedBy: string;
  published?: PublishedSnapshot | null; // last published config shown on mobile
}

// The number of leading items rendered on the Home screen before "View All".
export const HOME_PREVIEW_COUNT = 8;
