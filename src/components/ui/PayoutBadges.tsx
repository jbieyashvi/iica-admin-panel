import { Badge } from './Badge';
import {
  METHOD_STATUS_LABEL,
  METHOD_STATUS_TONE,
  PAYOUT_STATUS_LABEL,
  PAYOUT_STATUS_TONE,
  REVENUE_TYPE_LABEL,
} from '../../config/payoutLabels';
import type { PayoutMethodStatus, PayoutStatus, RevenueType } from '../../types/payouts';

const REVENUE_TONE: Record<RevenueType, 'magenta' | 'blue' | 'green' | 'amber'> = {
  masterclass: 'magenta',
  digital: 'blue',
  physical: 'green',
  event: 'amber',
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge tone={PAYOUT_STATUS_TONE[status]}>{PAYOUT_STATUS_LABEL[status]}</Badge>;
}

export function RevenueTypeBadge({ type }: { type: RevenueType }) {
  return <Badge tone={REVENUE_TONE[type]}>{REVENUE_TYPE_LABEL[type]}</Badge>;
}

export function MethodStatusBadge({ status }: { status: PayoutMethodStatus }) {
  return <Badge tone={METHOD_STATUS_TONE[status]}>{METHOD_STATUS_LABEL[status]}</Badge>;
}

export function ConfigStatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return <Badge tone={status === 'active' ? 'green' : 'neutral'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>;
}
