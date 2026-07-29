import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { useData, addAdminEvent } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { priceLabel } from '../../lib/format';
import { FORMAT_LABEL, EVENT_FORMATS } from '../../config/eventLabels';
import { EventCategoryFormModal } from './EventCategoryFormModal';
import type { EventFormat, TicketType } from '../../types/events';
import { cn } from '../../lib/cn';

const ADD_NEW_CATEGORY = '__add_new_category__';

const STEPS = ['Basic Details', 'Schedule & Location', 'Tickets', 'Review & Publish'];

interface Tier { name: string; price: number; capacity: number }

const todayPlus = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
};

export function AddEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, eventCategories } = useData();
  const { actor } = useActor();
  const creators = users.filter((u) => u.accountType === 'creator');
  const activeCategories = eventCategories.filter((c) => c.status === 'active');

  const [step, setStep] = useState(0);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: 'Monsoon Melodies Live',
    hostUserId: creators[0]?.id ?? '',
    category: eventCategories[0]?.name ?? 'Concert',
    description: 'An intimate evening of live music curated for the IICA community, featuring acoustic sets and special guests.',
    format: 'in_person' as EventFormat,
    date: todayPlus(21),
    startTime: '18:30',
    endTime: '21:00',
    timezone: 'Asia/Kolkata',
    venue: 'The Terrace, Bandra',
    platform: 'IICA Live Stream',
    city: 'Mumbai',
    country: 'India',
    ticketType: 'paid' as TicketType,
    refundPolicy: 'Full refund up to 7 days before the event.',
  });
  const [tiers, setTiers] = useState<Tier[]>([{ name: 'General Admission', price: 799, capacity: 150 }]);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setStep(0);
    setError(null);
  };
  const close = () => { reset(); onClose(); };

  const startAt = () => new Date(`${form.date}T${form.startTime}:00`).toISOString();
  const endAt = () => new Date(`${form.date}T${form.endTime}:00`).toISOString();

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Event title is required.';
    if (!form.hostUserId) return 'Select a host.';
    if (!form.category) return 'Select a category.';
    if (!form.date) return 'Event date is required.';
    if (new Date(startAt()).getTime() >= new Date(endAt()).getTime()) return 'End time must be after start time.';
    if (form.ticketType !== 'free' && tiers.length === 0) return 'Add at least one ticket tier.';
    return null;
  };

  const submit = (publish: boolean) => {
    const err = validate();
    if (err) { setError(err); setStep(err.includes('ticket') || err.includes('tier') ? 2 : err.includes('time') ? 1 : 0); return; }
    const host = creators.find((c) => c.id === form.hostUserId);
    const finalTiers = form.ticketType === 'free' ? [{ name: 'Free Entry', price: 0, capacity: tiers[0]?.capacity ?? 100 }] : tiers;
    addAdminEvent(
      {
        title: form.title.trim(), hostName: host?.name ?? 'Creator', hostUserId: form.hostUserId,
        category: form.category, description: form.description, format: form.format,
        startAt: startAt(), endAt: endAt(), timezone: form.timezone,
        venue: form.format !== 'online' ? form.venue : undefined, platform: form.format !== 'in_person' ? form.platform : undefined,
        city: form.format !== 'online' ? form.city : undefined, country: form.format !== 'online' ? form.country : undefined,
        ticketType: form.ticketType, tiers: finalTiers, refundPolicy: form.refundPolicy, publish,
      },
      actor,
    );
    toast(publish ? `"${form.title}" published.` : `"${form.title}" saved as draft.`);
    close();
  };

  const addTier = () => setTiers((t) => [...t, { name: 'VIP', price: 1999, capacity: 40 }]);
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i));
  const setTier = (i: number, patch: Partial<Tier>) => setTiers((t) => t.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Admin Event"
      description="Prototype administration — create an event for testing."
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
                <Button onClick={() => submit(true)}>Publish Event</Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* Stepper */}
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-magenta-500 text-white' : 'bg-cream-100 text-charcoal-muted')}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('hidden text-xs font-medium sm:block', i === step ? 'text-charcoal' : 'text-charcoal-muted')}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-cream-200" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {step === 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Event title" htmlFor="ae-title" required><Input id="ae-title" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Host / creator" htmlFor="ae-host" required>
            <Select id="ae-host" value={form.hostUserId} onChange={(e) => set('hostUserId', e.target.value)}>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Category" htmlFor="ae-cat" required hint="Only active categories can be selected.">
            <Select
              id="ae-cat"
              value={form.category}
              onChange={(e) => {
                if (e.target.value === ADD_NEW_CATEGORY) setCatModalOpen(true);
                else set('category', e.target.value);
              }}
            >
              {activeCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value={ADD_NEW_CATEGORY}>＋ Add New Category…</option>
            </Select>
          </Field>
          <Field label="Format" htmlFor="ae-format">
            <Select id="ae-format" value={form.format} onChange={(e) => set('format', e.target.value as EventFormat)}>
              {EVENT_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="ae-desc"><Textarea id="ae-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Cover image" htmlFor="ae-cover" hint="Prototype placeholder — no upload in this phase.">
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-cream-200 bg-cream-100/50 text-sm text-charcoal-muted">Cover image placeholder</div>
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="ae-date" required><Input id="ae-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Timezone" htmlFor="ae-tz"><Input id="ae-tz" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
          <Field label="Start time" htmlFor="ae-start"><Input id="ae-start" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
          <Field label="End time" htmlFor="ae-end"><Input id="ae-end" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
          {form.format !== 'online' ? (
            <>
              <Field label="Venue" htmlFor="ae-venue"><Input id="ae-venue" value={form.venue} onChange={(e) => set('venue', e.target.value)} /></Field>
              <Field label="City" htmlFor="ae-city"><Input id="ae-city" value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="Country" htmlFor="ae-country"><Input id="ae-country" value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
            </>
          ) : null}
          {form.format !== 'in_person' ? (
            <Field label="Online platform" htmlFor="ae-platform"><Input id="ae-platform" value={form.platform} onChange={(e) => set('platform', e.target.value)} /></Field>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Ticket type" htmlFor="ae-ticket">
            <Select id="ae-ticket" value={form.ticketType} onChange={(e) => set('ticketType', e.target.value as TicketType)}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="external">External Booking</option>
            </Select>
          </Field>
          {form.ticketType === 'external' ? (
            <p className="rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3 text-sm text-charcoal-muted">External booking is managed on the third-party provider. No tiers are configured here.</p>
          ) : form.ticketType === 'free' ? (
            <Field label="Capacity" htmlFor="ae-cap"><Input id="ae-cap" type="number" min={1} value={tiers[0]?.capacity ?? 100} onChange={(e) => setTier(0, { capacity: Number(e.target.value) })} /></Field>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-charcoal">Ticket tiers</p>
                <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={addTier}>Add tier</Button>
              </div>
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] items-end gap-2 rounded-lg border border-cream-200 p-2">
                  <Field label="Tier name" htmlFor={`t-name-${i}`}><Input id={`t-name-${i}`} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} /></Field>
                  <Field label="Price ₹" htmlFor={`t-price-${i}`}><Input id={`t-price-${i}`} type="number" min={0} value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) })} /></Field>
                  <Field label="Capacity" htmlFor={`t-cap-${i}`}><Input id={`t-cap-${i}`} type="number" min={1} value={t.capacity} onChange={(e) => setTier(i, { capacity: Number(e.target.value) })} /></Field>
                  <button onClick={() => removeTier(i)} disabled={tiers.length === 1} className="mb-1.5 rounded-md p-2 text-charcoal-muted hover:bg-cream-100 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <Field label="Refund policy" htmlFor="ae-refund"><Input id="ae-refund" value={form.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)} /></Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2 text-sm">
          {[
            ['Title', form.title],
            ['Host', creators.find((c) => c.id === form.hostUserId)?.name ?? '—'],
            ['Category', form.category],
            ['Format', FORMAT_LABEL[form.format]],
            ['Date', `${form.date} ${form.startTime}–${form.endTime} (${form.timezone})`],
            ['Location', form.format === 'online' ? `Online · ${form.platform}` : `${form.venue}, ${form.city}, ${form.country}`],
            ['Ticket type', form.ticketType],
            ['Tickets', form.ticketType === 'external' ? 'External booking' : form.ticketType === 'free' ? `Free · ${tiers[0]?.capacity ?? 100} capacity` : tiers.map((t) => `${t.name} ${priceLabel(t.price)} (${t.capacity})`).join(', ')],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-cream-200 py-2">
              <span className="text-charcoal-muted">{k}</span>
              <span className="max-w-[60%] text-right font-medium text-charcoal">{v}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-charcoal-muted">Publishing requires all mandatory fields. Save Draft keeps it hidden until reviewed.</p>
        </div>
      )}

      {/* Add New Category — keeps entered event data intact */}
      <EventCategoryFormModal
        target={catModalOpen ? 'new' : null}
        onClose={() => setCatModalOpen(false)}
        onCreated={(name) => {
          set('category', name);
          setCatModalOpen(false);
        }}
      />
    </Modal>
  );
}
