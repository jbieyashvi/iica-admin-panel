import { Badge } from './Badge';
import {
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_STATUS_TONE,
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TONE,
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_TONE,
} from '../../config/userLabels';
import type { AccountType, MembershipStatus, PurchaseStatus } from '../../types/users';

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return <Badge tone={MEMBERSHIP_STATUS_TONE[status]}>{MEMBERSHIP_STATUS_LABEL[status]}</Badge>;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge tone={PURCHASE_STATUS_TONE[status]}>{PURCHASE_STATUS_LABEL[status]}</Badge>;
}

export function AccountTypeBadge({ type }: { type: AccountType }) {
  return <Badge tone={ACCOUNT_TYPE_TONE[type]}>{ACCOUNT_TYPE_LABEL[type]}</Badge>;
}
