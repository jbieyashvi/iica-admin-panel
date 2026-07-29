import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Ban, RotateCcw, Upload, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProductStatusBadge, ProductTypeBadge } from '../../components/ui/ProductBadges';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import { ProductHideModal, ProductArchiveModal } from './ProductModals';
import { useData, publishProduct, restoreProduct, addProductNote } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate, formatDateTime, formatMoney, priceLabel } from '../../lib/format';
import { PRODUCT_TYPE_LABEL, COMMISSION_RATE, COMMISSION_NOTE } from '../../config/productLabels';

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-charcoal">{title}</h3>{action}</div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 py-2.5 last:border-0">
      <span className="text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

export function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { products, memberships, productCategories } = useData();
  const { abilities, actor } = useActor();

  const product = products.find((p) => p.id === productId);
  const membership = memberships.find((m) => m.userId === product?.sellerUserId);

  const [hideOpen, setHideOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [note, setNote] = useState('');

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/products';

  if (!product) {
    return (
      <div>
        <Link to="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Products</Link>
        <div className="card"><EmptyState title="Product not found" description="This product may have been removed." /></div>
      </div>
    );
  }

  const canManage = abilities.manageProducts;
  const sellerEligible = membership?.membershipStatus === 'active';
  const categoryActive = productCategories.some((c) => c.type === product.type && c.name === product.category && c.status === 'active');
  const infoComplete = product.title.trim().length > 0 && product.description.trim().length > 0;
  const canPublish = canManage && sellerEligible && categoryActive && infoComplete && product.status !== 'published';

  const price = product.price;
  const commissionRate = COMMISSION_RATE[product.type];
  const effective = product.discountPrice ?? price;
  const commission = Math.round(effective * commissionRate);
  const earnings = effective - commission;

  const submitNote = () => {
    if (!note.trim()) return;
    addProductNote(product.id, note.trim(), actor);
    toast('Note added.');
    setNote('');
  };

  return (
    <div>
      <button onClick={() => navigate(back)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Products</button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-medium text-charcoal">{product.title}</h1>
              <ProductStatusBadge status={product.status} />
              <ProductTypeBadge type={product.type} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-muted">
              <span>{product.id}</span>
              <span className="flex items-center gap-1"><Avatar name={product.sellerName} size="sm" /> {product.sellerName}</span>
              <span className="font-medium text-charcoal">{priceLabel(price)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Upload className="h-4 w-4" />} onClick={() => setPublishOpen(true)} disabled={!canPublish} title={!canManage ? RESTRICTED_HINT : !sellerEligible ? 'Seller needs an active creator membership.' : !categoryActive ? 'Selected category is inactive.' : product.status === 'published' ? 'Already published.' : ''}>Publish</Button>
            {product.status === 'hidden'
              ? <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRestoreOpen(true)} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT}>Restore</Button>
              : <Button variant="secondary" icon={<Ban className="h-4 w-4" />} onClick={() => setHideOpen(true)} disabled={!canManage || !['published', 'out_of_stock'].includes(product.status)} title={canManage ? '' : RESTRICTED_HINT}>Hide</Button>}
            <Button variant="danger" icon={<Archive className="h-4 w-4" />} onClick={() => setArchiveOpen(true)} disabled={!canManage || product.status === 'archived'} title={canManage ? '' : RESTRICTED_HINT}>Archive</Button>
          </div>
        </div>
        {!sellerEligible && (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">Seller does not have an active creator membership — verify eligibility before publishing.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card title="Product Preview">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {product.images.map((img, i) => (
                <div key={img} className="flex aspect-square items-center justify-center rounded-lg bg-cream-100 text-xs text-charcoal-muted/60">Image {i + 1}</div>
              ))}
            </div>
            <p className="font-serif text-lg font-medium text-charcoal">{product.title}</p>
            <p className="text-sm font-medium text-magenta-700">{priceLabel(price)}{product.discountPrice ? <span className="ml-2 text-xs text-charcoal-muted line-through">{formatMoney(price, '₹')}</span> : null}</p>
            <p className="mt-2 text-sm leading-relaxed text-charcoal">{product.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-3 text-xs text-charcoal-muted">
              <span>Seller: {product.sellerName}</span>
              <span>· Category: {product.category}</span>
            </div>
          </Card>
        </div>

        {/* Info + Pricing */}
        <div className="space-y-6">
          <Card title="Product Information">
            <Row label="Product ID">{product.id}</Row>
            <Row label="Product type">{PRODUCT_TYPE_LABEL[product.type]}</Row>
            <Row label="Category">{product.category}{!categoryActive && <Badge tone="amber" className="ml-1">Inactive</Badge>}</Row>
            <Row label="Seller">
              <button onClick={() => navigate(`/admin/users/${product.sellerUserId}`)} className="inline-flex items-center gap-1 text-magenta-600 hover:text-magenta-700">
                <UserIcon className="h-3.5 w-3.5" /> {product.sellerName}
              </button>
            </Row>
            <Row label="Created">{formatDate(product.createdAt)}</Row>
            <Row label="Last updated">{formatDate(product.lastUpdatedAt)}</Row>
          </Card>

          <Card title="Pricing">
            <Row label="Base price">{priceLabel(price)}</Row>
            {product.discountPrice ? <Row label="Discount price">{formatMoney(product.discountPrice, '₹')}</Row> : null}
            <Row label="Currency">{product.currency}</Row>
            <Row label="Platform commission">{price === 0 ? '—' : formatMoney(commission, '₹')}</Row>
            <Row label="Estimated seller earnings">{price === 0 ? 'Free' : formatMoney(earnings, '₹')}</Row>
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">{COMMISSION_NOTE[product.type]}</div>
          </Card>
        </div>

        {/* Inventory / Capacity */}
        <div className="lg:col-span-2">
          <Card title={product.type === 'masterclass' ? 'Capacity' : product.type === 'digital' ? 'Availability' : 'Inventory'}>
            {product.type === 'physical' && product.physical && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Row label="SKU">{product.physical.sku}</Row>
                  <Row label="Stock quantity">{product.physical.stock}</Row>
                  <Row label="Low-stock threshold">{product.physical.lowStockThreshold}</Row>
                  <Row label="Weight">{product.physical.weight}</Row>
                </div>
                <div>
                  <Row label="Dimensions">{product.physical.dimensions}</Row>
                  <Row label="Shipping origin">{product.physical.shippingOrigin}</Row>
                  <Row label="Dispatch timeline">{product.physical.dispatchTimeline}</Row>
                </div>
              </div>
            )}
            {product.type === 'masterclass' && product.masterclass && (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <Row label="Session date & time">{formatDateTime(product.masterclass.sessionAt)}</Row>
                  <Row label="Timezone">{product.masterclass.timezone}</Row>
                  <Row label="Duration">{product.masterclass.durationMins} mins</Row>
                </div>
                <div>
                  <Row label="Total capacity">{product.masterclass.capacity}</Row>
                  <Row label="Seats booked">{product.masterclass.seatsBooked}</Row>
                  <Row label="Available seats">{Math.max(0, product.masterclass.capacity - product.masterclass.seatsBooked)}</Row>
                  <Row label="Delivery mode">{product.masterclass.deliveryMode}</Row>
                </div>
              </div>
            )}
            {product.type === 'digital' && product.digital && (
              <>
                <Row label="Digital format">{product.digital.digitalFormat}</Row>
                <Row label="Availability">{product.digital.availability}</Row>
                <Row label="Expected delivery">{product.digital.deliveryTime}</Row>
              </>
            )}
          </Card>
        </div>

        {/* Fulfilment */}
        <div>
          <Card title="Fulfilment">
            {product.type === 'physical' && product.physical && (
              <div className="space-y-2 text-sm text-charcoal">
                <p>The seller dispatches the item. Shipping is required.</p>
                <p className="text-charcoal-muted">Estimated dispatch: <span className="font-medium text-charcoal">{product.physical.dispatchTimeline}</span></p>
                <p className="text-charcoal-muted">Return policy: <span className="font-medium text-charcoal">{product.physical.returnPolicy}</span></p>
              </div>
            )}
            {product.type === 'digital' && product.digital && (
              <div className="space-y-2 text-sm text-charcoal">
                <p>The seller delivers the digital file by email.</p>
                <p className="text-charcoal-muted">{product.digital.deliveryInstructions}</p>
              </div>
            )}
            {product.type === 'masterclass' && product.masterclass && (
              <div className="space-y-2 text-sm text-charcoal">
                <p>The seller emails the session / Zoom link to the buyer.</p>
                <p className="text-charcoal-muted">{product.masterclass.deliveryInstructions}</p>
                <p className="text-xs text-amber-700">"Delivery sent" does not confirm buyer access.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Status history */}
        <div className="lg:col-span-2">
          <Card title="Status History"><MembershipTimeline events={product.timeline} /></Card>
        </div>

        {/* Internal notes */}
        <div>
          <Card title="Internal Notes">
            {canManage && (
              <div className="mb-3">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
                <div className="mt-2 flex justify-end"><Button size="sm" onClick={submitNote} disabled={!note.trim()}>Add note</Button></div>
              </div>
            )}
            {product.notes.length === 0 ? <p className="text-sm text-charcoal-muted">No notes yet.</p> : (
              <ul className="space-y-2">
                {product.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-2.5">
                    <p className="text-sm text-charcoal">{n.body}</p>
                    <p className="mt-0.5 text-xs text-charcoal-muted">{n.author} · {formatDateTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ProductHideModal product={hideOpen ? product : null} onClose={() => setHideOpen(false)} />
      <ProductArchiveModal product={archiveOpen ? product : null} onClose={() => setArchiveOpen(false)} />
      <ConfirmDialog
        open={publishOpen}
        title={`Publish "${product.title}"?`}
        description="Confirms the seller has an active membership, an active category and complete information, then makes the product Shop-visible."
        confirmLabel="Publish"
        onConfirm={() => { publishProduct(product.id, actor); toast('Product published.'); setPublishOpen(false); }}
        onCancel={() => setPublishOpen(false)}
      />
      <ConfirmDialog
        open={restoreOpen}
        title={`Restore "${product.title}"?`}
        description="Makes the product Shop-visible again."
        confirmLabel="Restore"
        onConfirm={() => { restoreProduct(product.id, actor); toast('Product restored.'); setRestoreOpen(false); }}
        onCancel={() => setRestoreOpen(false)}
      />
    </div>
  );
}
