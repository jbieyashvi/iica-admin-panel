import type { PortfolioRecord } from '../types/portfolio';
import type { UserRecord, TimelineEvent } from '../types/users';
import type {
  CollabFormat,
  CollabIntent,
  CollabProgress,
  CollaborationRecord,
  CollaborationSettings,
  CommRecord,
  CommType,
  CreatorSnapshot,
  MatchDimension,
  Meeting,
  MeetingMode,
  MeetingPlatform,
  MeetingStatus,
  ReportReason,
  ReportStatus,
  RequestStatus,
} from '../types/collaborations';
import {
  DEFAULT_WEIGHTS,
  FORMAT_LABEL,
  INTENT_LABEL,
} from '../config/collaborationLabels';

export const DEFAULT_COLLAB_SETTINGS: CollaborationSettings = {
  weights: { ...DEFAULT_WEIGHTS },
  activeMembershipRequired: true,
  statementRequired: true,
  completePortfolioRequired: true,
  allowOnline: true,
  allowInPerson: true,
  defaultExpiryDays: 7,
  reminderBeforeDays: 2,
};

// Per-category collaboration statements (<= 500 chars). Contributes to matching.
const STATEMENTS: Record<string, string> = {
  Artist: 'Open to cross-medium art collaborations — murals, exhibitions and fusion projects blending traditional and digital craft. I love working with performers, designers and cultural hosts to build immersive experiences.',
  Model: 'Looking to collaborate with photographers, designers and fellow models on editorial, runway and brand concepts. Comfortable travelling for the right creative project.',
  'Yoga Coach': 'Keen to co-create wellness workshops and retreats that blend yoga, breathwork and movement. Happy to partner with fitness and lifestyle creators.',
  'Fitness Champion': 'Happy to partner on strength-and-conditioning programs, challenges and community fitness events. Open to wellness and sports crossovers.',
  Athlete: 'Open to mentorship, training collaborations and sports-brand campaigns. Enjoy inspiring younger athletes through shared sessions.',
  'Sports Coach/Trainer/Enthusiast': 'Available for coaching clinics, youth camps and sports content collaborations. I value structured, joyful training partnerships.',
  'VIP Host': 'Curating luxury cultural evenings — open to co-hosting workshops, showcases and brand events with artists and performers.',
  'VIP Venue': 'Welcoming creators to host performances, workshops and shoots at our heritage venue. Open to co-produced cultural events.',
  'VIP Connoisseur': 'Interested in curated art, dining and cultural experiences and refined brand collaborations with makers and hosts.',
  'VIP Manager': 'Connecting creators with brands and stages — open to representation and collaboration deals across categories.',
  'Legacy Brand of Impact': 'Partnering with artists and designers on heritage-craft collections and sustainable campaigns that carry cultural meaning.',
};

const SOCIAL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  spotify: 'Spotify',
};

function audienceRange(views: number): string {
  if (views >= 8000) return '100K–500K';
  if (views >= 4000) return '25K–100K';
  if (views >= 1500) return '5K–25K';
  if (views >= 400) return '1K–5K';
  return 'Under 1K';
}

function snapshot(user: UserRecord, portfolio?: PortfolioRecord): CreatorSnapshot {
  const cat = (user.membershipCategory ?? 'Artist') as string;
  const socials = portfolio
    ? Object.entries(portfolio.content.socials)
        .filter(([, v]) => !!v)
        .map(([k]) => SOCIAL_LABEL[k] ?? k)
    : ['Instagram'];
  return {
    userId: user.id,
    portfolioId: portfolio?.id,
    name: user.name,
    iicaId: user.iicaId,
    membershipCategory: user.membershipCategory,
    membershipStatus: user.membershipStatus,
    primaryCategory: portfolio?.domainGenre ?? cat,
    city: user.city,
    country: user.country,
    socials: socials.length ? socials : ['Instagram'],
    audienceRange: audienceRange(portfolio?.profileViews ?? 0),
    collaborationStatement: STATEMENTS[cat] ?? STATEMENTS.Artist,
    profileImage: portfolio?.content.profileImage,
    skills: portfolio?.content.skills ?? [],
  };
}

