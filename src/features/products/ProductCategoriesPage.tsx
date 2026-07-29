import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CheckCircle2, ListChecks, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProductTypeBadge } from '../../components/ui/ProductBadges';
import { ProductCategoryFormModal } from './ProductCategoryFormModal';
import { useData, setProductCategoryStatus, productCategoryUsage } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { ProductCategoryRecord } from '../../types/products';

const TYPE_ORDER: Record<string, number> = { masterclass: 0, digital: 1, physical: 2 };

export function ProductCategoriesPage() {
  const { productCategories, products } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();

  const [formTarget, setFormTarget] = useState<ProductCategoryRecord | 'new' | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductCategoryRecord | null>(null);

  const canManage = abilities.manageProducts;

  const usage = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const k = `${p.type}::${p.category}`;
      map[k] = (map[k] ?? 0) + 1;
    });
    return map;
  }, [products]);

  const sorted = useMemo(
    () => [...productCategories].sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.name.localeCompare(b.name)),
    [productCategories],
  );

  const doDeactivate = () => {
    if (!deactivateTarget) return;
    setProductCategoryStatus(deactivateTarget.id, 'inactive', actor);
    toast(`${deactivateTarget.name} deactivated. Existing products keep their category.`, 'info');
    setDeactivateTarget(null);
  };

  return (
    <div>
      <PageHeader
        title="Product Categories"
        description="Manage categories available for creator products."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormTarget('new')} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>
            Add Category
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Product Type</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {sorted.map((c) => {
                const count = usage[`${c.type}::${c.name}`] ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-charcoal">{c.name}</span>
                      {c.description && <span className="block max-w-xs truncate text-xs text-charcoal-muted">{c.description}</span>}
                    </td>
                    <td className="px-4 py-3"><ProductTypeBadge type={c.type} /></td>
                    <td className="px-4 py-3 text-charcoal">{count}</td>
                    <td className="px-4 py-3">
                      {c.status === 'active' ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu
                          items={[
                            { label: 'View Products', icon: <ListChecks className="h-4 w-4" />, onClick: () => navigate(`/admin/products?type=${c.type}&cat=${encodeURIComponent(c.name)}`) },
                            { label: 'Edit', icon: <Pencil className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setFormTarget(c) },
                            { divider: true, label: 'd' },
                            c.status === 'active'
                              ? { label: 'Deactivate', icon: <Ban className="h-4 w-4" />, danger: true, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setDeactivateTarget(c) }
                              : { label: 'Activate', icon: <CheckCircle2 className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => { setProductCategoryStatus(c.id, 'active', actor); toast(`${c.name} activated.`); } },
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
          Only active categories can be selected for new products. Existing products keep an inactive category.
        </div>
      </div>

      <ProductCategoryFormModal target={formTarget} onClose={() => setFormTarget(null)} />
      <ConfirmDialog
        open={!!deactivateTarget}
        title={`Deactivate "${deactivateTarget?.name ?? ''}"?`}
        description={
          deactivateTarget
            ? `New products can no longer choose this category. ${productCategoryUsage(deactivateTarget.name, deactivateTarget.type)} existing product(s) keep it.`
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
