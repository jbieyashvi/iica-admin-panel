import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useData, updatePricing } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { PricingRow } from '../../types/users';

export function MembershipSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pricing } = useData();
  const { abilities, actor } = useActor();
  const [rows, setRows] = useState<PricingRow[]>(pricing);

  // Re-sync when reopened.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setRows(pricing);
  }

  const setAmount = (i: number, amount: number) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, amount } : row)));

  const save = () => {
    updatePricing(rows, actor);
    toast('Proposed pricing updated.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Membership Settings"
      description="Regional membership pricing (prototype)."
      size="lg"
      footer={
        abilities.editPricing ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save proposed pricing</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Proposed pricing — pending final approval.</span> These values are
          not final and are used only for the prototype. Membership payment is processed through Apple / Google
          in-app purchase.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-cream-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-100/50 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
              <th className="px-4 py-2.5">Country</th>
              <th className="px-4 py-2.5">Currency</th>
              <th className="px-4 py-2.5">Annual price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {rows.map((row, i) => (
              <tr key={row.country}>
                <td className="px-4 py-3 font-medium text-charcoal">{row.country}</td>
                <td className="px-4 py-3 text-charcoal-muted">
                  {row.currencyCode} ({row.symbol})
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-charcoal-muted">{row.symbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={row.amount}
                      disabled={!abilities.editPricing}
                      onChange={(e) => setAmount(i, Number(e.target.value))}
                      className="w-28 rounded-md border border-cream-200 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20 disabled:bg-cream-100 disabled:text-charcoal-muted"
                    />
                    <span className="text-xs text-charcoal-muted">/ {row.period}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge tone="amber">Not final</Badge>
        {!abilities.editPricing && <span className="text-xs text-charcoal-muted">{RESTRICTED_HINT}</span>}
      </div>
    </Modal>
  );
}
