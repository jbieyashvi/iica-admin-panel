import { useState } from 'react';
import { Eye, Pencil, Power } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Field, Input, Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { useData, updateMembershipPrice, setMembershipPriceStatus } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { formatDate } from '../../lib/format';
import {
  BASE_CURRENCY, BASE_CURRENCY_NOTE, CURRENCIES, CURRENCY_COUNTRY, FX_RATE_TO_INR, FX_RATE_TIMESTAMP,
  FX_RATE_SOURCE, formatCurrency,
} from '../../config/currency';
import type { MembershipPriceRecord } from '../../types/pricing';

const METHOD_LABEL = { fixed: 'Fixed Local Price', conversion: 'Base Price Conversion' } as const;

export function PricingCurrencyTab() {
  const { membershipPricing } = useData();
  const { abilities, actor } = useActor();
  const canEdit = abilities.manageCategories;

  const [edit, setEdit] = useState<MembershipPriceRecord | null>(null);
  const [view, setView] = useState<MembershipPriceRecord | null>(null);

  const rows = [...membershipPricing].sort((a, b) =>
    a.category.localeCompare(b.category) || a.plan.localeCompare(b.plan) || a.currency.localeCompare(b.currency));

  return (
    <div className="space-y-6">
      {/* Base currency + FX rates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-1">
          <p className="text-sm font-semibold text-charcoal">Platform Base Currency</p>
          <p className="mt-1 font-serif text-2xl font-medium text-charcoal">{BASE_CURRENCY}</p>
          <p className="mt-1 text-xs text-charcoal-muted">{BASE_CURRENCY_NOTE}</p>
          <p className="mt-2 text-xs text-charcoal-muted">All Dashboard revenue totals use this base currency. Amounts in different currencies are never added together directly.</p>
        </div>
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-cream-200 px-4 py-3 text-sm font-semibold text-charcoal">Exchange Rates (Prototype)</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-4 py-2.5">Currency</th>
                  <th className="px-4 py-2.5 text-right">Rate → INR</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {CURRENCIES.map((c) => (
                  <tr key={c}>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{c} · {CURRENCY_COUNTRY[c]}</td>
                    <td className="px-4 py-2.5 text-right text-charcoal">{c === 'INR' ? '1.00' : `₹${FX_RATE_TO_INR[c]}`}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{FX_RATE_SOURCE}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{formatDate(FX_RATE_TIMESTAMP)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pricing table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Membership Category</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Country / Region</th>
                <th className="px-4 py-3">Customer Currency</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Base Currency</th>
                <th className="px-4 py-3 text-right">Base Price</th>
                <th className="px-4 py-3">Pricing Method</th>
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
                  <td className="px-4 py-3 text-charcoal-muted">{r.baseCurrency}</td>
                  <td className="px-4 py-3 text-right text-charcoal-muted">{formatCurrency(r.basePrice, r.baseCurrency)}</td>
                  <td className="px-4 py-3"><Badge tone={r.method === 'fixed' ? 'blue' : 'neutral'}>{METHOD_LABEL[r.method]}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'active' ? 'green' : 'neutral'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu items={[
                        { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => setView(r) },
                        { label: 'Edit Price', icon: <Pencil className="h-4 w-4" />, disabled: !canEdit, onClick: () => setEdit(r) },
                        { label: r.status === 'active' ? 'Deactivate' : 'Activate', icon: <Power className="h-4 w-4" />, danger: r.status === 'active', disabled: !canEdit,
                          onClick: () => { setMembershipPriceStatus(r.id, r.status === 'active' ? 'inactive' : 'active', actor); toast('Pricing status updated.'); } },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-200 px-4 py-3 text-xs text-charcoal-muted">
          Regional Membership pricing (prototype). If no active regional price exists, the base Membership price is used and shown in the base currency. No fake live exchange-rate service is used.
        </div>
      </div>

      {edit && <EditPriceModal record={edit} onClose={() => setEdit(null)} />}
      {view && <ViewPriceModal record={view} onClose={() => setView(null)} />}
    </div>
  );
}

function EditPriceModal({ record, onClose }: { record: MembershipPriceRecord; onClose: () => void }) {
  const { actor } = useActor();
  const [price, setPrice] = useState(String(record.price));
  const [method, setMethod] = useState(record.method);
  const [status, setStatus] = useState(record.status);
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const num = Number(price);
    if (Number.isNaN(num) || num < 0) { setErr('Enter a valid price (0 or more).'); return; }
    const ok = updateMembershipPrice(record.id, { price: num, method, status }, actor);
    if (!ok) { setErr('Could not save the price.'); return; }
    toast('Regional price updated.');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Edit Price" description={`${record.category} · ${record.plan} · ${record.country}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save Price</Button></>}>
      <div className="space-y-4">
        <Field label={`Price (${record.currency})`} required hint="Fixed Local Price stays until you edit it.">
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Pricing method" required>
          <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="fixed">Fixed Local Price</option>
            <option value="conversion">Base Price Conversion</option>
          </Select>
        </Field>
        <Field label="Status" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <p className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-xs text-charcoal-muted">
          Base price: {formatCurrency(record.basePrice, record.baseCurrency)}. Base Price Conversion shows a converted prototype price; the final amount may be confirmed by the payment provider at checkout.
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

function ViewPriceModal({ record, onClose }: { record: MembershipPriceRecord; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Regional Price" description={`${record.category} · ${record.plan} · ${record.country}`}
      footer={<Button onClick={onClose}>Close</Button>}>
      <div className="space-y-1.5 text-sm">
        {[
          ['Customer currency', record.currency],
          ['Local price', formatCurrency(record.price, record.currency)],
          ['Base currency', record.baseCurrency],
          ['Base price', formatCurrency(record.basePrice, record.baseCurrency)],
          ['Pricing method', METHOD_LABEL[record.method]],
          ['Applied rate', record.currency === 'INR' ? 'No conversion' : `1 ${record.currency} = ₹${FX_RATE_TO_INR[record.currency]}`],
          ['Rate source', FX_RATE_SOURCE],
          ['Rate timestamp', formatDate(FX_RATE_TIMESTAMP)],
          ['Status', record.status === 'active' ? 'Active' : 'Inactive'],
          ['Updated', formatDate(record.updatedAt)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-cream-200 py-1.5 last:border-0">
            <span className="text-charcoal-muted">{k}</span><span className="text-right font-medium text-charcoal">{v}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
