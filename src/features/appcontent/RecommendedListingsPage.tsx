import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData, saveRecommendedDraft, publishRecommendedSection, hideRecommendedSection } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatMoney } from '../../lib/format';
import { buildListingCatalog, resolveListing, LISTING_TYPE_LABEL } from '../../data/recommendedListings';
import { HOME_PREVIEW_COUNT } from '../../types/recommended';
import type { ListingType, SelectedListing } from '../../types/recommended';
import type { ListingCard } from '../../data/recommendedListings';

const TYPES: ListingType[] = ['physical_product', 'digital_product', 'masterclass', 'event', 'donation'];
const PRICE_RANGES = [
  { key: 'any', label: 'Any price', test: () => true },
  { key: 'u250', label: 'Under ₹250', test: (p: number) => p > 0 && p < 250 },
  { key: '250_1000', label: '₹250–₹1,000', test: (p: number) => p >= 250 && p <= 1000 },
  { key: 'o1000', label: 'Over ₹1,000', test: (p: number) => p > 1000 },
];

const priceLabel = (c: ListingCard) => (c.free ? 'Free' : formatMoney(c.price, '₹'));

export function RecommendedListingsPage() {
  const data = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const canManage = abilities.manageBanners;
  const section = data.recommendedSection;

  // Working (draft) state, initialised from the stored section.
  const [heading, setHeading] = useState(section.heading);
  const [description, setDescription] = useState(section.description ?? '');
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [startAt, setStartAt] = useState(section.startAt ?? '');
  const [endAt, setEndAt] = useState(section.endAt ?? '');
  const [selected, setSelected] = useState<SelectedListing[]>(
    [...section.selectedListings].sort((a, b) => a.displayOrder - b.displayOrder),
  );

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [cat, setCat] = useState('all');
  const [paid, setPaid] = useState('all');
  const [priceRange, setPriceRange] = useState('any');
  const [publishOpen, setPublishOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const catalog = useMemo(() => buildListingCatalog(data), [data]);
  const selectedIds = new Set(selected.map((s) => s.listingId));
  const categories = useMemo(() => [...new Set(catalog.map((c) => c.category))].sort(), [catalog]);

  const available = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.key === priceRange)!;
    return catalog.filter((c) => {
      if (!c.available) return false;          // only eligible listings can be selected
      if (selectedIds.has(c.id)) return false; // prevent duplicates
      if (q) { const hay = `${c.title} ${c.id} ${c.creator} ${c.category}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
      if (type !== 'all' && c.type !== type) return false;
      if (cat !== 'all' && c.category !== cat) return false;
      if (paid === 'free' && !c.free) return false;
      if (paid === 'paid' && c.free) return false;
      if (!range.test(c.price)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, q, type, cat, paid, priceRange, selected]);

  // Resolve selected listings to live cards (may be unavailable).
  const selectedCards = useMemo(
    () => selected.map((s) => ({ sel: s, card: resolveListing(data, s.listingId, s.listingType) })),
    [data, selected],
  );

  const reindex = (list: SelectedListing[]) => list.map((s, i) => ({ ...s, displayOrder: i }));
  const addListing = (c: ListingCard) => setSelected((prev) => reindex([...prev, { listingId: c.id, listingType: c.type, displayOrder: prev.length }]));
  const removeListing = (id: string) => setSelected((prev) => reindex(prev.filter((s) => s.listingId !== id)));
  const move = (i: number, dir: -1 | 1) => setSelected((prev) => {
    const j = i + dir; if (j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return reindex(next);
  });
  const clearAll = () => setSelected([]);

  const config = () => ({ heading: heading.trim(), description: description.trim() || undefined, isVisible, startAt: startAt || null, endAt: endAt || null, selectedListings: selected });

  // Validation.
  const validate = (forPublish: boolean): string | null => {
    if (heading.length > 60) return 'Heading must be 60 characters or fewer.';
    if (description.length > 160) return 'Description must be 160 characters or fewer.';
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) return 'End date cannot be earlier than start date.';
    if (isVisible && !heading.trim()) return 'Heading is required when the section is shown.';
    if (forPublish && isVisible && selected.length === 0) return 'Cannot publish an active section without selected listings.';
    return null;
  };

  const onSaveDraft = () => {
    const err = validate(false);
    if (err) return toast(err, 'error');
    saveRecommendedDraft(config(), actor);
    toast('Draft saved. Published Mobile content is unchanged.');
  };
  const onPublish = () => {
    const err = validate(true);
    if (err) { setPublishOpen(false); return toast(err, 'error'); }
    publishRecommendedSection(config(), actor);
    setPublishOpen(false);
    toast('Recommended section published to Mobile Home.');
  };
  const onHide = () => {
    hideRecommendedSection(actor);
    setIsVisible(false);
    setHideOpen(false);
    toast('Section hidden from Mobile Home. Configuration preserved.');
  };

  const homeCount = Math.min(HOME_PREVIEW_COUNT, selected.length);

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-charcoal">Recommended Listings</h2>
          <p className="text-sm text-charcoal-muted">Curate products, classes and events displayed in a promotional section on the Mobile App Home screen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Smartphone className="h-4 w-4" />} onClick={() => setPreviewOpen(true)}>Preview Mobile Section</Button>
          <Button variant="secondary" onClick={onSaveDraft} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Save Draft</Button>
          <Button onClick={() => setPublishOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Save &amp; Publish</Button>
        </div>
      </div>

      {/* Section configuration */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-charcoal">Section Configuration</h3>
          <div className="flex items-center gap-2">
            <Badge tone={section.state === 'published' ? 'green' : 'amber'}>{section.state === 'published' ? 'Published' : 'Draft'}</Badge>
            <Button variant="secondary" size="sm" onClick={() => setHideOpen(true)} disabled={!canManage || !isVisible}>Hide Section</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Section heading" required hint={`${heading.length}/60`}>
            <Input value={heading} maxLength={60} onChange={(e) => setHeading(e.target.value)} placeholder="e.g. Recommended Shopping" />
          </Field>
          <Field label="Section visibility">
            <Select value={isVisible ? 'shown' : 'hidden'} onChange={(e) => setIsVisible(e.target.value === 'shown')}>
              <option value="shown">Shown</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <Field label="Short description (optional)" hint={`${description.length}/160`}>
            <Textarea rows={2} value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} placeholder="Optional supporting text shown under the heading." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start (optional)"><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field>
            <Field label="End (optional)"><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Available listings */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-charcoal">Available Listings</h3>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, ID, creator or category…" aria-label="Search listings" className="input-base pl-9" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Select className="text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{LISTING_TYPE_LABEL[t]}</option>)}
            </Select>
            <Select className="text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select className="text-sm" value={paid} onChange={(e) => setPaid(e.target.value)}>
              <option value="all">Free or Paid</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </Select>
            <Select className="text-sm" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
              {PRICE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </div>
          <p className="mb-2 text-xs text-charcoal-muted">{available.length} eligible listing{available.length === 1 ? '' : 's'} — Draft / Hidden / Archived / Out-of-stock / Cancelled / Expired / suspended-creator listings are excluded.</p>
          <ul className="max-h-[420px] space-y-1.5 overflow-y-auto">
            {available.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg border border-cream-200 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-charcoal">{c.title}</span>
                  <span className="block truncate text-xs text-charcoal-muted">{c.typeLabel} · {c.creator} · {priceLabel(c)}</span>
                </span>
                <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} disabled={!canManage} onClick={() => addListing(c)}>Add</Button>
              </li>
            ))}
            {available.length === 0 && <li><EmptyState title="No eligible listings" description="Adjust the search or filters above." /></li>}
          </ul>
        </div>

        {/* Selected listings */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-charcoal">Selected Listings <span className="text-charcoal-muted">({selected.length})</span></h3>
            {selected.length > 0 && canManage && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-red-600">Clear all</button>}
          </div>
          <p className="mb-2 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Keep the first 6–8 listings most relevant — they appear first on the Mobile App Home screen. Additional listings show under “View All”.</p>
          {selected.length === 0 ? (
            <EmptyState title="No listings selected" description="Add eligible listings from the left." />
          ) : (
            <ul className="space-y-1.5">
              {selectedCards.map(({ sel, card }, i) => (
                <li key={sel.listingId} className="flex items-center gap-2 rounded-lg border border-cream-200 p-2.5">
                  <span className="flex shrink-0 flex-col">
                    <button onClick={() => move(i, -1)} disabled={!canManage || i === 0} className="rounded p-0.5 text-charcoal-muted hover:bg-cream-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={!canManage || i === selected.length - 1} className="rounded p-0.5 text-charcoal-muted hover:bg-cream-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </span>
                  <Badge tone={i < homeCount ? 'magenta' : 'neutral'}>{i < homeCount ? 'Home Preview' : 'View All'}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-charcoal">{card ? card.title : sel.listingId}</span>
                    <span className="block truncate text-xs text-charcoal-muted">
                      {card ? `${card.typeLabel} · ${card.creator} · ${priceLabel(card)}` : LISTING_TYPE_LABEL[sel.listingType]}
                      {(!card || !card.available) && <span className="ml-1 font-medium text-red-600">· Unavailable{card?.reason ? ` (${card.reason})` : ''}</span>}
                    </span>
                  </span>
                  {card && <button onClick={() => navigate(card.route)} className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="Open source"><ExternalLink className="h-4 w-4" /></button>}
                  <button onClick={() => removeListing(sel.listingId)} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-red-600 disabled:opacity-30" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Publish confirm */}
      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Save & Publish section"
        description="Publishes the heading, description and selected listings to the Mobile App Home screen, replacing the previous published configuration."
        footer={<><Button variant="secondary" onClick={() => setPublishOpen(false)}>Cancel</Button><Button onClick={onPublish}>Publish</Button></>}>
        <p className="text-sm text-charcoal">Publish <span className="font-medium">{selected.length}</span> listing{selected.length === 1 ? '' : 's'} under “{heading || 'Untitled'}”. Source products, classes and events are not changed.</p>
      </Modal>

      {/* Hide confirm */}
      <Modal open={hideOpen} onClose={() => setHideOpen(false)} title="Hide section"
        description="Removes the section from Mobile Home. Configuration and selected listings are preserved for later restoration."
        footer={<><Button variant="secondary" onClick={() => setHideOpen(false)}>Cancel</Button><Button variant="danger" onClick={onHide}>Hide Section</Button></>}>
        <p className="text-sm text-charcoal">Hide the Recommended Listings section from the Mobile App Home screen?</p>
      </Modal>

      {/* Mobile preview */}
      <MobilePreview open={previewOpen} onClose={() => setPreviewOpen(false)}
        heading={heading} description={description} isVisible={isVisible} startAt={startAt} endAt={endAt}
        cards={selectedCards.map((x) => x.card).filter((c): c is ListingCard => !!c && c.available)} homeCount={homeCount} />
    </div>
  );
}

function MobilePreview({ open, onClose, heading, description, isVisible, startAt, endAt, cards, homeCount }: {
  open: boolean; onClose: () => void; heading: string; description: string; isVisible: boolean; startAt: string; endAt: string; cards: ListingCard[]; homeCount: number;
}) {
  const homeCards = cards.slice(0, homeCount);
  const scheduled = !!(startAt || endAt);
  return (
    <Modal open={open} onClose={onClose} title="Mobile Section Preview" description="Prototype preview — does not change any product or event record."
      footer={<Button onClick={onClose}>Close</Button>}>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge tone={isVisible ? 'green' : 'neutral'}>{isVisible ? 'Shown on Home' : 'Hidden'}</Badge>
        {scheduled && <Badge tone="blue">Scheduled{startAt ? ` from ${formatDate(startAt)}` : ''}{endAt ? ` to ${formatDate(endAt)}` : ''}</Badge>}
      </div>
      <div className="mx-auto max-w-[320px] rounded-2xl border border-cream-200 bg-cream-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate font-serif text-base font-medium text-charcoal">{heading || 'Section heading'}</p>
            {description && <p className="truncate text-xs text-charcoal-muted">{description}</p>}
          </div>
          <span className="shrink-0 text-xs font-medium text-magenta-600">View All ›</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {homeCards.length === 0 ? (
            <p className="py-6 text-center text-xs text-charcoal-muted">No listings selected.</p>
          ) : homeCards.map((c) => (
            <div key={c.id} className="w-28 shrink-0 rounded-xl border border-cream-200 bg-white p-2">
              <div className="mb-1 h-16 rounded-lg bg-cream-100" />
              <p className="truncate text-xs font-medium text-charcoal">{c.title}</p>
              <p className="truncate text-[11px] text-charcoal-muted">{c.free ? 'Free' : formatMoney(c.price, '₹')}</p>
            </div>
          ))}
        </div>
        {cards.length > homeCount && <p className="mt-2 text-center text-[11px] text-charcoal-muted">+{cards.length - homeCount} more under View All</p>}
      </div>
    </Modal>
  );
}
