import type { UserRecord } from '../types/users';
import type { TimelineEvent } from '../types/users';
import type { ProductRecord } from '../types/products';
import type {
  CommEntry,
  FulfilmentStatus,
  IssueRecord,
  IssueStatus,
  IssueType,
  OrderPaymentStatus,
  OrderStatus,
  ProductOrder,
} from '../types/orders';

const DAY = 86400000;

interface GuestBuyer { name: string; email: string; phone: string; city: string }
interface Spec {
  id: string;
  productId: string;
  userId?: string; // registered / creator buyer
  guest?: GuestBuyer;
  qty: number;
  pay: OrderPaymentStatus;
  ful: FulfilmentStatus;
  ord: OrderStatus;
  daysAgo: number;
  issue?: { type: IssueType; status: IssueStatus; reason: string; sellerResponse?: string };
  refundCompleted?: boolean;
}

const G = (name: string, email: string, phone: string, city: string): GuestBuyer => ({ name, email, phone, city });

const SPECS: Spec[] = [
  // Physical
  { id: 'ord_p1', productId: 'prod_folkjournal', userId: 'usr_nisha', qty: 1, pay: 'paid', ful: 'delivered', ord: 'completed', daysAgo: 22 },
  { id: 'ord_p2', productId: 'prod_canvas', userId: 'usr_kabir', qty: 1, pay: 'paid', ful: 'in_transit', ord: 'processing', daysAgo: 5 },
  { id: 'ord_p3', productId: 'prod_photobook', guest: G('Rahul Menon', 'rahul.guest@example.com', '+91 90111 22233', 'Chennai'), qty: 2, pay: 'paid', ful: 'dispatched', ord: 'processing', daysAgo: 3 },
  { id: 'ord_p4', productId: 'prod_artprint', userId: 'usr_arjun', qty: 1, pay: 'pending', ful: 'awaiting_acceptance', ord: 'new', daysAgo: 1 },
  { id: 'ord_p5', productId: 'prod_folkjournal', userId: 'usr_meera', qty: 1, pay: 'paid', ful: 'return_requested', ord: 'processing', daysAgo: 14, issue: { type: 'return', status: 'under_review', reason: 'Item arrived with a torn cover.', sellerResponse: 'Reviewing the photos shared by the buyer.' } },
  { id: 'ord_p6', productId: 'prod_canvas', userId: 'usr_fatima', qty: 1, pay: 'paid', ful: 'preparing', ord: 'accepted', daysAgo: 4 },
  { id: 'ord_p7', productId: 'prod_photobook', guest: G('Sana Kapoor', 'sana.guest@example.com', '+91 90222 33344', 'Delhi'), qty: 1, pay: 'failed', ful: 'awaiting_acceptance', ord: 'new', daysAgo: 2 },
  { id: 'ord_p8', productId: 'prod_folkjournal', userId: 'usr_daniel', qty: 1, pay: 'refunded', ful: 'returned', ord: 'cancelled', daysAgo: 40, refundCompleted: true },
  // Digital
  { id: 'ord_d1', productId: 'prod_classicaltracks', guest: G('Meghna Rao', 'meghna.guest@example.com', '+91 90333 44455', 'Bengaluru'), qty: 1, pay: 'paid', ful: 'delivery_sent', ord: 'processing', daysAgo: 2 },
  { id: 'ord_d2', productId: 'prod_fitnessbook', userId: 'usr_nisha', qty: 1, pay: 'paid', ful: 'buyer_confirmed', ord: 'completed', daysAgo: 9 },
  { id: 'ord_d3', productId: 'prod_nutrition', userId: 'usr_aarav', qty: 1, pay: 'paid', ful: 'awaiting_delivery', ord: 'accepted', daysAgo: 3 },
  { id: 'ord_d4', productId: 'prod_classicaltracks', userId: 'usr_arjun', qty: 1, pay: 'paid', ful: 'delivery_disputed', ord: 'processing', daysAgo: 6, issue: { type: 'missing_digital', status: 'waiting_seller', reason: 'I paid but never received the download email.', sellerResponse: 'Checking whether the file was sent.' } },
  { id: 'ord_d5', productId: 'prod_yogaguide', guest: G('Karan Shah', 'karan.guest@example.com', '+91 90444 55566', 'Ahmedabad'), qty: 1, pay: 'paid', ful: 'buyer_confirmed', ord: 'completed', daysAgo: 12 },
  { id: 'ord_d6', productId: 'prod_fitnessbook', userId: 'usr_vikram', qty: 1, pay: 'pending', ful: 'awaiting_acceptance', ord: 'new', daysAgo: 1 },
  { id: 'ord_d7', productId: 'prod_nutrition', userId: 'usr_fatima', qty: 1, pay: 'paid', ful: 'delivery_sent', ord: 'processing', daysAgo: 4 },
  { id: 'ord_d8', productId: 'prod_meditation', userId: 'usr_daniel', qty: 1, pay: 'paid', ful: 'delivery_sent', ord: 'processing', daysAgo: 3 },
  // Masterclass
  { id: 'ord_m1', productId: 'prod_songwriting', userId: 'usr_nisha', qty: 1, pay: 'paid', ful: 'awaiting_delivery', ord: 'accepted', daysAgo: 3 },
  { id: 'ord_m2', productId: 'prod_bharatanatyam', guest: G('Ira Nair', 'ira.guest@example.com', '+91 90555 66677', 'Kochi'), qty: 1, pay: 'paid', ful: 'completed', ord: 'completed', daysAgo: 30 },
  { id: 'ord_m3', productId: 'prod_courtyard', userId: 'usr_ananya', qty: 1, pay: 'paid', ful: 'delivery_sent', ord: 'processing', daysAgo: 5 },
  { id: 'ord_m4', productId: 'prod_songwriting', userId: 'usr_fatima', qty: 1, pay: 'paid', ful: 'delivery_disputed', ord: 'processing', daysAgo: 7, issue: { type: 'link_not_received', status: 'waiting_seller', reason: 'The joining link never arrived before the session.', sellerResponse: 'Resending the link now.' } },
  { id: 'ord_m5', productId: 'prod_bharatanatyam', userId: 'usr_arjun', qty: 2, pay: 'paid', ful: 'buyer_confirmed', ord: 'completed', daysAgo: 10 },
  { id: 'ord_m6', productId: 'prod_courtyard', guest: G('Vivek Desai', 'vivek.guest@example.com', '+91 90666 77788', 'Pune'), qty: 1, pay: 'pending', ful: 'awaiting_acceptance', ord: 'new', daysAgo: 1 },
  // Extra coverage
  { id: 'ord_x1', productId: 'prod_canvas', userId: 'usr_nisha', qty: 1, pay: 'paid', ful: 'awaiting_acceptance', ord: 'new', daysAgo: 1 },
  { id: 'ord_r1', productId: 'prod_photobook', userId: 'usr_arjun', qty: 1, pay: 'paid', ful: 'delivered', ord: 'completed', daysAgo: 18, issue: { type: 'refund', status: 'sent_to_finance', reason: 'Received a duplicate copy; requesting a partial refund.', sellerResponse: 'Agreed — approving the refund.' } },
];

