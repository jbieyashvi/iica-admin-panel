import type { DataState } from '../types/users';
import type { Transaction, TxnStatus, PaymentMethod, BuyerKind } from '../types/transactions';
import type { SettlementStatus } from '../types/paymentProvider';
import { COMMISSION_RATE } from '../config/productLabels';
import { EVENT_COMMISSION_RATE } from '../config/transactionLabels';
import {
  BASE_CURRENCY, CURRENCIES, CURRENCY_COUNTRY, FX_RATE_TO_INR, FX_RATE_TIMESTAMP,
  PROCESSING_FEE_RATE, FX_FEE_RATE, fromBase,
} from '../config/currency';
import type { CurrencyCode } from '../config/currency';

const asCurrency = (c: string): CurrencyCode => (CURRENCIES as string[]).includes(c) ? (c as CurrencyCode) : 'INR';
// Deterministic presentment currency for product/event transactions (memberships
// use their real region currency). Prototype spread so international examples exist.
const POOL: CurrencyCode[] = ['INR', 'INR', 'INR', 'INR', 'USD', 'GBP', 'AED', 'EUR'];
// Stable overrides that guarantee specific prototype example rows.
const CUR_OVERRIDE: Record<string, CurrencyCode> = {
  ord_pr1: 'GBP', // partially-refunded international (product)
  ord_p3: 'USD',
  ord_r1: 'EUR',  // EUR with FX fee
  ord_p7: 'AED',  // failed international
};
const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
};
const completedRefund = (list: { amount: number; status: string }[]) =>
  list.filter((r) => r.status.toLowerCase() === 'completed').reduce((s, r) => s + r.amount, 0);

const CARD_METHODS: PaymentMethod[] = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Stripe', 'Skydo'];
const BANKS = ['HDFC', 'ICICI', 'Axis', 'SBI', 'Kotak'];

function methodForOrder(seed: string): PaymentMethod {
  return CARD_METHODS[hash(seed) % CARD_METHODS.length];
}
function maskFor(method: PaymentMethod, seed: string, name: string): string {
  const h = hash(seed);
  const last4 = String(1000 + (h % 9000));
  const handle = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2) || 'us';
  const bank = BANKS[h % BANKS.length];
  switch (method) {
    case 'UPI': return `${handle}••••@ok${bank.toLowerCase()}`;
    case 'Credit Card':
    case 'Debit Card': return `•••• ${last4}`;
    case 'Net Banking': return `${bank} ••••${last4}`;
    case 'Stripe': return `ch_••${last4}`;
    case 'Skydo': return `sky_••${last4}`;
    case 'Apple App Store': return 'Apple ID ••••';
    case 'Google Play': return 'Google Play ••••';
    default: return 'Prototype demo payment';
  }
}

// Membership purchase status → transaction status.
function membershipStatus(s: string): TxnStatus | null {
  switch (s) {
    case 'completed':
    case 'restored': return 'paid';
    case 'pending': return 'pending';
    case 'initiated': return 'initiated';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'refunded';
    default: return null; // not_started → no transaction
  }
}

// Raw = the core (pre-currency-enrichment) transaction fields.
type SettlementKeys =
  | 'customerCurrency' | 'customerCountry' | 'originalAmount' | 'baseCurrency' | 'baseAmount'
  | 'exchangeRate' | 'exchangeRateAt' | 'provider' | 'providerFee' | 'fxFee' | 'grossSettlement'
  | 'netSettlement' | 'settlementCurrency' | 'settlementStatus' | 'availableOn' | 'settlementDate' | 'isInternational';
interface Raw extends Omit<Transaction, 'id' | SettlementKeys> {}

