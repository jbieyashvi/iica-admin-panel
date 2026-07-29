import { useState } from 'react';
import { Info, MapPin, RotateCcw } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { correctLocation, revertLocation, editDiscovery } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { activityBreakdown, effectiveLocation } from '../../data/portfolioLogic';
import { formatDateTime } from '../../lib/format';
import type { PortfolioRecord } from '../../types/portfolio';
import type { UserRecord } from '../../types/users';

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'UAE'];

// ---- Correct Location ------------------------------------------------------
export function CorrectLocationModal({
  portfolio,
  user,
  onClose,
}: {
  portfolio: PortfolioRecord | null;
  user?: UserRecord;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const [country, setCountry] = useState('India');
  const [stateRegion, setStateRegion] = useState('');
  const [city, setCity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (portfolio && portfolio.id !== lastId) {
    setLastId(portfolio.id);
    const eff = effectiveLocation(portfolio, user);
    setCountry(eff.country in { India: 1, 'United States': 1, 'United Kingdom': 1, UAE: 1 } ? eff.country : 'India');
    setStateRegion(eff.state ?? '');
    setCity(eff.city === '—' ? '' : eff.city);
    setReason('');
    setNote('');
    setNotify(false);
    setError(null);
  }

  if (!portfolio) return null;
  const selfReported = `${user?.city ?? '—'}, ${user?.country ?? '—'}`;
  const hasCorrection = !!portfolio.locationCorrection;

  const submit = () => {
    if (!reason.trim()) return setError('A correction reason is mandatory.');
    if (!city.trim()) return setError('City is required.');
    correctLocation(portfolio.id, { country, state: stateRegion.trim() || undefined, city: city.trim(), reason: reason.trim(), note: note.trim() || undefined, notifyCreator: notify }, actor);
    toast('Location corrected. Original self-reported value preserved in history.');
    onClose();
  };

  const revert = () => {
    revertLocation(portfolio.id, actor);
    toast('Location correction reverted.');
    onClose();
  };

  return (
    <Modal
      open={!!portfolio}
      onClose={onClose}
      title="Correct Location"
      description="Corrects an inaccurate self-reported location. Never shown as a correction on the public profile."
      footer={
        <>
          {hasCorrection && (
            <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={revert} className="mr-auto">
              Revert correction
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save correction</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-2.5 text-sm">
        <p className="text-charcoal-muted">Current self-reported location</p>
        <p className="font-medium text-charcoal">{selfReported}</p>
        {hasCorrection && (
          <p className="mt-1 text-xs text-magenta-700">
            Admin correction active (internal): {portfolio.locationCorrection?.city}, {portfolio.locationCorrection?.country}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Corrected country" htmlFor="loc-country" required>
          <select id="loc-country" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-sm focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="State / region" htmlFor="loc-state">
          <Input id="loc-state" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="e.g. Maharashtra" />
        </Field>
        <Field label="Corrected city" htmlFor="loc-city" required>
          <Input id="loc-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Correction reason" htmlFor="loc-reason" required>
          <Input id="loc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being corrected?" />
        </Field>
        <Field label="Internal note" htmlFor="loc-note" hint="Admins only.">
          <Textarea id="loc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-charcoal">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
          Notify creator of the correction
        </label>
      </div>
    </Modal>
  );
}

// ---- Edit Discovery Data ---------------------------------------------------
export function EditDiscoveryModal({ portfolio, onClose }: { portfolio: PortfolioRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [domain, setDomain] = useState('');
  const [skills, setSkills] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);

  if (portfolio && portfolio.id !== lastId) {
    setLastId(portfolio.id);
    setDomain(portfolio.domainGenre);
    setSkills(portfolio.content.skills.join(', '));
  }
  if (!portfolio) return null;

  const submit = () => {
    editDiscovery(portfolio.id, { domainGenre: domain.trim(), skills: skills.split(',').map((s) => s.trim()).filter(Boolean) }, actor);
    toast('Discovery data updated (logged).');
    onClose();
  };

  return (
    <Modal
      open={!!portfolio}
      onClose={onClose}
      title="Edit Discovery Data"
      description="Adjusts discovery metadata only."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Domain / genre" htmlFor="disc-domain">
          <Input id="disc-domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </Field>
        <Field label="Skills" htmlFor="disc-skills" hint="Comma-separated.">
          <Input id="disc-skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// ---- Activity Score Drawer -------------------------------------------------
export function ActivityScoreDrawer({
  portfolio,
  user,
  onClose,
}: {
  portfolio: PortfolioRecord | null;
  user?: UserRecord;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!portfolio} onClose={onClose} title="Activity Score" description="System-generated discovery ranking signal">
      {portfolio && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-xl border border-cream-200 bg-cream-100/50 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-magenta-500 font-serif text-2xl font-medium text-white">
              {portfolio.activityScore}
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal">Overall activity score</p>
              <p className="text-xs text-charcoal-muted">Out of 100 · last calculated {formatDateTime(portfolio.scoreCalculatedAt)}</p>
              <Badge tone="magenta" className="mt-1">System-generated</Badge>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Signal breakdown</p>
            <ul className="space-y-3">
              {activityBreakdown(portfolio, true).map((s) => (
                <li key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-charcoal">{s.label}</span>
                    <span className="font-medium text-charcoal">{s.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                    <div className="h-full rounded-full bg-magenta-400" style={{ width: `${Math.max(s.raw, 2)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-cream-200 bg-white px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-muted" />
            <p className="text-xs text-charcoal-muted">
              Discovery ranking is generated automatically from real platform activity — portfolio completeness,
              views, listings, published content and recent engagement. It does <span className="font-medium text-charcoal">not</span> use
              follower count, and cannot be manually overridden, weighted or set as "featured". Featured placement is
              earned through sustained activity.
            </p>
          </div>

          <div className="text-xs text-charcoal-muted">
            <MapPin className="mr-1 inline h-3 w-3" />
            {effectiveLocation(portfolio, user).city}, {effectiveLocation(portfolio, user).country}
          </div>
        </div>
      )}
    </Drawer>
  );
}