function buildTimeline(id: string, spec: Spec, base: number): TimelineEvent[] {
  const t: TimelineEvent[] = [{ id: `${id}_t0`, key: 'placed', label: 'Order placed', at: new Date(base).toISOString() }];
  if (['paid', 'failed', 'refunded', 'partially_refunded'].includes(spec.pay))
    t.push({ id: `${id}_t1`, key: 'payment', label: `Payment ${spec.pay}`, at: new Date(base + 0.2 * DAY).toISOString() });
  if (spec.ord !== 'new')
    t.push({ id: `${id}_t2`, key: 'accepted', label: 'Seller accepted the order', at: new Date(base + 1 * DAY).toISOString() });
  if (!['awaiting_acceptance', 'accepted', 'new'].includes(spec.ful))
    t.push({ id: `${id}_t3`, key: 'fulfilment', label: `Fulfilment: ${spec.ful.replace(/_/g, ' ')}`, at: new Date(base + 2 * DAY).toISOString() });
  if (['delivered', 'buyer_confirmed', 'completed', 'returned'].includes(spec.ful))
    t.push({ id: `${id}_t4`, key: 'confirmed', label: spec.ful === 'returned' ? 'Return completed' : 'Delivery / access confirmed', at: new Date(base + 4 * DAY).toISOString() });
  return t;
}