// Build the four match dimensions from an explicit score tuple + snapshots.
function buildDimensions(
  a: CreatorSnapshot,
  b: CreatorSnapshot,
  scores: [number, number, number, number],
  intent: CollabIntent,
  format: CollabFormat,
): MatchDimension[] {
  const w = DEFAULT_WEIGHTS;
  const sharedSocials = a.socials.filter((s) => b.socials.includes(s));
  const sameCity = a.city === b.city;
  return [
    {
      key: 'location',
      label: 'Location Compatibility',
      score: scores[0],
      weight: w.location,
      explanation: sameCity
        ? `Both creators are based in ${a.city}, making in-person sessions easy.`
        : `${a.city} and ${b.city} differ, but both are open to remote collaboration.`,
      signals: [
        sameCity ? `Same city — ${a.city}` : `${a.city} ↔ ${b.city}`,
        `Remote preference: ${format === 'online' ? 'High' : format === 'hybrid' ? 'Medium' : 'Low'}`,
        'Travel availability considered',
      ],
    },
    {
      key: 'social',
      label: 'Social Compatibility',
      score: scores[1],
      weight: w.social,
      explanation: 'Platform overlap and comparable audience sizes suggest aligned reach.',
      signals: [
        `Primary platforms: ${(sharedSocials.length ? sharedSocials : a.socials).slice(0, 3).join(', ')}`,
        `Audience size: ${a.audienceRange} ↔ ${b.audienceRange}`,
        'Similar content engagement style',
      ],
    },
    {
      key: 'intent',
      label: 'Collaboration Intent',
      score: scores[2],
      weight: w.intent,
      explanation: 'Stated goals and collaboration statements point to a shared direction.',
      signals: [
        `Shared goal: ${INTENT_LABEL[intent]}`,
        `Preferred type: ${FORMAT_LABEL[format]}`,
        'Availability windows overlap',
        "Collaboration statements are complementary",
      ],
    },
    {
      key: 'creative',
      label: 'Creative Compatibility',
      score: scores[3],
      weight: w.creative,
      explanation: 'Creative categories and skills complement one another across the two portfolios.',
      signals: [
        `Categories: ${a.primaryCategory} × ${b.primaryCategory}`,
        `Skills: ${[...new Set([...a.skills, ...b.skills])].slice(0, 4).join(', ') || 'Varied'}`,
        'Complementary creative interests',
        'Portfolio work aligns',
      ],
    },
  ];
}

function overall(scores: [number, number, number, number]): number {
  const w = DEFAULT_WEIGHTS;
  return Math.round((scores[0] * w.location + scores[1] * w.social + scores[2] * w.intent + scores[3] * w.creative) / 100);
}

interface MeetingSpec {
  mode: MeetingMode;
  platform?: MeetingPlatform;
  status: MeetingStatus;
  offset: number; // days from now (negative = past)
  link: 'added' | 'pending';
  location?: string;
  reschedule?: boolean;
  cancelReason?: string;
  noteless?: boolean;
}

interface ReportSpec {
  by: 'a' | 'b';
  reason: ReportReason;
  desc: string;
  status: ReportStatus;
}

interface Spec {
  id: string;
  a: string; // initiator userId
  b: string; // invited userId
  intent: CollabIntent;
  title: string;
  message: string;
  outcome: string;
  format: CollabFormat;
  location: string;
  req: RequestStatus;
  prog: CollabProgress;
  scores: [number, number, number, number];
  reqOffset: number; // request created days ago (positive)
  declineReason?: string;
  withdrawalReason?: string;
  blockReason?: string;
  meeting?: MeetingSpec;
  report?: ReportSpec;
}

