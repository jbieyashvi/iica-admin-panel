import type { CollaborationRecord, MatchSource } from '../types/collaborations';

// Admin-facing collaboration statuses are collapsed to the five the Mobile flow
// exposes. Internal request/progress vocabulary maps onto these.
export type CollabStatusKey = 'sent' | 'accepted' | 'declined' | 'completed' | 'cancelled';

type Tone = 'amber' | 'blue' | 'red' | 'green' | 'neutral';

export const COLLAB_STATUS_KEYS: { key: CollabStatusKey; label: string }[] = [
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function collabStatus(c: CollaborationRecord): { key: CollabStatusKey; label: string; tone: Tone } {
  const r = c.requestStatus;
  const p = c.progress;
  if (p === 'completed') return { key: 'completed', label: 'Completed', tone: 'green' };
  if (p === 'cancelled' || r === 'withdrawn' || r === 'expired' || r === 'blocked') return { key: 'cancelled', label: 'Cancelled', tone: 'neutral' };
  if (r === 'declined') return { key: 'declined', label: 'Declined', tone: 'red' };
  if (r === 'accepted' || ['discussion_scheduled', 'in_discussion', 'confirmed'].includes(p)) return { key: 'accepted', label: 'Accepted', tone: 'blue' };
  return { key: 'sent', label: 'Sent', tone: 'amber' };
}

export const MATCH_SOURCE_LABEL: Record<MatchSource, string> = {
  natural_language: 'Natural Language Match',
  direct_profile: 'Direct Profile Request',
};
