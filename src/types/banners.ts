// ---------------------------------------------------------------------------
// Admin-managed promotional banner carousels. The User App shows banner
// carousels in TWO locations — the mobile Home screen and the Shop screen — so
// each banner record carries a Placement plus a per-carousel display order. One
// record is never duplicated for "Home & Shop"; it simply belongs to both.
// ---------------------------------------------------------------------------

export type BannerLinkType = 'creator' | 'event' | 'product' | 'external' | 'none';

// Where a banner appears in the Mobile App.
export type BannerPlacement = 'home' | 'shop' | 'home_and_shop';

// Derived status (never stored directly): from active flag + date window.
export type BannerStatus = 'active' | 'scheduled' | 'inactive' | 'expired';

export interface BannerRecord {
  id: string;
  title: string;
  supportingText: string;
  image: string; // placeholder key (no real upload in the prototype)
  label: string; // small eyebrow label, e.g. "Artist Spotlight"
  ctaLabel: string;
  placement: BannerPlacement; // Home / Shop / both
  linkType: BannerLinkType;
  linkedId?: string | null; // connected creator / event / product id
  linkedName?: string | null;
  externalUrl?: string | null;
  startDate: string; // ISO
  endDate: string; // ISO
  active: boolean; // admin on/off toggle
  // Per-carousel order. null when the banner is not in that carousel. Reordering
  // one carousel never affects the other. `displayOrder` is kept as a legacy
  // fallback (overall insertion order) for backward compatibility / migration.
  homeDisplayOrder: number | null;
  shopDisplayOrder: number | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
