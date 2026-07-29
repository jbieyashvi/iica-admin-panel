import type { ReviewRecord, ReviewSourceKind, ReviewStatus, ReviewType, ReviewerType, TestimonialRecord, TestimonialPlacement, TestimonialSourceType, TestimonialStatus } from '../types/reviews';

const DAY = 86400000;

interface RSpec {
  id: string;
  reviewer: string;
  rtype: ReviewerType;
  userId?: string;
  email?: string;
  type: ReviewType;
  targetId: string;
  targetName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  daysAgo: number;
  source: { kind: ReviewSourceKind; id: string };
  hiddenReason?: string;
  images?: number;
}

// All targetIds / source ids reference existing seeded records (products,
// events, ticket bookings, collaborations, users).
const REVIEWS: RSpec[] = [
  // ---- Physical products ----
  { id: 'rev_p01', reviewer: 'Nisha Reddy', rtype: 'registered', userId: 'usr_nisha', type: 'product', targetId: 'prod_folkjournal', targetName: 'Handcrafted Folk Art Journal', rating: 5, title: 'Beautiful craftsmanship', body: 'The folk art journal is even lovelier in person — the hand-painted cover and thick paper make it a joy to write in. Arrived well packaged and on time.', status: 'published', daysAgo: 20, source: { kind: 'order', id: 'ord_p1' }, images: 2 },
  { id: 'rev_p02', reviewer: 'Meera Kulkarni', rtype: 'registered', userId: 'usr_meera', type: 'product', targetId: 'prod_folkjournal', targetName: 'Handcrafted Folk Art Journal', rating: 2, title: 'Cover arrived damaged', body: 'The journal itself is nice but my copy arrived with a torn cover. I have raised a return request with the seller.', status: 'pending', daysAgo: 12, source: { kind: 'order', id: 'ord_p5' } },
  { id: 'rev_p03', reviewer: 'Daniel Fernandes', rtype: 'registered', userId: 'usr_daniel', type: 'product', targetId: 'prod_folkjournal', targetName: 'Handcrafted Folk Art Journal', rating: 1, title: 'Not for me', body: 'Returned it. Contact me on 98xxxxxx11 if you want details.', status: 'hidden', daysAgo: 34, source: { kind: 'order', id: 'ord_p8' }, hiddenReason: 'Personal Information' },
  { id: 'rev_p04', reviewer: 'Kabir Menon', rtype: 'registered', userId: 'usr_kabir', type: 'product', targetId: 'prod_canvas', targetName: 'Original Canvas Artwork', rating: 5, title: 'A statement piece', body: 'The canvas is vivid and the texture is gorgeous. It has become the centrepiece of my living room. Worth every rupee.', status: 'published', daysAgo: 6, source: { kind: 'order', id: 'ord_p2' }, images: 3 },
  { id: 'rev_p05', reviewer: 'Arjun Bhatia', rtype: 'registered', userId: 'usr_arjun', type: 'product', targetId: 'prod_photobook', targetName: 'Signed Photography Book', rating: 4, title: 'Lovely signed edition', body: 'Great print quality and the signature is a nice touch. Took a little long to arrive but the book is excellent.', status: 'published', daysAgo: 16, source: { kind: 'order', id: 'ord_r1' } },
  { id: 'rev_p06', reviewer: 'Rahul Menon', rtype: 'guest', email: 'rahul.guest@example.com', type: 'product', targetId: 'prod_photobook', targetName: 'Signed Photography Book', rating: 4, title: 'Great gift', body: 'Bought two as gifts. Both were well made and beautifully packaged.', status: 'pending', daysAgo: 2, source: { kind: 'order', id: 'ord_p3' } },

  // ---- Digital products ----
  { id: 'rev_d01', reviewer: 'Nisha Reddy', rtype: 'registered', userId: 'usr_nisha', type: 'product', targetId: 'prod_fitnessbook', targetName: 'Fitness Strength Program (E-book)', rating: 5, title: 'Clear and practical', body: 'The strength program is well structured and easy to follow at home. Downloaded instantly after purchase.', status: 'published', daysAgo: 8, source: { kind: 'order', id: 'ord_d2' } },
  { id: 'rev_d02', reviewer: 'Karan Shah', rtype: 'guest', email: 'karan.guest@example.com', type: 'product', targetId: 'prod_yogaguide', targetName: 'Yoga Mobility Guide', rating: 4, title: 'Great free resource', body: 'Really helpful mobility routines. Cannot believe this was free — thank you!', status: 'published', daysAgo: 11, source: { kind: 'order', id: 'ord_d5' } },
  { id: 'rev_d03', reviewer: 'Meghna Rao', rtype: 'guest', email: 'meghna.guest@example.com', type: 'product', targetId: 'prod_classicaltracks', targetName: 'Indian Classical Practice Tracks', rating: 5, title: 'Perfect for riyaaz', body: 'These practice tracks are pitch-perfect and cover a great range of ragas. My daily practice has improved a lot.', status: 'published', daysAgo: 4, source: { kind: 'order', id: 'ord_d1' }, images: 1 },
  { id: 'rev_d04', reviewer: 'Arjun Bhatia', rtype: 'registered', userId: 'usr_arjun', type: 'product', targetId: 'prod_classicaltracks', targetName: 'Indian Classical Practice Tracks', rating: 2, title: 'Never got the file', body: 'I paid but the download email never arrived. Raised a request with the seller.', status: 'hidden', daysAgo: 6, source: { kind: 'order', id: 'ord_d4' }, hiddenReason: 'Misleading Content' },
  { id: 'rev_d05', reviewer: 'Fatima Noor', rtype: 'registered', userId: 'usr_fatima', type: 'product', targetId: 'prod_nutrition', targetName: 'Athlete Nutrition Guide', rating: 4, title: 'Solid guidance', body: 'Good, evidence-based nutrition advice tailored for athletes. Would have liked more sample meal plans.', status: 'published', daysAgo: 5, source: { kind: 'order', id: 'ord_d7' } },
  { id: 'rev_d06', reviewer: 'Daniel Fernandes', rtype: 'registered', userId: 'usr_daniel', type: 'product', targetId: 'prod_meditation', targetName: 'Meditation Audio Pack', rating: 5, title: 'Calming and clear', body: 'Beautifully recorded meditation tracks. I use them every night to wind down.', status: 'published', daysAgo: 3, source: { kind: 'order', id: 'ord_d8' } },
  { id: 'rev_d07', reviewer: 'Vikram Sport Lab', rtype: 'registered', userId: 'usr_vikram', type: 'product', targetId: 'prod_fitnessbook', targetName: 'Fitness Strength Program (E-book)', rating: 4, title: 'Good base program', body: 'Recommending this to my trainees as a starting point. Well laid out.', status: 'pending', daysAgo: 1, source: { kind: 'order', id: 'ord_d6' } },

  // ---- Masterclasses ----
  { id: 'rev_m01', reviewer: 'Ira Nair', rtype: 'guest', email: 'ira.guest@example.com', type: 'masterclass', targetId: 'prod_bharatanatyam', targetName: 'Bharatanatyam Foundations', rating: 5, title: 'Transformative session', body: 'Meera is an incredible teacher. The foundations masterclass was clear, patient and inspiring. I left with a real practice plan.', status: 'published', daysAgo: 28, source: { kind: 'order', id: 'ord_m2' }, images: 1 },
  { id: 'rev_m02', reviewer: 'Arjun Bhatia', rtype: 'registered', userId: 'usr_arjun', type: 'masterclass', targetId: 'prod_bharatanatyam', targetName: 'Bharatanatyam Foundations', rating: 4, title: 'Well paced', body: 'Great content and demonstrations. The session ran a little over time but I did not mind.', status: 'published', daysAgo: 10, source: { kind: 'order', id: 'ord_m5' } },
  { id: 'rev_m03', reviewer: 'Nisha Reddy', rtype: 'registered', userId: 'usr_nisha', type: 'masterclass', targetId: 'prod_songwriting', targetName: 'The Art of Indian Songwriting', rating: 4, title: 'Looking forward to it', body: 'Booked and excited. Early communication from the host has been very good.', status: 'pending', daysAgo: 3, source: { kind: 'order', id: 'ord_m1' } },
  { id: 'rev_m04', reviewer: 'Fatima Noor', rtype: 'registered', userId: 'usr_fatima', type: 'masterclass', targetId: 'prod_songwriting', targetName: 'The Art of Indian Songwriting', rating: 2, title: 'Link issues', body: 'The joining link did not arrive on time and I missed part of the session. Hope this is fixed for others.', status: 'hidden', daysAgo: 7, source: { kind: 'order', id: 'ord_m4' }, hiddenReason: 'Irrelevant Content' },
  { id: 'rev_m05', reviewer: 'Ananya Rao', rtype: 'registered', userId: 'usr_ananya', type: 'masterclass', targetId: 'prod_courtyard', targetName: 'Royal Courtyard Cultural Workshop', rating: 5, title: 'A magical experience', body: 'The cultural workshop at the Royal Courtyard was beautifully curated — music, stories and craft all in one evening. Highly recommend.', status: 'published', daysAgo: 5, source: { kind: 'order', id: 'ord_m3' }, images: 2 },
  { id: 'rev_m06', reviewer: 'Vivek Desai', rtype: 'guest', email: 'vivek.guest@example.com', type: 'masterclass', targetId: 'prod_courtyard', targetName: 'Royal Courtyard Cultural Workshop', rating: 3, title: 'Good but crowded', body: 'Enjoyed the workshop though it felt a little crowded. The host was warm and knowledgeable.', status: 'pending', daysAgo: 1, source: { kind: 'order', id: 'ord_m6' } },

  // ---- Events ----
  { id: 'rev_e01', reviewer: 'Arjun Bhatia', rtype: 'registered', userId: 'usr_arjun', type: 'event', targetId: 'evt_sprint', targetName: 'Sprint Clinic', rating: 5, title: 'Brilliant clinic', body: 'The sprint clinic was intense and incredibly well organised. Learned drills I am still using weeks later.', status: 'published', daysAgo: 8, source: { kind: 'booking', id: 'ord_evt_sprint_0_0' } },
  { id: 'rev_e02', reviewer: 'Guest — Pooja R.', rtype: 'guest', email: 'pooja.guest@example.com', type: 'event', targetId: 'evt_photo', targetName: 'Photography Walk', rating: 4, title: 'Lovely morning', body: 'A relaxed, friendly photography walk with great tips. Would join again.', status: 'published', daysAgo: 4, source: { kind: 'booking', id: 'ord_evt_photo_0_0' } },
  { id: 'rev_e03', reviewer: 'Fatima Noor', rtype: 'registered', userId: 'usr_fatima', type: 'event', targetId: 'evt_sprint', targetName: 'Sprint Clinic', rating: 3, title: 'Good but hot', body: 'Solid coaching, but the afternoon heat made it tough. Maybe an earlier slot next time.', status: 'pending', daysAgo: 7, source: { kind: 'booking', id: 'ord_evt_sprint_0_1' } },

  // ---- Creator (backed by a completed collaboration) ----
  { id: 'rev_c01', reviewer: 'Vikram Sport Lab', rtype: 'registered', userId: 'usr_vikram', type: 'creator', targetId: 'usr_abhishek', targetName: 'Abhishek Singh Chouhan', rating: 5, title: 'A dedicated collaborator', body: 'Worked with Abhishek on our sprint mentorship program. Professional, punctual and genuinely great with young athletes.', status: 'published', daysAgo: 9, source: { kind: 'collaboration', id: 'col_05' } },
  { id: 'rev_c02', reviewer: 'Abhishek Singh Chouhan', rtype: 'registered', userId: 'usr_abhishek', type: 'creator', targetId: 'usr_vikram', targetName: 'Vikram Sport Lab', rating: 5, title: 'Excellent coaching partner', body: 'Vikram brought real structure to our joint mentorship block. Clear communicator and a pleasure to collaborate with.', status: 'published', daysAgo: 9, source: { kind: 'collaboration', id: 'col_05' } },
];

