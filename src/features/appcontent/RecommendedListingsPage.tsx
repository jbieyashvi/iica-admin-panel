import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData, saveRecommendedDraft, publishRecommendedSection } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatMoney } from '../../lib/format';
import { buildListingCatalog, resolveListing, LISTING_TYPE_LABEL } from '../../data/recommendedListings';
import type { ListingType, SelectedListing } from '../../types/recommended';
import type { ListingCard } from '../../data/recommendedListings';

const TYPES: ListingType[] = ['physical_product', 'digital_product', 'masterclass', 'event', 'second_hand_instrument', 'donation'];
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
  const [selected, setSelected] = useState<SelectedListing[]>(
    [...section.selectedListings].sort((a, b) => a.displayOrder - b.displayOrder),
  );

  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [cat, setCat] = useState('all');
  const [paid, setPaid] = useState('all');
  const [priceRange, setPriceRange] = useState('any');
  const [publishOpen, setPublishOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
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
  const clearAll = () => { setSelected([]); setClearOpen(false); toast('Selection cleared. Save Draft or Publish to apply.'); };

  const config = () => ({ heading: heading.trim(), description: description.trim() || undefined, selectedListings: selected });

  const unavailableCount = selectedCards.filter(({ card }) => !card || !card.available).length;

  // Validation. Heading is always required; scheduling/visibility are gone.
  const validate = (forPublish: boolean): string | null => {
    if (heading.trim().length > 60) return 'Heading must be 60 characters or fewer.';
    if (description.trim().length > 160) return 'Description must be 160 characters or fewer.';
    if (!heading.trim()) return 'Section heading is required.';
    if (forPublish && selected.length === 0) return 'Add at least one listing before publishing.';
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

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-charcoal">Recommended Listings</h2>
          <p className="text-sm text-charcoal-muted">The primary curated Mobile Home carousel. Mix products, classes, events, instruments and donations under an editable heading (e.g. Festival Specials, Weekend Workshops, Everything Under ₹250). Events appear on Home only when selected here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Smartphone className="h-4 w-4" />} onClick={() => setPreviewOpen(true)}>Preview Mobile Section</Button>
          <Button variant="secondary" onClick={onSaveDraft} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Save Draft</Button>
          <Button onClick={() => setPublishOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Save &amp; Publish</Button>
        </div>
      </div>

      {/* Section configuration — heading + description only. Visibility, scheduling
          and infinite-loop are no longer configurable (carousel is always infinite;
          Draft/Published is the only state). */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-charcoal">Section Configuration</h3>
          <Badge tone={section.state === 'published' ? 'green' : 'amber'}>{section.state === 'published' ? 'Published' : 'Draft'}</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Section heading" required hint={`${heading.length}/60`}>
            <Input value={heading} maxLength={60} onChange={(e) => setHeading(e.target.value)} placeholder="e.g. Recommended Shopping" />
          </Field>
          <Field label="Short description (optional)" hint={`${description.length}/160`}>
            <Input value={description} maxLength={160} onChange={(e) => setDescription(e.target.value)} placeholder="Optional supporting text shown under the heading." />
          </Field>
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
            {selected.length > 0 && canManage && <button onClick={() => setClearOpen(true)} className="text-xs font-medium text-charcoal-muted hover:text-red-600">Clear all</button>}
          </div>
          <p className="mb-2 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Listings render on Mobile Home in this exact order as one horizontal carousel. No fixed maximum — 10, 50 or more are supported. Store order here is independent of the source records.</p>
          {unavailableCount > 0 && (
            <p className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-medium">{unavailableCount} selected {unavailableCount === 1 ? 'listing is' : 'listings are'} unavailable.</span> They stay listed here but are excluded from the Mobile carousel until their source becomes public again. Source records are unchanged.
            </p>
          )}
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
                  <Badge tone={card && card.available ? 'neutral' : 'red'}>{card && card.available ? `#${i + 1}` : 'Unavailable'}</Badge>
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

      {/* Clear all confirm */}
      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Clear all selected listings"
        description="Empties the working selection. Source products, classes, events, instruments and donations are not deleted."
        footer={<><Button variant="secondary" onClick={() => setClearOpen(false)}>Cancel</Button><Button variant="danger" onClick={clearAll}>Clear Selection</Button></>}>
        <p className="text-sm text-charcoal">Remove all <span className="font-medium">{selected.length}</span> listing{selected.length === 1 ? '' : 's'} from the selection? This affects only what the carousel shows once you Save.</p>
      </Modal>

      {/* Mobile preview */}
      <MobilePreview open={previewOpen} onClose={() => setPreviewOpen(false)}
        heading={heading} description={description} state={section.state} unavailableCount={unavailableCount}
        cards={selectedCards.map((x) => x.card).filter((c): c is ListingCard => !!c && c.available)} />
    </div>
  );
}

function MobilePreview({ open, onClose, heading, description, state, unavailableCount, cards }: {
  open: boolean; onClose: () => void; heading: string; description: string;
  state: 'draft' | 'published'; unavailableCount: number; cards: ListingCard[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="Mobile Carousel Preview" description="Prototype preview of the final Mobile Home carousel — no product, class or event record is changed."
      footer={<Button onClick={onClose}>Close</Button>}>
      {/* State + fixed carousel behaviour */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Badge tone={state === 'published' ? 'green' : 'amber'}>{state === 'published' ? 'Published — available to Mobile' : 'Draft — not on Mobile'}</Badge>
        <Badge tone="magenta">Infinite carousel</Badge>
      </div>

      {/* Unavailable warning lives OUTSIDE the phone frame */}
      {unavailableCount > 0 && (
        <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {unavailableCount} unavailable {unavailableCount === 1 ? 'listing is' : 'listings are'} hidden from this carousel until republished as public.
        </p>
      )}

      <div className="mx-auto max-w-[320px] rounded-2xl border border-cream-200 bg-cream-50 p-3">
        <div className="mb-2 min-w-0">
          <p className="truncate font-serif text-base font-medium text-charcoal">{heading || 'Section heading'}</p>
          {description && <p className="truncate text-xs text-charcoal-muted">{description}</p>}
        </div>
        {/* One horizontal carousel — a partial next card peeks to signal scroll. */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pr-6">
            {cards.length === 0 ? (
              <p className="w-full py-6 text-center text-xs text-charcoal-muted">No available listings to show.</p>
            ) : cards.map((c) => (
              <div key={c.id} className="w-28 shrink-0 rounded-xl border border-cream-200 bg-white p-2">
                <div className="mb-1 h-16 rounded-lg bg-cream-100" />
                <p className="truncate text-xs font-medium text-charcoal">{c.title}</p>
                <p className="truncate text-[11px] text-charcoal-muted">{c.typeLabel}</p>
                <p className="truncate text-[11px] text-charcoal-muted">{c.free ? 'Free' : formatMoney(c.price, '₹')}</p>
              </div>
            ))}
          </div>
          {cards.length > 0 && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-cream-50 to-transparent" />}
        </div>
        {cards.length > 0 && (
          <p className="mt-2 text-center text-[11px] text-charcoal-muted">
            {cards.length} card{cards.length === 1 ? '' : 's'} · swipe horizontally · loops end-to-end continuously
          </p>
        )}
      </div>
    </Modal>
  );
}
