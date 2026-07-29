import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { updateCommissionConfig, upsertCommissionOverride } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { REVENUE_TYPE_LABEL } from '../../config/payoutLabels';
import type { CommissionConfig, CommissionOverride, RevenueType } from '../../types/payouts';

const pct = (rate: number) => String(Math.round(rate * 1000) / 10);

// ---- Edit commission config -----------------------------------------------
export function EditCommissionModal({ config, onClose }: { config: CommissionConfig; onClose: () => void }) {
  const { actor } = useActor();
  const [rate, setRate] = useState(pct(config.defaultRate));
  const [holding, setHolding] = useState(String(config.holdingDays));
  const [min, setMin] = useState(String(config.minPayout));
  const [status, setStatus] = useState<'active' | 'inactive'>(config.status);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const rateNum = Number(rate);
  const holdNum = Number(holding);
  const minNum = Number(min);
  const valid =
    !Number.isNaN(rateNum) && rateNum >= 0 && rateNum <= 100 &&
    !Number.isNaN(holdNum) && holdNum >= 0 &&
    !Number.isNaN(minNum) && minNum >= 0 &&
    reason.trim().length > 0;

  const save = () => {
    if (!valid) { setErr('Check the values: rate 0–100%, holding ≥ 0 days, minimum ≥ 0, and a change reason is required.'); return; }
    const ok = updateCommissionConfig(config.type, { defaultRate: rateNum / 100, holdingDays: Math.round(holdNum), minPayout: Math.round(minNum), status }, reason.trim(), actor);
    if (!ok) { setErr('Could not save — please check the values.'); return; }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${REVENUE_TYPE_LABEL[config.type]} commission`}
      description="Changes apply only to new transactions — historical captured rates are never rewritten."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!valid}>Save Changes</Button></>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Default commission (%)" required hint="0–100%">
            <Input type="number" min={0} max={100} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <Field label="Holding period (days)" required hint="Days before a payout becomes eligible">
            <Input type="number" min={0} value={holding} onChange={(e) => setHolding(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum payout (₹)" required>
            <Input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
          </Field>
          <Field label="Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        <Field label="Change reason" required hint="Recorded with this configuration change.">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this rate / policy changing?" />
        </Field>
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Prototype configuration — final commission and payout policies require approval.
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Add / edit category override -----------------------------------------
export function OverrideModal({
  override,
  categoriesByType,
  onClose,
}: {
  override: CommissionOverride | null; // null = add
  categoriesByType: Record<RevenueType, string[]>;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const isEdit = !!override;
  const [type, setType] = useState<RevenueType>(override?.type ?? 'physical');
  const [category, setCategory] = useState(override?.category ?? '');
  const [rate, setRate] = useState(override ? pct(override.overrideRate) : '');
  const [err, setErr] = useState<string | null>(null);

  const cats = useMemo(() => categoriesByType[type] ?? [], [categoriesByType, type]);
  const rateNum = Number(rate);
  const valid = !!category && !Number.isNaN(rateNum) && rateNum >= 0 && rateNum <= 100;

  const save = () => {
    if (!valid) { setErr('Pick a category and enter a rate between 0 and 100%.'); return; }
    const ok = upsertCommissionOverride({ id: override?.id, type, category, overrideRate: rateNum / 100 }, actor);
    if (!ok) { setErr('Could not save the override.'); return; }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit category override' : 'Add category override'}
      description="One active override per category. Overrides apply to new transactions only."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!valid}>{isEdit ? 'Save Override' : 'Add Override'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Revenue type" required>
          <Select value={type} onChange={(e) => { setType(e.target.value as RevenueType); setCategory(''); }} disabled={isEdit}>
            {(Object.keys(categoriesByType) as RevenueType[]).map((t) => <option key={t} value={t}>{REVENUE_TYPE_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select a category…</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Override commission (%)" required hint="0–100%">
          <Input type="number" min={0} max={100} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
