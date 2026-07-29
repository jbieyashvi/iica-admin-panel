import type {
  CommissionConfig,
  CommissionOverride,
  CreatorPayoutSettings,
  PayoutRecord,
  PayoutStatus,
  RevenueType,
} from '../types/payouts';
import { METHOD_LABEL } from '../config/payoutLabels';

const DAY = 86400000;

// Default commission settings. Rates match the values captured on historical
// transactions (see config/productLabels COMMISSION_RATE + EVENT_COMMISSION_RATE).
// Editing these applies only to NEW payouts — historical capturedRate is frozen.
export function buildCommissionSettings(): CommissionConfig[] {
  return [
    { type: 'masterclass', defaultRate: 0.2, holdingDays: 7, minPayout: 1000, status: 'active', label: 'Proposed — pending final approval' },
    { type: 'digital', defaultRate: 0.1, holdingDays: 7, minPayout: 1000, status: 'active', label: 'Provisional' },
    { type: 'physical', defaultRate: 0.15, holdingDays: 7, minPayout: 1000, status: 'active', label: 'Provisional' },
    { type: 'event', defaultRate: 0.1, holdingDays: 7, minPayout: 1000, status: 'active', label: 'Provisional' },
  ];
}

// One active override per category (rates within 0–100%). Controlled category data.
export function buildCommissionOverrides(): CommissionOverride[] {
  return [
    { id: 'ovr_phys_art', type: 'physical', category: 'Art & Paintings', overrideRate: 0.12, status: 'active' },
    { id: 'ovr_mc_dance', type: 'masterclass', category: 'Dance', overrideRate: 0.18, status: 'active' },
    { id: 'ovr_dig_music', type: 'digital', category: 'Music & Audio', overrideRate: 0.08, status: 'active' },
  ];
}

// Per-creator payout method. Only "active" methods can receive a payout; anything
// else forces connected payouts On Hold. Masked — no full account numbers stored.
export function buildPayoutSettings(): CreatorPayoutSettings[] {
  return [
    { userId: 'usr_meera', method: 'upi', holderName: 'Meera Kulkarni', institution: 'UPI', masked: 'me••••@okhdfc', status: 'active' },
    { userId: 'usr_heritage', method: 'bank', holderName: 'Heritage Weaves Co.', institution: 'ICICI Bank', masked: '••••4821', status: 'active' },
    { userId: 'usr_james', method: 'stripe', holderName: 'James Carter', institution: 'Stripe Connect', masked: 'acct_••3391', status: 'active' },
    { userId: 'usr_aarav', method: 'upi', holderName: 'Aarav Fitness Collective', institution: 'UPI', masked: 'aa••••@okaxis', status: 'active' },
    { userId: 'usr_nikhil', method: 'bank', holderName: 'Nikhil Kapoor', institution: 'HDFC Bank', masked: '••••7745', status: 'active' },
    { userId: 'usr_royal', method: 'bank', holderName: 'Royal Courtyard', institution: 'SBI', masked: '••••1180', status: 'active' },
    { userId: 'usr_vikram', method: 'upi', holderName: 'Vikram Sport Lab', institution: 'UPI', masked: 'vi••••@okicici', status: 'active' },
    { userId: 'usr_abhishek', method: 'bank', holderName: 'Abhishek Singh Chouhan', institution: 'Axis Bank', masked: '••••2480', status: 'active' },
    { userId: 'usr_aisha', method: 'upi', holderName: 'Aisha Merchant', institution: 'UPI', masked: 'ai••••@okhdfc', status: 'active' },
    { userId: 'usr_devang', method: 'bank', holderName: 'Devang Shah', institution: 'Kotak Bank', masked: '••••4102', status: 'active' },
    // Non-active methods — connected payouts stay On Hold.
    { userId: 'usr_sophia', method: 'bank', holderName: 'Sophia Nguyen', institution: 'Not linked', masked: '—', status: 'not_set' },
    { userId: 'usr_ananya', method: 'bank', holderName: 'Ananya Rao', institution: 'ICICI Bank', masked: '••••6612', status: 'needs_attention' },
    { userId: 'usr_kabir', method: 'upi', holderName: 'Kabir Menon', institution: 'UPI', masked: 'ka••••@okaxis', status: 'pending' },
  ];
}

