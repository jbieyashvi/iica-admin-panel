import type { PortfolioRecord } from '../types/portfolio';
import type { UserRecord, TimelineEvent } from '../types/users';
import type {
  ArchiveRecord,
  ArchiveStatus,
  CustomCategoryProposal,
  EventCategoryRecord,
  EventFormat,
  EventRecord,
  EventSettings,
  EventStatus,
  TicketOrder,
  TicketTier,
  TicketType,
  YouTubeStatus,
} from '../types/events';
import { DEFAULT_EVENT_CATEGORIES } from '../config/eventLabels';

const DAY = 86400000;
const ytId = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : 'dQw4w9WgXcQ';
};
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

// ---- Archive (from Portfolio Watch — Watch is source of truth) -------------

export function buildArchiveSeed(portfolios: PortfolioRecord[], users: UserRecord[]): ArchiveRecord[] {
  const out: ArchiveRecord[] = [];
  let i = 0;
  for (const p of portfolios) {
    const user = users.find((u) => u.id === p.userId);
    for (const w of p.content.watch) {
      i += 1;
      const h = hash(w.id);
      let status: ArchiveStatus =
        p.status === 'published' ? 'published'
        : p.status === 'submitted' ? 'awaiting_review'
        : p.status === 'changes_requested' ? 'changes_requested'
        : p.status === 'archived' ? 'removed_by_creator'
        : 'draft';
      if (w.hidden) status = 'hidden';
      // A little variety
      if (i % 11 === 0 && status === 'published') status = 'hidden';

      let yt: YouTubeStatus = w.linkValid ? 'valid' : 'unavailable';
      if (i % 9 === 0 && w.linkValid) yt = 'private';
      if (i % 13 === 0 && w.linkValid) yt = 'restricted';
      if (!w.linkValid && i % 2 === 0) yt = 'invalid_url';

      const reports =
        i % 7 === 0
          ? [{
              id: `${w.id}_rep`,
              reporterType: 'Registered user',
              reason: (['inappropriate', 'copyright', 'misleading', 'broken', 'spam'] as const)[i % 5],
              description: 'Flagged by a viewer for review.',
              at: new Date(new Date(w.publishDate).getTime() + 5 * DAY).toISOString(),
              status: (['new', 'under_review'] as const)[i % 2],
              assignedTo: i % 2 === 0 ? 'Rahul Desai' : null,
            }]
          : [];

      const timeline: TimelineEvent[] = [
        { id: `${w.id}_atl0`, key: 'added', label: 'Added via Portfolio Watch', at: w.publishDate },
      ];
      if (status === 'published') timeline.push({ id: `${w.id}_atl1`, key: 'published', label: 'Published to Archive', at: new Date(new Date(w.publishDate).getTime() + DAY).toISOString() });
      if (status === 'hidden') timeline.push({ id: `${w.id}_atl2`, key: 'hidden', label: 'Hidden from Archive', at: new Date(new Date(w.publishDate).getTime() + 10 * DAY).toISOString() });

      out.push({
        id: `arc_${w.id}`,
        portfolioId: p.id,
        userId: p.userId,
        watchItemId: w.id,
        iicaId: p.iicaId,
        category: p.category,
        title: w.title,
        description: w.description,
        youtubeUrl: w.youtubeUrl,
        youtubeId: ytId(w.youtubeUrl),
        durationSec: 90 + (h % 780),
        views: status === 'published' ? 200 + (h % 42000) : h % 800,
        addedAt: w.publishDate,
        publishedAt: status === 'published' ? new Date(new Date(w.publishDate).getTime() + DAY).toISOString() : null,
        archiveStatus: status,
        youtubeStatus: yt,
        hiddenReason: status === 'hidden' ? 'Hidden pending moderation review.' : null,
        reports,
        notes: [],
        timeline,
        lastUpdatedAt: user ? user.lastActiveAt : w.publishDate,
      });
    }
  }
  return out;
}

// ---- Events ----------------------------------------------------------------

interface EventSpec {
  id: string;
  title: string;
  hostId: string;
  category: string;
  format: EventFormat;
  ticket: TicketType;
  status: EventStatus;
  offset: number; // days from today
  city?: string;
  country?: string;
  venue?: string;
  platform?: string;
  external?: string;
  customName?: string; // Others → custom proposal
  tiers?: { name: string; price: number; capacity: number; sold: number }[];
}

