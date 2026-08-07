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

// How the Mobile section renders its selected listings.
//  - horizontal: infinite swipeable carousel (loops end↔start; clones at render
//    time only, never duplicated in storage).
//  - vertical: finite progressive list/grid (loads in pages, no looping).
export type ScrollDirection = 'horizontal' | 'vertical';

// Editable working config + the last-published snapshot (so a Draft save never
// changes what the Mobile App currently shows).
// Visibility, scheduling and infinite-loop are no longer Admin-configurable:
// horizontal is infinite by definition, vertical is finite, and Draft/Published
// is the only content state (a published config is available to Mobile).
export interface RecommendedConfig {
  heading: string;
  description?: string;
  scrollDirection: ScrollDirection;
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
