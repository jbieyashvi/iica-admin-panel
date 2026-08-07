import type { BannerImagePosition, BannerLinkType, BannerPlacement, BannerRecord, BannerStatus } from '../types/banners';

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

// ---- Image upload constraints (real upload, no gradient placeholders) -------

export const BANNER_ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BANNER_ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const BANNER_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const BANNER_MIN_W = 800;
export const BANNER_MIN_H = 400;
export const BANNER_REC_W = 1200;
export const BANNER_REC_H = 600;
export const BANNER_IMAGE_HINT = 'Recommended: 1200 × 600 px, JPG/PNG/WebP, maximum 5 MB.';

// Character limits for the text overlay fields.
export const BANNER_LABEL_MAX = 30;
export const BANNER_TITLE_MAX = 50;
export const BANNER_SUPPORT_MAX = 100;
export const BANNER_CTA_MAX = 24;

export const bannerHasImage = (b: BannerRecord): boolean => !!b.imageUrl;

// CSS object-position from the stored focal value.
export const bannerObjectPosition = (pos: BannerImagePosition): string =>
  pos === 'left' ? 'left center' : pos === 'right' ? 'right center' : 'center';

// Derived status from the active flag + date window. Expired never stays Active.
export function computeBannerStatus(b: BannerRecord, now = Date.now()): BannerStatus {
  const start = new Date(b.startDate).getTime();
  const end = new Date(b.endDate).getTime();
  if (now > end) return 'expired';
  if (!b.active) return 'inactive';
  if (now < start) return 'scheduled';
  return 'active';
}

// A banner is publicly visible in a mobile carousel only when Active + in window
// AND it has an uploaded image (legacy "Missing image" banners never render).
export function isBannerLive(b: BannerRecord, now = Date.now()): boolean {
  return bannerHasImage(b) && computeBannerStatus(b, now) === 'active';
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
