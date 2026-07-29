import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Ban,
  CalendarPlus,
  Download,
  Eye,
  EyeOff,
  FileWarning,
  RotateCcw,
  Search,
  Settings,
  Ticket,
  Upload,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EventStatusBadge } from '../../components/ui/EventBadges';
import { EventRequestChangesModal, EventHideModal, EventCancelModal } from './EventModals';
import { AddEventModal } from './AddEventModal';
import { EventSettingsModal } from './EventSettingsModal';
import { useData, publishEvent, restoreEvent } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { exportCsv } from '../../lib/exportCsv';
import { formatDateTime, priceLabel } from '../../lib/format';
import { EVENT_STATUSES, EVENT_STATUS_LABEL, EVENT_FORMATS, FORMAT_LABEL, TICKET_TYPE_LABEL } from '../../config/eventLabels';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { EventRecord } from '../../types/events';

const SORTS = [
  { key: 'date', label: 'Event Date' },
  { key: 'submitted', label: 'Recently Submitted' },
  { key: 'updated', label: 'Recently Updated' },
  { key: 'sold', label: 'Most Tickets Sold' },
  { key: 'name_az', label: 'Event Name A–Z' },
];

const soldOf = (e: EventRecord) => e.tiers.reduce((s, t) => s + t.sold, 0);
const isUpcoming = (e: EventRecord) => new Date(e.startAt).getTime() > Date.now();

