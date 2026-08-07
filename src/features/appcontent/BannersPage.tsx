import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowUp, Eye, ImageOff, Pencil, Plus, Power, Smartphone, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BannerFormModal } from './BannerFormModal';
import { BannerPreview } from './BannerPreview';
import { RecommendedListingsPage } from './RecommendedListingsPage';
import { NewMusicPage } from './NewMusicPage';
import { TalkShowPage } from './TalkShowPage';
import { useData, toggleBanner, deleteBanner, moveBanner } from '../../data/store';
import type { DataState } from '../../types/users';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import {
  BANNER_STATUS_LABEL, BANNER_STATUS_TONE, LINK_TYPE_LABEL,
  BANNER_PLACEMENT_LABEL, BANNER_PLACEMENT_TONE, bannerInHome, bannerInShop,
  bannerHasImage, bannerObjectPosition, computeBannerStatus, isBannerLive,
} from '../../config/bannerLabels';
import type { BannerRecord } from '../../types/banners';

// A banner whose CTA points at an internal record that no longer exists (or is
// no longer public) is flagged Unavailable in Admin and excluded from Mobile.
function bannerLinkIssue(b: BannerRecord, data: DataState): string | null {
  if (b.linkType === 'creator') {
    const u = data.users.find((x) => x.id === b.linkedId);
    if (!u) return 'Linked creator not found';
    if (u.membershipStatus === 'suspended') return 'Creator suspended';
    return null;
  }
  if (b.linkType === 'event') {
    const e = data.events.find((x) => x.id === b.linkedId);
    if (!e) return 'Linked event not found';
    if (e.status === 'cancelled') return 'Event cancelled';
    return null;
  }
  if (b.linkType === 'product') {
    const p = data.products.find((x) => x.id === b.linkedId);
    if (!p) return 'Linked product not found';
    if (p.status === 'archived') return 'Product archived';
    return null;
  }
  return null; // external / none never block
}

// The four approved Home & App Content sections. Removed: What's New Preview,
// standalone Upcoming Events Home controls, and Previous Episodes Home controls.
const APPCONTENT_TABS = [
  { key: 'banners', label: 'Banners' },
  { key: 'music', label: 'New Music' },
  { key: 'talkshow', label: 'Talk Show' },
  { key: 'recommended', label: 'Recommended Listings' },
];

export function BannersPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') ?? 'banners';
  const valid = APPCONTENT_TABS.some((t) => t.key === raw);
  const tab = valid ? raw : 'banners';
  const setTab = (t: string) => { const n = new URLSearchParams(params); if (t === 'banners') n.delete('tab'); else n.set('tab', t); setParams(n, { replace: true }); };

  // Safely redirect obsolete/removed tabs (e.g. an old ?tab=whatsnew deep link)
  // to the first valid section instead of leaving a stale query in the URL.
  useEffect(() => {
    if (!valid && params.get('tab')) {
      const n = new URLSearchParams(params); n.delete('tab'); setParams(n, { replace: true });
    }
  }, [valid, params, setParams]);

  return (
    <div>
      <PageHeader
        title="Home & App Content"
        description="Manage every Mobile App Home section: banners, New Music, Talk Show and the curated Recommended Listings carousel."
      />
      <div className="mb-5"><Tabs tabs={APPCONTENT_TABS} active={tab} onChange={setTab} /></div>
      {tab === 'banners' && <BannersTab />}
      {tab === 'music' && <NewMusicPage />}
      {tab === 'talkshow' && <TalkShowPage />}
      {tab === 'recommended' && <RecommendedListingsPage />}
    </div>
  );
}

