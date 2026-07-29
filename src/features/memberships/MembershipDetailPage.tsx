import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Bell,
  Check,
  Copy,
  FlaskConical,
  NotebookPen,
  RefreshCw,
  Receipt,
  RotateCcw,
  ClipboardCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Field, Textarea } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { MembershipStatusBadge, PurchaseStatusBadge } from '../../components/ui/StatusBadge';
import { PaymentPanel } from './PaymentPanel';
import { MembershipTimeline } from './MembershipTimeline';
import {
  useData,
  simulate,
  suspendUser,
  reactivateUser,
  addNote,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime } from '../../lib/format';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
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

type SimKind = 'completed' | 'failed' | 'renewal_due' | 'expired' | 'reset';

export function MembershipDetailPage() {
  const { membershipId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { memberships, users } = useData();
  const { abilities, actor } = useActor();

  const membership = memberships.find((m) => m.id === membershipId);
  const user = users.find((u) => u.id === membership?.userId);

  const [copied, setCopied] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const [reactivateConfirm, setReactivateConfirm] = useState(false);
  const [sim, setSim] = useState<SimKind | null>(null);

  const backSearch = (location.state as { from?: string } | null)?.from ?? '';

  if (!membership) {
    return (
      <div>
        <Link to="/admin/memberships" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Back to Memberships
        </Link>
        <div className="card">
          <EmptyState title="Membership not found" description="This record may have been removed." />
        </div>
      </div>
    );
  }


  const copyId = async () => {
    if (!membership.iicaId) return;
    try {
      await navigator.clipboard.writeText(membership.iicaId);
    } catch {
      /* clipboard blocked — ignore in prototype */
    }
    setCopied(true);
    toast('IICA ID copied to clipboard.');
    setTimeout(() => setCopied(false), 1500);
  };

  const runSim = () => {
    if (!sim) return;
    simulate(membership.id, sim, actor);
    const msg: Record<SimKind, string> = {
      completed: 'Purchase simulated as completed — membership is now Active.',
      failed: 'Purchase simulated as failed.',
      renewal_due: 'Membership set to Renewal Due.',
      expired: 'Membership simulated as expired.',
      reset: 'Membership demo reset.',
    };
    toast(msg[sim]);
    setSim(null);
  };

  const submitNote = () => {
    if (!noteBody.trim() || !user) return;
    addNote(user.id, noteBody.trim(), actor);
    toast('Internal note added.');
    setNoteBody('');
    setNoteOpen(false);
  };

  const suspended = membership.membershipStatus === 'suspended';

  const SIM_META: Record<SimKind, { label: string; desc: string }> = {
    completed: { label: 'Simulate Purchase Completed', desc: 'Marks the purchase Completed, activates the membership, generates start/renewal dates and unlocks portfolio access.' },
    failed: { label: 'Simulate Purchase Failed', desc: 'Marks the purchase as Failed and returns the membership to Purchase Pending.' },
    renewal_due: { label: 'Simulate Renewal Due', desc: 'Sets the membership to Renewal Due with a renewal date 7 days out.' },
    expired: { label: 'Simulate Expired Membership', desc: 'Expires the membership and locks portfolio access.' },
    reset: { label: 'Reset Membership Demo', desc: 'Resets purchase and membership state back to the pre-purchase baseline.' },
  };

  return (
    <div>
      <button
        onClick={() => navigate(`/admin/memberships${backSearch}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Memberships
      </button>

      {/* Creator summary */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={user?.name ?? '—'} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-medium text-charcoal">{user?.name ?? 'Unknown creator'}</h1>
                <MembershipStatusBadge status={membership.membershipStatus} />
                <PurchaseStatusBadge status={membership.purchaseStatus} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
                <span>{user?.email}</span>
                <span>{user?.phone}</span>
                <span>{membership.category}</span>
                <span>{user?.country}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<NotebookPen className="h-4 w-4" />} onClick={() => setNoteOpen(true)} disabled={!abilities.addNotes} title={abilities.addNotes ? '' : RESTRICTED_HINT}>
              Add Note
            </Button>
            {user && (
              <Button variant="secondary" onClick={() => navigate(`/admin/users/${user.id}`)}>
                View User
              </Button>
            )}
            {suspended ? (
              <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setReactivateConfirm(true)} disabled={!abilities.suspendUsers} title={abilities.suspendUsers ? '' : RESTRICTED_HINT}>
                Reactivate
              </Button>
            ) : (
              <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setSuspendConfirm(true)} disabled={!abilities.suspendUsers} title={abilities.suspendUsers ? '' : RESTRICTED_HINT}>
                Suspend
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Membership form data */}
        <Panel title="Membership Form Data">
          <Row label="Full name">{membership.form.fullName}</Row>
          <Row label="Email">{membership.form.email}</Row>
          <Row label="Phone">{membership.form.phone}</Row>
          <Row label="Country">{membership.form.country}</Row>
          <Row label="City">{membership.form.city}</Row>
          <Row label="Selected category">{membership.category}</Row>
          <Row label="Submission date">{formatDate(membership.form.submittedAt)}</Row>
        </Panel>

        {/* IICA ID */}
        <Panel
          title="IICA ID"
          action={
            membership.iicaId && (
              <button onClick={copyId} className="inline-flex items-center gap-1 text-xs font-medium text-magenta-600 hover:text-magenta-700">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy ID'}
              </button>
            )
          }
        >
          {membership.iicaId ? (
            <>
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-cream-200 bg-cream-100/50 px-4 py-3">
                <span className="font-serif text-xl font-semibold tracking-wide text-charcoal">{membership.iicaId}</span>
              </div>
              <Row label="Generated">{formatDateTime(membership.idGeneratedAt)}</Row>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Generation history</p>
                <ul className="space-y-1.5">
                  {membership.idHistory.map((h, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-charcoal">{h.id}</span>
                      <span className="text-xs text-charcoal-muted">{formatDateTime(h.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Bell className="h-4 w-4" />}
                  onClick={() => toast('IICA ID notification resent (simulated).', 'info')}
                >
                  Resend IICA ID Notification
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-charcoal-muted">No IICA ID generated yet. It is issued after the membership form is submitted.</p>
          )}
        </Panel>

        {/* Payment info */}
        {abilities.viewPurchases ? (
          <div className="lg:col-span-2">
            <PaymentPanel membership={membership} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<ClipboardCheck className="h-4 w-4" />}
                onClick={() => toast('Purchase record reviewed.', 'info')}
              >
                Review Purchase Record
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => toast('Purchase status refreshed from store (simulated).', 'info')}
              >
                Refresh Purchase Status
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Receipt className="h-4 w-4" />}
                disabled={membership.payment.receiptStatus !== 'available'}
                title={membership.payment.receiptStatus !== 'available' ? 'No receipt available yet.' : ''}
                onClick={() => toast('Receipt opened (simulated).', 'info')}
              >
                View Receipt
              </Button>
            </div>
          </div>
        ) : (
          <div className="card p-5 lg:col-span-2">
            <p className="text-sm text-charcoal-muted">Payment details are restricted for your role. {RESTRICTED_HINT}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="lg:col-span-2">
          <Panel title="Membership Timeline">
            <MembershipTimeline events={membership.timeline} />
          </Panel>
        </div>

        {/* Prototype Tools — Super Admin only */}
        {abilities.simulate && (
          <div className="lg:col-span-2">
            <div className="rounded-xl border-2 border-dashed border-magenta-200 bg-magenta-50/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-magenta-600" />
                <h3 className="text-sm font-semibold text-charcoal">Prototype Tools</h3>
                <Badge tone="magenta">Prototype only</Badge>
              </div>
              <p className="mb-4 text-sm text-charcoal-muted">
                Simulate the Apple / Google in-app purchase lifecycle. These tools are for demonstration and are
                available to Super Admin only. Ordinary admins can never manually mark a transaction as paid.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSim('completed')}>Simulate Purchase Completed</Button>
                <Button variant="secondary" size="sm" onClick={() => setSim('failed')}>Simulate Purchase Failed</Button>
                <Button variant="secondary" size="sm" onClick={() => setSim('renewal_due')}>Simulate Renewal Due</Button>
                <Button variant="secondary" size="sm" onClick={() => setSim('expired')}>Simulate Expired Membership</Button>
                <Button variant="danger" size="sm" onClick={() => setSim('reset')}>Reset Membership Demo</Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Note modal */}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add internal note"
        description="Recorded against the creator's account."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={submitNote}>Save note</Button>
          </>
        }
      >
        <Field label="Note" htmlFor="mnote">
          <Textarea id="mnote" rows={4} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add context for the team…" />
        </Field>
      </Modal>

      {/* Suspend / reactivate */}
      <ConfirmDialog
        open={suspendConfirm}
        title={`Suspend ${user?.name ?? 'membership'}?`}
        description="Suspension restricts access and locks portfolio, but never deletes the account or membership."
        confirmLabel="Suspend"
        tone="danger"
        onConfirm={() => {
          if (user) suspendUser(user.id, { reason: 'Suspended from membership record', notifyUser: true, endDate: null }, actor);
          toast('Membership suspended.', 'info');
          setSuspendConfirm(false);
        }}
        onCancel={() => setSuspendConfirm(false)}
      />
      <ConfirmDialog
        open={reactivateConfirm}
        title={`Reactivate ${user?.name ?? 'membership'}?`}
        description="Restores the membership to its prior active state."
        confirmLabel="Reactivate"
        onConfirm={() => {
          if (user) reactivateUser(user.id, actor);
          toast('Membership reactivated.');
          setReactivateConfirm(false);
        }}
        onCancel={() => setReactivateConfirm(false)}
      />

      {/* Simulation confirm */}
      <ConfirmDialog
        open={!!sim}
        title={sim ? SIM_META[sim].label : ''}
        description={sim ? `Prototype only. ${SIM_META[sim].desc}` : ''}
        confirmLabel={sim === 'reset' ? 'Reset Demo' : 'Run Simulation'}
        tone={sim === 'reset' || sim === 'failed' || sim === 'expired' ? 'danger' : 'primary'}
        onConfirm={runSim}
        onCancel={() => setSim(null)}
      />
    </div>
  );
}
