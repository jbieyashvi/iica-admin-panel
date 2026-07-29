import { useState } from 'react';
import { AlertTriangle, Check, GitMerge, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Field';
import { ProposalStatusBadge } from '../../components/ui/EventBadges';
import {
  useData,
  approveProposal,
  mapProposal,
  requestProposalName,
  rejectProposal,
  updateEventSettings,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import type { CustomCategoryProposal } from '../../types/events';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// crude closeness: containment or shared significant token
function closeMatches(name: string, categories: string[]): string[] {
  const n = norm(name);
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  return categories.filter((c) => {
    if (c === 'Others') return false;
    const cn = norm(c);
    if (cn.includes(n) || n.includes(cn)) return true;
    const ct = c.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    return tokens.some((t) => ct.some((x) => x === t || x.startsWith(t) || t.startsWith(x)));
  });
}

function ProposalRow({ p, categories }: { p: CustomCategoryProposal; categories: string[] }) {
  const { actor, abilities } = useActor();
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'none' | 'name' | 'reject'>('none');
  const dups = closeMatches(p.proposedName, categories);
  const can = abilities.reviewProposals;

  if (p.status !== 'pending' && p.status !== 'needs_name') {
    return (
      <li className="flex items-center justify-between rounded-lg border border-cream-200 p-3">
        <span className="text-sm text-charcoal">{p.proposedName}{p.mappedTo ? ` → ${p.mappedTo}` : ''}</span>
        <ProposalStatusBadge status={p.status} />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-cream-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-charcoal">"{p.proposedName}"</p>
          <p className="text-xs text-charcoal-muted">Proposed by {p.proposedBy} · {new Date(p.at).toLocaleDateString('en-IN')}</p>
        </div>
        <ProposalStatusBadge status={p.status} />
      </div>

      {dups.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">Possible duplicate of: {dups.map((d) => <span key={d} className="font-medium">{d} </span>)}</p>
        </div>
      )}

      {!can ? (
        <p className="mt-2 text-xs text-charcoal-muted">{RESTRICTED_HINT}</p>
      ) : mode === 'name' ? (
        <div className="mt-2 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the creator clarify?" />
          <Button size="sm" onClick={() => { if (note.trim()) { requestProposalName(p.id, note.trim(), actor); toast('Requested a clearer name.'); setMode('none'); } }}>Send</Button>
        </div>
      ) : mode === 'reject' ? (
        <div className="mt-2 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rejection reason" />
          <Button size="sm" variant="danger" onClick={() => { if (note.trim()) { rejectProposal(p.id, note.trim(), actor); toast('Proposal rejected.', 'info'); setMode('none'); } }}>Reject</Button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => { approveProposal(p.id, actor); toast(`"${p.proposedName}" approved as a new category.`); }}>Approve</Button>
          {dups.map((d) => (
            <Button key={d} size="sm" variant="secondary" icon={<GitMerge className="h-3.5 w-3.5" />} onClick={() => { mapProposal(p.id, d, actor); toast(`Mapped to "${d}".`); }}>Map → {d}</Button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setMode('name')}>Request name</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('reject')}>Reject</Button>
        </div>
      )}
    </li>
  );
}

export function EventSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { eventCategories, categoryProposals, eventSettings } = useData();
  const { actor, abilities } = useActor();
  const [limit, setLimit] = useState(eventSettings.defaultPerUserLimit);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) { setLastOpen(open); if (open) setLimit(eventSettings.defaultPerUserLimit); }

  const categoryNames = eventCategories.map((c) => c.name);
  const pending = categoryProposals.filter((p) => p.status === 'pending' || p.status === 'needs_name');
  const resolved = categoryProposals.filter((p) => p.status !== 'pending' && p.status !== 'needs_name');

  return (
    <Modal open={open} onClose={onClose} title="Event Settings" description="Controlled categories, proposals and platform defaults." size="lg">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-charcoal">Controlled Event Categories</h3>
          <div className="flex flex-wrap gap-1.5">
            {eventCategories.map((c) => <Badge key={c.id} tone={c.isDefault ? 'neutral' : 'magenta'}>{c.name}</Badge>)}
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-charcoal">
            Custom Category Proposals
            {pending.length > 0 && <Badge tone="amber">{pending.length} pending</Badge>}
          </h3>
          {categoryProposals.length === 0 ? (
            <p className="text-sm text-charcoal-muted">No proposals.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((p) => <ProposalRow key={p.id} p={p} categories={categoryNames} />)}
              {resolved.map((p) => <ProposalRow key={p.id} p={p} categories={categoryNames} />)}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-charcoal">Default Ticket Limit (per user)</h3>
          <div className="flex items-center gap-2">
            <Input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} disabled={!abilities.manageEventSettings} className="w-24" />
            <Button size="sm" onClick={() => { updateEventSettings({ defaultPerUserLimit: limit }, actor); toast('Default ticket limit updated.'); }} disabled={!abilities.manageEventSettings} title={abilities.manageEventSettings ? '' : RESTRICTED_HINT}>Save</Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-charcoal">Cancellation Reasons</h3>
            <ul className="space-y-1 text-sm text-charcoal-muted">{eventSettings.cancellationReasons.map((r) => <li key={r}>• {r}</li>)}</ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-charcoal">Report Reasons</h3>
            <ul className="space-y-1 text-sm text-charcoal-muted">{eventSettings.reportReasons.map((r) => <li key={r}>• {r}</li>)}</ul>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-charcoal">Moderation Guidelines</h3>
          <ul className="space-y-1 text-sm text-charcoal-muted">{eventSettings.moderationGuidelines.map((g) => <li key={g} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{g}</li>)}</ul>
        </section>

        {!abilities.manageEventSettings && (
          <p className="flex items-center gap-1.5 text-xs text-charcoal-muted"><X className="h-3.5 w-3.5" /> Platform-wide settings are editable by Super Admin only. You can review proposals.</p>
        )}
      </div>
    </Modal>
  );
}
