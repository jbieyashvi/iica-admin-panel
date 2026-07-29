import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { hideProduct, archiveProduct } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { ProductRecord } from '../../types/products';

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
