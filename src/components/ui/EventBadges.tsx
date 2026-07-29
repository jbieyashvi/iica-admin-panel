import { Badge } from './Badge';
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_TONE,
} from '../../config/eventLabels';
import type {
  BookingStatus,
  EventStatus,
  PaymentStatus,
  ProposalStatus,
  ReportStatus,
} from '../../types/events';

export const EventStatusBadge = ({ status }: { status: EventStatus }) => <Badge tone={EVENT_STATUS_TONE[status]}>{EVENT_STATUS_LABEL[status]}</Badge>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
export const BookingBadge = ({ status }: { status: BookingStatus }) => <Badge tone={BOOKING_STATUS_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
export const ReportStatusBadge = ({ status }: { status: ReportStatus }) => <Badge tone={REPORT_STATUS_TONE[status]}>{REPORT_STATUS_LABEL[status]}</Badge>;
export const ProposalStatusBadge = ({ status }: { status: ProposalStatus }) => <Badge tone={PROPOSAL_STATUS_TONE[status]}>{PROPOSAL_STATUS_LABEL[status]}</Badge>;