const SPECS: EventSpec[] = [
  { id: 'evt_ragas', title: 'Ragas of Dusk', hostId: 'usr_nikhil', category: 'Concert', format: 'in_person', ticket: 'paid', status: 'published', offset: 20, city: 'Mumbai', country: 'India', venue: 'NCPA, Nariman Point', tiers: [{ name: 'General Admission', price: 999, capacity: 300, sold: 182 }, { name: 'Early Bird', price: 699, capacity: 100, sold: 100 }, { name: 'VIP', price: 2499, capacity: 40, sold: 21 }] },
  { id: 'evt_classical', title: 'An Evening of Classical Music', hostId: 'usr_aisha', category: 'LIVE Gig', format: 'hybrid', ticket: 'paid', status: 'published', offset: 30, city: 'Delhi', country: 'India', venue: 'Kamani Auditorium', platform: 'IICA Live Stream', tiers: [{ name: 'General Admission', price: 799, capacity: 250, sold: 96 }, { name: 'Online Pass', price: 299, capacity: 500, sold: 140 }] },
  { id: 'evt_bharat', title: 'Bharatanatyam Workshop', hostId: 'usr_meera', category: 'Workshop', format: 'in_person', ticket: 'paid', status: 'published', offset: 12, city: 'Pune', country: 'India', venue: 'Studio Natya', tiers: [{ name: 'General Admission', price: 1499, capacity: 40, sold: 33 }] },
  { id: 'evt_artjam', title: 'Contemporary Art Jam', hostId: 'usr_ananya', category: 'Painting Session', format: 'in_person', ticket: 'free', status: 'published', offset: 8, city: 'Mumbai', country: 'India', venue: 'Kala Ghoda Art Space', tiers: [{ name: 'Free Entry', price: 0, capacity: 120, sold: 74 }] },
  { id: 'evt_meet', title: 'Creator Meet & Greet', hostId: 'usr_kabir', category: 'Fan Meet n Greet', format: 'online', ticket: 'free', status: 'published', offset: 5, platform: 'Zoom', tiers: [{ name: 'Free RSVP', price: 0, capacity: 500, sold: 312 }] },
  { id: 'evt_baithak', title: 'Royal Courtyard Baithak', hostId: 'usr_royal', category: 'In-door Baithak', format: 'in_person', ticket: 'paid', status: 'published', offset: 18, city: 'Udaipur', country: 'India', venue: 'Royal Courtyard', tiers: [{ name: 'General Admission', price: 1999, capacity: 150, sold: 88 }, { name: 'VIP', price: 4999, capacity: 30, sold: 12 }] },
  { id: 'evt_sufi', title: 'Sufi Fusion Night', hostId: 'usr_nikhil', category: 'Sufi Fusion', customName: 'Sufi Fusion', format: 'in_person', ticket: 'paid', status: 'submitted', offset: 40, city: 'Mumbai', country: 'India', venue: 'Prithvi Theatre', tiers: [{ name: 'General Admission', price: 899, capacity: 200, sold: 0 }] },
  { id: 'evt_bootcamp', title: 'Fitness Bootcamp Live', hostId: 'usr_aarav', category: 'Workshop', format: 'hybrid', ticket: 'paid', status: 'published', offset: 10, city: 'Bengaluru', country: 'India', venue: 'Cubbon Park Grounds', platform: 'IICA Live Stream', tiers: [{ name: 'On-ground', price: 599, capacity: 100, sold: 61 }, { name: 'Online Pass', price: 199, capacity: 1000, sold: 240 }] },
  { id: 'evt_yoga', title: 'Yoga at Sunrise', hostId: 'usr_meera', category: 'Workshop', format: 'in_person', ticket: 'free', status: 'published', offset: 3, city: 'Pune', country: 'India', venue: 'Riverside Lawns', tiers: [{ name: 'Free Entry', price: 0, capacity: 80, sold: 52 }] },
  { id: 'evt_craft', title: 'Legacy Craft Showcase', hostId: 'usr_heritage', category: 'Workshop', format: 'in_person', ticket: 'external', status: 'published', offset: 25, city: 'Kolkata', country: 'India', venue: 'Heritage Hall', external: 'https://tickets.partnersite.example/legacy-craft' },
  { id: 'evt_sprint', title: 'Sprint Clinic', hostId: 'usr_abhishek', category: 'Workshop', format: 'in_person', ticket: 'paid', status: 'completed', offset: -10, city: 'Jaipur', country: 'India', venue: 'SMS Stadium', tiers: [{ name: 'General Admission', price: 499, capacity: 60, sold: 60 }] },
  { id: 'evt_indie', title: 'Indie Music Jam', hostId: 'usr_james', category: 'Music Jam', format: 'online', ticket: 'paid', status: 'published', offset: 15, platform: 'YouTube Live', tiers: [{ name: 'Stream Pass', price: 249, capacity: 2000, sold: 410 }] },
  { id: 'evt_wine', title: 'Art & Wine Evening', hostId: 'usr_leila', category: 'In-door Baithak', format: 'in_person', ticket: 'paid', status: 'draft', offset: 50, city: 'Dubai', country: 'UAE', venue: 'The Loft', tiers: [{ name: 'General Admission', price: 1200, capacity: 80, sold: 0 }] },
  { id: 'evt_modelclass', title: 'Model Portfolio Masterclass', hostId: 'usr_kabir', category: 'Workshop', format: 'online', ticket: 'paid', status: 'changes_requested', offset: 22, platform: 'Google Meet', tiers: [{ name: 'General Admission', price: 799, capacity: 150, sold: 0 }] },
  { id: 'evt_football', title: 'Street Football Meetup', hostId: 'usr_vikram', category: 'Fan Meet n Greet', format: 'in_person', ticket: 'free', status: 'cancelled', offset: 14, city: 'Pune', country: 'India', venue: 'Deccan Ground', tiers: [{ name: 'Free Entry', price: 0, capacity: 100, sold: 38 }] },
  { id: 'evt_gala', title: 'VIP Gala Dinner', hostId: 'usr_devang', category: 'Concert', format: 'in_person', ticket: 'paid', status: 'sold_out', offset: 9, city: 'Ahmedabad', country: 'India', venue: 'Grand Ballroom', tiers: [{ name: 'VIP Table', price: 7999, capacity: 50, sold: 50 }] },
  { id: 'evt_photo', title: 'Photography Walk', hostId: 'usr_sophia', category: 'Workshop', format: 'in_person', ticket: 'free', status: 'completed', offset: -5, city: 'New York', country: 'United States', venue: 'Brooklyn Bridge Park', tiers: [{ name: 'Free Entry', price: 0, capacity: 40, sold: 40 }] },
  { id: 'evt_winter', title: 'Winter Concert Series', hostId: 'usr_nikhil', category: 'Concert', format: 'in_person', ticket: 'paid', status: 'hidden', offset: 60, city: 'Mumbai', country: 'India', venue: 'Jio Gardens', tiers: [{ name: 'General Admission', price: 1299, capacity: 400, sold: 0 }] },
];