function buildIssue(id: string, spec: Spec, base: number): IssueRecord[] {
  if (!spec.issue) return [];
  const decisions =
    spec.issue.status === 'sent_to_finance'
      ? [
          { id: `${id}_dec1`, action: 'Approved request', reason: spec.issue.sellerResponse ?? 'Valid request', by: 'Aparna Menon', at: new Date(base + 5 * DAY).toISOString(), statusAfter: 'approved' as IssueStatus },
          { id: `${id}_dec2`, action: 'Sent to Finance', reason: 'Refund approved — queued for processing', by: 'Aparna Menon', at: new Date(base + 6 * DAY).toISOString(), statusAfter: 'sent_to_finance' as IssueStatus },
        ]
      : [];
  return [
    {
      id: `${id}_iss`,
      type: spec.issue.type,
      buyerReason: spec.issue.reason,
      sellerResponse: spec.issue.sellerResponse ?? null,
      status: spec.issue.status,
      assignedAdmin: 'Aparna Menon',
      evidence: ['evidence_1', 'evidence_2'],
      notes: [],
      decisions,
      createdAt: new Date(base + 3 * DAY).toISOString(),
    },
  ];
}

function buildComms(id: string, spec: Spec, base: number, buyerName: string): CommEntry[] {
  const out: CommEntry[] = [];
  if (spec.ord !== 'new') out.push({ id: `${id}_c0`, at: new Date(base + 1 * DAY).toISOString(), sender: 'IICA Platform', recipient: buyerName, channel: 'Email', messageType: 'Order confirmation', deliveryStatus: 'Delivered' });
  if (spec.issue) out.push({ id: `${id}_c1`, at: new Date(base + 3 * DAY).toISOString(), sender: 'Aparna Menon', recipient: buyerName, channel: 'Email', messageType: 'Issue follow-up', deliveryStatus: 'Sent' });
  return out;
}

