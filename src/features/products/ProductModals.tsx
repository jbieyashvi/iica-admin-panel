import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { requestProductChanges, hideProduct, archiveProduct } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { ProductRecord } from '../../types/products';

const FIELDS = ['Title', 'Description', 'Images', 'Category', 'Pricing', 'Inventory / Capacity', 'Fulfilment'];

export function ProductRequestChangesModal({ product, onClose }: { product: ProductRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [fields, setFields] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (product && product.id !== lastId) {
    setLastId(product.id);
    setFields([]);
    setMessage('');
    setNote('');
    setError(null);
  }
  if (!product) return null;

  const toggle = (f: string) => setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const submit = () => {
    if (fields.length === 0) return setError('Select at least one affected field.');
    if (!message.trim()) return setError('A message to the creator is required.');
    requestProductChanges(product.id, { fields, message: message.trim(), note: note.trim() || undefined }, actor);
    toast('Change request sent to seller.', 'info');
    onClose();
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Request Changes" description="Ask the seller to update parts of this product." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send request</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-charcoal">Affected fields</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-lg border border-cream-200 px-2.5 py-1.5 text-sm text-charcoal">
                <input type="checkbox" checked={fields.includes(f)} onChange={() => toggle(f)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
                {f}
              </label>
            ))}
          </div>
        </div>
        <Field label="Message to seller" htmlFor="pr-msg" required><Textarea id="pr-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Field label="Internal note" htmlFor="pr-note" hint="Admins only."><Input id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ReasonModal({
  product,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  product: ProductRecord | null;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (product && product.id !== lastId) { setLastId(product.id); setReason(''); setError(null); }
  if (!product) return null;
  const submit = () => {
    if (!reason.trim()) return setError('A reason is required.');
    onConfirm(reason.trim());
  };
  return (
    <Modal open={!!product} onClose={onClose} title={title} description={description}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>{confirmLabel}</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Reason" htmlFor="pm-reason" required><Input id="pm-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

export function ProductHideModal({ product, onClose }: { product: ProductRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  return (
    <ReasonModal
      product={product}
      title="Hide product"
      description="Removes the product from public Shop visibility. The seller is not suspended."
      confirmLabel="Hide product"
      onClose={onClose}
      onConfirm={(reason) => { if (product) { hideProduct(product.id, reason, actor); toast('Product hidden from Shop.', 'info'); } onClose(); }}
    />
  );
}

export function ProductArchiveModal({ product, onClose }: { product: ProductRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  return (
    <ReasonModal
      product={product}
      title="Archive product"
      description="Use only for discontinued products. Records are preserved."
      confirmLabel="Archive product"
      onClose={onClose}
      onConfirm={(reason) => { if (product) { archiveProduct(product.id, reason, actor); toast('Product archived.', 'info'); } onClose(); }}
    />
  );
}
