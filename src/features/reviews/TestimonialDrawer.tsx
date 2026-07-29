import { useState } from 'react';
import type { ReactNode } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { TestimonialStatusBadge } from '../../components/ui/ReviewBadges';
import { editTestimonial } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import { PLACEMENTS, PLACEMENT_LABEL, TESTIMONIAL_SOURCE_LABEL, TESTIMONIAL_MAX } from '../../config/reviewLabels';
import type { TestimonialPlacement, TestimonialRecord } from '../../types/reviews';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-200 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

export function TestimonialDrawer({
  testimonial,
  onClose,
  onPublish,
  onHide,
  onRestore,
}: {
  testimonial: TestimonialRecord | null;
  onClose: () => void;
  onPublish: (t: TestimonialRecord) => void;
  onHide: (t: TestimonialRecord) => void;
  onRestore: (t: TestimonialRecord) => void;
}) {
  const { abilities, actor } = useActor();
  const canManage = abilities.testimonialsManage;
  const [editing, setEditing] = useState(false);
  const [person, setPerson] = useState('');
  const [role, setRole] = useState('');
  const [body, setBody] = useState('');
  const [placement, setPlacement] = useState<TestimonialPlacement>('mobile_app');
  const [order, setOrder] = useState(1);
  const [seenId, setSeenId] = useState<string | null>(null);

  if (testimonial && testimonial.id !== seenId) {
    setSeenId(testimonial.id);
    setEditing(false);
    setPerson(testimonial.personName);
    setRole(testimonial.role);
    setBody(testimonial.body);
    setPlacement(testimonial.placement);
    setOrder(testimonial.displayOrder);
  }
  if (!testimonial) return null;

  const save = () => {
    if (!person.trim()) return toast('Person name is required.', 'error');
    if (!body.trim()) return toast('Testimonial text is required.', 'error');
    const ok = editTestimonial(testimonial.id, { personName: person, role, body, placement, displayOrder: order }, actor);
    if (!ok) return toast('A testimonial with this exact text already exists.', 'error');
    toast('Testimonial updated.');
    setEditing(false);
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {canManage && !editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
      {editing && <Button onClick={save}>Save Changes</Button>}
      {!editing && testimonial.status !== 'published' && <Button disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={() => (testimonial.status === 'hidden' ? onRestore(testimonial) : onPublish(testimonial))}>{testimonial.status === 'hidden' ? 'Restore' : 'Publish'}</Button>}
      {!editing && testimonial.status === 'published' && <Button variant="danger" disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={() => onHide(testimonial)}>Hide</Button>}
    </>
  );

  const remaining = TESTIMONIAL_MAX - body.length;

  return (
    <Drawer open={!!testimonial} onClose={onClose} title="Testimonial Details" description={testimonial.id} width="lg" footer={footer}>
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Person label" htmlFor="td-person" required><Input id="td-person" value={person} onChange={(e) => setPerson(e.target.value)} /></Field>
            <Field label="Role / category label" htmlFor="td-role"><Input id="td-role" value={role} onChange={(e) => setRole(e.target.value)} /></Field>
          </div>
          <Field label="Display text" htmlFor="td-body" required hint={`${remaining} characters left`}>
            <Textarea id="td-body" rows={3} maxLength={TESTIMONIAL_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display placement" htmlFor="td-placement" required>
              <Select id="td-placement" value={placement} onChange={(e) => setPlacement(e.target.value as TestimonialPlacement)}>
                {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
              </Select>
            </Field>
            <Field label="Display order" htmlFor="td-order"><Input id="td-order" type="number" min={1} value={order} onChange={(e) => setOrder(Math.max(1, Number(e.target.value) || 1))} /></Field>
          </div>
          {testimonial.connectedReviewId && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">This is an edited display excerpt. Saving changes here does not modify the original review <span className="font-medium">{testimonial.connectedReviewId}</span>.</div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-cream-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-charcoal">{testimonial.personName}</span>
              <TestimonialStatusBadge status={testimonial.status} />
            </div>
            <p className="text-xs text-charcoal-muted">{testimonial.role}</p>
            <p className="mt-2 text-sm text-charcoal">"{testimonial.body}"</p>
          </div>
          <div>
            <Row label="Testimonial ID">{testimonial.id}</Row>
            <Row label="Person">{testimonial.personName}</Row>
            <Row label="Role / category">{testimonial.role}</Row>
            <Row label="Source">{TESTIMONIAL_SOURCE_LABEL[testimonial.sourceType]}{testimonial.addedByAdmin && <Badge tone="blue" className="ml-2">Admin added</Badge>}</Row>
            <Row label="Connected review">{testimonial.connectedReviewId ?? '—'}</Row>
            <Row label="Display placement">{PLACEMENT_LABEL[testimonial.placement]}</Row>
            <Row label="Display order">{testimonial.displayOrder}</Row>
            <Row label="Status">{<TestimonialStatusBadge status={testimonial.status} />}</Row>
            {testimonial.status === 'hidden' && testimonial.hiddenReason && <Row label="Hidden reason">{testimonial.hiddenReason}</Row>}
            <Row label="Created">{formatDate(testimonial.createdAt)}</Row>
            <Row label="Last updated">{formatDate(testimonial.lastUpdatedAt)}</Row>
          </div>
          {testimonial.connectedReviewId && (
            <p className="text-xs text-charcoal-muted">This testimonial is an edited display excerpt of review <span className="font-medium text-charcoal">{testimonial.connectedReviewId}</span>. The original review is preserved unchanged.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}