export function EventsPage() {
  const { events, eventCategories, categoryProposals } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changesTarget, setChangesTarget] = useState<EventRecord | null>(null);
  const [hideTarget, setHideTarget] = useState<EventRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EventRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<EventRecord | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<EventRecord | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const format = get('format', 'all');
  const status = get('status', 'all');
  const paid = get('paid', 'all');
  const mode = get('mode', 'all');
  const city = get('city', 'all');
  const country = get('country', 'all');
  const hostCat = get('hostCat', 'all');
  const reported = get('reported', 'any');
  const sort = get('sort', 'date');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all' || v === 'any') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const cities = useMemo(() => [...new Set(events.map((e) => e.location.city).filter(Boolean))] as string[], [events]);
  const countries = useMemo(() => [...new Set(events.map((e) => e.location.country).filter(Boolean))] as string[], [events]);
  const pendingProposals = categoryProposals.filter((p) => p.status === 'pending').length;

  const filtered = useMemo(() => {
    let list = events.filter((e) => {
      if (q) {
        const hay = `${e.title} ${e.id} ${e.hostName} ${e.location.venue ?? ''} ${e.location.city ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && e.category !== cat) return false;
      if (format !== 'all' && e.format !== format) return false;
      if (status !== 'all' && e.status !== status) return false;
      if (paid === 'free' && e.ticketType !== 'free') return false;
      if (paid === 'paid' && e.ticketType === 'free') return false;
      if (mode === 'online' && e.format === 'in_person') return false;
      if (mode === 'offline' && e.format === 'online') return false;
      if (city !== 'all' && e.location.city !== city) return false;
      if (country !== 'all' && e.location.country !== country) return false;
      if (hostCat !== 'all' && e.hostCategory !== hostCat) return false;
      if (reported === 'reported' && e.reports.filter((r) => r.status !== 'dismissed').length === 0) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'submitted':
          return +new Date(b.submittedAt ?? 0) - +new Date(a.submittedAt ?? 0);
        case 'updated':
          return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        case 'sold':
          return soldOf(b) - soldOf(a);
        case 'name_az':
          return a.title.localeCompare(b.title);
        default:
          return +new Date(a.startAt) - +new Date(b.startAt);
      }
    });
    return list;
  }, [events, q, cat, format, status, paid, mode, city, country, hostCat, reported, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const summary = useMemo(
    () => ({
      total: events.length,
      upcoming: events.filter((e) => isUpcoming(e) && ['published', 'sold_out'].includes(e.status)).length,
      awaiting: events.filter((e) => e.status === 'submitted').length,
      free: events.filter((e) => e.ticketType === 'free').length,
      paid: events.filter((e) => e.ticketType === 'paid').length,
      cancelled: events.filter((e) => e.status === 'cancelled').length,
    }),
    [events],
  );

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (format !== 'all') chips.push({ key: 'format', label: FORMAT_LABEL[format as never] });
  if (status !== 'all') chips.push({ key: 'status', label: EVENT_STATUS_LABEL[status as never] });
  if (paid !== 'all') chips.push({ key: 'paid', label: paid === 'free' ? 'Free' : 'Paid' });
  if (mode !== 'all') chips.push({ key: 'mode', label: mode === 'online' ? 'Online' : 'Offline' });
  if (city !== 'all') chips.push({ key: 'city', label: city });
  if (country !== 'all') chips.push({ key: 'country', label: country });
  if (hostCat !== 'all') chips.push({ key: 'hostCat', label: hostCat });
  if (reported !== 'any') chips.push({ key: 'reported', label: 'Reported only' });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/events/${id}`, { state: { from: `/admin/events?${params.toString()}` } });

  const doExport = () => {
    exportCsv('iica-events.csv', filtered.map((e) => ({
      Title: e.title, ID: e.id, Host: e.hostName, Category: e.category, Format: FORMAT_LABEL[e.format],
      Date: formatDateTime(e.startAt), City: e.location.city ?? (e.format === 'online' ? 'Online' : ''),
      Ticket: TICKET_TYPE_LABEL[e.ticketType], Sold: soldOf(e), Status: EVENT_STATUS_LABEL[e.status],
    })));
    toast(`Exported ${filtered.length} events to CSV.`);
  };

  const selectCls = 'text-sm';

  return (
    <div>
      <PageHeader
        title="Events"
        description="Review events, ticketing, venues and creator submissions."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={doExport}>Export Events</Button>
            <Button variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)} disabled={!abilities.manageEvents} title={abilities.manageEvents ? '' : RESTRICTED_HINT}>Add Admin Event</Button>
            <Button variant="secondary" icon={<Settings className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
              Event Settings
              {pendingProposals > 0 && <span className="ml-1 rounded-full bg-magenta-500 px-1.5 text-[10px] font-semibold text-white">{pendingProposals}</span>}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Events', value: summary.total },
          { label: 'Upcoming', value: summary.upcoming },
          { label: 'Awaiting Review', value: summary.awaiting },
          { label: 'Free Events', value: summary.free },
          { label: 'Paid Events', value: summary.paid },
          { label: 'Cancelled', value: summary.cancelled },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-sm text-charcoal-muted">{c.label}</p>
            <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search title, event ID, host, venue or location…" aria-label="Search events" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {eventCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select className={selectCls} value={format} onChange={(e) => update({ format: e.target.value })}>
            <option value="all">All formats</option>
            {EVENT_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{EVENT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={paid} onChange={(e) => update({ paid: e.target.value })}>
            <option value="all">Free or Paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>
          <Select className={selectCls} value={mode} onChange={(e) => update({ mode: e.target.value })}>
            <option value="all">Online or Offline</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
          <Select className={selectCls} value={city} onChange={(e) => update({ city: e.target.value })}>
            <option value="all">All cities</option>
            {cities.sort().map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={country} onChange={(e) => update({ country: e.target.value })}>
            <option value="all">All countries</option>
            {countries.sort().map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={hostCat} onChange={(e) => update({ hostCat: e.target.value })}>
            <option value="all">Host category</option>
            {MEMBERSHIP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={reported} onChange={(e) => update({ reported: e.target.value })}>
            <option value="any">All content</option>
            <option value="reported">Reported only</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> result{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear All</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1140px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((e) => (
                <tr key={e.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => detail(e.id)} className="text-left">
                      <span className="block max-w-[220px] truncate font-medium text-charcoal group-hover:text-magenta-700">{e.title}</span>
                      <span className="block text-xs text-charcoal-muted">{e.id}{e.customCategoryPending ? ' · custom category' : ''}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={e.hostName} size="sm" />
                      <span className="text-charcoal">{e.hostName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-charcoal">{e.category}</span>
                    {e.customCategoryPending && <Badge tone="amber" className="ml-1">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3 text-charcoal">{FORMAT_LABEL[e.format]}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDateTime(e.startAt)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{e.format === 'online' ? 'Online' : `${e.location.city ?? '—'}, ${e.location.country ?? ''}`}</td>
                  <td className="px-4 py-3">
                    {e.ticketType === 'free' ? <Badge tone="green">Free</Badge> : e.ticketType === 'external' ? <Badge tone="blue">External</Badge> : <Badge tone="magenta">{priceLabel(Math.min(...e.tiers.map((t) => t.price)))}+</Badge>}
                  </td>
                  <td className="px-4 py-3 text-charcoal">{e.ticketType === 'external' ? '—' : soldOf(e)}</td>
                  <td className="px-4 py-3"><EventStatusBadge status={e.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View / Review', icon: <Eye className="h-4 w-4" />, onClick: () => detail(e.id) },
                          { label: 'View Tickets & Orders', icon: <Ticket className="h-4 w-4" />, onClick: () => navigate(`/admin/events/${e.id}?tab=orders`) },
                          { divider: true, label: 'd' },
                          { label: 'Publish Event', icon: <Upload className="h-4 w-4" />, disabled: !abilities.manageEvents || e.status === 'published' || e.status === 'cancelled', disabledHint: !abilities.manageEvents ? RESTRICTED_HINT : 'Not applicable in this state.', onClick: () => setPublishTarget(e) },
                          { label: 'Request Changes', icon: <FileWarning className="h-4 w-4" />, disabled: !abilities.manageEvents, disabledHint: RESTRICTED_HINT, onClick: () => setChangesTarget(e) },
                          e.status === 'hidden'
                            ? { label: 'Restore Event', icon: <RotateCcw className="h-4 w-4" />, disabled: !abilities.manageEvents, disabledHint: RESTRICTED_HINT, onClick: () => setRestoreTarget(e) }
                            : { label: 'Hide Event', icon: <EyeOff className="h-4 w-4" />, disabled: !abilities.manageEvents, disabledHint: RESTRICTED_HINT, onClick: () => setHideTarget(e) },
                          { label: 'Cancel Event', icon: <Ban className="h-4 w-4" />, danger: true, disabled: !abilities.manageEvents || e.status === 'cancelled' || e.status === 'completed', disabledHint: !abilities.manageEvents ? RESTRICTED_HINT : 'Not applicable in this state.', onClick: () => setCancelTarget(e) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && <EmptyState icon={<Ticket className="h-6 w-6" />} title="No events match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear All</Button>} />}
        {total > 0 && <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />}
      </div>

      <AddEventModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EventSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EventRequestChangesModal event={changesTarget} onClose={() => setChangesTarget(null)} />
      <EventHideModal event={hideTarget} onClose={() => setHideTarget(null)} />
      <EventCancelModal event={cancelTarget} onClose={() => setCancelTarget(null)} />
      <ConfirmDialog open={!!publishTarget} title={`Publish "${publishTarget?.title ?? ''}"?`} description="Validates host eligibility and configuration, then makes the event visible in the app." confirmLabel="Publish" onConfirm={() => { if (publishTarget) { publishEvent(publishTarget.id, actor); toast('Event published.'); } setPublishTarget(null); }} onCancel={() => setPublishTarget(null)} />
      <ConfirmDialog open={!!restoreTarget} title={`Restore "${restoreTarget?.title ?? ''}"?`} description="Revalidates date and ticket configuration and republishes the event." confirmLabel="Restore" onConfirm={() => { if (restoreTarget) { restoreEvent(restoreTarget.id, actor); toast('Event restored.'); } setRestoreTarget(null); }} onCancel={() => setRestoreTarget(null)} />
    </div>
  );
}