function tierFrom(spec: EventSpec, base: number): TicketTier[] {
  if (spec.ticket === 'external') return [];
  return (spec.tiers ?? []).map((t, i) => ({
    id: `${spec.id}_tier${i}`,
    name: t.name,
    price: t.price,
    capacity: t.capacity,
    sold: t.sold,
    reserved: Math.round(t.sold * 0.05),
    perUserLimit: t.price === 0 ? 4 : 6,
    salesStart: new Date(base - 30 * DAY).toISOString(),
    salesEnd: new Date(base - 1 * DAY).toISOString(),
    refundEligible: t.price > 0,
  }));
}

export function buildEventSeed(users: UserRecord[], now: number): { events: EventRecord[]; proposals: CustomCategoryProposal[] } {
  const proposals: CustomCategoryProposal[] = [];
  const events = SPECS.map((spec) => {
    const host = users.find((u) => u.id === spec.hostId);
    const start = now + spec.offset * DAY;
    const durationMins = spec.ticket === 'free' ? 90 : 150;
    const base = start;
    const tiers = tierFrom(spec, base);
    if (spec.customName) {
      proposals.push({
        id: `prop_${spec.id}`,
        proposedName: spec.customName,
        eventId: spec.id,
        proposedBy: host?.name ?? 'Creator',
        at: new Date(now - 2 * DAY).toISOString(),
        status: 'pending',
        note: null,
        mappedTo: null,
      });
    }
    const timeline: TimelineEvent[] = [{ id: `${spec.id}_etl0`, key: 'created', label: 'Event created', at: new Date(now - 20 * DAY).toISOString() }];
    if (['submitted', 'changes_requested', 'published', 'sold_out', 'completed', 'cancelled', 'hidden'].includes(spec.status))
      timeline.push({ id: `${spec.id}_etl1`, key: 'submitted', label: 'Submitted for review', at: new Date(now - 15 * DAY).toISOString() });
    if (['published', 'sold_out', 'completed', 'hidden'].includes(spec.status))
      timeline.push({ id: `${spec.id}_etl2`, key: 'published', label: 'Event published', at: new Date(now - 12 * DAY).toISOString() });
    if (spec.status === 'cancelled') timeline.push({ id: `${spec.id}_etl3`, key: 'cancelled', label: 'Event cancelled', at: new Date(now - 3 * DAY).toISOString(), detail: 'Cancelled due to venue conflict.' });
    if (spec.status === 'completed') timeline.push({ id: `${spec.id}_etl4`, key: 'completed', label: 'Event completed', at: new Date(start + durationMins * 60000).toISOString() });

    const ev: EventRecord = {
      id: spec.id,
      title: spec.title,
      hostUserId: spec.hostId,
      hostName: host?.name ?? 'Creator',
      hostCategory: host?.membershipCategory ?? null,
      category: spec.category,
      customCategoryPending: !!spec.customName,
      format: spec.format,
      ticketType: spec.ticket,
      status: spec.status,
      description: `${spec.title} — hosted by ${host?.name ?? 'a creator'}. Join us for a memorable experience curated for the IICA community.`,
      coverImage: `cover_${spec.id}`,
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + durationMins * 60000).toISOString(),
      timezone: spec.country === 'United States' ? 'America/New_York' : spec.country === 'UAE' ? 'Asia/Dubai' : 'Asia/Kolkata',
      durationMins,
      ageRestriction: spec.ticket === 'paid' && spec.category === 'Concert' ? '18+' : 'All ages',
      language: 'English / Hindi',
      coHosts: [],
      location:
        spec.format === 'online'
          ? {}
          : { venue: spec.venue, address: `${spec.venue}, ${spec.city}`, city: spec.city, state: '', country: spec.country, lat: 19.07, lng: 72.87, accessibility: 'Wheelchair accessible; assistance available on request.' },
      online:
        spec.format === 'in_person'
          ? {}
          : { platform: spec.platform ?? 'IICA Live Stream', joinLinkStatus: spec.status === 'published' ? 'scheduled' : 'not_set', linkReleaseTiming: '1 hour before start' },
      externalBookingUrl: spec.external ?? null,
      tiers,
      refundPolicy: spec.ticket === 'paid' ? 'Full refund up to 7 days before the event. No refunds thereafter.' : 'Free events — cancel any time before the event.',
      reports:
        spec.id === 'evt_indie'
          ? [{ id: 'erep_indie', reporterType: 'Registered user', reason: 'misleading', description: 'Listed start time seems incorrect.', at: new Date(now - 1 * DAY).toISOString(), status: 'new', assignedTo: null }]
          : [],
      notes: [],
      timeline,
      submittedAt: spec.status === 'draft' ? null : new Date(now - 15 * DAY).toISOString(),
      lastUpdatedAt: new Date(now - (spec.status === 'draft' ? 1 : 6) * DAY).toISOString(),
    };
    return ev;
  });
  return { events, proposals };
}

