import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  ExternalLink,
  NotebookPen,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Field, Textarea } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { AccountTypeBadge, MembershipStatusBadge, PurchaseStatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { SuspendModal } from './SuspendModal';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import { PaymentPanel } from '../memberships/PaymentPanel';
import { useData, reactivateUser, addNote } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime, formatMoney, timeAgo } from '../../lib/format';
import { PURCHASE_PLATFORM_LABEL } from '../../config/userLabels';
import { derivePortfolio, deriveOrders, deriveCollab, totalSpend } from '../../data/derive';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'membership', label: 'Membership' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'collaborations', label: 'Collaborations' },
  { key: 'activity', label: 'Activity' },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-cream-200 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-cream-200 bg-cream-100/50 p-3">
      <p className="font-serif text-xl font-medium text-charcoal">{value}</p>
      <p className="text-xs text-charcoal-muted">{label}</p>
    </div>
  );
}

export function UserDetailPage() {
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { users, memberships } = useData();
  const { abilities, actor } = useActor();

  const user = users.find((u) => u.id === userId);
  const membership = useMemo(() => memberships.find((m) => m.userId === userId), [memberships, userId]);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  const backSearch = (location.state as { from?: string } | null)?.from ?? '';
  const backTo = `/admin/users${backSearch}`;

  if (!user) {
    return (
      <div>
        <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="card">
          <EmptyState title="User not found" description="This record may have been removed." />
        </div>
      </div>
    );
  }

  const isCreator = user.accountType === 'creator' && !!membership;
  const tabDefs = isCreator ? TABS : TABS.filter((t) => t.key !== 'membership');
  const rawTab = params.get('tab') ?? 'overview';
  const tab = tabDefs.some((t) => t.key === rawTab) ? rawTab : 'overview';
  const setTab = (key: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  const orders = deriveOrders(user);
  const portfolio = derivePortfolio(user, membership);
  const collab = deriveCollab(user);

  const submitNote = () => {
    if (!noteBody.trim()) return;
    addNote(user.id, noteBody.trim(), actor);
    toast('Internal note added.');
    setNoteBody('');
    setNoteOpen(false);
  };

  const doReactivate = () => {
    reactivateUser(user.id, actor);
    toast(`${user.name}'s account reactivated.`);
    setReactivateOpen(false);
  };

  const suspended = user.membershipStatus === 'suspended';

  return (
    <div>
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={user.name} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-medium text-charcoal">{user.name}</h1>
                <AccountTypeBadge type={user.accountType} />
                <MembershipStatusBadge status={user.membershipStatus} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
                <span>{user.email}</span>
                <span>{user.phone}</span>
                {user.iicaId && <span className="font-medium text-charcoal">{user.iicaId}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-muted">
                {user.membershipCategory && <span>Category: {user.membershipCategory}</span>}
                <span>Joined {formatDate(user.joinedAt)}</span>
                <span>Active {timeAgo(user.lastActiveAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<NotebookPen className="h-4 w-4" />}
              onClick={() => setNoteOpen(true)}
              disabled={!abilities.addNotes}
              title={abilities.addNotes ? '' : RESTRICTED_HINT}
            >
              Add Note
            </Button>
            {suspended ? (
              <Button
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setReactivateOpen(true)}
                disabled={!abilities.suspendUsers}
                title={abilities.suspendUsers ? '' : RESTRICTED_HINT}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<Ban className="h-4 w-4" />}
                onClick={() => setSuspendOpen(true)}
                disabled={!abilities.suspendUsers}
                title={abilities.suspendUsers ? '' : RESTRICTED_HINT}
              >
                Suspend
              </Button>
            )}
          </div>
        </div>

        {suspended && user.suspension && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="text-sm">
              <p className="font-medium text-red-700">Account suspended</p>
              <p className="text-red-700/80">
                {user.suspension.reason} — by {user.suspension.by} on {formatDate(user.suspension.at)}
                {user.suspension.endDate ? ` · until ${formatDate(user.suspension.endDate)}` : ' · indefinite'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <Tabs tabs={tabDefs} active={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Personal Information">
            <Row label="Full name">{user.name}</Row>
            <Row label="Email">{user.email}</Row>
            <Row label="Phone">{user.phone}</Row>
            <Row label="Country">{user.country}</Row>
            <Row label="City">{user.city}</Row>
          </Panel>
          <Panel title="Account">
            <Row label="Account type">{<AccountTypeBadge type={user.accountType} />}</Row>
            <Row label="Membership status">{<MembershipStatusBadge status={user.membershipStatus} />}</Row>
            <Row label="Journey stage">{journeyStage(user.membershipStatus)}</Row>
            <Row label="IICA ID">{user.iicaId ?? '—'}</Row>
            <Row label="Joined">{formatDate(user.joinedAt)}</Row>
            <Row label="Last active">{formatDateTime(user.lastActiveAt)}</Row>
          </Panel>
          <Panel title="Recent Activity">
            <ul className="space-y-2.5">
              {[...(membership?.timeline ?? [])].reverse().slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-charcoal">{e.label}</span>
                  <span className="shrink-0 text-xs text-charcoal-muted">{timeAgo(e.at)}</span>
                </li>
              ))}
              <li className="flex items-start justify-between gap-3 text-sm">
                <span className="text-charcoal">Signed in</span>
                <span className="shrink-0 text-xs text-charcoal-muted">{timeAgo(user.lastActiveAt)}</span>
              </li>
            </ul>
          </Panel>
          <Panel
            title="Internal Admin Notes"
            action={
              abilities.addNotes && (
                <button onClick={() => setNoteOpen(true)} className="text-xs font-medium text-magenta-600 hover:text-magenta-700">
                  Add note
                </button>
              )
            }
          >
            {user.notes.length === 0 ? (
              <p className="text-sm text-charcoal-muted">No internal notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {user.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-3">
                    <p className="text-sm text-charcoal">{n.body}</p>
                    <p className="mt-1 text-xs text-charcoal-muted">
                      {n.author} · {n.role} · {formatDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'membership' && membership && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Membership">
            <Row label="IICA ID">{membership.iicaId ?? '—'}</Row>
            <Row label="Membership category">{membership.category}</Row>
            <Row label="Form submission date">{formatDate(membership.form.submittedAt)}</Row>
            <Row label="Purchase platform">{PURCHASE_PLATFORM_LABEL[membership.purchasePlatform]}</Row>
            <Row label="Purchase status">{<PurchaseStatusBadge status={membership.purchaseStatus} />}</Row>
            <Row label="Membership status">{<MembershipStatusBadge status={membership.membershipStatus} />}</Row>
          </Panel>
          <Panel title="Access & Dates">
            <Row label="Start date">{formatDate(membership.startDate)}</Row>
            <Row label="Renewal date">{formatDate(membership.renewalDate)}</Row>
            <Row label="Expiry date">{formatDate(membership.expiryDate)}</Row>
            <Row label="Portfolio access">
              {membership.portfolioUnlocked ? <Badge tone="green">Unlocked</Badge> : <Badge tone="neutral">Locked</Badge>}
            </Row>
          </Panel>
          <div className="lg:col-span-2">
            <Panel title="Membership Progress">
              <MembershipTimeline events={membership.timeline} />
            </Panel>
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel
              title="Portfolio"
              action={
                <a href={portfolio.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-magenta-600 hover:text-magenta-700">
                  Open Portfolio <ExternalLink className="h-3 w-3" />
                </a>
              }
            >
              <Row label="Completeness">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-cream-100">
                    <span className="block h-full rounded-full bg-magenta-500" style={{ width: `${portfolio.completeness}%` }} />
                  </span>
                  {portfolio.completeness}%
                </span>
              </Row>
              <Row label="Status">
                {portfolio.published ? <Badge tone="green">Published</Badge> : <Badge tone="amber">Draft</Badge>}
              </Row>
              <Row label="Public link">
                <a href={portfolio.publicUrl} target="_blank" rel="noreferrer" className="text-magenta-600 hover:underline">
                  {portfolio.publicUrl.replace('https://', '')}
                </a>
              </Row>
            </Panel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Archive videos" value={portfolio.archiveVideos} />
            <Stat label="Products" value={portfolio.products} />
            <Stat label="Events" value={portfolio.events} />
            <Stat label="Testimonials" value={portfolio.testimonials} />
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Product orders" value={orders.filter((o) => o.type === 'Physical' || o.type === 'Digital').length} />
            <Stat label="Masterclasses" value={orders.filter((o) => o.type === 'Masterclass').length} />
            <Stat label="Event tickets" value={orders.filter((o) => o.type === 'Event Ticket').length} />
            <Stat label="Total spend" value={formatMoney(totalSpend(orders), '₹')} />
          </div>
          <div className="card overflow-hidden">
            {orders.length === 0 ? (
              <EmptyState title="No purchases yet" description="This user has not placed any orders." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-cream-100/50">
                        <td className="px-4 py-3 font-medium text-charcoal">{o.id}</td>
                        <td className="px-4 py-3 text-charcoal">{o.item}</td>
                        <td className="px-4 py-3"><Badge tone="neutral">{o.type}</Badge></td>
                        <td className="px-4 py-3 text-charcoal">{formatMoney(o.amount, '₹')}</td>
                        <td className="px-4 py-3 text-charcoal-muted">{formatDate(o.date)}</td>
                        <td className="px-4 py-3 text-charcoal">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'collaborations' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Recommendations received" value={collab.recommendationsReceived} />
          <Stat label="Requests sent" value={collab.requestsSent} />
          <Stat label="Requests accepted" value={collab.requestsAccepted} />
          <Stat label="Saved profiles" value={collab.savedProfiles} />
          <Stat label="Upcoming meetings" value={collab.upcomingMeetings} />
          <Stat label="Reported interactions" value={collab.reportedInteractions} />
        </div>
      )}


      {tab === 'activity' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Membership Timeline">
            {membership ? (
              <MembershipTimeline events={membership.timeline} />
            ) : (
              <p className="text-sm text-charcoal-muted">No membership timeline.</p>
            )}
          </Panel>
          {membership && abilities.viewPurchases && (
            <PaymentPanel membership={membership} />
          )}
        </div>
      )}

      {/* Modals */}
      <SuspendModal user={suspendOpen ? user : null} open={suspendOpen} onClose={() => setSuspendOpen(false)} />
      <ConfirmDialog
        open={reactivateOpen}
        title={`Reactivate ${user.name}?`}
        description="This restores the account and, where applicable, its active membership."
        confirmLabel="Reactivate"
        onConfirm={doReactivate}
        onCancel={() => setReactivateOpen(false)}
      />
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add internal note"
        description="Visible to admins only."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNote}>Save note</Button>
          </>
        }
      >
        <Field label="Note" htmlFor="note-body">
          <Textarea id="note-body" rows={4} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add context for the team…" />
        </Field>
      </Modal>
    </div>
  );
}

function journeyStage(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Registered user',
    form_submitted: 'Application submitted',
    purchase_pending: 'Completing purchase',
    active: 'Active creator',
    renewal_due: 'Renewal due',
    expired: 'Lapsed creator',
    cancelled: 'Cancelled',
    suspended: 'Suspended',
  };
  return map[status] ?? status;
}
