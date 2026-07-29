import type { MembershipCategory } from '../types';
import type { MembershipRecord, UserRecord } from '../types/users';
import type {
  CategoryRecord,
  PortfolioContent,
  PortfolioRecord,
  PortfolioStatus,
  TestimonialEntry,
  WatchVideo,
} from '../types/portfolio';
import type { TimelineEvent } from '../types/users';
import { computeActivityScore, completionChecklist, completionPercent } from './portfolioLogic';

// --- Category flavour --------------------------------------------------------
const FLAVOUR: Record<MembershipCategory, { domains: string[]; skills: string[]; about: string; icon: string }> = {
  Artist: { domains: ['Painting', 'Illustration', 'Mixed Media'], skills: ['Watercolour', 'Digital Art'], about: 'A multidisciplinary artist exploring colour, form and story across canvas and screen.', icon: 'Palette' },
  Model: { domains: ['Fashion', 'Editorial', 'Runway'], skills: ['Ramp Walk', 'Editorial Posing'], about: 'A versatile model working across editorial, runway and brand campaigns.', icon: 'Sparkles' },
  'Legacy Brand of Impact': { domains: ['Heritage', 'Craft', 'Textiles'], skills: ['Handloom', 'Sustainable Craft'], about: 'A heritage brand preserving craft traditions with a contemporary, responsible lens.', icon: 'Landmark' },
  'Fitness Champion': { domains: ['Strength', 'CrossFit', 'Conditioning'], skills: ['Programming', 'Nutrition'], about: 'A fitness champion helping people build strength, discipline and lasting habits.', icon: 'Dumbbell' },
  'Yoga Coach': { domains: ['Hatha', 'Vinyasa', 'Meditation'], skills: ['Breathwork', 'Mobility'], about: 'A certified yoga coach guiding practitioners toward balance and calm.', icon: 'Flower2' },
  Athlete: { domains: ['Track & Field', 'Endurance', 'Sprint'], skills: ['Sprinting', 'Race Strategy'], about: 'A competitive athlete training and racing at the national level.', icon: 'Medal' },
  'Sports Coach/Trainer/Enthusiast': { domains: ['Cricket', 'Football', 'Athletics'], skills: ['Skill Drills', 'Team Strategy'], about: 'A sports coach developing young talent through structured, joyful training.', icon: 'Trophy' },
  'VIP Host': { domains: ['Events', 'Anchoring', 'Luxury Hosting'], skills: ['Anchoring', 'Curation'], about: 'A sought-after host curating memorable luxury events and experiences.', icon: 'Mic' },
  'VIP Venue': { domains: ['Weddings', 'Banquets', 'Concerts'], skills: ['Event Ops', 'Hospitality'], about: 'A premium venue for weddings, banquets and marquee cultural events.', icon: 'Building2' },
  'VIP Connoisseur': { domains: ['Fine Dining', 'Art Collection', 'Luxury Travel'], skills: ['Curation', 'Tasting'], about: 'A connoisseur of fine living — food, art and refined travel.', icon: 'Wine' },
  'VIP Manager': { domains: ['Talent Management', 'Bookings', 'PR'], skills: ['Negotiation', 'Brand Deals'], about: 'A talent manager connecting creators with the right brands and stages.', icon: 'BriefcaseBusiness' },
};

export function buildCategorySeed(): CategoryRecord[] {
  const order: MembershipCategory[] = [
    'Artist', 'Model', 'Legacy Brand of Impact', 'Fitness Champion', 'Yoga Coach', 'Athlete',
    'Sports Coach/Trainer/Enthusiast', 'VIP Host', 'VIP Venue', 'VIP Connoisseur', 'VIP Manager',
  ];
  const descriptions: Record<MembershipCategory, string> = {
    Artist: 'Painters, illustrators and visual creators.',
    Model: 'Fashion, editorial and runway models.',
    'Legacy Brand of Impact': 'Heritage brands with cultural and social impact.',
    'Fitness Champion': 'Strength, conditioning and fitness leaders.',
    'Yoga Coach': 'Certified yoga and wellness instructors.',
    Athlete: 'Competitive athletes across disciplines.',
    'Sports Coach/Trainer/Enthusiast': 'Coaches, trainers and sports enthusiasts.',
    'VIP Host': 'Professional hosts and event anchors.',
    'VIP Venue': 'Premium venues for events and experiences.',
    'VIP Connoisseur': 'Curators of fine living and luxury.',
    'VIP Manager': 'Talent managers and representation.',
  };
  return order.map((name, i) => ({
    id: `cat_${i + 1}`,
    name,
    description: descriptions[name],
    icon: FLAVOUR[name].icon,
    catalogueVisible: true,
    status: 'active',
    order: i,
    relatedDomains: FLAVOUR[name].domains,
    history: [
      { id: `cat_${i + 1}_h0`, action: 'Category created', by: 'System', role: 'Automated', at: '2024-06-01T00:00:00Z' },
    ],
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  }));
}