// Compute the illustrative currency + settlement layer for a transaction.
function enrich(r: Raw): Pick<Transaction, SettlementKeys> {
  const cur: CurrencyCode = r.source === 'membership'
    ? asCurrency(r.currency)
    : (CUR_OVERRIDE[r.refSub] ?? POOL[hash(r.refSub) % POOL.length]);
  const rate = FX_RATE_TO_INR[cur];
  // Membership amounts are stored in the local currency; product/event amounts are INR.
  const factor = r.source === 'membership' ? rate : 1;
  const baseAmount = Math.round(r.gross * factor);
  const grossSettlement = Math.round(r.netCollected * factor);
  const originalAmount = r.source === 'membership' ? r.gross : fromBase(r.gross, cur);
  const intl = cur !== BASE_CURRENCY;
  const collectible = r.status === 'paid' || r.status === 'partially_refunded' || r.status === 'refunded';
  const providerFee = collectible ? Math.round(baseAmount * PROCESSING_FEE_RATE) : 0;
  const fxFee = collectible && intl ? Math.round(baseAmount * FX_FEE_RATE) : 0;
  const netSettlement = Math.max(0, grossSettlement - providerFee - fxFee);

  let settlementStatus: SettlementStatus;
  let availableOn: string | null = null;
  let settlementDate: string | null = null;
  const age = daysSince(r.date);
  if (r.status === 'failed') settlementStatus = 'failed';
  else if (r.status === 'cancelled' || r.status === 'initiated' || r.status === 'pending') settlementStatus = 'na';
  else if (r.status === 'refunded') { settlementStatus = 'settled'; settlementDate = r.refundCompletedAt ?? r.date; }
  else if (age > 21) { settlementStatus = 'settled'; settlementDate = new Date(new Date(r.date).getTime() + 3 * 86400000).toISOString(); }
  else if (age > 7) settlementStatus = 'available';
  else { settlementStatus = 'pending'; availableOn = new Date(new Date(r.date).getTime() + 7 * 86400000).toISOString(); }

  const provider = r.paymentMethod === 'Apple App Store' ? 'Apple App Store'
    : r.paymentMethod === 'Google Play' ? 'Google Play'
    : intl ? 'Stripe (Prototype)' : 'Razorpay (Prototype)';

  return {
    customerCurrency: cur,
    customerCountry: CURRENCY_COUNTRY[cur],
    originalAmount,
    baseCurrency: BASE_CURRENCY,
    baseAmount,
    exchangeRate: rate,
    exchangeRateAt: FX_RATE_TIMESTAMP,
    provider,
    providerFee,
    fxFee,
    grossSettlement,
    netSettlement,
    settlementCurrency: BASE_CURRENCY,
    settlementStatus,
    availableOn,
    settlementDate,
    isInternational: intl,
  };
}

