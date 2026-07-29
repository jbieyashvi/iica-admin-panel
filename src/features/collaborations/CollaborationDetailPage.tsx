import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarClock, FolderOpen, ShieldAlert, SlidersHorizontal, Sparkles, Ban, RotateCcw } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Textarea } from '../../components/ui/Field';
import { RequestStatusBadge, ProgressBadge, MeetingStatusBadge, ReportStatusBadge, MatchScore } from '../../components/ui/CollaborationBadges';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import {
  ExtendExpiryModal,
  BlockCollaborationModal,
  RestoreConfirmModal,
  CancelMeetingModal,
  AdminNoticeModal,
  ReportDecisionModal,
} from './CollaborationModals';
import type { ReportDecisionSpec } from './CollaborationModals';
import {
  useData,
  sendCollabReminder,
  sendMeetingReminder,
  reviewReschedule,
  addCollabNote,
  addReportNote,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime } from '../../lib/format';
import {
  INTENT_LABEL,
  FORMAT_LABEL,
  MEETING_MODE_LABEL,
  MEETING_PLATFORM_LABEL,
  COMM_TYPE_LABEL,
  COMM_CHANNEL_LABEL,
  COMM_DELIVERY_LABEL,
  REPORT_REASON_LABEL,
} from '../../config/collaborationLabels';
import type { CollaborationRecord, CollabReport, CreatorSnapshot } from '../../types/collaborations';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'match', label: 'Match Breakdown' },
  { key: 'request', label: 'Request' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'communication', label: 'Communication' },
  { key: 'reports', label: 'Reports & Safety' },
  { key: 'history', label: 'Status History' },
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
  if (c.blocked) return { owner: 'Admin', next: 'Review or restore the collaboration' };
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
  const [params] = useSearchParams();
  const { collaborations } = useData();
  const { abilities, actor } = useActor();

  const collab = collaborations.find((c) => c.id === collaborationId);
  const queryTab = params.get('tab');
  const [tab, setTab] = useState(queryTab && TABS.some((t) => t.key === queryTab) ? queryTab : 'overview');
  // When the viewed record changes (e.g. detail→detail deep link), honour ?tab.
  const lastId = useRef(collaborationId);
  useEffect(() => {
    if (lastId.current !== collaborationId) {
      lastId.current = collaborationId;
      setTab(queryTab && TABS.some((t) => t.key === queryTab) ? queryTab : 'overview');
    }
  }, [collaborationId, queryTab]);
  const [note, setNote] = useState('');
  const [reportNote, setReportNote] = useState<Record<string, string>>({});

  const [extendOpen, setExtendOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [reportDecision, setReportDecision] = useState<{ report: CollabReport; spec: ReportDecisionSpec } | null>(null);

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
  const openReportCount = collab.reports.filter((r) => r.status !== 'dismissed').length;

  const remind = () => { sendCollabReminder(collab.id, actor); toast('Request reminder logged (prototype — no real message sent).'); };
  const remindMeeting = () => { sendMeetingReminder(collab.id, actor); toast('Meeting reminder logged (prototype — no real message sent).'); };
  const doReviewReschedule = (rid: string) => { reviewReschedule(collab.id, rid, actor); toast('Reschedule request reviewed. Creators asked to confirm a new time.'); };

  const submitNote = () => { if (!note.trim()) return; addCollabNote(collab.id, note.trim(), actor); toast('Note added.'); setNote(''); };
  const submitReportNote = (rid: string) => { const b = (reportNote[rid] ?? '').trim(); if (!b) return; addReportNote(collab.id, rid, b, actor); toast('Internal note added.'); setReportNote((s) => ({ ...s, [rid]: '' })); };

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
              <RequestStatusBadge status={collab.requestStatus} />
              <ProgressBadge status={collab.progress} />
              <MeetingStatusBadge status={collab.meeting?.status ?? 'not_scheduled'} />
              {collab.blocked && <Badge tone="red">Blocked</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{collab.id}</span>
              <span>{collab.initiator.name} × {collab.invited.name}</span>
              <span>{formatDate(collab.createdAt)}</span>
              <span className="inline-flex items-center gap-1">Match <MatchScore score={collab.matchScore} size="sm" /></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => navigate('/admin/collaboration-settings')}>Matching Settings</Button>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <Tabs tabs={TABS.map((t) => (t.key === 'reports' && openReportCount ? { ...t, count: openReportCount } : t))} active={tab} onChange={setTab} />
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
                <Row label="Initiated by">{collab.initiator.name}</Row>
                <Row label="Collaboration intent">{INTENT_LABEL[collab.intent]}</Row>
                <Row label="Proposed title">{collab.proposalTitle}</Row>
                <Row label="Preferred format">{FORMAT_LABEL[collab.preferredFormat]}</Row>
              </div>
              <div>
                <Row label="Preferred location">{collab.preferredLocation}</Row>
                <Row label="Created date">{formatDate(collab.createdAt)}</Row>
                <Row label="Current action owner">{owner.owner}</Row>
                <Row label="Next expected action">{owner.next}</Row>
              </div>
            </div>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Collaboration Request">
              <Row label="Request sender">{collab.initiator.name}</Row>
              <Row label="Invited creator">{collab.invited.name}</Row>
              <Row label="Request date">{collab.requestStatus === 'suggested' ? 'Not sent (suggested match)' : formatDate(collab.requestDate)}</Row>
              <Row label="Collaboration title">{collab.proposalTitle}</Row>
              <Row label="Collaboration intent">{INTENT_LABEL[collab.intent]}</Row>
              <Row label="Preferred format">{FORMAT_LABEL[collab.preferredFormat]}</Row>
              <Row label="Preferred meeting dates">{collab.preferredMeetingDates.map((d) => formatDate(d)).join(' · ')}</Row>
              <Row label="Response status">{<RequestStatusBadge status={collab.requestStatus} />}</Row>
              <Row label="Response date">{formatDate(collab.responseDate)}</Row>
              {collab.declineReason && <Row label="Decline reason">{collab.declineReason}</Row>}
              {collab.withdrawalReason && <Row label="Withdrawal reason">{collab.withdrawalReason}</Row>}
              <Row label="Expiry date">{formatDate(collab.expiryDate)}</Row>
              {collab.blocked && collab.blockReason && <Row label="Block reason">{collab.blockReason}</Row>}
              <div className="mt-3 border-t border-cream-200 pt-3">
                <p className="text-sm text-charcoal-muted">Proposal message</p>
                <p className="mt-1 text-sm text-charcoal">{collab.proposalMessage}</p>
              </div>
            </Card>
          </div>
          <Card title="Admin Actions">
            <p className="mb-3 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Admin cannot accept, decline or edit a creator's request, or create one on their behalf.</p>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" icon={<Bell className="h-4 w-4" />} disabled={!abilities.collabReminders || collab.blocked || collab.requestStatus === 'suggested'} title={abilities.collabReminders ? '' : RESTRICTED_HINT} onClick={remind}>Send Reminder</Button>
              <Button variant="secondary" icon={<CalendarClock className="h-4 w-4" />} disabled={!abilities.collabReminders || collab.blocked} title={abilities.collabReminders ? '' : RESTRICTED_HINT} onClick={() => setExtendOpen(true)}>Extend Expiry</Button>
              {collab.blocked ? (
                <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} disabled={!abilities.collabBlock} title={abilities.collabBlock ? '' : RESTRICTED_HINT} onClick={() => setRestoreOpen(true)}>Restore Collaboration</Button>
              ) : (
                <Button variant="danger" icon={<Ban className="h-4 w-4" />} disabled={!abilities.collabBlock} title={abilities.collabBlock ? '' : RESTRICTED_HINT} onClick={() => setBlockOpen(true)}>Block Collaboration</Button>
              )}
            </div>
          </Card>
        </div>
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
                        {r.status === 'pending' && (
                          <div className="mt-2">
                            <Button size="sm" variant="secondary" disabled={!abilities.collabReschedule} title={abilities.collabReschedule ? '' : RESTRICTED_HINT} onClick={() => doReviewReschedule(r.id)}>Review Reschedule Request</Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-charcoal-muted">Reviewing does not change the meeting time — creators must agree a new time between themselves.</p>
                </Card>
              )}

              <Card title="Meeting Actions">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<Bell className="h-4 w-4" />} disabled={!abilities.collabReminders || collab.blocked} title={abilities.collabReminders ? '' : RESTRICTED_HINT} onClick={remindMeeting}>Send Meeting Reminder</Button>
                  <Button size="sm" variant="danger" icon={<Ban className="h-4 w-4" />} disabled={!abilities.collabCancelMeeting || ['cancelled', 'completed'].includes(collab.meeting.status)} title={abilities.collabCancelMeeting ? '' : RESTRICTED_HINT} onClick={() => setCancelOpen(true)}>Cancel for Safety Reason</Button>
                </div>
                <p className="mt-2 text-xs text-charcoal-muted">Admin cannot mark creators as agreed, silently change the date, or create a completed meeting.</p>
              </Card>
            </>
          )}
        </div>
      )}

      {/* COMMUNICATION */}
      {tab === 'communication' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Communication Log" action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={!abilities.collabReminders || collab.blocked || collab.requestStatus === 'suggested'} title={abilities.collabReminders ? '' : RESTRICTED_HINT} onClick={remind}>Send Reminder</Button>
                <Button size="sm" variant="secondary" disabled={!abilities.collabReminders} title={abilities.collabReminders ? '' : RESTRICTED_HINT} onClick={() => setNoticeOpen(true)}>Send Admin Notice</Button>
              </div>
            }>
              {collab.communications.length === 0 ? <p className="text-sm text-charcoal-muted">No communications yet.</p> : (
                <ul className="space-y-3">
                  {collab.communications.map((c) => (
                    <li key={c.id} className="rounded-lg border border-cream-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-charcoal">{COMM_TYPE_LABEL[c.type]}</span>
                        <span className="text-xs text-charcoal-muted">{formatDateTime(c.at)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-charcoal-muted">{c.sender} → {c.recipient} · {COMM_CHANNEL_LABEL[c.channel]} · {COMM_DELIVERY_LABEL[c.delivery]}</p>
                      {c.body && <p className="mt-1 text-sm text-charcoal">{c.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-charcoal-muted">Private creator-to-creator chat messages are never shown here.</p>
            </Card>
          </div>
          <Card title="Internal Notes">
            {abilities.addNotes && (
              <div className="mb-3">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
                <div className="mt-2 flex justify-end"><Button size="sm" onClick={submitNote} disabled={!note.trim()}>Add note</Button></div>
              </div>
            )}
            {collab.notes.length === 0 ? <p className="text-sm text-charcoal-muted">No notes.</p> : (
              <ul className="space-y-2">{collab.notes.map((n) => (<li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-2.5"><p className="text-sm text-charcoal">{n.body}</p><p className="mt-0.5 text-xs text-charcoal-muted">{n.author} · {formatDateTime(n.at)}</p></li>))}</ul>
            )}
          </Card>
        </div>
      )}

      {/* REPORTS & SAFETY */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-charcoal-muted">Reviewing a report never automatically suspends a creator.</p>
            {collab.blocked ? (
              <Button size="sm" variant="secondary" icon={<RotateCcw className="h-4 w-4" />} disabled={!abilities.collabBlock} title={abilities.collabBlock ? '' : RESTRICTED_HINT} onClick={() => setRestoreOpen(true)}>Restore Collaboration</Button>
            ) : (
              <Button size="sm" variant="danger" icon={<Ban className="h-4 w-4" />} disabled={!abilities.collabBlock} title={abilities.collabBlock ? '' : RESTRICTED_HINT} onClick={() => setBlockOpen(true)}>Block Collaboration</Button>
            )}
          </div>
          {collab.reports.length === 0 ? (
            <div className="card"><EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="No reports" description="This collaboration has not been reported." /></div>
          ) : (
            collab.reports.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><Badge tone="magenta">{REPORT_REASON_LABEL[r.reason]}</Badge><ReportStatusBadge status={r.status} /></div>
                  <span className="text-xs text-charcoal-muted">{r.id} · {formatDate(r.reportedAt)}</span>
                </div>
                <Row label="Reported by">{r.reportedBy}</Row>
                <Row label="Reported creator">{r.reportedCreator}</Row>
                <Row label="Description">{r.description}</Row>
                {r.decisionReason && <Row label="Decision reason">{r.decisionReason}</Row>}
                {r.notes.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Internal notes</p>
                    <ul className="space-y-1.5">{r.notes.map((n) => <li key={n.id} className="text-xs text-charcoal-muted">{n.body} · {n.author} · {formatDateTime(n.at)}</li>)}</ul>
                  </div>
                )}
                {abilities.collabReports && (
                  <div className="mt-3 border-t border-cream-200 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setReportDecision({ report: r, spec: { action: 'Marked under review', statusAfter: 'under_review', requireReason: false } })}>Review Report</Button>
                      <Button size="sm" variant="secondary" onClick={() => setReportDecision({ report: r, spec: { action: 'Marked action taken', statusAfter: 'action_taken', requireReason: true } })}>Mark Action Taken</Button>
                      <Button size="sm" variant="secondary" onClick={() => setReportDecision({ report: r, spec: { action: 'Dismissed report', statusAfter: 'dismissed', requireReason: true } })}>Dismiss Report</Button>
                    </div>
                    <div className="mt-3">
                      <Textarea rows={2} value={reportNote[r.id] ?? ''} onChange={(e) => setReportNote((s) => ({ ...s, [r.id]: e.target.value }))} placeholder="Add an internal note to this report…" />
                      <div className="mt-2 flex justify-end"><Button size="sm" onClick={() => submitReportNote(r.id)} disabled={!(reportNote[r.id] ?? '').trim()}>Add Internal Note</Button></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* STATUS HISTORY */}
      {tab === 'history' && (
        <Card title="Status History"><MembershipTimeline events={collab.timeline} /></Card>
      )}

      {/* Modals */}
      <ExtendExpiryModal collab={extendOpen ? collab : null} onClose={() => setExtendOpen(false)} />
      <BlockCollaborationModal collab={blockOpen ? collab : null} onClose={() => setBlockOpen(false)} />
      <RestoreConfirmModal collab={restoreOpen ? collab : null} onClose={() => setRestoreOpen(false)} />
      <CancelMeetingModal collab={cancelOpen ? collab : null} onClose={() => setCancelOpen(false)} />
      <AdminNoticeModal collab={noticeOpen ? collab : null} onClose={() => setNoticeOpen(false)} />
      <ReportDecisionModal collab={reportDecision ? collab : null} report={reportDecision?.report ?? null} decision={reportDecision?.spec ?? null} onClose={() => setReportDecision(null)} />
    </div>
  );
}
