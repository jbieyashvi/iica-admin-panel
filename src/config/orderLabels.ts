import type {
  BuyerType,
  FulfilmentStatus,
  IssueStatus,
  IssueType,
  OrderPaymentStatus,
  OrderStatus,
} from '../types/orders';
import type { ProductType } from '../types/products';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const BUYER_TYPE_LABEL: Record<BuyerType, string> = {
  guest: 'Guest',
  registered: 'Registered User',
  creator: 'Creator',
};

export const PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> = {
  initiated: 'Initiated',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  partially_refunded: 'Partially Refunded',
  refunded: 'Refunded',
};
export const PAYMENT_STATUS_TONE: Record<OrderPaymentStatus, Tone> = {
  initiated: 'blue',
  pending: 'amber',
  paid: 'green',
  failed: 'red',
  cancelled: 'neutral',
  partially_refunded: 'amber',
  refunded: 'neutral',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New',
  accepted: 'Accepted',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const FULFILMENT_LABEL: Record<FulfilmentStatus, string> = {
  awaiting_acceptance: 'Awaiting Seller Acceptance',
  preparing: 'Preparing for Dispatch',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
  return_requested: 'Return Requested',
  return_approved: 'Return Approved',
  returned: 'Returned',
  accepted: 'Accepted',
  awaiting_delivery: 'Awaiting Seller Delivery',
  delivery_sent: 'Delivery Sent by Seller',
  buyer_confirmed: 'Buyer Confirmed Access',
  delivery_disputed: 'Delivery Disputed',
  completed: 'Completed',
};
export const FULFILMENT_TONE: Record<FulfilmentStatus, Tone> = {
  awaiting_acceptance: 'amber',
  preparing: 'blue',
  dispatched: 'blue',
  in_transit: 'blue',
  delivered: 'green',
  delivery_failed: 'red',
  return_requested: 'amber',
  return_approved: 'amber',
  returned: 'neutral',
  accepted: 'blue',
  awaiting_delivery: 'amber',
  delivery_sent: 'blue',
  buyer_confirmed: 'green',
  delivery_disputed: 'red',
  completed: 'green',
};

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  refund: 'Refund',
  return: 'Physical Return',
  missing_digital: 'Missing Digital Delivery',
  link_not_received: 'Masterclass Link Not Received',
  damaged: 'Damaged Product',
  wrong_product: 'Wrong Product',
  duplicate_payment: 'Duplicate Payment',
  other: 'Other',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  waiting_buyer: 'Waiting for Buyer',
  waiting_seller: 'Waiting for Seller',
  approved: 'Approved',
  rejected: 'Rejected',
  sent_to_finance: 'Sent to Finance',
  refund_processing: 'Refund Processing',
  refunded: 'Refunded',
  closed: 'Closed',
};
export const ISSUE_STATUS_TONE: Record<IssueStatus, Tone> = {
  new: 'red',
  under_review: 'amber',
  waiting_buyer: 'amber',
  waiting_seller: 'amber',
  approved: 'green',
  rejected: 'red',
  sent_to_finance: 'blue',
  refund_processing: 'blue',
  refunded: 'neutral',
  closed: 'neutral',
};

// Ordered lists for filters / selects.
export const PAYMENT_STATUSES: OrderPaymentStatus[] = ['initiated', 'pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'];
export const BUYER_TYPES: BuyerType[] = ['guest', 'registered', 'creator'];
export const ISSUE_TYPES: IssueType[] = ['refund', 'return', 'missing_digital', 'link_not_received', 'damaged', 'wrong_product', 'duplicate_payment', 'other'];

// Fulfilment statuses grouped by product family (for filters + transitions).
export const PHYSICAL_FULFILMENT: FulfilmentStatus[] = ['awaiting_acceptance', 'preparing', 'dispatched', 'in_transit', 'delivered', 'delivery_failed', 'return_requested', 'return_approved', 'returned'];
export const DIGITAL_FULFILMENT: FulfilmentStatus[] = ['awaiting_acceptance', 'accepted', 'awaiting_delivery', 'delivery_sent', 'buyer_confirmed', 'delivery_disputed', 'completed'];
export const ALL_FULFILMENT: FulfilmentStatus[] = [...new Set([...PHYSICAL_FULFILMENT, ...DIGITAL_FULFILMENT])];

// Linear happy-path sequences (for "next step" + skip detection).
export const PHYSICAL_FLOW: FulfilmentStatus[] = ['awaiting_acceptance', 'preparing', 'dispatched', 'in_transit', 'delivered'];
export const DIGITAL_FLOW: FulfilmentStatus[] = ['awaiting_acceptance', 'accepted', 'awaiting_delivery', 'delivery_sent', 'buyer_confirmed', 'completed'];

export function flowFor(type: ProductType): FulfilmentStatus[] {
  return type === 'physical' ? PHYSICAL_FLOW : DIGITAL_FLOW;
}
