import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Power, Smartphone, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BannerFormModal } from './BannerFormModal';
import { BannerPreview } from './BannerPreview';
import { RecommendedListingsPage } from './RecommendedListingsPage';
import { NewMusicPage } from './NewMusicPage';
import { TalkShowPage } from './TalkShowPage';
import { useData, toggleBanner, deleteBanner, moveBanner } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import {
  BANNER_STATUS_LABEL, BANNER_STATUS_TONE, LINK_TYPE_LABEL,
  bannerImageCss, computeBannerStatus, isBannerLive,
} from '../../config/bannerLabels';
import type { BannerRecord } from '../../types/banners';

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

  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editBanner, setEditBanner] = useState<BannerRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFocus, setPreviewFocus] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BannerRecord | null>(null);

  const ordered = useMemo(() => [...banners].sort((a, b) => a.displayOrder - b.displayOrder), [banners]);

  const liveBanners = useMemo(() => banners.filter((b) => isBannerLive(b)), [banners]);

  const openAdd = () => { setEditBanner(null); setFormMode('add'); };
  const openEdit = (b: BannerRecord) => { setEditBanner(b); setFormMode('edit'); };
  const openPreview = (focus?: string) => { setPreviewFocus(focus ?? null); setPreviewOpen(true); };

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

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-lg border border-cream-200 bg-cream-100/50 px-4 py-2.5 text-sm text-charcoal-muted">
          Admin controls only this top banner carousel. All other mobile Home sections use their existing connected data and fixed design.
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" icon={<Smartphone className="h-4 w-4" />} onClick={() => openPreview()}>Preview Carousel</Button>
          <Button icon={<Plus className="h-4 w-4" />} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={openAdd}>Add Banner</Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Linked Content</th>
                <th className="px-4 py-3">Display Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {ordered.map((b, i) => {
                const status = computeBannerStatus(b);
                return (
                  <tr key={b.id} className="group hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <button onClick={() => openPreview(b.id)} className="flex items-center gap-2 text-left">
                        <span className="h-9 w-14 shrink-0 rounded-md" style={{ background: bannerImageCss(b.image) }} />
                        <span className="text-xs text-charcoal-muted">{b.label || '—'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><span className="block max-w-[200px] truncate font-medium text-charcoal">{b.title}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-charcoal">{LINK_TYPE_LABEL[b.linkType]}</span>
                      {b.linkType !== 'none' && <span className="block max-w-[160px] truncate text-xs text-charcoal-muted">{b.linkType === 'external' ? b.externalUrl : b.linkedName}</span>}
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                    <td className="px-4 py-3"><Badge tone={BANNER_STATUS_TONE[status]}>{BANNER_STATUS_LABEL[status]}</Badge></td>
                    <td className="px-4 py-3 text-charcoal">{b.displayOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'Preview', icon: <Eye className="h-4 w-4" />, onClick: () => openPreview(b.id) },
                            { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(b), disabled: !canManage, disabledHint: RESTRICTED_HINT },
                            { label: b.active ? 'Deactivate' : 'Activate', icon: <Power className="h-4 w-4" />, onClick: () => onToggle(b), disabled: !canManage, disabledHint: RESTRICTED_HINT },
                            { label: 'Move Up', icon: <ArrowUp className="h-4 w-4" />, onClick: () => moveBanner(b.id, 'up', actor), disabled: !canManage || i === 0, disabledHint: RESTRICTED_HINT },
                            { label: 'Move Down', icon: <ArrowDown className="h-4 w-4" />, onClick: () => moveBanner(b.id, 'down', actor), disabled: !canManage || i === ordered.length - 1, disabledHint: RESTRICTED_HINT },
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
          <EmptyState icon={<Smartphone className="h-6 w-6" />} title="No banners yet" description="Add a banner to feature it on the mobile Home screen." action={canManage ? <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>Add Banner</Button> : undefined} />
        )}
      </div>

      {formMode && <BannerFormModal banner={formMode === 'edit' ? editBanner : null} mode={formMode} onClose={() => setFormMode(null)} />}
      <BannerPreview open={previewOpen} banners={liveBanners} focusId={previewFocus} onClose={() => setPreviewOpen(false)} />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete Banner"
        description="Removes only this banner. The connected creator, event or product is not deleted."
        footer={<><Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button><Button variant="danger" onClick={doDelete}>Delete Banner</Button></>}>
        <p className="text-sm text-charcoal">Delete <span className="font-medium">{toDelete?.title}</span> from the Home banner carousel?</p>
      </Modal>
    </div>
  );
}
