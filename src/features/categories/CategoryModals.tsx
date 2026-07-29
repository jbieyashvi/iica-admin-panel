import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { CategoryStatusBadge } from '../../components/ui/PortfolioBadges';
import { CategoryIcon, ICON_OPTIONS } from '../../lib/iconMap';
import { addCategory, editCategory, setCategoryStatus, categoryNameExists } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { formatDateTime } from '../../lib/format';
import type { CategoryRecord } from '../../types/portfolio';

export function AddCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actor } = useActor();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setDescription('');
    setIcon('Tag');
    setVisible(true);
    setActive(true);
    setError(null);
  };

  const submit = () => {
    if (!name.trim()) return setError('Category name is required.');
    if (!description.trim()) return setError('A description is required.');
    if (categoryNameExists(name)) return setError('A category with this name already exists.');
    const created = addCategory(
      { name, description, icon, catalogueVisible: visible, status: active ? 'active' : 'inactive' },
      actor,
    );
    if (!created) return setError('Could not create category.');
    toast(`Category "${name.trim()}" created.`);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add Category"
      description="Create a centrally controlled membership category."
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={submit}>Create Category</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Category name" htmlFor="cat-name" required>
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Culinary Artist" />
        </Field>
        <Field label="Description" htmlFor="cat-desc" required>
          <Textarea id="cat-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Suggested icon" htmlFor="cat-icon">
            <Select id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
              {ICON_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <span className="flex h-10 items-center gap-2 rounded-lg border border-cream-200 px-3 text-sm text-charcoal-muted">
              Preview <CategoryIcon name={icon} className="h-5 w-5 text-magenta-600" />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2.5 text-sm text-charcoal">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
            Catalogue visible
          </label>
          <label className="flex items-center gap-2.5 text-sm text-charcoal">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
            Active
          </label>
        </div>
      </div>
    </Modal>
  );
}

export function EditDescriptionModal({ category, onClose }: { category: CategoryRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [description, setDescription] = useState('');
  const [visible, setVisible] = useState(true);
  const [lastId, setLastId] = useState<string | null>(null);

  if (category && category.id !== lastId) {
    setLastId(category.id);
    setDescription(category.description);
    setVisible(category.catalogueVisible);
  }

  const submit = () => {
    if (!category) return;
    editCategory(category.id, { description, catalogueVisible: visible }, actor);
    toast(`${category.name} updated.`);
    onClose();
  };

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      title={`Edit ${category?.name ?? 'category'}`}
      description="Update the public description and catalogue visibility."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Public description" htmlFor="cat-edit-desc">
          <Textarea id="cat-edit-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-charcoal">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
          Show category in catalogue
        </label>
      </div>
    </Modal>
  );
}

export function DeactivateCategoryModal({ category, usage, onClose }: { category: CategoryRecord | null; usage: number; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!category) return;
    if (!reason.trim()) return setError('A reason is required to deactivate a category.');
    setCategoryStatus(category.id, 'inactive', actor, reason.trim());
    toast(`${category.name} deactivated.`, 'info');
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={!!category}
      onClose={() => { setReason(''); setError(null); onClose(); }}
      title={`Deactivate ${category?.name ?? 'category'}?`}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setReason(''); onClose(); }}>Cancel</Button>
          <Button variant="danger" onClick={submit}>Deactivate</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">What deactivation does</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>New members can no longer select this category.</li>
            <li>Existing {usage} profile{usage === 1 ? '' : 's'} keep their assignment.</li>
            <li>No profiles are removed automatically.</li>
          </ul>
        </div>
      </div>
      <Field label="Reason" htmlFor="cat-deact-reason" required>
        <Input id="cat-deact-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this category being deactivated?" />
      </Field>
    </Modal>
  );
}

export function CategoryDrawer({
  category,
  counts,
  onClose,
}: {
  category: CategoryRecord | null;
  counts: { profiles: Record<string, number>; active: Record<string, number> };
  onClose: () => void;
}) {
  return (
    <Drawer open={!!category} onClose={onClose} title={category?.name ?? 'Category'} description="Category details & change history">
      {category && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-magenta-50 text-magenta-600">
              <CategoryIcon name={category.icon} className="h-6 w-6" />
            </span>
            <div>
              <p className="font-serif text-lg font-medium text-charcoal">{category.name}</p>
              <CategoryStatusBadge status={category.status} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Public description</p>
            <p className="text-sm text-charcoal">{category.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-cream-200 bg-cream-100/50 p-3">
              <p className="font-serif text-xl font-medium text-charcoal">{counts.profiles[category.name] ?? 0}</p>
              <p className="text-xs text-charcoal-muted">Active profiles</p>
            </div>
            <div className="rounded-lg border border-cream-200 bg-cream-100/50 p-3">
              <p className="font-serif text-xl font-medium text-charcoal">{counts.active[category.name] ?? 0}</p>
              <p className="text-xs text-charcoal-muted">Active memberships</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Related domains / genres</p>
            <div className="flex flex-wrap gap-1.5">
              {category.relatedDomains.length ? (
                category.relatedDomains.map((d) => <Badge key={d} tone="neutral">{d}</Badge>)
              ) : (
                <span className="text-sm text-charcoal-muted">None recorded</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Catalogue visibility</p>
            {category.catalogueVisible ? <Badge tone="green">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Change history</p>
            <ul className="space-y-2.5">
              {category.history.map((h) => (
                <li key={h.id} className="border-b border-cream-200 pb-2.5 last:border-0">
                  <p className="text-sm font-medium text-charcoal">{h.action}</p>
                  <p className="text-xs text-charcoal-muted">
                    {h.by} · {h.role} · {formatDateTime(h.at)}
                    {h.detail ? ` · ${h.detail}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}
