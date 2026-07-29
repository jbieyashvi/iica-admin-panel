// ---------------------------------------------------------------------------
// Home banner carousel. Admin controls ONLY the promotional banners at the top
// of the mobile Home screen — no other Home section is admin-managed.
// ---------------------------------------------------------------------------

export type BannerLinkType = 'creator' | 'event' | 'product' | 'external' | 'none';

// Derived status (never stored directly): from active flag + date window.
export type BannerStatus = 'active' | 'scheduled' | 'inactive' | 'expired';

export interface BannerRecord {
  id: string;
  title: string;
  supportingText: string;
  image: string; // placeholder key (no real upload in the prototype)
  label: string; // small eyebrow label, e.g. "Artist Spotlight"
  ctaLabel: string;
  linkType: BannerLinkType;
  linkedId?: string | null; // connected creator / event / product id
  linkedName?: string | null;
  externalUrl?: string | null;
  startDate: string; // ISO
  endDate: string; // ISO
  active: boolean; // admin on/off toggle
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
