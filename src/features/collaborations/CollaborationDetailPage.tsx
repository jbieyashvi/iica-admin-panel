import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FolderOpen, Sparkles } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { RequestStatusBadge, MeetingStatusBadge, MatchScore } from '../../components/ui/CollaborationBadges';
import { useData } from '../../data/store';
import { formatDate, formatDateTime } from '../../lib/format';
import { collabStatus, MATCH_SOURCE_LABEL } from '../../config/collabStatus';
import {
  INTENT_LABEL,
  FORMAT_LABEL,
  MEETING_MODE_LABEL,
  MEETING_PLATFORM_LABEL,
} from '../../config/collaborationLabels';
import type { CollaborationRecord, CreatorSnapshot } from '../../types/collaborations';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'match', label: 'Match Breakdown' },
  { key: 'request', label: 'Request' },
  { key: 'meeting', label: 'Meeting' },
];

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-charcoal">{title}</h3>{action}</div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-200 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

function actionOwner(c: CollaborationRecord): { owner: string; next: string } {
  if (c.requestStatus === 'blocked') return { owner: 'Admin', next: 'Collaboration blocked' };
  switch (c.requestStatus) {
    case 'suggested': return { owner: 'Creators', next: 'A creator sends a collaboration request' };
    case 'request_sent':
    case 'pending_response': return { owner: c.invited.name, next: 'Invited creator accepts or declines' };
    case 'declined': return { owner: '—', next: 'None — request declined' };
    case 'withdrawn': return { owner: '—', next: 'None — request withdrawn' };
    case 'expired': return { owner: '—', next: 'None — request expired' };
    case 'accepted': {
      if (c.progress === 'completed') return { owner: '—', next: 'Collaboration complete' };
      const m = c.meeting;
      if (!m || m.status === 'not_scheduled') return { owner: 'Creators', next: 'Creators propose a meeting' };
      if (m.status === 'proposed') return { owner: c.invited.name, next: 'Invited creator confirms the time' };
      if (m.status === 'reschedule_requested') return { owner: 'Creators', next: 'Creators agree a new time' };
      if (m.status === 'scheduled') return { owner: 'Creators', next: 'Attend the scheduled meeting' };
      return { owner: 'Creators', next: 'Continue the collaboration' };
    }
    default: return { owner: '—', next: 'None' };
  }
}

