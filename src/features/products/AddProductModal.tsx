import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { useData, addProduct } from '../../data/store';
import type { AddProductInput } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { priceLabel } from '../../lib/format';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import type { ProductType } from '../../types/products';
import { cn } from '../../lib/cn';

const STEPS = ['Type & Seller', 'Product Details', 'Pricing & Availability', 'Fulfilment', 'Review'];

const todayPlus = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function AddProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, productCategories } = useData();
  const { actor } = useActor();
  const creators = users.filter((u) => u.accountType === 'creator');

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'physical' as ProductType,
    sellerUserId: creators[0]?.id ?? '',
    category: '',
    title: 'Hand-painted Ceramic Vase',
    description: 'A hand-painted ceramic vase crafted by the artist, finished with a food-safe glaze.',
    priceType: 'paid' as 'free' | 'paid',
    price: 1299,
    // physical
    stock: 25,
    lowStock: 5,
    weight: '0.8 kg',
    dimensions: '20 × 15 × 15 cm',
    shippingOrigin: 'Mumbai',
    dispatch: '3–5 business days',
    returnPolicy: '7-day return for damaged items',
    // masterclass
    date: todayPlus(21),
    time: '18:00',
    durationMins: 90,
    capacity: 40,
    deliveryMode: 'Live on Zoom',
    mcInstructions: 'Seller emails the Zoom link to the buyer 1 hour before the session.',
    // digital
    format: 'PDF',
    availability: 'Unlimited',
    deliveryTime: 'Within 24 hours',
    digInstructions: 'Seller emails the digital file to the buyer after purchase.',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const activeCats = useMemo(
    () => productCategories.filter((c) => c.type === form.type && c.status === 'active'),
    [productCategories, form.type],
  );

  // Keep category valid for the selected type.
  const category = activeCats.some((c) => c.name === form.category) ? form.category : activeCats[0]?.name ?? '';

  const changeType = (t: ProductType) => {
    const firstCat = productCategories.find((c) => c.type === t && c.status === 'active')?.name ?? '';
    setForm((f) => ({ ...f, type: t, category: firstCat }));
  };

  const close = () => { setStep(0); setError(null); onClose(); };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Product title is required.';
    if (!form.sellerUserId) return 'Select a seller.';
    if (!category) return 'Select an active category.';
    if (form.priceType === 'paid' && (!form.price || form.price <= 0)) return 'Enter a price, or mark the product Free.';
    return null;
  };

  const submit = (publish: boolean) => {
    const err = validate();
    if (err) { setError(err); setStep(err.includes('price') ? 2 : err.includes('category') || err.includes('seller') ? 0 : 1); return; }
    const price = form.priceType === 'free' ? 0 : form.price;
    const input: AddProductInput = {
      type: form.type,
      sellerUserId: form.sellerUserId,
      category,
      title: form.title,
      description: form.description,
      price,
      discountPrice: null,
      publish,
    };
    if (form.type === 'physical') {
      input.physical = {
        sku: 'SKU-' + form.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase(),
        stock: form.stock,
        lowStockThreshold: form.lowStock,
        weight: form.weight,
        dimensions: form.dimensions,
        shippingOrigin: form.shippingOrigin,
        dispatchTimeline: form.dispatch,
        returnPolicy: form.returnPolicy,
      };
    } else if (form.type === 'masterclass') {
      input.masterclass = {
        sessionAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        timezone: 'Asia/Kolkata',
        durationMins: form.durationMins,
        capacity: form.capacity,
        seatsBooked: 0,
        deliveryMode: form.deliveryMode,
        deliveryInstructions: form.mcInstructions,
      };
    } else {
      input.digital = {
        digitalFormat: form.format,
        availability: form.availability,
        deliveryTime: form.deliveryTime,
        deliveryInstructions: form.digInstructions,
      };
    }
    addProduct(input, actor);
    toast(publish ? `"${form.title}" published.` : `"${form.title}" saved as draft.`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Product"
      description="Prototype administration — create a product listing for testing."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => submit(false)}>Save Draft</Button>
                <Button onClick={() => submit(true)}>Publish Product</Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-magenta-500 text-white' : 'bg-cream-100 text-charcoal-muted')}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('hidden text-xs font-medium lg:block', i === step ? 'text-charcoal' : 'text-charcoal-muted')}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-cream-200" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {step === 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product type" htmlFor="ap-type">
            <Select id="ap-type" value={form.type} onChange={(e) => changeType(e.target.value as ProductType)}>
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Seller" htmlFor="ap-seller" required>
            <Select id="ap-seller" value={form.sellerUserId} onChange={(e) => set('sellerUserId', e.target.value)}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Category" htmlFor="ap-cat" required hint="Only active categories for this product type are shown.">
              <Select id="ap-cat" value={category} onChange={(e) => set('category', e.target.value)}>
                {activeCats.length === 0 && <option value="">No active categories</option>}
                {activeCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Product title" htmlFor="ap-title" required><Input id="ap-title" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Description" htmlFor="ap-desc"><Textarea id="ap-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Product images" htmlFor="ap-img" hint="Prototype placeholders — no upload in this phase.">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex h-20 items-center justify-center rounded-lg border border-dashed border-cream-200 bg-cream-100/50 text-xs text-charcoal-muted">Image {i + 1}</div>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Free or Paid" htmlFor="ap-pt">
            <Select id="ap-pt" value={form.priceType} onChange={(e) => set('priceType', e.target.value as 'free' | 'paid')}>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
            </Select>
          </Field>
          {form.priceType === 'paid' && (
            <Field label="Price (₹)" htmlFor="ap-price" required><Input id="ap-price" type="number" min={0} value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
          )}
          {form.type === 'physical' && (
            <>
              <Field label="Stock quantity" htmlFor="ap-stock"><Input id="ap-stock" type="number" min={0} value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} /></Field>
              <Field label="Low-stock threshold" htmlFor="ap-low"><Input id="ap-low" type="number" min={0} value={form.lowStock} onChange={(e) => set('lowStock', Number(e.target.value))} /></Field>
            </>
          )}
          {form.type === 'masterclass' && (
            <>
              <Field label="Total capacity" htmlFor="ap-cap"><Input id="ap-cap" type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
              <Field label="Session date" htmlFor="ap-date"><Input id="ap-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Start time" htmlFor="ap-time"><Input id="ap-time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
              <Field label="Duration (mins)" htmlFor="ap-dur"><Input id="ap-dur" type="number" min={15} value={form.durationMins} onChange={(e) => set('durationMins', Number(e.target.value))} /></Field>
            </>
          )}
          {form.type === 'digital' && (
            <>
              <Field label="Availability" htmlFor="ap-avail"><Input id="ap-avail" value={form.availability} onChange={(e) => set('availability', e.target.value)} /></Field>
              <Field label="Digital format" htmlFor="ap-fmt"><Input id="ap-fmt" value={form.format} onChange={(e) => set('format', e.target.value)} /></Field>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {form.type === 'physical' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Weight" htmlFor="ap-wt"><Input id="ap-wt" value={form.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
              <Field label="Dimensions" htmlFor="ap-dim"><Input id="ap-dim" value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} /></Field>
              <Field label="Shipping origin" htmlFor="ap-orig"><Input id="ap-orig" value={form.shippingOrigin} onChange={(e) => set('shippingOrigin', e.target.value)} /></Field>
              <Field label="Estimated dispatch" htmlFor="ap-disp"><Input id="ap-disp" value={form.dispatch} onChange={(e) => set('dispatch', e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Return policy" htmlFor="ap-ret"><Input id="ap-ret" value={form.returnPolicy} onChange={(e) => set('returnPolicy', e.target.value)} /></Field></div>
              <p className="text-xs text-charcoal-muted sm:col-span-2">The seller dispatches the item. Shipping is required.</p>
            </div>
          )}
          {form.type === 'masterclass' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Delivery mode" htmlFor="ap-dm"><Input id="ap-dm" value={form.deliveryMode} onChange={(e) => set('deliveryMode', e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Link delivery instructions" htmlFor="ap-mci"><Textarea id="ap-mci" rows={2} value={form.mcInstructions} onChange={(e) => set('mcInstructions', e.target.value)} /></Field></div>
              <p className="text-xs text-charcoal-muted sm:col-span-2">The seller emails the session / Zoom link to the buyer. "Delivery sent" does not confirm buyer access.</p>
            </div>
          )}
          {form.type === 'digital' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Expected delivery time" htmlFor="ap-dt"><Input id="ap-dt" value={form.deliveryTime} onChange={(e) => set('deliveryTime', e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label="Seller delivery instructions" htmlFor="ap-digi"><Textarea id="ap-digi" rows={2} value={form.digInstructions} onChange={(e) => set('digInstructions', e.target.value)} /></Field></div>
              <p className="text-xs text-charcoal-muted sm:col-span-2">The seller delivers the digital file by email. No platform-hosted delivery.</p>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2 text-sm">
          {[
            ['Type', PRODUCT_TYPE_LABEL[form.type]],
            ['Seller', creators.find((c) => c.id === form.sellerUserId)?.name ?? '—'],
            ['Category', category || '—'],
            ['Title', form.title],
            ['Price', form.priceType === 'free' ? 'Free' : priceLabel(form.price)],
            form.type === 'physical' ? ['Stock', String(form.stock)] : form.type === 'masterclass' ? ['Capacity', String(form.capacity)] : ['Availability', form.availability],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-cream-200 py-2">
              <span className="text-charcoal-muted">{k}</span>
              <span className="max-w-[60%] text-right font-medium text-charcoal">{v}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-charcoal-muted">Publishing requires a title, active category and (for paid products) a price. Save Draft keeps it hidden until reviewed.</p>
        </div>
      )}
    </Modal>
  );
}
