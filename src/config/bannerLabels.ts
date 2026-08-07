import type { BannerLinkType, BannerPlacement, BannerRecord, BannerStatus } from '../types/banners';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

// ---- Placement (Home / Shop / both) ----------------------------------------

export const PLACEMENTS: BannerPlacement[] = ['home', 'shop', 'home_and_shop'];

// Compact label for the table badge.
export const BANNER_PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  home: 'Home',
  shop: 'Shop',
  home_and_shop: 'Home & Shop',
};
// Longer label for the form radio/select options.
export const BANNER_PLACEMENT_OPTION_LABEL: Record<BannerPlacement, string> = {
  home: 'Home Page',
  shop: 'Shop Page',
  home_and_shop: 'Home & Shop',
};
export const BANNER_PLACEMENT_TONE: Record<BannerPlacement, Tone> = {
  home: 'blue',
  shop: 'magenta',
  home_and_shop: 'green',
};

export const bannerInHome = (b: BannerRecord): boolean => b.placement === 'home' || b.placement === 'home_and_shop';
export const bannerInShop = (b: BannerRecord): boolean => b.placement === 'shop' || b.placement === 'home_and_shop';

export const BANNER_STATUS_LABEL: Record<BannerStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  inactive: 'Inactive',
  expired: 'Expired',
};
export const BANNER_STATUS_TONE: Record<BannerStatus, Tone> = {
  active: 'green',
  scheduled: 'blue',
  inactive: 'neutral',
  expired: 'amber',
};

export const LINK_TYPE_LABEL: Record<BannerLinkType, string> = {
  creator: 'Creator Profile',
  event: 'Event',
  product: 'Product',
  external: 'External Announcement',
  none: 'No Link',
};

export const LINK_TYPES: BannerLinkType[] = ['creator', 'event', 'product', 'external', 'none'];

// Prototype gradient placeholders (no real image upload).
export const BANNER_IMAGES = [
  { key: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#f6a5c0,#a64d79)' },
  { key: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#7ec8e3,#3a6ea5)' },
  { key: 'gold', label: 'Gold', css: 'linear-gradient(135deg,#f5d76e,#c9a227)' },
  { key: 'forest', label: 'Forest', css: 'linear-gradient(135deg,#9fd8a0,#3c7a52)' },
  { key: 'violet', label: 'Violet', css: 'linear-gradient(135deg,#c7a6e8,#6a3fa0)' },
  { key: 'charcoal', label: 'Charcoal', css: 'linear-gradient(135deg,#6b7280,#1f2937)' },
];
export const bannerImageCss = (key: string) => BANNER_IMAGES.find((i) => i.key === key)?.css ?? BANNER_IMAGES[0].css;

// Derived status from the active flag + date window. Expired never stays Active.
export function computeBannerStatus(b: BannerRecord, now = Date.now()): BannerStatus {
  const start = new Date(b.startDate).getTime();
  const end = new Date(b.endDate).getTime();
  if (now > end) return 'expired';
  if (!b.active) return 'inactive';
  if (now < start) return 'scheduled';
  return 'active';
}

// A banner is publicly visible in the mobile carousel only when Active + in window.
export function isBannerLive(b: BannerRecord, now = Date.now()): boolean {
  return computeBannerStatus(b, now) === 'active';
}

// CTA route for connected IICA content (external handled separately).
export function bannerCtaRoute(b: BannerRecord): string | null {
  switch (b.linkType) {
    case 'creator': return b.linkedId ? `/admin/users/${b.linkedId}` : null;
    case 'event': return b.linkedId ? `/admin/events/${b.linkedId}` : null;
    case 'product': return b.linkedId ? `/admin/products/${b.linkedId}` : null;
    default: return null;
  }
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
