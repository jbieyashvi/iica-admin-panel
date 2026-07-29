import type { InternalNote, TimelineEvent } from './users';
import type { ProductType } from './products';

// ---------------------------------------------------------------------------
// Product Orders. Connected to Products, Sellers (creators) and Buyers by ID.
// Distinct from event-ticket orders (types/events.ts TicketOrder).
// ---------------------------------------------------------------------------

export type BuyerType = 'guest' | 'registered' | 'creator';

export type OrderPaymentStatus =
  | 'initiated'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded';

export type OrderStatus = 'new' | 'accepted' | 'rejected' | 'processing' | 'completed' | 'cancelled';

// Physical + digital/masterclass fulfilment states (union of both flows).
export type FulfilmentStatus =
  // shared
  | 'awaiting_acceptance'
  // physical
  | 'preparing'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'delivery_failed'
  | 'return_requested'
  | 'return_approved'
  | 'returned'
  // digital / masterclass
  | 'accepted'
  | 'awaiting_delivery'
  | 'delivery_sent'
  | 'buyer_confirmed'
  | 'delivery_disputed'
  | 'completed';

export interface ShipmentDetails {
  recipient: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  deliveryNotes: string;
  courier?: string | null;
  trackingId?: string | null;
  trackingUrl?: string | null;
  dispatchedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
}

export interface DigitalFulfilment {
  buyerEmail: string;
  expectedDeliveryAt?: string | null;
  deliverySentAt?: string | null;
  evidenceNote?: string | null;
  buyerAccessConfirmed: boolean;
  disputeStatus?: string | null;
}

export interface MasterclassFulfilment {
  sessionAt: string;
  timezone: string;
  durationMins: number;
  deliveryMode: string;
  linkSentAt?: string | null;
  buyerAccessConfirmed: boolean;
  attendance?: string | null;
}

export interface CommEntry {
  id: string;
  at: string;
  sender: string;
  recipient: string;
  channel: 'Email' | 'Phone';
  messageType: string;
  deliveryStatus: string;
  body?: string;
}

export type IssueType =
  | 'refund'
  | 'return'
  | 'missing_digital'
  | 'link_not_received'
  | 'damaged'
  | 'wrong_product'
  | 'duplicate_payment'
  | 'other';

export type IssueStatus =
  | 'new'
  | 'under_review'
  | 'waiting_buyer'
  | 'waiting_seller'
  | 'approved'
  | 'rejected'
  | 'sent_to_finance'
  | 'refund_processing'
  | 'refunded'
  | 'closed';

export interface IssueDecision {
  id: string;
  action: string;
  reason?: string;
  by: string;
  at: string;
  statusAfter: IssueStatus;
}

export interface IssueRecord {
  id: string;
  type: IssueType;
  buyerReason: string;
  sellerResponse?: string | null;
  status: IssueStatus;
  assignedAdmin?: string | null;
  evidence: string[];
  notes: InternalNote[];
  decisions: IssueDecision[];
  createdAt: string;
}

export interface RefundEntry {
  id: string;
  amount: number;
  at: string;
  by: string;
  status: string; // e.g. "Completed", "Processing"
}

export interface ProductOrder {
  id: string;
  productId: string;
  productTitle: string;
  productType: ProductType;
  sellerUserId: string;
  sellerName: string;
  sellerIicaId?: string;
  buyerType: BuyerType;
  buyerUserId?: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  billing?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  paymentRef?: string;
  paymentDate?: string | null;
  orderStatus: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  orderedAt: string;
  lastUpdatedAt: string;
  sellerAcceptedAt?: string | null;
  shipment?: ShipmentDetails;
  digital?: DigitalFulfilment;
  masterclass?: MasterclassFulfilment;
  refundHistory: RefundEntry[];
  timeline: TimelineEvent[];
  communications: CommEntry[];
  issues: IssueRecord[];
  notes: InternalNote[];
}
