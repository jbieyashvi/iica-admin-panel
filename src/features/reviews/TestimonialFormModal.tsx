import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { addTestimonial, testimonialTextExists } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { PLACEMENTS, PLACEMENT_LABEL, TESTIMONIAL_SOURCE_TYPES, TESTIMONIAL_SOURCE_LABEL, TESTIMONIAL_MAX } from '../../config/reviewLabels';
import type { ReviewRecord, TestimonialPlacement, TestimonialSourceType, TestimonialStatus } from '../../types/reviews';

function sourceForReview(t: ReviewRecord['type']): TestimonialSourceType {
  if (t === 'creator') return 'creator_review';
  if (t === 'event') return 'event_review';
  return 'product_review';
}

export function TestimonialFormModal({
  open,
  fromReview,
  nextOrder,
  onClose,
}: {
  open: boolean;
  fromReview?: ReviewRecord | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const [person, setPerson] = useState('');
  const [role, setRole] = useState('');
  const [body, setBody] = useState('');
  const [sourceType, setSourceType] = useState<TestimonialSourceType>('direct');
  const [placement, setPlacement] = useState<TestimonialPlacement>('mobile_app');
  const [order, setOrder] = useState(nextOrder);
  const [status, setStatus] = useState<TestimonialStatus>('draft');
  const [error, setError] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const key = open ? (fromReview?.id ?? 'new') : null;
  if (key !== seenKey) {
    setSeenKey(key);
    setPerson(fromReview?.reviewerName ?? '');
    setRole(fromReview ? (fromReview.type === 'creator' ? 'Creator' : fromReview.reviewerType === 'guest' ? 'Verified Buyer' : 'App Member') : '');
    setBody(fromReview ? fromReview.body.slice(0, TESTIMONIAL_MAX) : '');
    setSourceType(fromReview ? sourceForReview(fromReview.type) : 'direct');
    setPlacement('mobile_app');
    setOrder(nextOrder);
    setStatus('draft');
    setError(null);
  }
  if (!open) return null;

  const remaining = TESTIMONIAL_MAX - body.length;
  const submit = () => {
    if (!person.trim()) return setError('Person name is required.');
    if (!body.trim()) return setError('Testimonial text is required.');
    if (body.length > TESTIMONIAL_MAX) return setError(`Testimonial must be ${TESTIMONIAL_MAX} characters or fewer.`);
    if (!placement) return setError('Display placement is required.');
    if (testimonialTextExists(body)) return setError('A testimonial with this exact text already exists.');
    addTestimonial(
      { personName: person.trim(), role: role.trim(), body: body.trim(), sourceType, connectedReviewId: fromReview?.id ?? null, placement, displayOrder: order, status },
      actor,
    );
    toast('Testimonial added.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={fromReview ? 'Create Testimonial from Review' : 'Add Testimonial'} size="lg"
      description={fromReview ? 'Prefilled from the selected review. The original review is not changed.' : 'Create a curated testimonial for a chosen placement.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add Testimonial</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={person || 'IICA'} size="lg" />
          <div className="text-xs text-charcoal-muted">Profile image uses the person's avatar (no upload in this prototype).</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Person / creator" htmlFor="tf-person" required><Input id="tf-person" value={person} onChange={(e) => setPerson(e.target.value)} /></Field>
          <Field label="Role or creator category" htmlFor="tf-role"><Input id="tf-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Artist, App Member" /></Field>
        </div>
        <Field label="Testimonial text" htmlFor="tf-body" required hint={`${remaining} characters left`}>
          <Textarea id="tf-body" rows={3} maxLength={TESTIMONIAL_MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the display quote…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source type" htmlFor="tf-source">
            <Select id="tf-source" value={sourceType} onChange={(e) => setSourceType(e.target.value as TestimonialSourceType)} disabled={!!fromReview}>
              {TESTIMONIAL_SOURCE_TYPES.map((s) => <option key={s} value={s}>{TESTIMONIAL_SOURCE_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label="Display placement" htmlFor="tf-placement" required>
            <Select id="tf-placement" value={placement} onChange={(e) => setPlacement(e.target.value as TestimonialPlacement)}>
              {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Display order" htmlFor="tf-order"><Input id="tf-order" type="number" min={1} value={order} onChange={(e) => setOrder(Math.max(1, Number(e.target.value) || 1))} /></Field>
          <Field label="Status" htmlFor="tf-status">
            <Select id="tf-status" value={status} onChange={(e) => setStatus(e.target.value as TestimonialStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </div>
        {fromReview ? (
          <div className="rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Connected to review <span className="font-medium text-charcoal">{fromReview.id}</span>. Editing this testimonial later will not change the original review.</div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-charcoal-muted"><Badge tone="blue">Direct Testimonial</Badge> Manually added by admin — use prototype content only.</div>
        )}
      </div>
    </Modal>
  );
}
