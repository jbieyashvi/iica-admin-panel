import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Field';
import { useData, updateCollaborationSettings } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { DIMENSION_META, DIMENSION_ORDER, DEFAULT_WEIGHTS } from '../../config/collaborationLabels';
import { useNavigate } from 'react-router-dom';
import type { MatchDimensionKey } from '../../types/collaborations';

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${on ? 'bg-magenta-500' : 'bg-cream-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function CollaborationSettingsPage() {
  const { collaborationSettings: saved } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const canEdit = abilities.collabSettings;

  const [weights, setWeights] = useState({ ...saved.weights });
  const [access, setAccess] = useState({
    activeMembershipRequired: saved.activeMembershipRequired,
    statementRequired: saved.statementRequired,
    completePortfolioRequired: saved.completePortfolioRequired,
    allowOnline: saved.allowOnline,
    allowInPerson: saved.allowInPerson,
    defaultExpiryDays: saved.defaultExpiryDays,
    reminderBeforeDays: saved.reminderBeforeDays,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const total = DIMENSION_ORDER.reduce((sum, k) => sum + (weights[k] || 0), 0);
  const anyNegative = DIMENSION_ORDER.some((k) => weights[k] < 0);
  const weightsValid = total === 100 && !anyNegative;

  const setWeight = (k: MatchDimensionKey, v: number) => setWeights((w) => ({ ...w, [k]: Math.max(0, Math.min(100, Math.round(v || 0))) }));

  const doSave = () => {
    updateCollaborationSettings({ weights, ...access }, actor);
    toast('Collaboration matching settings saved.');
    setConfirmOpen(false);
  };

  const accessRows: { key: keyof typeof access; label: string }[] = [
    { key: 'activeMembershipRequired', label: 'Active Creator Membership Required' },
    { key: 'statementRequired', label: 'Collaboration Statement Required' },
    { key: 'completePortfolioRequired', label: 'Complete Portfolio Required' },
    { key: 'allowOnline', label: 'Allow Online Collaborations' },
    { key: 'allowInPerson', label: 'Allow In-Person Collaborations' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/admin/collaborations')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Collaborations</button>

      <PageHeader
        title="Collaboration Matching Settings"
        description="Configure prototype matching priorities and collaboration access."
        actions={<Badge tone="blue">Prototype configuration — final matching rules require product approval.</Badge>}
      />

      {!canEdit && (
        <div className="mb-6 rounded-lg border border-cream-200 bg-cream-100/50 px-4 py-3 text-sm text-charcoal-muted">
          You have read-only access. Only a Super Admin can edit collaboration settings.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Matching weights */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-charcoal">Matching Weights</h3>
          <p className="mt-0.5 text-sm text-charcoal-muted">Relative priority of each matching dimension. Must total 100%.</p>
          <div className="mt-4 space-y-4">
            {DIMENSION_ORDER.map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor={`w-${k}`} className="text-sm font-medium text-charcoal">{DIMENSION_META[k].label}</label>
                  <div className="flex items-center gap-1">
                    <Input id={`w-${k}`} type="number" min={0} max={100} value={weights[k]} disabled={!canEdit} onChange={(e) => setWeight(k, Number(e.target.value))} className="w-20 text-right" />
                    <span className="text-sm text-charcoal-muted">%</span>
                  </div>
                </div>
                <p className="text-xs text-charcoal-muted">{DIMENSION_META[k].blurb}</p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-100">
                  <div className="h-full rounded-full bg-magenta-400" style={{ width: `${Math.min(100, weights[k])}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2.5 ${weightsValid ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
            <span className="text-sm font-medium text-charcoal">Total</span>
            <span className={`text-sm font-semibold ${weightsValid ? 'text-emerald-700' : 'text-red-700'}`}>{total}% {weightsValid ? '' : '· must equal 100%'}</span>
          </div>
          {canEdit && (
            <div className="mt-3 flex items-center justify-between">
              <button className="text-xs font-medium text-charcoal-muted hover:text-charcoal" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>Reset to default (20 / 20 / 30 / 30)</button>
              <Button disabled={!weightsValid} onClick={() => setConfirmOpen(true)}>Save Settings</Button>
            </div>
          )}
          <p className="mt-3 text-xs text-charcoal-muted">Saving new weights does not recalculate existing historical match scores.</p>
        </div>

        {/* Access settings */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-charcoal">Access Settings</h3>
          <p className="mt-0.5 text-sm text-charcoal-muted">Eligibility and request rules for collaborations.</p>
          <div className="mt-4 divide-y divide-cream-200">
            {accessRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between py-3">
                <span className="text-sm text-charcoal">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-charcoal-muted">{access[row.key] ? 'On' : 'Off'}</span>
                  <Toggle on={access[row.key] as boolean} disabled={!canEdit} onChange={(v) => setAccess((a) => ({ ...a, [row.key]: v }))} />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-charcoal">Default Request Expiry (days)</span>
              <Input type="number" min={1} max={60} value={access.defaultExpiryDays} disabled={!canEdit} onChange={(e) => setAccess((a) => ({ ...a, defaultExpiryDays: Math.max(1, Number(e.target.value) || 1) }))} className="w-20 text-right" />
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-charcoal">Reminder Before Expiry (days)</span>
              <Input type="number" min={0} max={30} value={access.reminderBeforeDays} disabled={!canEdit} onChange={(e) => setAccess((a) => ({ ...a, reminderBeforeDays: Math.max(0, Number(e.target.value) || 0) }))} className="w-20 text-right" />
            </div>
          </div>
          {canEdit && (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" disabled={!weightsValid} title={weightsValid ? '' : 'Fix the weights total before saving.'} onClick={() => setConfirmOpen(true)}>Save Settings</Button>
            </div>
          )}
          {!canEdit && (
            <p className="mt-4 text-xs text-charcoal-muted" title={RESTRICTED_HINT}>Settings are read-only for your role.</p>
          )}
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Save matching settings?" description="Prototype configuration — final matching rules require product approval."
        footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={!weightsValid} onClick={doSave}>Confirm & Save</Button></>}>
        <div className="space-y-2 text-sm text-charcoal">
          <p className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Weights total {total}%.</p>
          <p className="text-charcoal-muted">Existing historical match scores will not be recalculated.</p>
        </div>
      </Modal>
    </div>
  );
}