// --- Portfolio status map (by seed user id) ---------------------------------
interface Spec {
  status: PortfolioStatus;
  badLink?: boolean;
}
const SPEC: Record<string, Spec> = {
  usr_ananya: { status: 'published' },
  usr_kabir: { status: 'published' },
  usr_meera: { status: 'published' },
  usr_aarav: { status: 'draft' },
  usr_royal: { status: 'published' },
  usr_heritage: { status: 'draft' },
  usr_vikram: { status: 'published' },
  usr_nikhil: { status: 'draft' },
  usr_aisha: { status: 'published' },
  usr_devang: { status: 'not_started' }, // active Creator Member, portfolio not started (0%)
  usr_james: { status: 'published' },
  usr_sophia: { status: 'draft', badLink: true },
  usr_abhishek: { status: 'published' },
  usr_leila: { status: 'published' },
  usr_tanvi: { status: 'published' }, // membership later expired → historical, hidden
  usr_karan: { status: 'published' }, // membership cancelled → historical, hidden
  usr_vivaan: { status: 'published' }, // suspended → hidden
};

const YT = ['dQw4w9WgXcQ', '3JZ_D3ELwOQ', 'kJQP7kiw5Fk', 'RgKAFK5djSk', 'OPf0YbXqDm0', 'e-ORhEE9VVg'];

function ts(base: number, offset: number) {
  return new Date(base + offset * 86400000).toISOString();
}

function buildContent(user: UserRecord, cat: MembershipCategory, spec: Spec, base: number): PortfolioContent {
  const f = FLAVOUR[cat];
  const minimal = spec.status === 'not_started';
  if (minimal) {
    return {
      profileImage: undefined,
      coverImage: undefined,
      socials: { instagram: `https://instagram.com/${user.name.toLowerCase().replace(/[^a-z]+/g, '')}` },
      about: '',
      domains: [],
      skills: [],
      highlights: [],
      awards: [],
      watch: [],
      spotify: { type: 'none' },
      events: [],
      gallery: [],
      testimonials: [],
      whatsNew: [],
      collaborations: [],
    };
  }

  const handle = user.name.toLowerCase().replace(/[^a-z]+/g, '');
  const watch: WatchVideo[] = [0, 1].map((n) => {
    const id = YT[(user.id.length + n) % YT.length];
    const bad = spec.badLink && n === 1;
    return {
      id: `${user.id}_w${n}`,
      youtubeUrl: bad ? `https://youtu.be/${id}?broken` : `https://www.youtube.com/watch?v=${id}`,
      title: `${f.domains[n % f.domains.length]} — ${user.name.split(' ')[0]}`,
      description: `A ${f.domains[0].toLowerCase()} feature from ${user.name}.`,
      publishDate: ts(base, 40 + n * 10),
      thumbnail: id,
      linkValid: !bad,
      hidden: false,
    };
  });

  const testimonials: TestimonialEntry[] = [
    { id: `${user.id}_t0`, author: 'Priyanka M.', rating: 5, body: 'Absolutely wonderful to work with — professional and inspiring.', reported: false },
    { id: `${user.id}_t1`, author: 'Rohan D.', rating: 4, body: 'Great experience overall, highly recommend.', reported: false },
  ];

  return {
    profileImage: `pf_${user.id}`,
    coverImage: `cv_${user.id}`,
    socials: {
      instagram: `https://instagram.com/${handle}`,
      facebook: `https://facebook.com/${handle}`,
      youtube: `https://youtube.com/@${handle}`,
      spotify: cat === 'Artist' || cat === 'VIP Host' ? `https://open.spotify.com/artist/${handle}` : undefined,
    },
    about: f.about,
    domains: f.domains,
    skills: f.skills,
    highlights: [
      { id: `${user.id}_h0`, date: ts(base, 5), title: 'Joined IICA', description: `Started the ${cat} journey on IICA.` },
      { id: `${user.id}_h1`, date: ts(base, 90), title: 'First feature', description: 'Featured in a community spotlight.' },
      { id: `${user.id}_h2`, date: ts(base, 200), title: 'Milestone reached', description: 'Crossed a major engagement milestone.' },
    ],
    awards: [
      { id: `${user.id}_a0`, title: 'Rising Star', organisation: 'IICA Community', year: '2025', details: 'Recognised for consistent quality and engagement.' },
      { id: `${user.id}_a1`, title: 'Excellence Award', organisation: `${f.domains[0]} Guild`, year: '2024' },
    ],
    watch,
    spotify:
      cat === 'Artist' || cat === 'VIP Host'
        ? { type: 'embed', embedUrl: `https://open.spotify.com/embed/artist/${handle}`, externalUrl: `https://open.spotify.com/artist/${handle}` }
        : { type: 'external', externalUrl: `https://open.spotify.com/user/${handle}` },
    events: [
      { id: `${user.id}_e0`, title: `${f.domains[0]} Showcase`, date: ts(base, 260), city: user.city },
    ],
    gallery: [0, 1, 2, 3].map((n) => ({ id: `${user.id}_g${n}`, url: `gal_${user.id}_${n}`, caption: `${f.domains[n % f.domains.length]} work ${n + 1}` })),
    testimonials,
    whatsNew: [
      { id: `${user.id}_n0`, type: 'Upcoming Show', title: `${f.domains[0]} Live`, description: 'A new live experience coming soon.', date: ts(base, 300), ctaLabel: 'Get tickets', destination: 'https://iica.app/events' },
    ],
    collaborations: [
      { id: `${user.id}_c0`, collaborator: 'Studio North', project: `${f.domains[0]} Series`, date: ts(base, 150), awardWon: true, awardDetails: 'Best Collaboration — 2025' },
      { id: `${user.id}_c1`, collaborator: 'Brand Loom', project: 'Campaign Feature', date: ts(base, 220), awardWon: false },
    ],
  };
}

