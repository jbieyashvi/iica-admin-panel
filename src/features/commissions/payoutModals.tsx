import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { markPayoutFailed, markPayoutPaid, retryPayout, startPayoutProcessing } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { formatINR } from '../../lib/format';
import { METHOD_LABEL } from '../../config/payoutLabels';
import type { CreatorPayoutSettings, PayoutRecord } from '../../types/payouts';

// ---- Start processing (Eligible → Processing) -----------------------------
export function StartProcessingModal({ payout, onClose }: { payout: PayoutRecord; onClose: () => void }) {
  const { actor } = useActor();
  const run = () => { startPayoutProcessing(payout.id, actor); onClose(); };
  return (
    <Modal
      open onClose={onClose}
      title="Start processing payout"
      description={`${payout.id} · ${payout.creatorName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run}>Start Processing</Button></>}
    >
      <p className="text-sm text-charcoal-muted">
        Move this payout of <span className="font-medium text-charcoal">{formatINR(payout.payoutAmount)}</span> to Processing. The processing date is recorded now.
      </p>
    </Modal>
  );
}

// ---- Mark paid (Processing → Paid) ----------------------------------------
export function MarkPaidModal({ payout, method, onClose }: { payout: PayoutRecord; method?: CreatorPayoutSettings; onClose: () => void }) {
  const { actor } = useActor();
  const [reference, setReference] = useState('');
  const [methodUsed, setMethodUsed] = useState(method && method.status === 'active' ? METHOD_LABEL[method.method] : 'Bank Transfer');
  const [err, setErr] = useState<string | null>(null);
  const valid = reference.trim().length > 0 && methodUsed.trim().length > 0;

  const run = () => {
    if (!valid) { setErr('A payout reference and method are required.'); return; }
    const ok = markPayoutPaid(payout.id, { reference: reference.trim(), method: methodUsed.trim() }, actor);
    if (!ok) { setErr('Could not mark paid.'); return; }
    onClose();
  };

  return (
    <Modal
      open onClose={onClose}
      title="Mark payout as paid"
      description={`${payout.id} · ${formatINR(payout.payoutAmount)} to ${payout.creatorName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run} disabled={!valid}>Mark Paid</Button></>}
    >
      <div className="space-y-4">
        <Field label="Payout reference" required hint="Bank / gateway transfer reference.">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PYT-2031-HERITAGE" />
        </Field>
        <Field label="Payout method used" required>
          <Select value={methodUsed} onChange={(e) => setMethodUsed(e.target.value)}>
            {['Bank Transfer', 'UPI', 'Stripe Connect', 'Skydo'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Mark failed (Processing → Failed) ------------------------------------
export function MarkFailedModal({ payout, onClose }: { payout: PayoutRecord; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const valid = reason.trim().length > 0;

  const run = () => {
    if (!valid) { setErr('A failure reason is required.'); return; }
    const ok = markPayoutFailed(payout.id, reason.trim(), actor);
    if (!ok) { setErr('Could not mark failed.'); return; }
    onClose();
  };

  return (
    <Modal
      open onClose={onClose}
      title="Mark payout as failed"
      description={`${payout.id} · ${payout.creatorName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={run} disabled={!valid}>Mark Failed</Button></>}
    >
      <div className="space-y-4">
        <Field label="Failure reason" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why did the payout fail?" />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Retry (Failed → Processing) ------------------------------------------
export function RetryPayoutModal({ payout, onClose }: { payout: PayoutRecord; onClose: () => void }) {
  const { actor } = useActor();
  const run = () => { retryPayout(payout.id, actor); onClose(); };
  return (
    <Modal
      open onClose={onClose}
      title="Retry payout"
      description={`${payout.id} · ${payout.creatorName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={run}>Retry Payout</Button></>}
    >
      <p className="text-sm text-charcoal-muted">Move this payout back to Processing for another attempt. The previous failure reason is kept on the record.</p>
      {payout.failureReason && <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">Previous failure: {payout.failureReason}</p>}
    </Modal>
  );
}