export function buildTransactions(state: DataState): Transaction[] {
  const { users, memberships, productOrders, orders, events } = state;
  const userById = new Map(users.map((u) => [u.id, u]));
  const eventById = new Map(events.map((e) => [e.id, e]));

  const raws: Raw[] = [];

  // ---- Memberships ----
  memberships.forEach((m) => {
    const status = membershipStatus(m.payment.purchaseStatus);
    if (!status) return;
    const gross = m.payment.amount;
    if (gross <= 0) return; // no free membership transaction
    const u = userById.get(m.userId);
    const method: PaymentMethod = m.payment.platform === 'apple' ? 'Apple App Store' : m.payment.platform === 'google' ? 'Google Play' : 'Prototype Demo';
    const refunded = status === 'refunded' ? gross : 0;
    raws.push({
      source: 'membership',
      date: m.payment.purchaseDate ?? m.form.submittedAt,
      lastUpdatedAt: m.lastUpdatedAt,
      status,
      buyerName: u?.name ?? m.form.fullName,
      buyerType: 'creator',
      buyerUserId: m.userId,
      email: u?.email ?? m.form.email,
      phone: u?.phone ?? m.form.phone,
      currency: m.payment.currency,
      base: gross, discount: 0, tax: 0, shipping: 0, gross,
      refundedAmount: refunded, netCollected: gross - refunded,
      commissionRate: 0, commission: 0, earnings: 0, commissionLabel: 'Net platform revenue',
      paymentMethod: method,
      paymentMasked: maskFor(method, m.id, u?.name ?? m.form.fullName),
      paymentRef: m.payment.transactionRef ?? `PAY-${m.id.toUpperCase()}`,
      refTitle: String(m.category),
      refSub: m.iicaId ?? m.id,
      refundRef: refunded ? `REF-${m.id.toUpperCase()}` : null,
      refundCompletedAt: refunded ? m.payment.cancellationDate ?? m.lastUpdatedAt : null,
      membership: { userId: m.userId, iicaId: m.iicaId, category: String(m.category), plan: 'Annual Membership', platform: m.payment.platform, startDate: m.startDate, renewalDate: m.renewalDate ?? m.expiryDate },
    });
  });

  // ---- Product orders ----
  productOrders.forEach((o) => {
    if (o.total <= 0) return; // free product → no transaction
    if (o.paymentStatus === 'initiated' && !o.paymentRef) { /* still show */ }
    const rate = COMMISSION_RATE[o.productType];
    const commission = Math.round(o.total * rate);
    const refunded = o.paymentStatus === 'refunded' ? o.total : completedRefund(o.refundHistory);
    const method = methodForOrder(o.id);
    const buyerType: BuyerKind = o.buyerType;
    raws.push({
      source: 'product',
      date: o.orderedAt,
      lastUpdatedAt: o.lastUpdatedAt,
      status: o.paymentStatus,
      buyerName: o.buyerName,
      buyerType,
      buyerUserId: o.buyerUserId,
      email: o.buyerEmail,
      phone: o.buyerPhone,
      currency: o.currency,
      base: o.subtotal, discount: o.discount, tax: o.tax, shipping: o.shippingFee, gross: o.total,
      refundedAmount: refunded, netCollected: o.total - refunded,
      commissionRate: rate, commission, earnings: o.total - commission,
      commissionLabel: o.productType === 'masterclass' ? 'Proposed — pending final approval' : 'Provisional',
      paymentMethod: method,
      paymentMasked: maskFor(method, o.id, o.buyerName),
      paymentRef: o.paymentRef ?? `PAY-${o.id.toUpperCase()}`,
      refTitle: o.productTitle,
      refSub: o.id,
      refundRef: refunded ? (o.refundHistory[0]?.id ?? `REF-${o.id.toUpperCase()}`) : null,
      refundCompletedAt: refunded ? (o.refundHistory.find((r) => r.status.toLowerCase() === 'completed')?.at ?? o.lastUpdatedAt) : null,
      product: { orderId: o.id, productId: o.productId, productTitle: o.productTitle, productType: o.productType, quantity: o.quantity, sellerName: o.sellerName, sellerUserId: o.sellerUserId },
    });
  });

  // ---- Event ticket orders ----
  orders.forEach((o) => {
    if (o.total <= 0) return; // free booking → no transaction
    const ev = eventById.get(o.eventId);
    const rate = EVENT_COMMISSION_RATE;
    const commission = Math.round(o.total * rate);
    const refunded = o.paymentStatus === 'refunded' ? o.total : completedRefund(o.refundHistory);
    const method = methodForOrder(o.id);
    const buyerType: BuyerKind = o.guest ? 'guest' : (userById.get(o.userId ?? '')?.accountType === 'creator' ? 'creator' : 'registered');
    raws.push({
      source: 'event',
      date: o.bookingDate,
      lastUpdatedAt: o.bookingDate,
      status: o.paymentStatus,
      buyerName: o.buyerName,
      buyerType,
      buyerUserId: o.userId,
      email: o.buyerEmail,
      phone: o.buyerPhone,
      currency: 'INR',
      base: o.subtotal, discount: 0, tax: o.taxes, shipping: 0, gross: o.total,
      refundedAmount: refunded, netCollected: o.total - refunded,
      commissionRate: rate, commission, earnings: o.total - commission, commissionLabel: 'Provisional',
      paymentMethod: method,
      paymentMasked: maskFor(method, o.id, o.buyerName),
      paymentRef: `PAY-${o.id.slice(4, 14).toUpperCase()}`,
      refTitle: ev?.title ?? 'Event',
      refSub: o.id,
      refundRef: refunded ? (o.refundHistory[0]?.id ?? `REF-${o.id.toUpperCase()}`) : null,
      refundCompletedAt: refunded ? (o.refundHistory.find((r) => r.status.toLowerCase() === 'completed')?.at ?? o.bookingDate) : null,
      event: { bookingId: o.id, eventId: o.eventId, eventTitle: ev?.title ?? 'Event', tier: o.tierName, quantity: o.quantity, hostName: ev?.hostName ?? 'Host', hostUserId: ev?.hostUserId },
    });
  });

  // Stable deterministic order + IDs (so the detail route resolves after refresh).
  raws.sort((a, b) => {
    const t = +new Date(a.date) - +new Date(b.date);
    return t !== 0 ? t : (a.refSub < b.refSub ? -1 : 1);
  });
  return raws.map((r, i) => ({ ...r, id: `TXN-IICA-${1001 + i}`, ...enrich(r) }));
}

// Eligible net platform revenue in BASE currency (paid + partially-refunded
// retained, minus completed refunds). Matches the dashboard revenue rule.
export function transactionRevenue(t: Transaction): number {
  if (t.status === 'paid' || t.status === 'partially_refunded') return Math.max(0, t.grossSettlement);
  return 0;
}