interface Spec {
  id: string;
  creatorId: string;
  creatorName: string;
  iicaId?: string;
  source: RevenueType;
  productId?: string;
  eventId?: string;
  refTitle: string;
  orderId: string;
  gross: number;
  refunded?: number;
  rate: number;
  status: PayoutStatus;
  metDaysAgo: number;
  holdNote?: string;
  failureReason?: string;
}

// 24 connected payout records covering every source + status, incl. a Failed,
// a partially-refunded calculation, below-minimum, and missing/inactive payout setup.
const SPECS: Spec[] = [
  // ---- Physical (0.15, Art & Paintings override 0.12) ----
  { id: 'PO-IICA-2001', creatorId: 'usr_heritage', creatorName: 'Heritage Weaves Co.', iicaId: 'HW.219.IICA', source: 'physical', productId: 'prod_folkjournal', refTitle: 'Handcrafted Folk Art Journal', orderId: 'ord_p1', gross: 1140, rate: 0.15, status: 'on_hold', metDaysAgo: 20, holdNote: 'Below the ₹1,000 minimum payout threshold.' },
  { id: 'PO-IICA-2002', creatorId: 'usr_ananya', creatorName: 'Ananya Rao', iicaId: 'AR.612.IICA', source: 'physical', productId: 'prod_canvas', refTitle: 'Original Canvas Artwork', orderId: 'ord_pr1', gross: 14829, refunded: 2000, rate: 0.12, status: 'on_hold', metDaysAgo: 26, holdNote: 'Payout method needs attention — verification incomplete.' },
  { id: 'PO-IICA-2003', creatorId: 'usr_james', creatorName: 'James Carter', iicaId: 'JC.400.IICA', source: 'physical', productId: 'prod_photobook', refTitle: 'Signed Photography Book', orderId: 'ord_p3', gross: 5271, rate: 0.15, status: 'paid', metDaysAgo: 30 },
  { id: 'PO-IICA-2004', creatorId: 'usr_sophia', creatorName: 'Sophia Nguyen', iicaId: 'SN.271.IICA', source: 'physical', productId: 'prod_artprint', refTitle: 'Limited Edition Art Print', orderId: 'ord_ap7', gross: 4209, rate: 0.12, status: 'on_hold', metDaysAgo: 24, holdNote: 'Payout method not set up by the creator.' },
  { id: 'PO-IICA-2005', creatorId: 'usr_heritage', creatorName: 'Heritage Weaves Co.', iicaId: 'HW.219.IICA', source: 'physical', productId: 'prod_scarf', refTitle: 'Handwoven Heritage Scarf', orderId: 'ord_sc4', gross: 2202, rate: 0.15, status: 'eligible', metDaysAgo: 12 },
  { id: 'PO-IICA-2006', creatorId: 'usr_devang', creatorName: 'Devang Shah', iicaId: 'DS.410.IICA', source: 'physical', productId: 'prod_vinyl', refTitle: 'Vintage Vinyl Collectible', orderId: 'ord_vn9', gross: 5310, rate: 0.15, status: 'processing', metDaysAgo: 15 },

  // ---- Digital (0.10, Music & Audio override 0.08) ----
  { id: 'PO-IICA-2007', creatorId: 'usr_aarav', creatorName: 'Aarav Fitness Collective', iicaId: 'AF.077.IICA', source: 'digital', productId: 'prod_fitnessbook', refTitle: 'Fitness Strength Program (E-book)', orderId: 'ord_d2', gross: 4130, rate: 0.1, status: 'paid', metDaysAgo: 28 },
  { id: 'PO-IICA-2008', creatorId: 'usr_aisha', creatorName: 'Aisha Merchant', iicaId: 'AM.144.IICA', source: 'digital', productId: 'prod_classicaltracks', refTitle: 'Indian Classical Practice Tracks', orderId: 'ord_ct5', gross: 2356, rate: 0.08, status: 'eligible', metDaysAgo: 11 },
  { id: 'PO-IICA-2009', creatorId: 'usr_vikram', creatorName: 'Vikram Sport Lab', iicaId: 'VS.360.IICA', source: 'digital', productId: 'prod_nutrition', refTitle: 'Athlete Nutrition Guide', orderId: 'ord_nu3', gross: 3540, rate: 0.1, status: 'eligible', metDaysAgo: 9 },
  { id: 'PO-IICA-2010', creatorId: 'usr_kabir', creatorName: 'Kabir Menon', iicaId: 'KM.105.IICA', source: 'digital', productId: 'prod_modeltemplates', refTitle: 'Modeling Portfolio Templates', orderId: 'ord_mt2', gross: 1770, rate: 0.1, status: 'on_hold', metDaysAgo: 10, holdNote: 'Payout method pending verification.' },
  { id: 'PO-IICA-2011', creatorId: 'usr_aisha', creatorName: 'Aisha Merchant', iicaId: 'AM.144.IICA', source: 'digital', productId: 'prod_classicaltracks', refTitle: 'Indian Classical Practice Tracks', orderId: 'ord_ct8', gross: 998, rate: 0.08, status: 'on_hold', metDaysAgo: 14, holdNote: 'Below the ₹1,000 minimum payout threshold.' },
  { id: 'PO-IICA-2012', creatorId: 'usr_aarav', creatorName: 'Aarav Fitness Collective', iicaId: 'AF.077.IICA', source: 'digital', productId: 'prod_fitnessbook', refTitle: 'Fitness Strength Program (E-book)', orderId: 'ord_fb6', gross: 2497, rate: 0.1, status: 'processing', metDaysAgo: 13 },

  // ---- Masterclass (0.20, Dance override 0.18) ----
  { id: 'PO-IICA-2013', creatorId: 'usr_meera', creatorName: 'Meera Kulkarni', iicaId: 'MK.334.IICA', source: 'masterclass', productId: 'prod_bharatanatyam', refTitle: 'Bharatanatyam Foundations', orderId: 'ord_m2', gross: 2359, rate: 0.18, status: 'paid', metDaysAgo: 30 },
  { id: 'PO-IICA-2014', creatorId: 'usr_meera', creatorName: 'Meera Kulkarni', iicaId: 'MK.334.IICA', source: 'masterclass', productId: 'prod_bharatanatyam', refTitle: 'Bharatanatyam Foundations', orderId: 'ord_m5', gross: 4718, rate: 0.18, status: 'eligible', metDaysAgo: 10 },
  { id: 'PO-IICA-2015', creatorId: 'usr_nikhil', creatorName: 'Nikhil Kapoor', iicaId: 'NK.288.IICA', source: 'masterclass', productId: 'prod_songwriting', refTitle: 'The Art of Indian Songwriting', orderId: 'ord_sw3', gross: 1769, rate: 0.2, status: 'eligible', metDaysAgo: 8 },
  { id: 'PO-IICA-2016', creatorId: 'usr_royal', creatorName: 'Royal Courtyard', iicaId: 'RC.501.IICA', source: 'masterclass', productId: 'prod_courtyard', refTitle: 'Royal Courtyard Cultural Workshop', orderId: 'ord_cy1', gross: 2949, rate: 0.2, status: 'paid', metDaysAgo: 25 },
  { id: 'PO-IICA-2017', creatorId: 'usr_nikhil', creatorName: 'Nikhil Kapoor', iicaId: 'NK.288.IICA', source: 'masterclass', productId: 'prod_songwriting', refTitle: 'The Art of Indian Songwriting', orderId: 'ord_sw7', gross: 3538, rate: 0.2, status: 'processing', metDaysAgo: 12 },
  { id: 'PO-IICA-2018', creatorId: 'usr_royal', creatorName: 'Royal Courtyard', iicaId: 'RC.501.IICA', source: 'masterclass', productId: 'prod_courtyard', refTitle: 'Royal Courtyard Cultural Workshop', orderId: 'ord_cy4', gross: 2949, rate: 0.2, status: 'on_hold', metDaysAgo: 4, holdNote: 'In holding period — becomes eligible after the holding window.' },
  { id: 'PO-IICA-2019', creatorId: 'usr_devang', creatorName: 'Devang Shah', iicaId: 'DS.410.IICA', source: 'masterclass', productId: 'prod_branding', refTitle: 'Personal Branding Intensive', orderId: 'ord_br2', gross: 4719, rate: 0.2, status: 'failed', metDaysAgo: 22, failureReason: 'Bank account details could not be verified by the payout provider.' },

  // ---- Event tickets (0.10) ----
  { id: 'PO-IICA-2020', creatorId: 'usr_abhishek', creatorName: 'Abhishek Singh Chouhan', iicaId: 'AS.248.IICA', source: 'event', eventId: 'evt_sprint', refTitle: 'Sprint Training Bootcamp', orderId: 'ord_ev21', gross: 2360, rate: 0.1, status: 'paid', metDaysAgo: 26 },
  { id: 'PO-IICA-2021', creatorId: 'usr_abhishek', creatorName: 'Abhishek Singh Chouhan', iicaId: 'AS.248.IICA', source: 'event', eventId: 'evt_sprint', refTitle: 'Sprint Training Bootcamp', orderId: 'ord_ev22', gross: 4720, rate: 0.1, status: 'eligible', metDaysAgo: 9 },
  { id: 'PO-IICA-2022', creatorId: 'usr_abhishek', creatorName: 'Abhishek Singh Chouhan', iicaId: 'AS.248.IICA', source: 'event', eventId: 'evt_sprint', refTitle: 'Sprint Training Bootcamp', orderId: 'ord_ev23', gross: 1180, rate: 0.1, status: 'eligible', metDaysAgo: 8 },
  { id: 'PO-IICA-2023', creatorId: 'usr_abhishek', creatorName: 'Abhishek Singh Chouhan', iicaId: 'AS.248.IICA', source: 'event', eventId: 'evt_sprint', refTitle: 'Sprint Training Bootcamp', orderId: 'ord_ev24', gross: 826, rate: 0.1, status: 'on_hold', metDaysAgo: 15, holdNote: 'Below the ₹1,000 minimum payout threshold.' },
  { id: 'PO-IICA-2024', creatorId: 'usr_abhishek', creatorName: 'Abhishek Singh Chouhan', iicaId: 'AS.248.IICA', source: 'event', eventId: 'evt_sprint', refTitle: 'Sprint Training Bootcamp', orderId: 'ord_ev25', gross: 3540, rate: 0.1, status: 'processing', metDaysAgo: 11 },
];

