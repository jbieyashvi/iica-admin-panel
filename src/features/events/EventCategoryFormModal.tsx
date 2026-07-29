import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { useData, addEventCategory, editEventCategory, eventCategoryNameExists } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { EventCategoryRecord, EventCategoryStatus } from '../../types/events';

// Flags existing categories with similar names (non-blocking warning).
function similarEventCategories(name: string, existing: string[]): string[] {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return [];
  const tokens = n.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  return existing.filter((c) => {
    const cn = c.toLowerCase();
    if (cn === n) return false;
    if (cn.includes(n) || n.includes(cn)) return true;
    const ct = cn.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    return tokens.some((t) => ct.some((x) => x === t || x.startsWith(t) || t.startsWith(x)));
  });
}

export function EventCategoryFormModal({
  target,
  onClose,
  onCreated,
}: {
  target: EventCategoryRecord | 'new' | null;
  onClose: () => void;
  onCreated?: (name: string) => void;
}) {
  const { eventCategories } = useData();
  const { actor } = useActor();
  const editing = target && target !== 'new' ? target : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EventCategoryStatus>('active');
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Sync form state when the target changes.
  const key = target === 'new' ? 'new' : target?.id ?? null;
  if (key !== lastKey) {
    setLastKey(key);
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setStatus(editing?.status ?? 'active');
    setError(null);
  }

  if (!target) return null;

  const names = eventCategories.map((c) => c.name);
  const similar = similarEventCategories(name, names).filter((s) => s.toLowerCase() !== (editing?.name.toLowerCase() ?? ''));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Category name is required.');
    if (eventCategoryNameExists(trimmed, editing?.id)) return setError('A category with this name already exists.');
    if (editing) {
      editEventCategory(editing.id, { name: trimmed, description }, actor);
      toast(`${trimmed} updated.`);
    } else {
      const created = addEventCategory({ name: trimmed, description, status }, actor);
      if (!created) return setError('Could not create category.');
      toast(`Category "${trimmed}" created.`);
      onCreated?.(created.name);
    }
    onClose();
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add Event Category'}
      description={editing ? 'Update the category name, description or status.' : 'Create a centrally managed event category.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{editing ? 'Save changes' : 'Create category'}</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Category name" htmlFor="ec-name" required>
          <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sufi Fusion Night" />
        </Field>
        {similar.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">Similar categories already exist: {similar.map((s) => <span key={s} className="font-medium">{s} </span>)} — make sure this isn't a duplicate.</p>
          </div>
        )}
        <Field label="Short description" htmlFor="ec-desc">
          <Textarea id="ec-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What kind of events belong here?" />
        </Field>
        {!editing && (
          <Field label="Status" htmlFor="ec-status">
            <Select id="ec-status" value={status} onChange={(e) => setStatus(e.target.value as EventCategoryStatus)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
