import { Badge } from './Badge';
import {
  MEETING_STATUS_LABEL,
  MEETING_STATUS_TONE,
  PROGRESS_LABEL,
  PROGRESS_TONE,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  scoreTone,
} from '../../config/collaborationLabels';
import type {
  CollabProgress,
  MeetingStatus,
  RequestStatus,
} from '../../types/collaborations';

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={REQUEST_STATUS_TONE[status]}>{REQUEST_STATUS_LABEL[status]}</Badge>;
}

export function ProgressBadge({ status }: { status: CollabProgress }) {
  return <Badge tone={PROGRESS_TONE[status]}>{PROGRESS_LABEL[status]}</Badge>;
}

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return <Badge tone={MEETING_STATUS_TONE[status]}>{MEETING_STATUS_LABEL[status]}</Badge>;
}

export function MatchScore({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const tone = scoreTone(score);
  const colors: Record<string, string> = {
    green: 'text-emerald-700',
    blue: 'text-sky-700',
    amber: 'text-amber-700',
    neutral: 'text-charcoal-muted',
  };
  return (
    <span className={`font-serif font-medium ${size === 'md' ? 'text-lg' : 'text-sm'} ${colors[tone]}`}>
      {score}
      <span className="text-xs text-charcoal-muted">/100</span>
    </span>
  );
}