// prettier-ignore
const SPECS: Spec[] = [
  { id: 'col_01', a: 'usr_ananya', b: 'usr_sophia', intent: 'content', title: 'Indo-Global Canvas Series', message: 'A joint painting series exploring shared heritage across two continents, released as prints and a short film.', outcome: 'A 6-piece capsule collection and a behind-the-scenes reel.', format: 'online', location: 'Remote — Mumbai / New York', req: 'accepted', prog: 'in_discussion', scores: [55, 82, 90, 88], reqOffset: 18, meeting: { mode: 'online', platform: 'zoom', status: 'scheduled', offset: 6, link: 'added' } },
  { id: 'col_02', a: 'usr_meera', b: 'usr_aarav', intent: 'workshop', title: 'Yoga Meets Strength Retreat', message: 'A weekend retreat blending mobility, breathwork and strength conditioning for everyday athletes.', outcome: 'A recurring retreat format and a shared waitlist.', format: 'in_person', location: 'Bengaluru', req: 'accepted', prog: 'confirmed', scores: [88, 72, 86, 80], reqOffset: 24, meeting: { mode: 'in_person', status: 'scheduled', offset: 12, link: 'pending', location: 'Aarav Fitness Collective, Bengaluru' } },
  { id: 'col_03', a: 'usr_ananya', b: 'usr_nikhil', intent: 'event', title: 'Live Painting at Cultural Soirée', message: 'Live-painting performance during a curated luxury evening, auctioned for a community cause.', outcome: 'A signature live-art segment for the soirée.', format: 'hybrid', location: 'Mumbai', req: 'accepted', prog: 'in_discussion', scores: [90, 68, 80, 75], reqOffset: 14, meeting: { mode: 'online', platform: 'google_meet', status: 'proposed', offset: 5, link: 'pending' } },
  { id: 'col_04', a: 'usr_kabir', b: 'usr_james', intent: 'performance', title: 'Transcontinental Editorial', message: 'A mirrored editorial shoot across Delhi and London exploring identity and movement.', outcome: 'A dual-city editorial spread.', format: 'online', location: 'Remote — Delhi / London', req: 'request_sent', prog: 'not_started', scores: [40, 78, 84, 82], reqOffset: 3 },
  { id: 'col_05', a: 'usr_vikram', b: 'usr_abhishek', intent: 'mentorship', title: 'Sprint Mentorship Program', message: 'A structured sprint-mentorship block pairing coaching drills with athlete feedback.', outcome: 'A published 8-week mentorship outline.', format: 'in_person', location: 'Pune', req: 'accepted', prog: 'completed', scores: [80, 64, 88, 84], reqOffset: 40, meeting: { mode: 'in_person', status: 'completed', offset: -10, link: 'pending', location: 'Vikram Sport Lab, Pune' } },
  { id: 'col_06', a: 'usr_heritage', b: 'usr_ananya', intent: 'brand', title: 'Handloom × Canvas Capsule', message: 'Hand-painted motifs on heritage handloom, launched as a limited capsule with a story film.', outcome: 'A co-branded capsule and lookbook.', format: 'in_person', location: 'Kolkata', req: 'accepted', prog: 'confirmed', scores: [70, 66, 82, 86], reqOffset: 21, meeting: { mode: 'in_person', status: 'scheduled', offset: 9, link: 'pending', location: 'Heritage Weaves Studio, Kolkata' } },
  { id: 'col_07', a: 'usr_aisha', b: 'usr_royal', intent: 'event', title: 'Curated Art Dinner Series', message: 'A recurring art-and-dining evening pairing regional cuisine with a featured artist each month.', outcome: 'A monthly ticketed dinner series.', format: 'hybrid', location: 'Udaipur', req: 'accepted', prog: 'discussion_scheduled', scores: [92, 60, 78, 72], reqOffset: 12, meeting: { mode: 'online', platform: 'google_meet', status: 'scheduled', offset: 4, link: 'added' } },
  { id: 'col_08', a: 'usr_devang', b: 'usr_kabir', intent: 'brand', title: 'Brand Ambassador Program', message: 'Suggested match — Devang represents lifestyle brands looking for a versatile model face.', outcome: 'Potential ambassador contract.', format: 'online', location: 'Remote', req: 'suggested', prog: 'not_started', scores: [85, 74, 70, 68], reqOffset: 2 },
  { id: 'col_09', a: 'usr_sophia', b: 'usr_meera', intent: 'content', title: 'Mindful Art Sessions', message: 'Suggested match — pairing guided art with mindful movement for a calming content series.', outcome: 'A short calming-content series.', format: 'online', location: 'Remote', req: 'suggested', prog: 'not_started', scores: [45, 70, 72, 66], reqOffset: 1 },
  { id: 'col_10', a: 'usr_james', b: 'usr_aisha', intent: 'brand', title: 'Luxury Lifestyle Feature', message: 'Suggested match — a refined lifestyle feature pairing a model with a connoisseur host.', outcome: 'A luxury lifestyle feature.', format: 'hybrid', location: 'Dubai', req: 'suggested', prog: 'not_started', scores: [42, 68, 64, 60], reqOffset: 4 },
  { id: 'col_11', a: 'usr_aarav', b: 'usr_vikram', intent: 'workshop', title: 'Community Fitness Bootcamp', message: 'An open community bootcamp combining strength circuits and sports drills.', outcome: 'A monthly free bootcamp.', format: 'in_person', location: 'Bengaluru', req: 'declined', prog: 'cancelled', scores: [78, 66, 80, 82], reqOffset: 16, declineReason: 'Scheduling conflict this quarter — open to revisiting later.' },
  { id: 'col_12', a: 'usr_nikhil', b: 'usr_devang', intent: 'event', title: 'Season Finale Gala', message: 'A season-finale gala pairing a host with a talent manager to curate performers.', outcome: 'A curated finale line-up.', format: 'in_person', location: 'Mumbai', req: 'expired', prog: 'not_started', scores: [88, 62, 70, 64], reqOffset: 20 },
  { id: 'col_13', a: 'usr_meera', b: 'usr_leila', intent: 'workshop', title: 'Wellness Escape Dubai', message: 'A cross-border wellness escape blending yoga with a curated luxury experience.', outcome: 'A pilot international retreat.', format: 'hybrid', location: 'Dubai', req: 'pending_response', prog: 'not_started', scores: [40, 58, 74, 62], reqOffset: 5 },
  { id: 'col_14', a: 'usr_abhishek', b: 'usr_aarav', intent: 'mentorship', title: 'Athlete Strength Clinic', message: 'A clinic pairing athlete conditioning with a champion’s strength programming.', outcome: 'A joint strength clinic.', format: 'in_person', location: 'Pune', req: 'accepted', prog: 'in_discussion', scores: [82, 68, 84, 80], reqOffset: 15, meeting: { mode: 'online', platform: 'zoom', status: 'reschedule_requested', offset: 7, link: 'added', reschedule: true } },
  { id: 'col_15', a: 'usr_royal', b: 'usr_nikhil', intent: 'event', title: 'Heritage Concert Night', message: 'A heritage-venue concert co-hosted for an intimate, high-end audience.', outcome: 'A flagship concert evening.', format: 'in_person', location: 'Udaipur', req: 'accepted', prog: 'confirmed', scores: [86, 64, 80, 76], reqOffset: 19, meeting: { mode: 'in_person', status: 'scheduled', offset: 15, link: 'pending', location: 'Royal Courtyard, Udaipur' } },
  { id: 'col_16', a: 'usr_kabir', b: 'usr_ananya', intent: 'creative_project', title: 'Wearable Art Shoot', message: 'A shoot featuring hand-painted wearable art on a model, styled as a gallery piece.', outcome: 'A wearable-art photo set.', format: 'in_person', location: 'Delhi', req: 'withdrawn', prog: 'not_started', scores: [90, 70, 76, 78], reqOffset: 11, withdrawalReason: 'Initiator paused personal projects for the month.' },
  { id: 'col_17', a: 'usr_sophia', b: 'usr_james', intent: 'performance', title: 'Editorial Art Film', message: 'A short editorial film merging painted backdrops with a model performance.', outcome: 'A festival-ready short film.', format: 'online', location: 'Remote — New York / London', req: 'accepted', prog: 'in_discussion', scores: [44, 76, 82, 74], reqOffset: 17, meeting: { mode: 'online', platform: 'ms_teams', status: 'cancelled', offset: 3, link: 'pending', cancelReason: 'Creator cancelled due to a travel clash.' } },
  { id: 'col_18', a: 'usr_heritage', b: 'usr_aisha', intent: 'brand', title: 'Sustainable Luxe Showcase', message: 'A showcase pairing sustainable craft with a connoisseur’s curated audience.', outcome: 'A sustainable-luxury showcase.', format: 'hybrid', location: 'Delhi', req: 'pending_response', prog: 'not_started', scores: [68, 60, 72, 70], reqOffset: 6, report: { by: 'b', reason: 'inappropriate_proposal', desc: 'Reported the proposal wording as pushy and off-brand.', status: 'under_review' } },
  { id: 'col_19', a: 'usr_vikram', b: 'usr_kabir', intent: 'content', title: 'Fit & Fashion Reels', message: 'A reels series pairing fitness drills with fashion-forward styling.', outcome: 'A weekly reels series.', format: 'online', location: 'Remote', req: 'request_sent', prog: 'not_started', scores: [60, 72, 66, 64], reqOffset: 7, report: { by: 'b', reason: 'spam', desc: 'Recipient flagged repeated identical requests as spam.', status: 'new' } },
  { id: 'col_20', a: 'usr_devang', b: 'usr_leila', intent: 'brand', title: 'Global Talent Bridge', message: 'A cross-border talent partnership connecting creators with international brands.', outcome: 'A referral partnership.', format: 'online', location: 'Remote — Ahmedabad / Dubai', req: 'blocked', prog: 'cancelled', scores: [55, 66, 68, 62], reqOffset: 13, blockReason: 'Blocked after a safety review of unverified brand claims.' },
  { id: 'col_21', a: 'usr_ananya', b: 'usr_meera', intent: 'creative_project', title: 'Art & Breath Installation', message: 'An immersive installation combining live painting with guided breathwork.', outcome: 'A gallery installation.', format: 'hybrid', location: 'Mumbai', req: 'accepted', prog: 'in_discussion', scores: [86, 68, 82, 80], reqOffset: 10, meeting: { mode: 'online', platform: 'ms_teams', status: 'scheduled', offset: 3, link: 'pending' } },
  { id: 'col_22', a: 'usr_aarav', b: 'usr_abhishek', intent: 'performance', title: 'Strength Showcase Live', message: 'A live strength showcase pairing a champion with a competitive athlete.', outcome: 'A live showcase event.', format: 'in_person', location: 'Bengaluru', req: 'accepted', prog: 'confirmed', scores: [80, 66, 84, 82], reqOffset: 22, meeting: { mode: 'in_person', status: 'no_show', offset: -3, link: 'pending', location: 'Aarav Fitness Collective, Bengaluru' } },
  { id: 'col_23', a: 'usr_nikhil', b: 'usr_aisha', intent: 'event', title: 'Art Patron Evening', message: 'Suggested match — an intimate patron evening connecting a host with a connoisseur.', outcome: 'A patron networking evening.', format: 'in_person', location: 'Mumbai', req: 'suggested', prog: 'not_started', scores: [90, 64, 72, 70], reqOffset: 3 },
  { id: 'col_24', a: 'usr_james', b: 'usr_sophia', intent: 'creative_project', title: 'Diaspora Portrait Project', message: 'A portrait project exploring diaspora stories through painted and photographed portraits.', outcome: 'A travelling portrait exhibit.', format: 'online', location: 'Remote — London / New York', req: 'accepted', prog: 'discussion_scheduled', scores: [46, 78, 80, 76], reqOffset: 9, meeting: { mode: 'online', platform: 'zoom', status: 'proposed', offset: 8, link: 'pending' } },
];

