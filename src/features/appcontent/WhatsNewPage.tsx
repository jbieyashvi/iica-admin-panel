import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../data/store';
import { formatDate, formatMoney } from '../../lib/format';

const NEW_PRODUCT_DAYS = 15;
const EVENT_WINDOW_DAYS = 7;

interface Card { id: string; title: string; creator: string; sub: string; route: string; }

export function WhatsNewPage() {
  const data = useData();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);

  const { newProducts, newClasses, eventsThisWeek } = useMemo(() => {
    const now = Date.now();
    const suspended = new Set(data.users.filter((u) => u.membershipStatus === 'suspended').map((u) => u.id));
    const activeCats = new Set(data.productCategories.filter((c) => c.status === 'active').map((c) => c.name));
    const productEligible = (p: typeof data.products[number]) =>
      p.status === 'published' &&
      !suspended.has(p.sellerUserId) &&
      activeCats.has(p.category) &&
      (now - new Date(p.createdAt).getTime()) / 86400000 <= NEW_PRODUCT_DAYS;

    const toCard = (p: typeof data.products[number]): Card => ({
      id: p.id, title: p.title, creator: p.sellerName,
      sub: `${p.discountPrice ?? p.price ? formatMoney(p.discountPrice ?? p.price, '₹') : 'Free'} · ${formatDate(p.createdAt)}`,
      route: `/admin/products/${p.id}`,
    });

    const products = data.products.filter(productEligible);
    const newProducts = products.filter((p) => p.type !== 'masterclass').map(toCard);
    const newClasses = products.filter((p) => p.type === 'masterclass').map(toCard);

    const eventsThisWeek: Card[] = data.events.filter((e) => {
      const t = new Date(e.startAt).getTime();
      return e.status === 'published' && !suspended.has(e.hostUserId ?? '') &&
        t >= now && (t - now) / 86400000 <= EVENT_WINDOW_DAYS;
    }).map((e) => ({ id: e.id, title: e.title, creator: e.hostName, sub: formatDate(e.startAt), route: `/admin/events/${e.id}` }));

    return { newProducts, newClasses, eventsThisWeek };
  }, [data]);

  const groups = [
    { key: 'products', label: 'New Products', hint: `Launched in the last ${NEW_PRODUCT_DAYS} days`, cards: newProducts },
    { key: 'classes', label: 'New Classes', hint: `Launched in the last ${NEW_PRODUCT_DAYS} days`, cards: newClasses },
    { key: 'events', label: 'Events This Week', hint: `Scheduled in the next ${EVENT_WINDOW_DAYS} days`, cards: eventsThisWeek },
  ];
  const total = newProducts.length + newClasses.length + eventsThisWeek.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-charcoal">What’s New Preview</h2>
          <p className="text-sm text-charcoal-muted">Automatically eligible records — Admin does not manually curate this section. Draft, hidden, archived, cancelled, expired and suspended-creator content is excluded.</p>
        </div>
        <Button variant="secondary" icon={<Smartphone className="h-4 w-4" />} onClick={() => setPreviewOpen(true)}>Preview Mobile Section</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.key} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal">{g.label}</h3>
              <Badge tone={g.cards.length ? 'green' : 'neutral'}>{g.cards.length} eligible</Badge>
            </div>
            <p className="mb-3 text-xs text-charcoal-muted">{g.hint}</p>
            {g.cards.length === 0 ? (
              <EmptyState title="Nothing eligible" description="No records currently qualify." />
            ) : (
              <ul className="space-y-1.5">
                {g.cards.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-lg border border-cream-200 p-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-charcoal">{c.title}</span>
                      <span className="block truncate text-xs text-charcoal-muted">{c.creator} · {c.sub}</span>
                    </span>
                    <button onClick={() => navigate(c.route)} className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="Open source"><ExternalLink className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="What’s New — Mobile Preview" description="Prototype preview of the auto-generated Home section." footer={<Button onClick={() => setPreviewOpen(false)}>Close</Button>}>
        <div className="mx-auto max-w-[320px] space-y-3 rounded-2xl border border-cream-200 bg-cream-50 p-3">
          {total === 0 ? <p className="py-6 text-center text-xs text-charcoal-muted"><Sparkles className="mx-auto mb-1 h-4 w-4" />Nothing new right now.</p> : groups.filter((g) => g.cards.length).map((g) => (
            <div key={g.key}>
              <p className="mb-1 font-serif text-sm font-medium text-charcoal">{g.label}</p>
              <div className="flex gap-2 overflow-x-auto">
                {g.cards.slice(0, 6).map((c) => (
                  <div key={c.id} className="w-28 shrink-0 rounded-xl border border-cream-200 bg-white p-2">
                    <div className="mb-1 h-14 rounded-lg bg-cream-100" />
                    <p className="truncate text-xs font-medium text-charcoal">{c.title}</p>
                    <p className="truncate text-[11px] text-charcoal-muted">{c.creator}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
