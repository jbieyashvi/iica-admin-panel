import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Eye, HandHeart, RotateCcw, Search, User as UserIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useData, hideDonationListing, restoreDonationListing } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatMoney } from '../../lib/format';
import type { DonationListing } from '../../types/donations';

export function DonationsPanel() {
  const { donationListings, donationOrders, users } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const canManage = abilities.manageProducts;
  const [q, setQ] = useState('');
  const [active, setActive] = useState('all');
  const [detail, setDetail] = useState<DonationListing | null>(null);
  const [hideTarget, setHideTarget] = useState<DonationListing | null>(null);

  const suspended = useMemo(() => new Set(users.filter((u) => u.membershipStatus === 'suspended').map((u) => u.id)), [users]);

  // Successful support totals per listing (Paid only).
  const stats = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    donationOrders.forEach((o) => {
      if (o.status !== 'paid') return;
      const s = m.get(o.listingId) ?? { count: 0, total: 0 };
      s.count += 1; s.total += o.amount;
      m.set(o.listingId, s);
    });
    return m;
  }, [donationOrders]);

  const listings = useMemo(() => donationListings.filter((d) => {
    if (q) { const hay = `${d.title} ${d.id} ${d.creatorName}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
    if (active === 'active' && !d.active) return false;
    if (active === 'inactive' && d.active) return false;
    return true;
  }), [donationListings, q, active]);

  const doHide = () => { if (!hideTarget) return; hideDonationListing(hideTarget.id, actor); toast('Donation listing hidden.'); setHideTarget(null); };

  return (
    <>
      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, listing ID or creator…" aria-label="Search donations" className="input-base pl-9" />
          </div>
          <Select className="text-sm sm:w-44" value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <p className="mt-2 text-xs text-charcoal-muted">Creators define fixed support amounts — no donor-entered amount, no stock, no fulfilment. Only listings from active Creator Members appear publicly.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Fixed Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Portfolio</th>
                <th className="px-4 py-3">Supports</th>
                <th className="px-4 py-3">Total Raised</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {listings.map((d) => {
                const s = stats.get(d.id) ?? { count: 0, total: 0 };
                const creatorSuspended = suspended.has(d.creatorUserId);
                return (
                  <tr key={d.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-2.5">
                      <button onClick={() => setDetail(d)} className="flex items-center gap-2.5 text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-magenta-50 text-magenta-600"><HandHeart className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block max-w-[220px] truncate font-medium text-charcoal hover:text-magenta-700">{d.title}</span>
                          <span className="block font-mono text-xs text-charcoal-muted">{d.id}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Avatar name={d.creatorName} size="sm" /><span className="text-charcoal">{d.creatorName}</span></span></td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{formatMoney(d.amount, '₹')}</td>
                    <td className="px-4 py-2.5">
                      {creatorSuspended ? <Badge tone="red">Creator suspended</Badge> : d.active ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-2.5">{d.portfolioVisible ? <Badge tone="blue">Visible</Badge> : <span className="text-charcoal-muted">Hidden</span>}</td>
                    <td className="px-4 py-2.5 text-charcoal">{s.count}</td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{formatMoney(s.total, '₹')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <DropdownMenu items={[
                          { label: 'View Listing', icon: <Eye className="h-4 w-4" />, onClick: () => setDetail(d) },
                          { label: 'Open Creator Profile', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${d.creatorUserId}`) },
                          ...(d.active
                            ? [{ label: 'Hide Listing', icon: <Ban className="h-4 w-4" />, danger: true, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setHideTarget(d) }]
                            : [{ label: 'Restore Listing', icon: <RotateCcw className="h-4 w-4" />, disabled: !canManage || creatorSuspended, disabledHint: creatorSuspended ? 'Creator is suspended.' : RESTRICTED_HINT, onClick: () => { restoreDonationListing(d.id, actor); toast('Donation listing restored.'); } }]),
                        ]} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {listings.length === 0 && <EmptyState icon={<HandHeart className="h-6 w-6" />} title="No donation listings" description="Creator “We Need Your Support” options appear here." />}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? 'Donation listing'} footer={<Button onClick={() => setDetail(null)}>Close</Button>}>
        {detail && (
          <dl className="space-y-2 text-sm">
            <Row label="Listing ID" value={detail.id} mono />
            <Row label="Creator" value={detail.creatorName} />
            <Row label="Fixed amount" value={formatMoney(detail.amount, '₹')} />
            <Row label="Currency" value={detail.currency} />
            <Row label="Status" value={detail.active ? 'Active' : 'Inactive'} />
            <Row label="Portfolio visibility" value={detail.portfolioVisible ? 'Visible' : 'Hidden'} />
            <Row label="Successful supports" value={String(stats.get(detail.id)?.count ?? 0)} />
            <Row label="Total raised" value={formatMoney(stats.get(detail.id)?.total ?? 0, '₹')} />
            {detail.description && <div><dt className="text-charcoal-muted">Description</dt><dd className="text-charcoal">{detail.description}</dd></div>}
          </dl>
        )}
      </Modal>

      <Modal open={!!hideTarget} onClose={() => setHideTarget(null)} title="Hide donation listing"
        description="Removes the listing from public/portfolio display. It can be restored while the creator stays eligible."
        footer={<><Button variant="secondary" onClick={() => setHideTarget(null)}>Cancel</Button><Button variant="danger" onClick={doHide}>Hide Listing</Button></>}>
        <p className="text-sm text-charcoal">Hide <span className="font-medium">{hideTarget?.title}</span> from <span className="font-medium">{hideTarget?.creatorName}</span>?</p>
      </Modal>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-charcoal-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-charcoal' : 'text-charcoal'}>{value}</dd>
    </div>
  );
}