const MSG_TYPE_BY_REQ: Partial<Record<RequestStatus, CommType>> = {
  request_sent: 'collab_request',
  pending_response: 'collab_request',
  accepted: 'request_accepted',
  declined: 'request_declined',
};

export function buildCollaborations(users: UserRecord[], portfolios: PortfolioRecord[], now: number): CollaborationRecord[] {
  const day = 86400000;
  const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();
  const userById = new Map(users.map((u) => [u.id, u]));
  const pfByUser = new Map(portfolios.map((p) => [p.userId, p]));

  const out: CollaborationRecord[] = [];

  for (const s of SPECS) {
    const ua = userById.get(s.a);
    const ub = userById.get(s.b);
    if (!ua || !ub) continue;
    const initiator = snapshot(ua, pfByUser.get(s.a));
    const invited = snapshot(ub, pfByUser.get(s.b));

    const requestDate = iso(-s.reqOffset);
    const responded = ['accepted', 'declined'].includes(s.req);
    const responseDate = responded ? iso(-s.reqOffset + 1) : null;
    const expiryDate = s.req === 'suggested' ? null : iso(-s.reqOffset + DEFAULT_COLLAB_SETTINGS.defaultExpiryDays);

    // ---- Meeting ----
    let meeting: Meeting | null = null;
    if (s.meeting) {
      const m = s.meeting;
      const meetTime = iso(m.offset);
      const confirmed = ['scheduled', 'completed', 'no_show'].includes(m.status);
      meeting = {
        id: s.id.replace('col_', 'mtg_'),
        title: `${s.title} — Discussion`,
        mode: m.mode,
        platform: m.mode === 'online' ? (m.platform ?? 'other') : null,
        proposedBy: initiator.name,
        proposedAt: meetTime,
        confirmedAt: confirmed ? meetTime : null,
        timezone: 'Asia/Kolkata (IST)',
        durationMins: m.mode === 'in_person' ? 60 : 45,
        status: m.status,
        linkStatus: m.mode === 'online' ? m.link : 'pending',
        location: m.mode === 'in_person' ? (m.location ?? s.location) : null,
        reschedules: m.reschedule
          ? [{ id: `${s.id}_rs0`, by: invited.name, requestedAt: iso(-1), proposedAt: iso(m.offset + 3), reason: 'Requested a later slot due to a travel commitment.', status: 'pending' }]
          : [],
        cancellationReason: m.cancelReason ?? null,
        notes: m.noteless ? undefined : 'Creators to align on scope and share references before the session.',
        createdAt: iso(-s.reqOffset + 2),
        lastUpdatedAt: iso(m.status === 'cancelled' ? -1 : Math.min(0, m.offset)),
      };
    }

    // ---- Communications ----
    const comms: CommRecord[] = [];
    const pushComm = (type: CommType, sender: string, recipient: string, offset: number, channel: 'in_app' | 'email' = 'in_app', body?: string) =>
      comms.unshift({ id: `${s.id}_cm${comms.length}`, at: iso(offset), sender, recipient, type, channel, delivery: channel === 'email' ? 'sent' : 'delivered', body });

    if (s.req !== 'suggested') {
      pushComm('collab_request', initiator.name, invited.name, -s.reqOffset, 'in_app', `Proposal: ${s.title}`);
    }
    const respType = MSG_TYPE_BY_REQ[s.req];
    if (respType === 'request_accepted') pushComm('request_accepted', invited.name, initiator.name, -s.reqOffset + 1);
    if (respType === 'request_declined') pushComm('request_declined', invited.name, initiator.name, -s.reqOffset + 1, 'in_app', s.declineReason);
    if (meeting) {
      pushComm('meeting_proposal', initiator.name, invited.name, -s.reqOffset + 2);
      if (['scheduled', 'completed', 'no_show'].includes(meeting.status)) pushComm('meeting_confirmation', invited.name, initiator.name, -s.reqOffset + 3);
      if (meeting.status === 'reschedule_requested') pushComm('reschedule_request', invited.name, initiator.name, -1);
      if (meeting.status === 'cancelled') pushComm('cancellation_notice', initiator.name, invited.name, -1, 'email', meeting.cancellationReason ?? undefined);
    }

    // ---- Reports ----
    const reports = s.report
      ? [{
          id: s.id.replace('col_', 'rep_'),
          reportedBy: s.report.by === 'a' ? initiator.name : invited.name,
          reportedCreator: s.report.by === 'a' ? invited.name : initiator.name,
          reason: s.report.reason,
          description: s.report.desc,
          reportedAt: iso(-Math.max(1, s.reqOffset - 2)),
          status: s.report.status,
          notes: [],
          decisionReason: null,
        }]
      : [];

    // ---- Timeline (operational status history) ----
    const tl: TimelineEvent[] = [];
    const pushTl = (key: string, label: string, offset: number, detail?: string) => tl.push({ id: `${s.id}_tl${tl.length}`, key, label, at: iso(offset), detail });
    pushTl('matched', 'Match generated by prototype AI', -s.reqOffset, `Overall score ${overall(s.scores)} / 100`);
    if (s.req !== 'suggested') pushTl('request_sent', 'Collaboration request sent', -s.reqOffset, `From ${initiator.name} to ${invited.name}`);
    if (s.req === 'accepted') pushTl('accepted', 'Request accepted', -s.reqOffset + 1);
    if (s.req === 'declined') pushTl('declined', 'Request declined', -s.reqOffset + 1, s.declineReason);
    if (s.req === 'withdrawn') pushTl('withdrawn', 'Request withdrawn', -s.reqOffset + 1, s.withdrawalReason);
    if (s.req === 'expired') pushTl('expired', 'Request expired', -s.reqOffset + DEFAULT_COLLAB_SETTINGS.defaultExpiryDays);
    if (meeting) {
      pushTl('meeting_proposed', 'Meeting proposed', -s.reqOffset + 2, `${meeting.mode === 'online' ? 'Online' : 'In person'}${meeting.platform ? ' · ' + meeting.platform : ''}`);
      if (['scheduled'].includes(meeting.status)) pushTl('meeting_scheduled', 'Meeting scheduled', -s.reqOffset + 3);
      if (meeting.status === 'reschedule_requested') pushTl('reschedule', 'Reschedule requested', -1, meeting.reschedules[0]?.reason);
      if (meeting.status === 'cancelled') pushTl('meeting_cancelled', 'Meeting cancelled', -1, meeting.cancellationReason ?? undefined);
      if (meeting.status === 'completed') pushTl('meeting_completed', 'Meeting completed', meeting.confirmedAt ? -Math.abs(s.meeting!.offset) : 0);
      if (meeting.status === 'no_show') pushTl('meeting_no_show', 'Meeting marked as no-show', -Math.abs(s.meeting!.offset));
    }
    if (s.prog === 'completed') pushTl('completed', 'Collaboration completed', -1);
    if (s.report) pushTl('reported', 'Collaboration reported', -Math.max(1, s.reqOffset - 2), s.report.desc);
    if (s.req === 'blocked') pushTl('blocked', 'Collaboration blocked by admin', -1, s.blockReason);

    const record: CollaborationRecord = {
      id: s.id,
      initiator,
      invited,
      matchScore: overall(s.scores),
      dimensions: buildDimensions(initiator, invited, s.scores, s.intent, s.format),
      intent: s.intent,
      proposalTitle: s.title,
      proposalMessage: s.message,
      expectedOutcome: s.outcome,
      preferredFormat: s.format,
      preferredLocation: s.location,
      preferredMeetingDates: [iso(Math.max(2, s.reqOffset - 10)), iso(Math.max(4, s.reqOffset - 6))],
      requestStatus: s.req,
      progress: s.prog,
      requestDate,
      responseDate,
      declineReason: s.declineReason ?? null,
      withdrawalReason: s.withdrawalReason ?? null,
      expiryDate,
      blocked: s.req === 'blocked',
      blockReason: s.blockReason ?? null,
      preBlock: s.req === 'blocked' ? { requestStatus: 'pending_response', progress: 'not_started' } : null,
      meeting,
      communications: comms,
      reports,
      notes: [],
      timeline: tl,
      createdAt: requestDate,
      lastUpdatedAt: iso(-1),
    };
    out.push(record);
  }

  return out;
}