export function buildProductOrders(products: ProductRecord[], users: UserRecord[], now: number): ProductOrder[] {
  return SPECS.map((spec) => {
    const product = products.find((p) => p.id === spec.productId);
    if (!product) return null;
    const buyerUser = spec.userId ? users.find((u) => u.id === spec.userId) : undefined;
    const buyerType = spec.guest ? 'guest' : buyerUser?.accountType === 'creator' ? 'creator' : 'registered';
    const buyerName = spec.guest?.name ?? buyerUser?.name ?? 'Buyer';
    const buyerEmail = spec.guest?.email ?? buyerUser?.email ?? 'buyer@example.com';
    const buyerPhone = spec.guest?.phone ?? buyerUser?.phone ?? '+91 90000 00000';
    const buyerCity = spec.guest?.city ?? buyerUser?.city ?? 'Mumbai';
    const base = now - spec.daysAgo * DAY;

    const free = product.price === 0;
    const unitPrice = product.price;
    const subtotal = unitPrice * spec.qty;
    const discount = 0;
    const tax = free ? 0 : Math.round((subtotal - discount) * 0.18);
    const shippingFee = product.type === 'physical' && !free ? 79 : 0;
    const total = free ? 0 : subtotal - discount + tax + shippingFee;
    const paid = ['paid', 'refunded', 'partially_refunded'].includes(spec.pay);

    const order: ProductOrder = {
      id: spec.id,
      productId: product.id,
      productTitle: product.title,
      productType: product.type,
      sellerUserId: product.sellerUserId,
      sellerName: product.sellerName,
      sellerIicaId: product.sellerIicaId,
      buyerType,
      buyerUserId: spec.guest ? null : spec.userId ?? null,
      buyerName,
      buyerEmail,
      buyerPhone,
      billing: `${buyerName}, ${buyerCity}, India`,
      quantity: spec.qty,
      unitPrice,
      subtotal,
      discount,
      tax,
      shippingFee,
      total,
      currency: 'INR',
      paymentStatus: spec.pay,
      paymentRef: spec.pay === 'initiated' ? undefined : `PAY-${spec.id.replace('ord_', '').toUpperCase()}-${(base % 100000).toString().padStart(5, '0')}`,
      paymentDate: paid || spec.pay === 'failed' ? new Date(base + 0.2 * DAY).toISOString() : null,
      orderStatus: spec.ord,
      fulfilmentStatus: spec.ful,
      orderedAt: new Date(base).toISOString(),
      lastUpdatedAt: new Date(base + 2 * DAY).toISOString(),
      sellerAcceptedAt: spec.ord !== 'new' ? new Date(base + 1 * DAY).toISOString() : null,
      refundHistory: spec.refundCompleted
        ? [{ id: `${spec.id}_ref`, amount: total, at: new Date(base + 8 * DAY).toISOString(), by: 'Finance Team', status: 'Completed' }]
        : [],
      timeline: buildTimeline(spec.id, spec, base),
      communications: buildComms(spec.id, spec, base, buyerName),
      issues: buildIssue(spec.id, spec, base),
      notes: [],
    };

    if (product.type === 'physical') {
      const dispatched = ['dispatched', 'in_transit', 'delivered', 'return_requested', 'return_approved', 'returned'].includes(spec.ful);
      order.shipment = {
        recipient: buyerName,
        phone: buyerPhone,
        address: `${12 + (spec.daysAgo % 40)}, Rose Villa, MG Road`,
        city: buyerCity,
        state: buyerCity === 'Delhi' ? 'Delhi' : buyerCity === 'Chennai' ? 'Tamil Nadu' : 'Maharashtra',
        pin: `${400001 + (spec.daysAgo * 7) % 90000}`,
        country: 'India',
        deliveryNotes: 'Leave with security if unavailable.',
        courier: dispatched ? 'BlueDart' : null,
        trackingId: dispatched ? `BD${(base % 1000000000).toString().padStart(9, '0')}` : null,
        trackingUrl: dispatched ? 'https://track.bluedart.example/track' : null,
        dispatchedAt: dispatched ? new Date(base + 2 * DAY).toISOString() : null,
        estimatedDeliveryAt: dispatched ? new Date(base + 6 * DAY).toISOString() : null,
        deliveredAt: spec.ful === 'delivered' || spec.ful === 'returned' ? new Date(base + 5 * DAY).toISOString() : null,
      };
    } else if (product.type === 'digital') {
      const sent = ['delivery_sent', 'buyer_confirmed', 'completed', 'delivery_disputed'].includes(spec.ful);
      order.digital = {
        buyerEmail,
        expectedDeliveryAt: new Date(base + 1 * DAY).toISOString(),
        deliverySentAt: sent ? new Date(base + 2 * DAY).toISOString() : null,
        evidenceNote: sent ? 'Seller reported sending the file by email.' : null,
        buyerAccessConfirmed: ['buyer_confirmed', 'completed'].includes(spec.ful),
        disputeStatus: spec.ful === 'delivery_disputed' ? 'Buyer reports non-delivery' : null,
      };
    } else {
      const mc = product.masterclass;
      const sent = ['delivery_sent', 'buyer_confirmed', 'completed', 'delivery_disputed'].includes(spec.ful);
      order.masterclass = {
        sessionAt: mc?.sessionAt ?? new Date(now + 14 * DAY).toISOString(),
        timezone: mc?.timezone ?? 'Asia/Kolkata',
        durationMins: mc?.durationMins ?? 90,
        deliveryMode: mc?.deliveryMode ?? 'Live on Zoom',
        linkSentAt: sent ? new Date(base + 2 * DAY).toISOString() : null,
        buyerAccessConfirmed: ['buyer_confirmed', 'completed'].includes(spec.ful),
        attendance: spec.ful === 'completed' ? 'Attended' : null,
      };
    }

    return order;
  }).filter((o): o is ProductOrder => o !== null);
}
