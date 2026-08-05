import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  Ban,
  Eye,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { Tabs } from '../../components/ui/Tabs';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProductStatusBadge, ProductTypeBadge } from '../../components/ui/ProductBadges';
import { ProductHideModal, ProductArchiveModal } from './ProductModals';
import { ProductCategoriesPanel } from './ProductCategoriesPanel';
import { DonationsPanel } from './DonationsPanel';
import { useData, publishProduct, restoreProduct } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { timeAgo, priceLabel } from '../../lib/format';
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABEL, PRODUCT_TYPES, PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { ProductRecord, ProductCategoryRecord } from '../../types/products';

const SORTS = [
  { key: 'added', label: 'Recently Added' },
  { key: 'updated', label: 'Recently Updated' },
  { key: 'name_az', label: 'Product Name A–Z' },
  { key: 'price_lo', label: 'Price Low to High' },
  { key: 'price_hi', label: 'Price High to Low' },
];

function stockLabel(p: ProductRecord): string {
  if (p.type === 'physical') return p.physical ? (p.physical.stock > 0 ? `${p.physical.stock} in stock` : 'Out of stock') : '—';
  if (p.type === 'masterclass') return p.masterclass ? `${p.masterclass.seatsBooked}/${p.masterclass.capacity} seats` : '—';
  return p.digital?.availability ?? '—';
}

export function ProductsPage() {
  const { products } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [catForm, setCatForm] = useState<ProductCategoryRecord | 'new' | null>(null);
  const [hideTarget, setHideTarget] = useState<ProductRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<ProductRecord | null>(null);

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const type = get('type', 'all');
  const cat = get('cat', 'all');
  const status = get('status', 'all');
  const paid = get('paid', 'all');
  const sort = get('sort', 'added');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const rawTab = get('tab');
  const tab = rawTab === 'categories' ? 'categories' : rawTab === 'donations' ? 'donations' : 'products';
  const setTab = (t: string) => update({ tab: t === 'products' ? '' : t }, false);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.id} ${p.sellerName}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (type !== 'all' && p.type !== type) return false;
      if (cat !== 'all' && p.category !== cat) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (paid === 'free' && p.price !== 0) return false;
      if (paid === 'paid' && p.price === 0) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'updated':
          return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
        case 'name_az':
          return a.title.localeCompare(b.title);
        case 'price_lo':
          return a.price - b.price;
        case 'price_hi':
          return b.price - a.price;
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return list;
  }, [products, q, type, cat, status, paid, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (type !== 'all') chips.push({ key: 'type', label: PRODUCT_TYPE_LABEL[type as never] });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });
  if (status !== 'all') chips.push({ key: 'status', label: PRODUCT_STATUS_LABEL[status as never] });
  if (paid !== 'all') chips.push({ key: 'paid', label: paid === 'free' ? 'Free' : 'Paid' });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const detail = (id: string) => navigate(`/admin/products/${id}`, { state: { from: `/admin/products?${params.toString()}` } });

  const doPublish = () => {
    if (!publishTarget) return;
    publishProduct(publishTarget.id, actor);
    toast(`"${publishTarget.title}" published.`);
    setPublishTarget(null);
  };

  const selectCls = 'text-sm';
  const canManage = abilities.manageProducts;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Review and manage creator product listings."
        actions={
          tab === 'categories' ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCatForm('new')} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Add Product Category</Button>
          ) : undefined
        }
      />

      <div className="mb-5">
        <Tabs tabs={[{ key: 'products', label: 'Products' }, { key: 'donations', label: 'Donations' }, { key: 'categories', label: 'Categories' }]} active={tab} onChange={setTab} />
      </div>

      {tab === 'donations' && <DonationsPanel />}
      {tab === 'categories' && <ProductCategoriesPanel formTarget={catForm} setFormTarget={setCatForm} />}

      {tab === 'products' && (
      <>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Search product name, product ID or seller…" aria-label="Search products" className="input-base pl-9" />
          </div>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-52">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select className={selectCls} value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="all">All types</option>
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>)}
          </Select>
          <Select className={selectCls} value={cat} onChange={(e) => update({ cat: e.target.value })}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className={selectCls} value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select className={selectCls} value={paid} onChange={(e) => update({ paid: e.target.value })}>
            <option value="all">Free or Paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted"><span className="font-medium text-charcoal">{total}</span> result{total === 1 ? '' : 's'}</span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button key={chip.key} onClick={() => update({ [chip.key]: '' })} className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100">{chip.label}<X className="h-3 w-3" /></button>
          ))}
          {chips.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear Filters</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock / Capacity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map((p) => (
                <tr key={p.id} className="group hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => detail(p.id)} className="flex items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cream-100 text-charcoal-muted"><Package className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block max-w-[220px] truncate font-medium text-charcoal group-hover:text-magenta-700">{p.title}</span>
                        <span className="block text-xs text-charcoal-muted">{p.id}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={p.sellerName} size="sm" />
                      <span className="text-charcoal">{p.sellerName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><ProductTypeBadge type={p.type} /></td>
                  <td className="px-4 py-3 text-charcoal">{p.category}</td>
                  <td className="px-4 py-3 font-medium text-charcoal">{priceLabel(p.price)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{stockLabel(p)}</td>
                  <td className="px-4 py-3"><ProductStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-charcoal-muted">{timeAgo(p.lastUpdatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'View Product', icon: <Eye className="h-4 w-4" />, onClick: () => detail(p.id) },
                          ...(p.status === 'draft'
                            ? [
                                { label: 'Edit Product', icon: <Pencil className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => detail(p.id) },
                                { label: 'Publish', icon: <Upload className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setPublishTarget(p) },
                              ]
                            : []),
                          ...(p.status === 'published'
                            ? [
                                { label: 'Open Seller Profile', icon: <UserIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users/${p.sellerUserId}`) },
                                { label: 'Hide', icon: <Ban className="h-4 w-4" />, danger: true, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setHideTarget(p) },
                                { label: 'Archive', icon: <Archive className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setArchiveTarget(p) },
                              ]
                            : []),
                          ...(p.status === 'out_of_stock'
                            ? [
                                { label: 'Edit Inventory', icon: <Pencil className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => detail(p.id) },
                                { label: 'Archive', icon: <Archive className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setArchiveTarget(p) },
                              ]
                            : []),
                          ...(p.status === 'hidden'
                            ? [
                                { label: 'Restore', icon: <RotateCcw className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => { restoreProduct(p.id, actor); toast('Product restored to Shop.'); } },
                                { label: 'Archive', icon: <Archive className="h-4 w-4" />, disabled: !canManage, disabledHint: RESTRICTED_HINT, onClick: () => setArchiveTarget(p) },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total === 0 && (
          <EmptyState icon={<Package className="h-6 w-6" />} title="No products match your filters" description="Try adjusting or clearing the filters above." action={<Button variant="secondary" onClick={clearAll}>Clear Filters</Button>} />
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={size} total={total} onPage={(p) => update({ page: String(p) }, false)} onPageSize={(n) => update({ size: String(n) })} />
        )}
      </div>
      </>
      )}

      <ProductHideModal product={hideTarget} onClose={() => setHideTarget(null)} />
      <ProductArchiveModal product={archiveTarget} onClose={() => setArchiveTarget(null)} />
      <ConfirmDialog
        open={!!publishTarget}
        title={`Publish "${publishTarget?.title ?? ''}"?`}
        description="Confirms seller eligibility, required info and an active category, then makes the product Shop-visible."
        confirmLabel="Publish"
        onConfirm={doPublish}
        onCancel={() => setPublishTarget(null)}
      />
    </div>
  );
}