export function buildPortfolioSeed(users: UserRecord[], memberships: MembershipRecord[]): PortfolioRecord[] {
  const out: PortfolioRecord[] = [];
  for (const m of memberships) {
    const user = users.find((u) => u.id === m.userId);
    if (!user) continue;
    // Only paid Creator Members (with an IICA ID) can have a Portfolio record.
    // Registered / form-submitted / purchase-pending members get none.
    if (m.purchaseStatus !== 'completed' || !m.iicaId) continue;
    const spec = SPEC[user.id] ?? { status: 'draft' as PortfolioStatus };
    const base = new Date(m.form.submittedAt).getTime();
    const content = buildContent(user, m.category, spec, base);

    const timeline: TimelineEvent[] = [
      { id: `${user.id}_ptl0`, key: 'created', label: 'Portfolio created', at: ts(base, 4) },
    ];
    if (spec.status === 'published')
      timeline.push({ id: `${user.id}_ptl3`, key: 'published', label: 'Portfolio published', at: ts(base, 36) });

    // Historical portfolios (membership later expired / cancelled / suspended)
    // are preserved but hidden from the public catalogue.
    const historical = ['expired', 'cancelled', 'suspended'].includes(m.membershipStatus);

    const hasLocation = true;
    const activitySignals = {
      portfolioCompleteness: 0,
      profileViews: 0,
      productsListed: (user.id.length * 3) % 12,
      archiveVideos: content.watch.filter((w) => !w.hidden).length,
      eventsPublished: content.events.length,
      collaborationAttempts: content.collaborations.length + ((user.id.length * 2) % 6),
      recentActivity: 40 + ((user.id.length * 7) % 55),
    };
    const profileViews = spec.status === 'published' ? 800 + ((user.id.length * 517) % 9000) : 40 + ((user.id.length * 53) % 400);

    const portfolio: PortfolioRecord = {
      id: `pf_${m.id.replace('mem_', '')}`,
      userId: user.id,
      iicaId: m.iicaId,
      category: m.category,
      domainGenre: FLAVOUR[m.category].domains[0],
      status: spec.status,
      hiddenFromCatalogue: historical,
      hiddenReason: historical ? 'Membership no longer active.' : null,
      locationCorrection: null,
      content,
      activity: activitySignals,
      profileViews,
      activityScore: 0,
      scoreCalculatedAt: ts(base, 300),
      reports: [],
      notes: [],
      timeline,
      lastSubmittedAt: spec.status === 'published' ? ts(base, 30) : null,
      lastUpdatedAt: ts(base, spec.status === 'published' ? 300 : 30),
    };
    // finalise derived fields
    portfolio.activity.portfolioCompleteness = completionPercent(completionChecklist(content, hasLocation, true));
    portfolio.activityScore = computeActivityScore(portfolio, hasLocation);
    out.push(portfolio);
  }
  return out;
}