function BannersTab() {
  const { banners } = useData();
  const { abilities, actor } = useActor();
  const canManage = abilities.manageBanners;

  const data = useData();

  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editBanner, setEditBanner] = useState<BannerRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCarousel, setPreviewCarousel] = useState<'home' | 'shop'>('home');
  const [previewFocus, setPreviewFocus] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BannerRecord | null>(null);
  const [placementFilter, setPlacementFilter] = useState<'all' | 'home' | 'shop' | 'home_and_shop'>('all');

  // Filter + sort by the selected placement context. Home/Shop use the matching
  // per-carousel order; All / Home & Shop fall back to the legacy overall order.
  const ordered = useMemo(() => {
    const list = banners.filter((b) => {
      if (placementFilter === 'all') return true;
      if (placementFilter === 'home') return bannerInHome(b);
      if (placementFilter === 'shop') return bannerInShop(b);
      return b.placement === 'home_and_shop';
    });
    const key = placementFilter === 'home' ? 'homeDisplayOrder' : placementFilter === 'shop' ? 'shopDisplayOrder' : null;
    return list.sort((a, b) => key
      ? (a[key] ?? 0) - (b[key] ?? 0)
      : a.displayOrder - b.displayOrder);
  }, [banners, placementFilter]);

  const reorderable = placementFilter === 'home' || placementFilter === 'shop';

  // Live banners for the chosen preview carousel: in that placement, currently
  // Active + in-window, with valid linked content, in that carousel's order.
  const previewBanners = useMemo(() => {
    const inCar = previewCarousel === 'home' ? bannerInHome : bannerInShop;
    const key = previewCarousel === 'home' ? 'homeDisplayOrder' : 'shopDisplayOrder';
    return banners
      .filter((b) => inCar(b) && isBannerLive(b) && !bannerLinkIssue(b, data))
      .sort((a, b) => (a[key] ?? 0) - (b[key] ?? 0));
  }, [banners, previewCarousel, data]);

  const openAdd = () => { setEditBanner(null); setFormMode('add'); };
  const openEdit = (b: BannerRecord) => { setEditBanner(b); setFormMode('edit'); };
  const openPreview = (carousel: 'home' | 'shop', focus?: string) => { setPreviewCarousel(carousel); setPreviewFocus(focus ?? null); setPreviewOpen(true); };

  const onToggle = (b: BannerRecord) => {
    const ok = toggleBanner(b.id, actor);
    if (!ok) toast('Expired banners cannot be activated. Update the dates first.', 'error');
    else toast(b.active ? 'Banner deactivated.' : 'Banner activated.');
  };
  const doDelete = () => {
    if (!toDelete) return;
    deleteBanner(toDelete.id, actor);
    toast('Banner deleted.');
    setToDelete(null);
  };

  const orderCell = (b: BannerRecord) => {
    if (placementFilter === 'home') return b.homeDisplayOrder ?? '—';
    if (placementFilter === 'shop') return b.shopDisplayOrder ?? '—';
    return (
      <span className="whitespace-nowrap text-xs text-charcoal-muted">
        H·{b.homeDisplayOrder ?? '—'} <span className="text-cream-200">/</span> S·{b.shopDisplayOrder ?? '—'}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-lg border border-cream-200 bg-cream-100/50 px-4 py-2.5 text-sm text-charcoal-muted">
          The User App shows banner carousels on both Home and Shop. Each banner’s Placement decides where it appears — one record, never duplicated.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Compact placement filter */}
          <Select aria-label="Filter by placement" className="w-auto text-sm" value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value as typeof placementFilter)}>
            <option value="all">All placements</option>
            <option value="home">Home</option>
            <option value="shop">Shop</option>
            <option value="home_and_shop">Home &amp; Shop</option>
          </Select>
          {/* Preview selector */}
          <div className="flex overflow-hidden rounded-lg border border-cream-200">
            <button onClick={() => openPreview('home')} className="px-3 py-1.5 text-sm text-charcoal hover:bg-cream-100">Preview Home</button>
            <span className="w-px bg-cream-200" />
            <button onClick={() => openPreview('shop')} className="px-3 py-1.5 text-sm text-charcoal hover:bg-cream-100">Preview Shop</button>
          </div>
          <Button icon={<Plus className="h-4 w-4" />} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={openAdd}>Add Banner</Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="whitespace-nowrap px-4 py-3">Banner</th>
                <th className="whitespace-nowrap px-4 py-3">Title</th>
                <th className="whitespace-nowrap px-4 py-3">Placement</th>
                <th className="whitespace-nowrap px-4 py-3">Linked Content</th>
                <th className="whitespace-nowrap px-4 py-3">Display Period</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Order</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {ordered.map((b, i) => {
                const status = computeBannerStatus(b);
                const issue = bannerLinkIssue(b, data);
                const previewFrom: 'home' | 'shop' = bannerInHome(b) ? 'home' : 'shop';
                return (
                  <tr key={b.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => openPreview(previewFrom, b.id)} className="flex items-center gap-2 text-left">
                        {bannerHasImage(b) ? (
                          <img src={b.imageUrl} alt="" className="h-9 w-14 shrink-0 rounded-md object-cover" style={{ objectPosition: bannerObjectPosition(b.imagePosition) }} />
                        ) : (
                          <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-cream-200 bg-cream-100 text-charcoal-muted"><ImageOff className="h-4 w-4" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[120px] truncate text-xs text-charcoal-muted">{b.label || '—'}</span>
                          {!bannerHasImage(b) && <span className="block text-[11px] font-medium text-amber-700">Missing image</span>}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><span className="block max-w-[180px] truncate font-medium text-charcoal">{b.title}</span></td>
                    <td className="px-4 py-3"><Badge tone={BANNER_PLACEMENT_TONE[b.placement]}>{BANNER_PLACEMENT_LABEL[b.placement]}</Badge></td>
                    <td className="px-4 py-3">
                      <span className="text-charcoal">{LINK_TYPE_LABEL[b.linkType]}</span>
                      {b.linkType !== 'none' && <span className="block max-w-[150px] truncate text-xs text-charcoal-muted">{b.linkType === 'external' ? b.externalUrl : b.linkedName}</span>}
                      {issue && <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700" title={`${issue} — excluded from the Mobile carousel until fixed.`}><AlertTriangle className="h-3.5 w-3.5" />Unavailable</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                    <td className="px-4 py-3"><Badge tone={BANNER_STATUS_TONE[status]}>{BANNER_STATUS_LABEL[status]}</Badge></td>
                    <td className="px-4 py-3 text-charcoal">{orderCell(b)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: `Preview in ${previewFrom === 'home' ? 'Home' : 'Shop'}`, icon: <Eye className="h-4 w-4" />, onClick: () => openPreview(previewFrom, b.id) },
                            { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(b), disabled: !canManage, disabledHint: RESTRICTED_HINT },
                            { label: b.active ? 'Deactivate' : 'Activate', icon: <Power className="h-4 w-4" />, onClick: () => onToggle(b), disabled: !canManage, disabledHint: RESTRICTED_HINT },
                            { label: reorderable ? `Move Up (${placementFilter === 'home' ? 'Home' : 'Shop'})` : 'Move Up', icon: <ArrowUp className="h-4 w-4" />, onClick: () => reorderable && moveBanner(b.id, 'up', placementFilter as 'home' | 'shop', actor), disabled: !canManage || !reorderable || i === 0, disabledHint: reorderable ? RESTRICTED_HINT : 'Filter by Home or Shop to reorder that carousel.' },
                            { label: reorderable ? `Move Down (${placementFilter === 'home' ? 'Home' : 'Shop'})` : 'Move Down', icon: <ArrowDown className="h-4 w-4" />, onClick: () => reorderable && moveBanner(b.id, 'down', placementFilter as 'home' | 'shop', actor), disabled: !canManage || !reorderable || i === ordered.length - 1, disabledHint: reorderable ? RESTRICTED_HINT : 'Filter by Home or Shop to reorder that carousel.' },
                            { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setToDelete(b), disabled: !canManage, disabledHint: RESTRICTED_HINT },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ordered.length === 0 && (
          <EmptyState icon={<Smartphone className="h-6 w-6" />} title="No banners here" description={placementFilter === 'all' ? 'Add a banner to feature it on Home or Shop.' : 'No banners match this placement filter.'} action={canManage && placementFilter === 'all' ? <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>Add Banner</Button> : undefined} />
        )}
      </div>
      {!reorderable && ordered.length > 1 && (
        <p className="mt-2 text-xs text-charcoal-muted">Tip: filter by <span className="font-medium">Home</span> or <span className="font-medium">Shop</span> to reorder that carousel — Home and Shop keep independent orders.</p>
      )}

      {formMode && <BannerFormModal banner={formMode === 'edit' ? editBanner : null} mode={formMode} onClose={() => setFormMode(null)} />}
      <BannerPreview open={previewOpen} carousel={previewCarousel} banners={previewBanners} focusId={previewFocus} onClose={() => setPreviewOpen(false)} />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete Banner"
        description="Removes only this banner. The connected creator, event or product is not deleted."
        footer={<><Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button><Button variant="danger" onClick={doDelete}>Delete Banner</Button></>}>
        <p className="text-sm text-charcoal">Delete <span className="font-medium">{toDelete?.title}</span> from {toDelete ? BANNER_PLACEMENT_LABEL[toDelete.placement] : ''} banner{toDelete?.placement === 'home_and_shop' ? ' carousels' : ' carousel'}?</p>
      </Modal>
    </div>
  );
}
