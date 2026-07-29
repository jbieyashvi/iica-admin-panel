import type { BannerRecord } from '../types/banners';

const DAY = 86400000;

interface BSpec {
  id: string;
  title: string;
  supporting: string;
  image: string;
  label: string;
  cta: string;
  linkType: BannerRecord['linkType'];
  linkedId?: string;
  linkedName?: string;
  externalUrl?: string;
  startOffset: number; // days from now
  endOffset: number;
  active: boolean;
}

// Connected to existing seeded creators, events and products by shared IDs.
const SPECS: BSpec[] = [
  { id: 'ban_1', title: 'Meet Ananya Rao', supporting: 'Explore vivid canvases from one of IICA’s featured artists.', image: 'violet', label: 'Artist Spotlight', cta: 'View Profile', linkType: 'creator', linkedId: 'usr_ananya', linkedName: 'Ananya Rao', startOffset: -6, endOffset: 20, active: true },
  { id: 'ban_2', title: 'Ragas of Dusk — Live', supporting: 'An unforgettable evening of classical music at NCPA.', image: 'sunset', label: 'Featured Event', cta: 'Get Tickets', linkType: 'event', linkedId: 'evt_ragas', linkedName: 'Ragas of Dusk', startOffset: -3, endOffset: 18, active: true },
  { id: 'ban_3', title: 'Handcrafted Folk Art Journal', supporting: 'A limited-run journal with a hand-painted cover.', image: 'gold', label: 'Shop Feature', cta: 'Shop Now', linkType: 'product', linkedId: 'prod_folkjournal', linkedName: 'Handcrafted Folk Art Journal', startOffset: 4, endOffset: 30, active: true },
  { id: 'ban_4', title: 'IICA Creator Awards 2026', supporting: 'Nominations are now open. Celebrate India’s finest creators.', image: 'forest', label: 'Announcement', cta: 'Learn More', linkType: 'external', externalUrl: 'https://iica.app/awards', startOffset: -10, endOffset: 40, active: false },
  { id: 'ban_5', title: 'Bharatanatyam Foundations', supporting: 'A masterclass with Meera Kulkarni — now closed.', image: 'ocean', label: 'Masterclass', cta: 'View Masterclass', linkType: 'product', linkedId: 'prod_bharatanatyam', linkedName: 'Bharatanatyam Foundations', startOffset: -40, endOffset: -5, active: true },
];

export function buildBanners(now: number): BannerRecord[] {
  return SPECS.map((s, i) => ({
    id: s.id,
    title: s.title,
    supportingText: s.supporting,
    image: s.image,
    label: s.label,
    ctaLabel: s.cta,
    linkType: s.linkType,
    linkedId: s.linkedId ?? null,
    linkedName: s.linkedName ?? null,
    externalUrl: s.externalUrl ?? null,
    startDate: new Date(now + s.startOffset * DAY).toISOString(),
    endDate: new Date(now + s.endOffset * DAY).toISOString(),
    active: s.active,
    displayOrder: i + 1,
    createdAt: new Date(now - (30 - i) * DAY).toISOString(),
    updatedAt: new Date(now - (5 - i) * DAY).toISOString(),
  }));
}
