import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { useData, addBanner, updateBanner } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import {
  BANNER_IMAGES, bannerImageCss, LINK_TYPES, LINK_TYPE_LABEL,
  BANNER_STATUS_LABEL, BANNER_STATUS_TONE, computeBannerStatus, isValidHttpUrl,
  PLACEMENTS, BANNER_PLACEMENT_OPTION_LABEL,
} from '../../config/bannerLabels';
import type { BannerLinkType, BannerPlacement, BannerRecord } from '../../types/banners';

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : '');

export function BannerFormModal({ banner, mode, onClose }: { banner: BannerRecord | null; mode: 'add' | 'edit'; onClose: () => void }) {
  const { users, events, products } = useData();
  const { actor } = useActor();

  const creators = users.filter((u) => u.accountType === 'creator');

  const [title, setTitle] = useState('');
  const [supporting, setSupporting] = useState('');
  const [image, setImage] = useState(BANNER_IMAGES[0].key);
  const [label, setLabel] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [placement, setPlacement] = useState<BannerPlacement>('home');
  const [linkType, setLinkType] = useState<BannerLinkType>('none');
  const [linkedId, setLinkedId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const open = mode === 'add' || !!banner;
  const key = open ? (banner?.id ?? 'new') : null;
  if (key !== seenKey) {
    setSeenKey(key);
    setTitle(banner?.title ?? '');
    setSupporting(banner?.supportingText ?? '');
    setImage(banner?.image ?? BANNER_IMAGES[0].key);
    setLabel(banner?.label ?? '');
    setCtaLabel(banner?.ctaLabel ?? '');
    setPlacement(banner?.placement ?? 'home');
    setLinkType(banner?.linkType ?? 'none');
    setLinkedId(banner?.linkedId ?? '');
    setExternalUrl(banner?.externalUrl ?? '');
    setStartDate(toDateInput(banner?.startDate ?? new Date().toISOString()));
    setEndDate(toDateInput(banner?.endDate ?? new Date(Date.now() + 14 * 86400000).toISOString()));
    setActive(banner?.active ?? true);
    setError(null);
  }
  if (!open) return null;

  const linkOptions = linkType === 'creator'
    ? creators.map((c) => ({ id: c.id, name: c.name }))
    : linkType === 'event'
      ? events.map((e) => ({ id: e.id, name: e.title }))
      : linkType === 'product'
        ? products.map((p) => ({ id: p.id, name: p.title }))
        : [];

  const needsLinked = linkType === 'creator' || linkType === 'event' || linkType === 'product';

  // Live status preview from the chosen dates + active flag. Guard against a
  // partially-typed/empty date (new Date('') would throw "Invalid time value").
  const safeIso = (d: string) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? null : new Date(t).toISOString(); };
  const sIso = safeIso(startDate), eIso = safeIso(endDate);
  const previewStatus = sIso && eIso
    ? computeBannerStatus({ active, startDate: sIso, endDate: eIso } as BannerRecord)
    : active ? 'active' : 'inactive';

  const submit = () => {
    if (!title.trim()) return setError('Banner title is required.');
    if (!image) return setError('Banner image is required.');
    if (!startDate || !endDate) return setError('Start and end dates are required.');
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) return setError('Start date cannot be after end date.');
    if (needsLinked && !linkedId) return setError('Select the linked content for this CTA.');
    if (linkType === 'external' && !isValidHttpUrl(externalUrl.trim())) return setError('Enter a valid http(s) URL for the external announcement.');

    const linkedName = needsLinked ? linkOptions.find((o) => o.id === linkedId)?.name ?? null : null;
    const input = {
      title: title.trim(),
      supportingText: supporting.trim(),
      image,
      label: label.trim(),
      ctaLabel: linkType === 'none' ? '' : ctaLabel.trim() || 'Learn More',
      placement,
      linkType,
      linkedId: needsLinked ? linkedId : null,
      linkedName,
      externalUrl: linkType === 'external' ? externalUrl.trim() : null,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      active,
    };
    if (mode === 'add') addBanner(input, actor);
    else if (banner) updateBanner(banner.id, input, actor);
    toast(mode === 'add' ? 'Banner added.' : 'Banner updated.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'add' ? 'Add Banner' : 'Edit Banner'} size="lg"
      description="Only Active banners within their date window appear in the mobile Home carousel."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>{mode === 'add' ? 'Add Banner' : 'Save Changes'}</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        {/* Mini preview */}
        <div className="overflow-hidden rounded-xl" style={{ background: bannerImageCss(image) }}>
          <div className="bg-charcoal/25 p-4 text-white">
            {label && <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-medium">{label}</span>}
            <p className="mt-1 font-serif text-lg font-medium">{title || 'Banner title'}</p>
            <p className="text-xs text-white/90">{supporting || 'Short supporting text'}</p>
            {linkType !== 'none' && <span className="mt-2 inline-block rounded-md bg-white px-2.5 py-1 text-xs font-medium text-charcoal">{ctaLabel || 'Learn More'}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Banner title" htmlFor="bf-title" required><Input id="bf-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Small label" htmlFor="bf-label" hint="e.g. Artist Spotlight"><Input id="bf-label" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        </div>
        <Field label="Short supporting text" htmlFor="bf-support"><Textarea id="bf-support" rows={2} value={supporting} onChange={(e) => setSupporting(e.target.value)} /></Field>

        <Field label="Mobile banner image" htmlFor="bf-image" required hint="Prototype gradient placeholder — no upload.">
          <div className="flex flex-wrap gap-2">
            {BANNER_IMAGES.map((img) => (
              <button key={img.key} type="button" onClick={() => setImage(img.key)} title={img.label}
                className={`h-9 w-14 rounded-md border-2 ${image === img.key ? 'border-magenta-500' : 'border-transparent'}`} style={{ background: img.css }} />
            ))}
          </div>
        </Field>

        <Field label="Banner placement" htmlFor="bf-placement" required hint="Which Mobile carousel(s) this banner appears in.">
          <Select id="bf-placement" value={placement} onChange={(e) => setPlacement(e.target.value as BannerPlacement)}>
            {PLACEMENTS.map((p) => <option key={p} value={p}>{BANNER_PLACEMENT_OPTION_LABEL[p]}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Linked content" htmlFor="bf-linktype" required>
            <Select id="bf-linktype" value={linkType} onChange={(e) => { setLinkType(e.target.value as BannerLinkType); setLinkedId(''); }}>
              {LINK_TYPES.map((t) => <option key={t} value={t}>{LINK_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="CTA label" htmlFor="bf-cta" hint={linkType === 'none' ? 'No CTA for “No Link”' : undefined}>
            <Input id="bf-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} disabled={linkType === 'none'} placeholder="e.g. View Profile" />
          </Field>
        </div>

        {needsLinked && (
          <Field label={`Select ${LINK_TYPE_LABEL[linkType]}`} htmlFor="bf-linked" required>
            <Select id="bf-linked" value={linkedId} onChange={(e) => setLinkedId(e.target.value)}>
              <option value="">Choose…</option>
              {linkOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </Field>
        )}
        {linkType === 'external' && (
          <Field label="External URL (CTA destination)" htmlFor="bf-url" required>
            <Input id="bf-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://example.com/announcement" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" htmlFor="bf-start" required><Input id="bf-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="End date" htmlFor="bf-end" required><Input id="bf-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-cream-200 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <input id="bf-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-magenta-500" />
            <label htmlFor="bf-active" className="text-sm text-charcoal">Active</label>
          </div>
          <span className="flex items-center gap-2 text-xs text-charcoal-muted">
            Resulting status
            <Badge tone={BANNER_STATUS_TONE[previewStatus]}>{BANNER_STATUS_LABEL[previewStatus]}</Badge>
          </span>
        </div>
        {previewStatus === 'expired' && active && (
          <p className="text-xs text-amber-700">This date window is in the past — the banner will show as Expired and will not appear in the carousel even while Active.</p>
        )}
      </div>
    </Modal>
  );
}