export function CollaborationDetailPage() {
  const { collaborationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { collaborations } = useData();

  const collab = collaborations.find((c) => c.id === collaborationId);
  const queryTab = params.get('tab');
  const validTab = (t: string | null) => !!t && TABS.some((x) => x.key === t);
  const [tab, setTab] = useState(validTab(queryTab) ? (queryTab as string) : 'overview');

  // Honour ?tab when the record changes; strip an unknown/removed tab from the URL.
  const lastId = useRef(collaborationId);
  useEffect(() => {
    if (lastId.current !== collaborationId) {
      lastId.current = collaborationId;
      setTab(validTab(queryTab) ? (queryTab as string) : 'overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborationId, queryTab]);

  useEffect(() => {
    if (queryTab && !validTab(queryTab)) {
      const next = new URLSearchParams(params);
      next.delete('tab');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTab]);

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/collaborations';

  if (!collab) {
    return (
      <div>
        <Link to="/admin/collaborations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Collaborations</Link>
        <div className="card"><EmptyState title="Collaboration not found" description="This collaboration may have been removed." /></div>
      </div>
    );
  }

  const owner = actionOwner(collab);

  const CreatorCard = ({ who }: { who: CreatorSnapshot }) => {
    const active = who.membershipStatus === 'active';
    return (
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={who.name} size="lg" />
          <div>
            <p className="font-medium text-charcoal">{who.name}</p>
            <p className="text-xs text-charcoal-muted">{who.iicaId ?? '—'}</p>
          </div>
        </div>
        {!active && (
          <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Membership status is <span className="font-medium">{who.membershipStatus}</span>. Active creator membership is required for collaboration access.
          </div>
        )}
        <Row label="Membership category">{who.membershipCategory ?? '—'}</Row>
        <Row label="Membership status">{who.membershipStatus}</Row>
        <Row label="Primary creative category">{who.primaryCategory}</Row>
        <Row label="City & country">{who.city}, {who.country}</Row>
        <Row label="Social platforms">{who.socials.join(', ') || '—'}</Row>
        <Row label="Audience size">{who.audienceRange}</Row>
        <div className="border-b border-cream-200 py-2.5">
          <p className="text-sm text-charcoal-muted">Collaboration Statement</p>
          <p className="mt-1 text-sm text-charcoal">{who.collaborationStatement}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/users/${who.userId}`)}>Open Creator Profile</Button>
          <Button size="sm" variant="secondary" icon={<FolderOpen className="h-4 w-4" />} disabled={!who.portfolioId} onClick={() => who.portfolioId && navigate(`/admin/portfolios/${who.portfolioId}`)}>Open Portfolio</Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Collaborations</button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-charcoal">{collab.proposalTitle}</h1>
              <Badge tone={collabStatus(collab).tone}>{collabStatus(collab).label}</Badge>
              <Badge tone={collab.matchSource === 'natural_language' ? 'magenta' : 'blue'}>{MATCH_SOURCE_LABEL[collab.matchSource]}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{collab.id}</span>
              <span>{collab.initiator.name} × {collab.invited.name}</span>
              <span>{formatDate(collab.createdAt)}</span>
              <span className="inline-flex items-center gap-1">Match <MatchScore score={collab.matchScore} size="sm" /></span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CreatorCard who={collab.initiator} />
            <CreatorCard who={collab.invited} />
          </div>
          <Card title="Collaboration Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
              <div>
                <Row label="Collaboration ID">{collab.id}</Row>
                <Row label="Sender">{collab.initiator.name}</Row>
                <Row label="Selected creator">{collab.invited.name}</Row>
                <Row label="Genre / skill">{collab.invited.primaryCategory}</Row>
                <Row label="Collaboration intent">{INTENT_LABEL[collab.intent]}</Row>
                <Row label="Match source">{MATCH_SOURCE_LABEL[collab.matchSource]}</Row>
              </div>
              <div>
                <Row label="Preferred format">{FORMAT_LABEL[collab.preferredFormat]}</Row>
                <Row label="Preferred location">{collab.preferredLocation}</Row>
                <Row label="Created date">{formatDate(collab.createdAt)}</Row>
                <Row label="Current action owner">{owner.owner}</Row>
                <Row label="Next expected action">{owner.next}</Row>
              </div>
            </div>
            {collab.naturalLanguageRequirement && (
              <div className="mt-3 border-t border-cream-200 pt-3">
                <p className="text-sm text-charcoal-muted">Original natural-language requirement</p>
                <p className="mt-1 rounded-lg bg-cream-100/60 px-3 py-2 text-sm italic text-charcoal">“{collab.naturalLanguageRequirement}”</p>
                {collab.extractedRequirement && (
                  <>
                    <p className="mt-3 text-sm text-charcoal-muted">Extracted requirement summary</p>
                    <p className="mt-1 text-sm text-charcoal">{collab.extractedRequirement}</p>
                  </>
                )}
              </div>
            )}
            <div className="mt-3 border-t border-cream-200 pt-3">
              <p className="text-sm text-charcoal-muted">Short proposal</p>
              <p className="mt-1 text-sm text-charcoal">{collab.proposalMessage}</p>
              <p className="mt-3 text-sm text-charcoal-muted">Expected outcome</p>
              <p className="mt-1 text-sm text-charcoal">{collab.expectedOutcome}</p>
            </div>
          </Card>
        </div>
      )}

      {/* MATCH BREAKDOWN */}
      {tab === 'match' && (
        <div className="space-y-6">
          <Card title="Overall Match">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-magenta-50 text-magenta-600"><Sparkles className="h-5 w-5" /></span>
                <MatchScore score={collab.matchScore} />
              </div>
              <Badge tone="blue">Prototype AI Match — based on profile and portfolio information</Badge>
            </div>
            <p className="mt-3 text-xs text-charcoal-muted">Scores are generated by a prototype model from profile and portfolio data. They are not produced by a live AI service and cannot be edited manually.</p>
          </Card>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {collab.dimensions.map((d) => (
              <Card key={d.key} title={d.label} action={<span className="text-xs text-charcoal-muted">Weight {d.weight}%</span>}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-serif text-xl font-medium text-charcoal">{d.score}<span className="text-xs text-charcoal-muted">/100</span></span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
                    <div className="h-full rounded-full bg-magenta-400" style={{ width: `${d.score}%` }} />
                  </div>
                </div>
                <p className="text-sm text-charcoal">{d.explanation}</p>
                <ul className="mt-2 space-y-1">
                  {d.signals.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-charcoal-muted"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-magenta-400" />{s}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* REQUEST */}
      {tab === 'request' && (
        <Card title="Collaboration Request">
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
            <div>
              <Row label="Request sender">{collab.initiator.name}</Row>
              <Row label="Invited creator">{collab.invited.name}</Row>
              <Row label="Request date">{collab.requestStatus === 'suggested' ? 'Not sent (suggested match)' : formatDate(collab.requestDate)}</Row>
              <Row label="Collaboration title">{collab.proposalTitle}</Row>
              <Row label="Collaboration intent">{INTENT_LABEL[collab.intent]}</Row>
              <Row label="Preferred format">{FORMAT_LABEL[collab.preferredFormat]}</Row>
            </div>
            <div>
              <Row label="Preferred meeting dates">{collab.preferredMeetingDates.map((d) => formatDate(d)).join(' · ')}</Row>
              <Row label="Response status">{<RequestStatusBadge status={collab.requestStatus} />}</Row>
              <Row label="Response date">{formatDate(collab.responseDate)}</Row>
              {collab.declineReason && <Row label="Decline reason">{collab.declineReason}</Row>}
              {collab.withdrawalReason && <Row label="Withdrawal reason">{collab.withdrawalReason}</Row>}
              <Row label="Expiry date">{formatDate(collab.expiryDate)}</Row>
            </div>
          </div>
          <div className="mt-3 border-t border-cream-200 pt-3">
            <p className="text-sm text-charcoal-muted">Proposal message</p>
            <p className="mt-1 text-sm text-charcoal">{collab.proposalMessage}</p>
          </div>
          <p className="mt-3 text-xs text-charcoal-muted">Admin cannot accept, decline or edit a creator's request, or create one on their behalf.</p>
        </Card>
      )}

      {/* MEETING */}
      {tab === 'meeting' && (
        <div className="space-y-6">
          {!collab.meeting ? (
            <div className="card"><EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No meeting scheduled" description="Creators have not proposed a meeting for this collaboration yet." /></div>
          ) : (
            <>
              <Card title="Meeting Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                  <div>
                    <Row label="Meeting ID">{collab.meeting.id}</Row>
                    <Row label="Meeting title">{collab.meeting.title}</Row>
                    <Row label="Participants">{collab.initiator.name} & {collab.invited.name}</Row>
                    <Row label="Proposed by">{collab.meeting.proposedBy}</Row>
                    <Row label="Meeting mode">{MEETING_MODE_LABEL[collab.meeting.mode]}</Row>
                    <Row label="Meeting status">{<MeetingStatusBadge status={collab.meeting.status} />}</Row>
                    <Row label="Meeting platform">{collab.meeting.platform ? MEETING_PLATFORM_LABEL[collab.meeting.platform] : '—'}</Row>
                  </div>
                  <div>
                    <Row label="Proposed date & time">{formatDateTime(collab.meeting.proposedAt)}</Row>
                    <Row label="Confirmed date & time">{formatDateTime(collab.meeting.confirmedAt)}</Row>
                    <Row label="Timezone">{collab.meeting.timezone}</Row>
                    <Row label="Duration">{collab.meeting.durationMins} mins</Row>
                    <Row label="Meeting-link status">{<Badge tone={collab.meeting.linkStatus === 'added' ? 'green' : 'amber'}>{collab.meeting.linkStatus === 'added' ? 'Link Added' : 'Link Pending'}</Badge>}</Row>
                    {collab.meeting.mode === 'in_person' && <Row label="Location">{collab.meeting.location ?? '—'}</Row>}
                    {collab.meeting.cancellationReason && <Row label="Cancellation reason">{collab.meeting.cancellationReason}</Row>}
                  </div>
                </div>
                <div className="mt-3 border-t border-cream-200 pt-3">
                  <Row label="Meeting notes">{collab.meeting.notes ?? '—'}</Row>
                  <Row label="Created">{formatDate(collab.meeting.createdAt)}</Row>
                  <Row label="Last updated">{formatDate(collab.meeting.lastUpdatedAt)}</Row>
                </div>
                <p className="mt-3 text-xs text-charcoal-muted">Private meeting links are never shown here or in table views — only "Link Added" / "Link Pending". No real calendar or meeting provider is integrated.</p>
              </Card>

              {collab.meeting.reschedules.length > 0 && (
                <Card title="Reschedule Requests">
                  <ul className="space-y-3">
                    {collab.meeting.reschedules.map((r) => (
                      <li key={r.id} className="rounded-lg border border-cream-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-charcoal">Requested by {r.by}</span>
                          <Badge tone={r.status === 'pending' ? 'amber' : 'neutral'}>{r.status === 'pending' ? 'Pending' : r.status === 'reviewed' ? 'Reviewed' : r.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-charcoal">{r.reason}</p>
                        <p className="mt-0.5 text-xs text-charcoal-muted">Proposed new time: {formatDateTime(r.proposedAt)} · Requested {formatDate(r.requestedAt)}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-charcoal-muted">Creators agree a new time between themselves — the meeting date is not changed here.</p>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
