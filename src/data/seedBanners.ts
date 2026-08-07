import type { BannerRecord } from '../types/banners';

const DAY = 86400000;

// Generate a small REAL raster image (JPEG data URL) for seed demos — an abstract
// composition of shapes on a solid base, NOT a CSS gradient. Runs client-side; if
// no canvas is available the banner is seeded as "Missing image" (empty imageUrl).
const PALETTES = [
  ['#7a2e58', '#c2186b'], ['#2f5d7a', '#4a8fc0'], ['#b8862f', '#e0b64a'],
  ['#3c6b4a', '#6fae82'], ['#5a3f7a', '#8a6fb8'],
];
function seedBannerImage(i: number): string {
  if (typeof document === 'undefined') return '';
  const w = 600, h = 300;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const [base, accent] = PALETTES[i % PALETTES.length];
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(w * 0.78, h * 0.38, 130, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(w * 0.6, h * 0.85, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.2;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.globalAlpha = 1;
  try { return c.toDataURL('image/jpeg', 0.7); } catch { return ''; }
}

interface BSpec {
  id: string;
  title: string;
  supporting: string;
  hasImage: boolean; // false → seeded as a legacy "Missing image" record
  label: string;
  cta: string;
  placement: BannerRecord['placement'];
  homeOrder: number | null;
  shopOrder: number | null;
  linkType: BannerRecord['linkType'];
  linkedId?: string;
  linkedName?: string;
  externalUrl?: string;
  startOffset: number; // days from now
  endOffset: number;
  active: boolean;
}

// Connected to existing seeded creators, events and products by shared IDs.
// Placement demonstrates all three cases (Home-only, Shop-only, Home & Shop) with
// independent per-carousel ordering. ban_5 is seeded WITHOUT an image to show the
// "Missing image" state and the upload flow.
const SPECS: BSpec[] = [
  { id: 'ban_1', title: 'Meet Ananya Rao', supporting: 'Reimagining Bharatanatyam for the contemporary stage.', hasImage: true, label: 'Artist Spotlight', cta: 'Read the story', placement: 'home', homeOrder: 1, shopOrder: null, linkType: 'creator', linkedId: 'usr_ananya', linkedName: 'Ananya Rao', startOffset: -6, endOffset: 20, active: true },
  { id: 'ban_2', title: 'Ragas of Dusk — Live', supporting: 'An unforgettable evening of classical music at NCPA.', hasImage: true, label: 'Featured Event', cta: 'Get Tickets', placement: 'home', homeOrder: 2, shopOrder: null, linkType: 'event', linkedId: 'evt_ragas', linkedName: 'Ragas of Dusk', startOffset: -3, endOffset: 18, active: true },
  { id: 'ban_3', title: 'Handcrafted Folk Art Journal', supporting: 'A limited-run journal with a hand-painted cover.', hasImage: true, label: 'Shop Feature', cta: 'Shop Now', placement: 'shop', homeOrder: null, shopOrder: 1, linkType: 'product', linkedId: 'prod_folkjournal', linkedName: 'Handcrafted Folk Art Journal', startOffset: 4, endOffset: 30, active: true },
  { id: 'ban_4', title: 'IICA Creator Awards 2026', supporting: 'Nominations are now open. Celebrate India’s finest creators.', hasImage: true, label: 'Announcement', cta: 'Learn More', placement: 'home_and_shop', homeOrder: 3, shopOrder: 2, linkType: 'external', externalUrl: 'https://iica.app/awards', startOffset: -10, endOffset: 40, active: false },
  { id: 'ban_5', title: 'Bharatanatyam Foundations', supporting: 'A masterclass with Meera Kulkarni — now closed.', hasImage: false, label: 'Masterclass', cta: 'View Masterclass', placement: 'shop', homeOrder: null, shopOrder: 3, linkType: 'product', linkedId: 'prod_bharatanatyam', linkedName: 'Bharatanatyam Foundations', startOffset: -40, endOffset: -5, active: true },
];

export function buildBanners(now: number): BannerRecord[] {
  return SPECS.map((s, i) => {
    const imageUrl = s.hasImage ? seedBannerImage(i) : '';
    return {
      id: s.id,
      title: s.title,
      supportingText: s.supporting,
      imageUrl,
      imageName: imageUrl ? `${s.id}.jpg` : undefined,
      imageMimeType: imageUrl ? 'image/jpeg' : undefined,
      imageSize: imageUrl ? Math.round((imageUrl.length * 3) / 4) : undefined,
      imagePosition: 'center' as const,
      label: s.label,
      ctaLabel: s.cta,
      placement: s.placement,
      linkType: s.linkType,
      linkedId: s.linkedId ?? null,
      linkedName: s.linkedName ?? null,
      externalUrl: s.externalUrl ?? null,
      startDate: new Date(now + s.startOffset * DAY).toISOString(),
      endDate: new Date(now + s.endOffset * DAY).toISOString(),
      active: s.active,
      homeDisplayOrder: s.homeOrder,
      shopDisplayOrder: s.shopOrder,
      displayOrder: i + 1,
      createdAt: new Date(now - (30 - i) * DAY).toISOString(),
      updatedAt: new Date(now - (5 - i) * DAY).toISOString(),
    };
  });
}