// ---- Ticket orders ---------------------------------------------------------

const BUYERS = [
  { name: 'Ritika Sharma', email: 'ritika.s@example.com', phone: '+91 90000 11111', guest: false, userId: 'usr_nisha' },
  { name: 'Arjun Bhatia', email: 'arjun.bhatia@example.com', phone: '+91 98110 23456', guest: false, userId: 'usr_arjun' },
  { name: 'Guest — Pooja R.', email: 'pooja.guest@example.com', phone: '+91 90000 22222', guest: true, userId: null },
  { name: 'Guest — Sameer K.', email: 'sameer.guest@example.com', phone: '+91 90000 33333', guest: true, userId: null },
  { name: 'Fatima Noor', email: 'fatima.noor@example.com', phone: '+971 50 552 3311', guest: false, userId: 'usr_fatima' },
  { name: 'Daniel Fernandes', email: 'daniel.f@example.com', phone: '+91 90070 66554', guest: false, userId: 'usr_daniel' },
];

export function buildOrderSeed(events: EventRecord[], now: number): TicketOrder[] {
  const orders: TicketOrder[] = [];
  for (const ev of events) {
    if (ev.ticketType === 'external') continue;
    if (!['published', 'sold_out', 'completed'].includes(ev.status)) continue;
    ev.tiers.forEach((tier, ti) => {
      if (tier.sold <= 0) return;
      const nOrders = Math.min(3, Math.max(1, Math.round(tier.sold / 30)));
      for (let k = 0; k < nOrders; k++) {
        const b = BUYERS[(hash(ev.id + ti + k)) % BUYERS.length];
        const qty = 1 + ((hash(ev.id + k) % 3));
        const subtotal = tier.price * qty;
        const taxes = Math.round(subtotal * 0.18);
        const free = tier.price === 0;
        const completed = ev.status === 'completed';
        const payment = free ? 'paid' : (['paid', 'paid', 'paid', 'pending'] as const)[k % 4];
        const booking = completed
          ? (['checked_in', 'no_show', 'checked_in'] as const)[k % 3]
          : (['confirmed', 'confirmed', 'pending'] as const)[k % 3];
        orders.push({
          id: `ord_${ev.id}_${ti}_${k}`,
          eventId: ev.id,
          tierId: tier.id,
          tierName: tier.name,
          buyerName: b.name,
          buyerEmail: b.email,
          buyerPhone: b.phone,
          guest: b.guest,
          userId: b.userId,
          quantity: qty,
          subtotal,
          taxes: free ? 0 : taxes,
          total: free ? 0 : subtotal + taxes,
          paymentStatus: payment,
          bookingStatus: booking,
          checkInStatus: booking === 'checked_in' ? 'checked_in' : booking === 'no_show' ? 'no_show' : 'not_checked',
          ticketIds: Array.from({ length: qty }, (_, q) => `TKT-${ev.id.slice(4, 8).toUpperCase()}-${1000 + hash(ev.id + k + q) % 9000}`),
          bookingDate: new Date(now - (10 + (hash(ev.id + k) % 20)) * DAY).toISOString(),
          refundHistory: [],
        });
      }
    });
  }
  return orders;
}

