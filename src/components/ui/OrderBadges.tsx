import { Badge } from './Badge';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  FULFILMENT_LABEL,
  FULFILMENT_TONE,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_TONE,
  ORDER_STATUS_LABEL,
} from '../../config/orderLabels';
import type { FulfilmentStatus, IssueStatus, OrderPaymentStatus, OrderStatus } from '../../types/orders';

export const PaymentStatusBadge = ({ status }: { status: OrderPaymentStatus }) => (
  <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>
);
export const FulfilmentBadge = ({ status }: { status: FulfilmentStatus }) => (
  <Badge tone={FULFILMENT_TONE[status]}>{FULFILMENT_LABEL[status]}</Badge>
);
export const IssueStatusBadge = ({ status }: { status: IssueStatus }) => (
  <Badge tone={ISSUE_STATUS_TONE[status]}>{ISSUE_STATUS_LABEL[status]}</Badge>
);
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone="neutral">{ORDER_STATUS_LABEL[status]}</Badge>
);
