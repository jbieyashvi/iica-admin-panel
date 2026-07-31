import { useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { useData, addMembershipPrice, updateMembershipPrice, setMembershipPriceStatus, duplicateActivePrice } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { CURRENCIES, CURRENCY_COUNTRY, formatCurrency } from '../../config/currency';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import type { CurrencyCode } from '../../config/currency';
import type { MembershipPlan, MembershipPriceRecord } from '../../types/pricing';

const PLANS: MembershipPlan[] = ['Monthly', 'Annual', 'Lifetime'];

export function PricingCurrencyTab() {
  const { membershipPricing } = useData();
  const { abilities, actor } = useActor();
  const canEdit = abilities.manageCategories;

  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<MembershipPriceRecord | null>(null);
  const [deactivate, setDeactivate] = useState<MembershipPriceRecord | null>(null);

  const rows = [...membershipPricing].sort((a, b) =>
    a.category.localeCompare(b.category) || a.plan.localeCompare(b.plan) || a.currency.localeCompare(b.currency));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-charcoal-muted">Admin enters the final local Membership price for each region.</p>
        {canEdit && <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Regional Price</Button>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Membership Category</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Country / Region</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Membership Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-cream-100/50">
                  <td className="px-4 py-3 font-medium text-charcoal">{r.category}</td>
                  <td className="px-4 py-3 text-charcoal">{r.plan}</td>
                  <td className="px-4 py-3 text-charcoal">{r.country}</td>
                  <td className="px-4 py-3 text-charcoal">{r.currency}</td>
                  <td className="px-4 py-3 text-right font-medium text-charcoal">{formatCurrency(r.price, r.currency)}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'active' ? 'green' : 'neutral'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu items={[
                        { label: 'Edit Price', icon: <Pencil className="h-4 w-4" />, disabled: !canEdit, onClick: () => setEdit(r) },
                        r.status === 'active'
                          ? { label: 'Deactivate', icon: <Power className="h-4 w-4" />, danger: true, disabled: !canEdit, onClick: () => setDeactivate(r) }
                          : { label: 'Activate', icon: <Power className="h-4 w-4" />, disabled: !canEdit, onClick: () => { setMembershipPriceStatus(r.id, 'active', actor); toast('Pricing activated.'); } },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-200 px-4 py-3 text-xs text-charcoal-muted">
          Regional Membership pricing. The User App shows the active configured local price for the user’s selected/verified country.
        </div>
      </div>

      {addOpen && <PriceModal onClose={() => setAddOpen(false)} />}
      {edit && <PriceModal record={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog
        open={!!deactivate}
        title={`Deactivate ${deactivate?.category ?? ''} · ${deactivate?.plan ?? ''} · ${deactivate?.country ?? ''}?`}
        description="This regional price will no longer be offered in the User App. Existing configured prices are preserved."
        confirmLabel="Deactivate"
        tone="danger"
        onConfirm={() => { if (deactivate) { setMembershipPriceStatus(deactivate.id, 'inactive', actor); toast('Pricing deactivated.'); } setDeactivate(null); }}
        onCancel={() => setDeactivate(null)}
      />
    </div>
  );
}

function PriceModal({ record, onClose }: { record?: MembershipPriceRecord; onClose: () => void }) {
  const { actor } = useActor();
  const isEdit = !!record;
  const [category, setCategory] = useState(record?.category ?? MEMBERSHIP_CATEGORIES[0]);
  const [plan, setPlan] = useState<MembershipPlan>(record?.plan ?? 'Annual');
  const [currency, setCurrency] = useState<CurrencyCode>(record?.currency ?? 'INR');
  const [price, setPrice] = useState(record ? String(record.price) : '');
  const [status, setStatus] = useState(record?.status ?? 'active');
  const [err, setErr] = useState<string | null>(null);
  const country = CURRENCY_COUNTRY[currency];

  const save = () => {
    setErr(null);
    if (!category) return setErr('Category is required.');
    if (!plan) return setErr('Plan is required.');
    if (!currency) return setErr('Currency (region) is required.');
    const num = Number(price);
    if (Number.isNaN(num) || num <= 0) return setErr('Membership price must be greater than zero.');
    if (isEdit) {
      const ok = updateMembershipPrice(record!.id, { price: num, status }, actor);
      if (!ok) return setErr('Could not save — a duplicate active price exists for this Category + Plan + Region.');
    } else {
      if (status === 'active' && duplicateActivePrice({ category, plan, country })) {
        return setErr('An active price already exists for this Category + Plan + Region.');
      }
      const ok = addMembershipPrice({ category, plan, country, currency, price: num, status }, actor);
      if (!ok) return setErr('Could not save the regional price.');
    }
    toast(isEdit ? 'Regional price updated.' : 'Regional price added.');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Price' : 'Add Regional Price'} description={isEdit ? `${record!.category} · ${record!.plan} · ${record!.country}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{isEdit ? 'Save Price' : 'Add Price'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Membership category" required>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isEdit}>
              {MEMBERSHIP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Plan" required>
            <Select value={plan} onChange={(e) => setPlan(e.target.value as MembershipPlan)} disabled={isEdit}>
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Country / Region (currency)" required>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} disabled={isEdit}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_COUNTRY[c]} · {c}</option>)}
            </Select>
          </Field>
          <Field label={`Membership price (${currency})`} required hint="Final local price for this region.">
            <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
