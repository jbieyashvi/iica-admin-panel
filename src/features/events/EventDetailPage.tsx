import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  EyeOff,
  FileWarning,
  FlaskConical,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EventStatusBadge, PaymentBadge, BookingBadge, ReportStatusBadge } from '../../components/ui/EventBadges';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import { EventRequestChangesModal, EventHideModal, EventCancelModal } from './EventModals';
import { TicketOrderDrawer } from './TicketOrderDrawer';
import {
  useData,
  publishEvent,
  restoreEvent,
  simTicketPurchase,
  simFreeBooking,
  simSoldOut,
  simEventCancellation,
  resetArchiveEventDemo,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime, formatMoney, priceLabel } from '../../lib/format';
import { FORMAT_LABEL, TICKET_TYPE_LABEL } from '../../config/eventLabels';
import { isEligible } from '../../data/portfolioLogic';
import type { TicketOrder } from '../../types/events';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'location', label: 'Location' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'orders', label: 'Orders & Attendees' },
  { key: 'reports', label: 'Reports' },
  { key: 'activity', label: 'Activity & Audit' },
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
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

type Sim = 'purchase' | 'free' | 'soldout' | 'cancel' | 'reset';

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { events, orders, users, memberships, audit } = useData();
  const { abilities, actor } = useActor();

  const event = events.find((e) => e.id === eventId);
  const host = users.find((u) => u.id === event?.hostUserId);
  const membership = memberships.find((m) => m.userId === event?.hostUserId);

  const [changesOpen, setChangesOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState<TicketOrder | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/events';

  if (!event) {
    return (
      <div>
        <Link to="/admin/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Events</Link>
        <div className="card"><EmptyState title="Event not found" description="This event may have been removed." /></div>
      </div>
    );
  }

  const tab = params.get('tab') ?? 'overview';
  const setTab = (key: string) => { const next = new URLSearchParams(params); next.set('tab', key); setParams(next, { replace: true }); };

  const evOrders = orders.filter((o) => o.eventId === event.id);
  const eligible = isEligible(host, membership);
  const free = event.ticketType === 'free';
  const eventAudit = audit.filter((a) => a.targetId === event.id || evOrders.some((o) => o.id === a.targetId));

  const SIM_META: Record<Sim, { label: string; desc: string }> = {
    purchase: { label: 'Simulate Ticket Purchase', desc: 'Creates a paid order and increments tickets sold.' },
    free: { label: 'Simulate Free Booking', desc: 'Creates a free guest booking with a ticket ID.' },
    soldout: { label: 'Simulate Sold Out', desc: 'Marks every tier sold to capacity and sets status to Sold Out.' },
    cancel: { label: 'Simulate Event Cancellation', desc: 'Cancels the event. Refunds are recorded as required, never auto-completed.' },
    reset: { label: 'Reset Archive/Event Demo Data', desc: 'Rebuilds all Archive and Event demo data from seed. Users and portfolios are untouched.' },
  };
  const runSim = () => {
    if (!sim) return;
    if (sim === 'purchase') simTicketPurchase(event.id, actor);
    if (sim === 'free') simFreeBooking(event.id, actor);
    if (sim === 'soldout') simSoldOut(event.id, actor);
    if (sim === 'cancel') simEventCancellation(event.id, actor);
    if (sim === 'reset') resetArchiveEventDemo(actor);
    toast(sim === 'reset' ? 'Archive/Event demo data reset.' : 'Simulation applied.');
    setSim(null);
    if (sim === 'reset') navigate('/admin/events');
  };

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Events</button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-charcoal">{event.title}</h1>
              <EventStatusBadge status={event.status} />
              {free ? <Badge tone="green">Free</Badge> : event.ticketType === 'external' ? <Badge tone="blue">External Booking</Badge> : <Badge tone="magenta">Paid</Badge>}
              {event.customCategoryPending && <Badge tone="amber">Custom category pending</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{event.id}</span>
              <span className="flex items-center gap-1"><Avatar name={event.hostName} size="sm" /> {event.hostName}</span>
              <span>{formatDateTime(event.startAt)}</span>
              <span>{FORMAT_LABEL[event.format]}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Upload className="h-4 w-4" />} onClick={() => setPublishOpen(true)} disabled={!abilities.manageEvents || event.status === 'published' || event.status === 'cancelled'} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Publish</Button>
            <Button variant="secondary" icon={<FileWarning className="h-4 w-4" />} onClick={() => setChangesOpen(true)} disabled={!abilities.manageEvents} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Request Changes</Button>
            {event.status === 'hidden'
              ? <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRestoreOpen(true)} disabled={!abilities.manageEvents} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Restore</Button>
              : <Button variant="secondary" icon={<EyeOff className="h-4 w-4" />} onClick={() => setHideOpen(true)} disabled={!abilities.manageEvents} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Hide</Button>}
            <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)} disabled={!abilities.manageEvents || event.status === 'cancelled' || event.status === 'completed'} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Cancel</Button>
          </div>
        </div>
        {!eligible && (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">Host membership is not currently active — verify eligibility before publishing.</p>
        )}
      </div>

      <div className="mb-5"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Event Details">
            <Row label="Title">{event.title}</Row>
            <Row label="Category">{event.category}{event.customCategoryPending && <Badge tone="amber" className="ml-1">Pending review</Badge>}</Row>
            <Row label="Format">{FORMAT_LABEL[event.format]}</Row>
            <Row label="Host / creator">{event.hostName}</Row>
            <Row label="Co-hosts">{event.coHosts.length ? event.coHosts.join(', ') : '—'}</Row>
            <Row label="Date & time">{formatDateTime(event.startAt)}</Row>
            <Row label="Timezone">{event.timezone}</Row>
            <Row label="Duration">{event.durationMins} mins</Row>
            <Row label="Age restriction">{event.ageRestriction}</Row>
            <Row label="Language">{event.language}</Row>
          </Card>
          <Card title="Description & Cover">
            <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-cream-100 text-sm text-charcoal-muted/60">Cover image placeholder</div>
            <p className="text-sm leading-relaxed text-charcoal">{event.description}</p>
          </Card>
        </div>
      )}

      {tab === 'location' && (
        <Card title={event.format === 'online' ? 'Online Details' : 'Venue & Location'}>
          {event.format !== 'online' ? (
            <>
              <Row label="Venue">{event.location.venue ?? '—'}</Row>
              <Row label="Address">{event.location.address ?? '—'}</Row>
              <Row label="City">{event.location.city ?? '—'}</Row>
              <Row label="State">{event.location.state || '—'}</Row>
              <Row label="Country">{event.location.country ?? '—'}</Row>
              <Row label="Map coordinates">{event.location.lat ? `${event.location.lat}, ${event.location.lng}` : '—'}</Row>
              <Row label="Accessibility">{event.location.accessibility ?? '—'}</Row>
            </>
          ) : null}
          {event.format !== 'in_person' && (
            <div className={event.format === 'hybrid' ? 'mt-4 border-t border-cream-200 pt-3' : ''}>
              <Row label="Platform">{event.online.platform ?? '—'}</Row>
              <Row label="Join-link status">{event.online.joinLinkStatus ?? '—'}</Row>
              <Row label="Link release">{event.online.linkReleaseTiming ?? '—'}</Row>
            </div>
          )}
          {event.externalBookingUrl && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-sky-50 px-3 py-2.5 text-sm">
              <p className="font-medium text-sky-700">External booking</p>
              <a href={event.externalBookingUrl} target="_blank" rel="noreferrer" className="break-all text-xs text-sky-700 hover:underline">{event.externalBookingUrl}</a>
              <p className="mt-1 text-xs text-charcoal-muted">Third-party provider — distinct from IICA membership payments.</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'tickets' && (
        <Card title="Ticket Configuration" action={<Badge tone="neutral">{TICKET_TYPE_LABEL[event.ticketType]}</Badge>}>
          {event.ticketType === 'external' ? (
            <p className="text-sm text-charcoal-muted">Tickets are handled via the external booking link (see Location tab).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="py-2 pr-3">Tier</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Capacity</th><th className="px-3 py-2">Sold</th><th className="px-3 py-2">Reserved</th><th className="px-3 py-2">Remaining</th><th className="px-3 py-2">Per-user</th><th className="px-3 py-2">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {event.tiers.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 pr-3 font-medium text-charcoal">{t.name}</td>
                      <td className="px-3 py-2">{priceLabel(t.price)}</td>
                      <td className="px-3 py-2">{t.capacity}</td>
                      <td className="px-3 py-2">{t.sold}</td>
                      <td className="px-3 py-2">{t.reserved}</td>
                      <td className="px-3 py-2 font-medium text-charcoal">{Math.max(0, t.capacity - t.sold - t.reserved)}</td>
                      <td className="px-3 py-2">{t.perUserLimit}</td>
                      <td className="px-3 py-2">{t.refundEligible ? 'Eligible' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-charcoal-muted">Sales window: {formatDate(event.tiers[0]?.salesStart)} – {formatDate(event.tiers[0]?.salesEnd)} · {event.refundPolicy}</p>
        </Card>
      )}

      {tab === 'orders' && (
        <div className="card overflow-hidden">
          {evOrders.length === 0 ? (
            <EmptyState title="No orders yet" description={event.ticketType === 'external' ? 'This event uses external booking.' : 'No bookings recorded for this event.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Order</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {evOrders.map((o) => (
                    <tr key={o.id} className="cursor-pointer hover:bg-cream-100/50" onClick={() => setOrderTarget(o)}>
                      <td className="px-4 py-3 font-medium text-charcoal">{o.id.slice(0, 14)}…</td>
                      <td className="px-4 py-3"><span className="text-charcoal">{o.buyerName}</span> {o.guest ? <Badge tone="neutral">Guest</Badge> : <Badge tone="blue">User</Badge>}</td>
                      <td className="px-4 py-3 text-charcoal">{o.tierName}</td>
                      <td className="px-4 py-3">{o.quantity}</td>
                      <td className="px-4 py-3">{o.total === 0 ? 'Free' : formatMoney(o.total, '₹')}</td>
                      <td className="px-4 py-3"><PaymentBadge status={o.paymentStatus} /></td>
                      <td className="px-4 py-3"><BookingBadge status={o.bookingStatus} /></td>
                      <td className="px-4 py-3 text-charcoal-muted">{o.checkInStatus === 'checked_in' ? 'Checked in' : o.checkInStatus === 'no_show' ? 'No show' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <Card title="Reports & Disputes">
          {event.reports.length === 0 ? (
            <p className="text-sm text-charcoal-muted">No reports for this event.</p>
          ) : (
            <ul className="space-y-3">
              {event.reports.map((r) => (
                <li key={r.id} className="rounded-lg border border-cream-200 p-3">
                  <div className="flex items-center justify-between">
                    <Badge tone="red">{r.reason}</Badge>
                    <ReportStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-charcoal">{r.description}</p>
                  <p className="text-xs text-charcoal-muted">{r.reporterType} · {formatDate(r.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'activity' && (
        <Card title="Activity & Audit">
          <MembershipTimeline events={event.timeline} />
          {eventAudit.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-cream-200 pt-4">
              {eventAudit.map((a) => (
                <li key={a.id} className="border-b border-cream-200 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-charcoal">{a.action}</span>
                    <span className="text-xs text-charcoal-muted">{formatDateTime(a.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-charcoal-muted">{a.prevState && a.newState ? `${a.prevState} → ${a.newState} · ` : ''}{a.adminName} ({a.adminRole}){a.reason ? ` · ${a.reason}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Prototype Tools */}
      {abilities.simulate && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-magenta-200 bg-magenta-50/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-magenta-600" />
            <h3 className="text-sm font-semibold text-charcoal">Prototype Tools</h3>
            <Badge tone="magenta">Prototype only</Badge>
          </div>
          <p className="mb-4 text-sm text-charcoal-muted">Super Admin only. Kept separate from normal operational actions. Each creates an audit entry.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSim('purchase')} disabled={event.ticketType === 'external'}>Simulate Ticket Purchase</Button>
            <Button variant="secondary" size="sm" onClick={() => setSim('free')} disabled={event.ticketType === 'external'}>Simulate Free Booking</Button>
            <Button variant="secondary" size="sm" onClick={() => setSim('soldout')} disabled={event.ticketType === 'external'}>Simulate Sold Out</Button>
            <Button variant="secondary" size="sm" onClick={() => setSim('cancel')}>Simulate Event Cancellation</Button>
            <Button variant="danger" size="sm" onClick={() => setSim('reset')}>Reset Archive/Event Demo Data</Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <EventRequestChangesModal event={changesOpen ? event : null} onClose={() => setChangesOpen(false)} />
      <EventHideModal event={hideOpen ? event : null} onClose={() => setHideOpen(false)} />
      <EventCancelModal event={cancelOpen ? event : null} onClose={() => setCancelOpen(false)} />
      <TicketOrderDrawer order={orderTarget} event={event} onClose={() => setOrderTarget(null)} />
      <ConfirmDialog open={publishOpen} title={`Publish "${event.title}"?`} description="Validates host eligibility, required info and ticket configuration, then makes the event visible in the app." confirmLabel="Publish" onConfirm={() => { publishEvent(event.id, actor); toast('Event published.'); setPublishOpen(false); }} onCancel={() => setPublishOpen(false)} />
      <ConfirmDialog open={restoreOpen} title={`Restore "${event.title}"?`} description="Revalidates date and ticket configuration and republishes." confirmLabel="Restore" onConfirm={() => { restoreEvent(event.id, actor); toast('Event restored.'); setRestoreOpen(false); }} onCancel={() => setRestoreOpen(false)} />
      <ConfirmDialog open={!!sim} title={sim ? SIM_META[sim].label : ''} description={sim ? `Prototype only. ${SIM_META[sim].desc}` : ''} confirmLabel={sim === 'reset' ? 'Reset Demo' : 'Run Simulation'} tone={sim === 'reset' || sim === 'cancel' ? 'danger' : 'primary'} onConfirm={runSim} onCancel={() => setSim(null)} />
    </div>
  );
}