export function buildPayouts(settings: CreatorPayoutSettings[], now: number): PayoutRecord[] {
  const settingsBy = new Map(settings.map((s) => [s.userId, s]));
  return SPECS.map((s) => {
    const holdingDays = 7;
    const refunded = s.refunded ?? 0;
    const netEligible = s.gross - refunded;
    const commission = Math.round(netEligible * s.rate);
    const payoutAmount = netEligible - commission;
    const metAt = now - s.metDaysAgo * DAY;
    const eligibilityAt = metAt + holdingDays * DAY;
    const method = settingsBy.get(s.creatorId);
    const methodLabel = method && method.status === 'active' ? METHOD_LABEL[method.method] : null;

    const rec: PayoutRecord = {
      id: s.id,
      creatorUserId: s.creatorId,
      creatorName: s.creatorName,
      iicaId: s.iicaId,
      source: s.source,
      productId: s.productId,
      eventId: s.eventId,
      refTitle: s.refTitle,
      orderId: s.orderId,
      transactionRef: `TXN-${s.orderId.replace(/^ord_/, '').toUpperCase()}`,
      currency: 'INR',
      capturedRate: s.rate,
      gross: s.gross,
      refundedAmount: refunded,
      netEligible,
      commission,
      payoutAmount,
      holdingDays,
      requirementMetAt: new Date(metAt).toISOString(),
      eligibilityDate: new Date(eligibilityAt).toISOString(),
      createdAt: new Date(metAt).toISOString(),
      status: s.status,
      processingAt: null,
      paidAt: null,
      payoutReference: null,
      payoutMethodUsed: null,
      failedAt: null,
      failureReason: null,
      holdNote: s.holdNote ?? null,
    };

    if (s.status === 'processing') {
      rec.processingAt = new Date(eligibilityAt + 1 * DAY).toISOString();
    } else if (s.status === 'paid') {
      rec.processingAt = new Date(eligibilityAt + 1 * DAY).toISOString();
      rec.paidAt = new Date(eligibilityAt + 2 * DAY).toISOString();
      rec.payoutReference = `PYT-${s.id.replace('PO-IICA-', '')}-${s.creatorId.replace('usr_', '').toUpperCase().slice(0, 4)}`;
      rec.payoutMethodUsed = methodLabel ?? 'Bank Transfer';
    } else if (s.status === 'failed') {
      rec.processingAt = new Date(eligibilityAt + 1 * DAY).toISOString();
      rec.failedAt = new Date(eligibilityAt + 2 * DAY).toISOString();
      rec.failureReason = s.failureReason ?? 'Payout attempt failed.';
      rec.payoutMethodUsed = methodLabel ?? 'Bank Transfer';
    }
    return rec;
  });
}
