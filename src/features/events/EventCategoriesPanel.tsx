import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CheckCircle2, ListChecks, Pencil } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EventCategoryFormModal } from './EventCategoryFormModal';
import { useData, setEventCategoryStatus, eventCategoryUsage } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { formatDate } from '../../lib/format';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { EventCategoryRecord } from '../../types/events';

// Headerless Event Categories panel — rendered inside the Events page "Categories"
// tab. The "Add Event Category" action lives in the shared page header (formTarget
// lifted to the parent).
export function EventCategoriesPanel({
  formTarget,
  setFormTarget,
}: {
  formTarget: EventCategoryRecord | 'new' | null;
  setFormTarget: (t: EventCategoryRecord | 'new' | null) => void;
}) {
  const { eventCategories, events } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();

  const [deactivateTarget, setDeactivateTarget] = useState<EventCategoryRecord | null>(null);
  const canManage = abilities.manageEvents;

  const usage = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => (map[e.category] = (map[e.category] ?? 0) + 1));
    return map;
  }, [events]);

  const sorted = useMemo(() => [...eventCategories].sort((a, b) => a.order - b.order), [eventCategories]);

  const doDeactivate = () => {
    if (!deactivateTarget) return;
    setEventCategoryStatus(deactivateTarget.id, 'inactive', actor);
    toast(`${deactivateTarget.name} deactivated. Existing events keep their category.`, 'info');
    setDeactivateTarget(null);
  };

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {sorted.map((c) => {
                const count = usage[c.name] ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-charcoal">{c.name}</span>
                      {c.isDefault && <Badge tone="neutral" className="ml-1.5">Default</Badge>}
                    </td>
                    <td className="max-w-sm px-4 py-3 text-charcoal-muted"><span className="line-clamp-1">{c.description || '—'}</span></td>
                    <td className="px-4 py-3 text-charcoal">{count}</td>
                    <td className="px-4 py-3">
                      {c.status === 'active' ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'View Related Events', icon: <ListChecks className="h-4 w-4" />, onClick: () => navigate(`/admin/events?cat=${encodeURIComponent(c.name)}`) },
                            { label: 'Edit Category', icon: <Pencil className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setFormTarget(c) },
                            { divider: true, label: 'd' },
                            c.status === 'active'
                              ? { label: 'Deactivate', icon: <Ban className="h-4 w-4" />, danger: true, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setDeactivateTarget(c) }
                              : { label: 'Activate', icon: <CheckCircle2 className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => { setEventCategoryStatus(c.id, 'active', actor); toast(`${c.name} activated.`); } },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-200 px-4 py-3 text-xs text-charcoal-muted">
          Categories cannot be deleted while events are assigned — deactivate instead. Existing events always keep their category.
        </div>
      </div>

      <EventCategoryFormModal target={formTarget} onClose={() => setFormTarget(null)} />
      <ConfirmDialog
        open={!!deactivateTarget}
        title={`Deactivate "${deactivateTarget?.name ?? ''}"?`}
        description={
          deactivateTarget
            ? `New events can no longer choose this category. ${eventCategoryUsage(deactivateTarget.name)} existing event(s) keep it.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="danger"
        onConfirm={doDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