// ---- Event categories, proposals baseline, settings ------------------------

const EVENT_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Concert: 'Live musical concerts and performances.',
  'LIVE Gig': 'Intimate live gigs and sets.',
  Workshop: 'Hands-on learning sessions and masterclasses.',
  'Music Jam': 'Open jams and collaborative music sessions.',
  'In-door Baithak': 'Traditional indoor musical gatherings.',
  'Fan Meet n Greet': 'Meet-and-greet events with creators.',
  'Painting Session': 'Guided painting and art sessions.',
  Others: 'Uncategorised or one-off event types.',
};

export function buildEventCategories(): EventCategoryRecord[] {
  return DEFAULT_EVENT_CATEGORIES.map((name, i) => ({
    id: `ecat_${i}`,
    name,
    description: EVENT_CATEGORY_DESCRIPTIONS[name] ?? '',
    order: i,
    isDefault: true,
    status: 'active',
    createdAt: '2024-06-01T00:00:00Z',
  }));
}

export const EVENT_SETTINGS: EventSettings = {
  defaultPerUserLimit: 6,
  cancellationReasons: ['Venue unavailable', 'Low ticket sales', 'Host unavailable', 'Safety concern', 'Weather', 'Other'],
  reportReasons: ['Inappropriate content', 'Safety concern', 'Misleading information', 'Ticket dispute', 'Spam', 'Other'],
  moderationGuidelines: [
    'Verify host membership eligibility before publishing.',
    'Confirm date, venue and ticket configuration are complete.',
    'External booking links must point to a legitimate third-party provider.',
    'Cancelling an event never marks refunds completed automatically.',
  ],
};
