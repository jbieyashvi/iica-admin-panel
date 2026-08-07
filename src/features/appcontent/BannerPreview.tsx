import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { bannerCtaRoute, bannerObjectPosition } from '../../config/bannerLabels';
import type { BannerRecord } from '../../types/banners';

// Renders a mobile banner carousel (Home or Shop) exactly as it would appear:
// the caller passes only the live banners for that carousel, already in the
// correct per-carousel order.
export function BannerPreview({ open, carousel, banners, focusId, onClose }: { open: boolean; carousel: 'home' | 'shop'; banners: BannerRecord[]; focusId?: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const live = banners;
  const carouselLabel = carousel === 'home' ? 'Home' : 'Shop';
  const [idx, setIdx] = useState(0);
  const multiple = live.length > 1;

  // Reset to the focused banner (or first) whenever the preview opens.
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    const fi = focusId ? live.findIndex((b) => b.id === focusId) : -1;
    setIdx(fi >= 0 ? fi : 0);
  }
  if (!open && seen) setSeen(false);

  // Auto-rotate only when multiple banners are active.
  useEffect(() => {
    if (!open || !multiple) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % live.length), 3000);
    return () => clearInterval(t);
  }, [open, multiple, live.length]);

  if (!open) return null;

  const current = live[Math.min(idx, Math.max(0, live.length - 1))];
  const go = (d: number) => setIdx((i) => (i + d + live.length) % live.length);
  const openCta = (b: BannerRecord) => {
    if (b.linkType === 'external' && b.externalUrl) { window.open(b.externalUrl, '_blank', 'noopener,noreferrer'); return; }
    const route = bannerCtaRoute(b);
    if (route) { onClose(); navigate(route); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Mobile ${carouselLabel} Preview`} description={`${carouselLabel} carousel as shown in the User App. Only Active, in-window banners for this placement with valid linked content appear.`}>
      {live.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Smartphone className="h-8 w-8 text-charcoal-muted" />
          <p className="text-sm text-charcoal-muted">No banners are currently live in the {carouselLabel} carousel. It is hidden in the User App.</p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[300px]">
          {/* Phone frame */}
          <div className="rounded-[2rem] border-4 border-charcoal/80 bg-cream-100 p-2 shadow-drawer">
            <div className="mb-2 flex items-center justify-between px-2 pt-1 text-[10px] text-charcoal-muted">
              <span>9:41</span><span>IICA</span>
            </div>
            <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-cream-200">
              {current.imageUrl && <img src={current.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: bannerObjectPosition(current.imagePosition) }} />}
              {/* Readability overlay (presentation only, never part of the file) */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
              <div className="absolute inset-0 flex flex-col justify-end gap-0.5 p-4 text-white">
                {current.label && <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">{current.label}</span>}
                <p className="font-serif text-base font-medium leading-tight drop-shadow">{current.title}</p>
                {current.supportingText && <p className="max-w-[85%] text-[11px] text-white/90 drop-shadow">{current.supportingText}</p>}
                {current.linkType !== 'none' && (
                  <button onClick={() => openCta(current)} className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-white px-3 py-1 text-[11px] font-semibold text-charcoal hover:bg-cream-100">{current.ctaLabel || 'Learn More'} <ArrowRight className="h-3 w-3" /></button>
                )}
              </div>
              {multiple && (
                <>
                  <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1 text-charcoal hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => go(1)} aria-label="Next" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1 text-charcoal hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
                </>
              )}
            </div>
            {/* Pagination dots — only when multiple */}
            {multiple && (
              <div className="flex justify-center gap-1.5 py-2">
                {live.map((b, i) => (
                  <button key={b.id} onClick={() => setIdx(i)} aria-label={`Go to banner ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-magenta-500' : 'w-1.5 bg-cream-200'}`} />
                ))}
              </div>
            )}
            <div className="px-2 pb-2 pt-1 text-center text-[10px] text-charcoal-muted">{carousel === 'home' ? 'Quick Actions · Explore the Catalogue · Featured Profiles' : 'Shop · Categories · New Arrivals · Wishlist'}</div>
          </div>
          <p className="mt-3 text-center text-xs text-charcoal-muted">
            {live.length === 1 ? 'One active banner — no pagination, no auto-slide.' : `${live.length} active banners — swipe + auto-rotation enabled.`}
          </p>
          <div className="mt-2 flex justify-center"><Button variant="secondary" onClick={onClose}>Close</Button></div>
        </div>
      )}
    </Modal>
  );
}
