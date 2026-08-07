import { useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { useData, addBanner, updateBanner } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { processBannerImage } from '../../lib/bannerImage';
import {
  LINK_TYPES, LINK_TYPE_LABEL, BANNER_STATUS_LABEL, BANNER_STATUS_TONE, computeBannerStatus,
  isValidHttpUrl, PLACEMENTS, BANNER_PLACEMENT_OPTION_LABEL, bannerObjectPosition,
  BANNER_IMAGE_HINT, BANNER_ACCEPT_ATTR, BANNER_LABEL_MAX, BANNER_TITLE_MAX,
  BANNER_SUPPORT_MAX, BANNER_CTA_MAX,
} from '../../config/bannerLabels';
import type { BannerImagePosition, BannerLinkType, BannerPlacement, BannerRecord } from '../../types/banners';

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : '');
const fmtBytes = (n?: number) => (n == null ? '' : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const POSITIONS: BannerImagePosition[] = ['left', 'center', 'right'];

export function BannerFormModal({ banner, mode, onClose }: { banner: BannerRecord | null; mode: 'add' | 'edit'; onClose: () => void }) {
  const { users, events, products } = useData();
  const { actor } = useActor();

  const creators = users.filter((u) => u.accountType === 'creator');
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [supporting, setSupporting] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);
  const [imageSize, setImageSize] = useState<number | undefined>(undefined);
  const [imagePosition, setImagePosition] = useState<BannerImagePosition>('center');
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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const open = mode === 'add' || !!banner;
  const key = open ? (banner?.id ?? 'new') : null;
  if (key !== seenKey) {
    setSeenKey(key);
    setTitle(banner?.title ?? '');
    setSupporting(banner?.supportingText ?? '');
    setImageUrl(banner?.imageUrl ?? '');
    setImageName(banner?.imageName);
    setImageMimeType(banner?.imageMimeType);
    setImageSize(banner?.imageSize);
    setImagePosition(banner?.imagePosition ?? 'center');
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
    setUploading(false);
    setDragOver(false);
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
  const hasCta = linkType !== 'none';

  const safeIso = (d: string) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? null : new Date(t).toISOString(); };
  const sIso = safeIso(startDate), eIso = safeIso(endDate);
  const previewStatus = sIso && eIso
    ? computeBannerStatus({ active, startDate: sIso, endDate: eIso } as BannerRecord)
    : active ? 'active' : 'inactive';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await processBannerImage(file);
    setUploading(false);
    if (!res.ok || !res.image) { setError(res.error ?? 'Could not process the image.'); return; }
    setImageUrl(res.image.dataUrl);
    setImageName(file.name);
    setImageMimeType(res.image.mimeType);
    setImageSize(res.image.size);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    setImageUrl(''); setImageName(undefined); setImageMimeType(undefined); setImageSize(undefined);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = () => {
    if (!imageUrl) return setError('A banner image is required. Upload a JPG, PNG or WebP.');
    if (!title.trim()) return setError('Banner title is required.');
    if (!startDate || !endDate) return setError('Start and end dates are required.');
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) return setError('Start date cannot be after end date.');
    if (needsLinked && !linkedId) return setError('Select the linked content for this CTA.');
    if (linkType === 'external' && !isValidHttpUrl(externalUrl.trim())) return setError('Enter a valid http(s) URL for the external announcement.');
    if (hasCta && !ctaLabel.trim()) return setError('A CTA label is required when the banner links to content.');

    const linkedName = needsLinked ? linkOptions.find((o) => o.id === linkedId)?.name ?? null : null;
    const input = {
      title: title.trim(),
      supportingText: supporting.trim(),
      imageUrl,
      imageName,
      imageMimeType,
      imageSize,
      imagePosition,
      label: label.trim(),
      ctaLabel: hasCta ? ctaLabel.trim() : '',
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
      description="Only Active, in-window banners with an uploaded image appear in the mobile carousels."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={uploading}>{mode === 'add' ? 'Add Banner' : 'Save Changes'}</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        {/* Live mobile preview — text is a UI overlay, never baked into the image. */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-charcoal-muted">Live mobile preview</p>
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-cream-100">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: bannerObjectPosition(imagePosition) }} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-charcoal-muted">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">Upload an image to preview the banner</span>
              </div>
            )}
            {/* Readability overlay (presentation only) */}
            {imageUrl && <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />}
            <div className="absolute inset-0 flex flex-col justify-end gap-0.5 p-4 text-white">
              {label && <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">{label}</span>}
              <p className="font-serif text-lg font-medium leading-tight drop-shadow">{title || 'Banner title'}</p>
              {supporting && <p className="max-w-[80%] text-xs text-white/90 drop-shadow">{supporting}</p>}
              {hasCta && (
                <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal">
                  {ctaLabel || 'Learn More'} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Image upload */}
        <Field label="Banner image" required hint={BANNER_IMAGE_HINT}>
          <input ref={fileRef} type="file" accept={BANNER_ACCEPT_ATTR} className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); }} />
          {!imageUrl ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${dragOver ? 'border-magenta-400 bg-magenta-50/40' : 'border-cream-200 bg-cream-100/40'}`}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-magenta-500" /> : <Upload className="h-5 w-5 text-charcoal-muted" />}
              <p className="text-sm text-charcoal">{uploading ? 'Processing image…' : 'Drag & drop an image here'}</p>
              <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>Browse Files</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-cream-200 p-2.5">
              <img src={imageUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" style={{ objectPosition: bannerObjectPosition(imagePosition) }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">{imageName ?? 'Uploaded image'}</p>
                <p className="text-xs text-charcoal-muted">{imageMimeType ?? 'image'}{imageSize ? ` · ${fmtBytes(imageSize)}` : ''}</p>
              </div>
              <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Processing…' : 'Replace'}</Button>
              <button type="button" onClick={removeImage} className="rounded-md p-1.5 text-charcoal-muted hover:bg-red-50 hover:text-red-600" aria-label="Remove image"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
        </Field>

        {/* Focal position (only useful with an image) */}
        <Field label="Image focus" hint="Where to anchor the crop when the image is not exactly 2:1.">
          <div className="inline-flex overflow-hidden rounded-lg border border-cream-200">
            {POSITIONS.map((p, i) => (
              <button key={p} type="button" disabled={!imageUrl} onClick={() => setImagePosition(p)}
                className={`px-3 py-1.5 text-sm capitalize disabled:opacity-40 ${i > 0 ? 'border-l border-cream-200' : ''} ${imagePosition === p ? 'bg-magenta-500 text-white' : 'bg-white text-charcoal hover:bg-cream-100'}`}>{p}</button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Banner title" htmlFor="bf-title" required hint={`${title.length}/${BANNER_TITLE_MAX}`}><Input id="bf-title" maxLength={BANNER_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Small label" htmlFor="bf-label" hint={`${label.length}/${BANNER_LABEL_MAX} · e.g. Artist Spotlight`}><Input id="bf-label" maxLength={BANNER_LABEL_MAX} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        </div>
        <Field label="Short supporting text" htmlFor="bf-support" hint={`${supporting.length}/${BANNER_SUPPORT_MAX}`}><Textarea id="bf-support" rows={2} maxLength={BANNER_SUPPORT_MAX} value={supporting} onChange={(e) => setSupporting(e.target.value)} /></Field>

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
          <Field label="CTA label" htmlFor="bf-cta" required={hasCta} hint={hasCta ? `${ctaLabel.length}/${BANNER_CTA_MAX}` : 'No CTA for “No Link”'}>
            <Input id="bf-cta" maxLength={BANNER_CTA_MAX} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} disabled={!hasCta} placeholder="e.g. Read the story" />
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