export function buildReviews(now: number): ReviewRecord[] {
  return REVIEWS.map((s) => ({
    id: s.id,
    reviewerName: s.reviewer,
    reviewerType: s.rtype,
    reviewerUserId: s.rtype === 'registered' ? s.userId ?? null : null,
    reviewerEmail: s.email,
    type: s.type,
    targetId: s.targetId,
    targetName: s.targetName,
    rating: s.rating,
    title: s.title,
    body: s.body,
    images: s.images ? Array.from({ length: s.images }, (_, i) => `revimg_${s.id}_${i}`) : [],
    status: s.status,
    hiddenReason: s.hiddenReason ?? null,
    submittedAt: new Date(now - s.daysAgo * DAY).toISOString(),
    lastUpdatedAt: new Date(now - Math.max(0, s.daysAgo - 1) * DAY).toISOString(),
    source: s.source,
  }));
}

// ---- Testimonials ----------------------------------------------------------

interface TSpec {
  id: string;
  person: string;
  role: string;
  body: string;
  sourceType: TestimonialSourceType;
  reviewId?: string;
  placement: TestimonialPlacement;
  order: number;
  status: TestimonialStatus;
  daysAgo: number;
  direct?: boolean;
}

const TESTIMONIALS: TSpec[] = [
  { id: 'tst_01', person: 'Ira Nair', role: 'Masterclass Participant', body: 'Meera is an incredible teacher — the Bharatanatyam foundations masterclass left me with a real practice plan.', sourceType: 'product_review', reviewId: 'rev_m01', placement: 'mobile_app', order: 1, status: 'published', daysAgo: 26 },
  { id: 'tst_02', person: 'Nisha Reddy', role: 'Verified Buyer', body: 'The handcrafted folk art journal is even lovelier in person — beautiful cover, lovely paper, arrived on time.', sourceType: 'product_review', reviewId: 'rev_p01', placement: 'shop', order: 2, status: 'published', daysAgo: 19 },
  { id: 'tst_03', person: 'Ananya Rao', role: 'Artist', body: 'The Royal Courtyard workshop was beautifully curated — music, stories and craft in one magical evening.', sourceType: 'event_review', reviewId: 'rev_m05', placement: 'events', order: 3, status: 'published', daysAgo: 5 },
  { id: 'tst_04', person: 'Vikram Sport Lab', role: 'Sports Coach', body: 'Abhishek is a dedicated collaborator — professional, punctual and genuinely great with young athletes.', sourceType: 'creator_review', reviewId: 'rev_c01', placement: 'creator_discovery', order: 4, status: 'published', daysAgo: 8 },
  { id: 'tst_05', person: 'Karan Shah', role: 'App Member', body: 'The free Yoga Mobility Guide is a fantastic resource — genuinely helpful routines I use every week.', sourceType: 'product_review', reviewId: 'rev_d02', placement: 'mobile_app', order: 5, status: 'published', daysAgo: 10 },
  { id: 'tst_06', person: 'Sophia Nguyen', role: 'Artist', body: 'IICA gave my work a stage and a community. The platform truly celebrates creators from every discipline.', sourceType: 'direct', placement: 'website', order: 6, status: 'published', daysAgo: 14, direct: true },
  { id: 'tst_07', person: 'Nikhil Kapoor', role: 'VIP Host', body: 'Hosting through IICA connected me with audiences who value craft and culture. A wonderful creative home.', sourceType: 'direct', placement: 'creator_discovery', order: 7, status: 'draft', daysAgo: 12, direct: true },
  { id: 'tst_08', person: 'Royal Courtyard', role: 'VIP Venue', body: 'Our heritage venue found the right creators and events through IICA. Every collaboration has been memorable.', sourceType: 'direct', placement: 'events', order: 8, status: 'draft', daysAgo: 9, direct: true },
  { id: 'tst_09', person: 'Arjun Bhatia', role: 'Event Attendee', body: 'The sprint clinic was intense and incredibly well organised — drills I am still using weeks later.', sourceType: 'event_review', reviewId: 'rev_e01', placement: 'events', order: 9, status: 'hidden', daysAgo: 8 },
  { id: 'tst_10', person: 'Meera Kulkarni', role: 'Yoga Coach', body: 'Teaching on IICA lets me reach students who really want to learn. The tools make sharing my practice easy.', sourceType: 'direct', placement: 'mobile_app', order: 10, status: 'draft', daysAgo: 6, direct: true },
];

export function buildTestimonials(now: number): TestimonialRecord[] {
  return TESTIMONIALS.map((t) => ({
    id: t.id,
    personName: t.person,
    role: t.role,
    profileImage: `tstimg_${t.id}`,
    body: t.body,
    sourceType: t.sourceType,
    connectedReviewId: t.reviewId ?? null,
    placement: t.placement,
    displayOrder: t.order,
    status: t.status,
    hiddenReason: t.status === 'hidden' ? 'Irrelevant Content' : null,
    addedByAdmin: !!t.direct,
    createdAt: new Date(now - t.daysAgo * DAY).toISOString(),
    lastUpdatedAt: new Date(now - Math.max(0, t.daysAgo - 1) * DAY).toISOString(),
  }));
}
