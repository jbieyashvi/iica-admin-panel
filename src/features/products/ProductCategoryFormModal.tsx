import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { addProductCategory, editProductCategory, productCategoryNameExists } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import type { ProductCategoryRecord, ProductCategoryStatus, ProductType } from '../../types/products';

export function ProductCategoryFormModal({
  target,
  onClose,
}: {
  target: ProductCategoryRecord | 'new' | null;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const editing = target && target !== 'new' ? target : null;

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('masterclass');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductCategoryStatus>('active');
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = target === 'new' ? 'new' : target?.id ?? null;
  if (key !== lastKey) {
    setLastKey(key);
    setName(editing?.name ?? '');
    setType(editing?.type ?? 'masterclass');
    setDescription(editing?.description ?? '');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  if (!target) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Category name is required.');
    if (productCategoryNameExists(trimmed, editing?.type ?? type, editing?.id)) {
      return setError('A category with this name already exists for this product type.');
    }
    if (editing) {
      editProductCategory(editing.id, { name: trimmed, description }, actor);
      toast(`${trimmed} updated.`);
    } else {
      const created = addProductCategory({ name: trimmed, type, description, status }, actor);
      if (!created) return setError('Could not create category.');
      toast(`Category "${trimmed}" created.`);
    }
    onClose();
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add Product Category'}
      description="Product categories are centrally controlled — creators cannot type their own."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{editing ? 'Save changes' : 'Create category'}</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Category name" htmlFor="pc-name" required>
          <Input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Watercolour Prints" />
        </Field>
        <Field label="Product type" htmlFor="pc-type" required hint={editing ? 'Product type cannot be changed after creation.' : undefined}>
          <Select id="pc-type" value={editing?.type ?? type} disabled={!!editing} onChange={(e) => setType(e.target.value as ProductType)}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Short description" htmlFor="pc-desc">
          <Textarea id="pc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {!editing && (
          <Field label="Status" htmlFor="pc-status">
            <Select id="pc-status" value={status} onChange={(e) => setStatus(e.target.value as ProductCategoryStatus)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
