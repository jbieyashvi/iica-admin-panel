import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import {
  blockCollaboration,
  cancelMeetingSafety,
  extendCollabExpiry,
  restoreCollaboration,
  reviewReport,
  sendAdminNotice,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { CollaborationRecord, CollabReport, ReportStatus } from '../../types/collaborations';

// ---- Extend expiry ---------------------------------------------------------
export function ExtendExpiryModal({ collab, onClose }: { collab: CollaborationRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [days, setDays] = useState(7);
  const [lastId, setLastId] = useState<string | null>(null);
  if (collab && collab.id !== lastId) { setLastId(collab.id); setDays(7); }
  if (!collab) return null;
  const submit = () => {
    extendCollabExpiry(collab.id, Math.max(1, days), actor);
    toast(`Request expiry extended by ${days} day${days === 1 ? '' : 's'}.`);
    onClose();
  };
  return (
    <Modal open={!!collab} onClose={onClose} title="Extend Request Expiry" description="Gives the invited creator more time to respond. Logged to Status History."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Extend</Button></>}>
      <Field label="Extend by (days)" htmlFor="ex-days" required>
        <Input id="ex-days" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </Field>
    </Modal>
  );
}

// ---- Block collaboration ---------------------------------------------------
export function BlockCollaborationModal({ collab, onClose }: { collab: CollaborationRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (collab && collab.id !== lastId) { setLastId(collab.id); setReason(''); setError(null); }
  if (!collab) return null;
  const submit = () => {
    if (!reason.trim()) return setError('A safety or policy reason is required.');
    blockCollaboration(collab.id, reason.trim(), actor);
    toast('Collaboration blocked.');
    onClose();
  };
  return (
    <Modal open={!!collab} onClose={onClose} title="Block Collaboration" description="Only for policy or safety reasons. The record is preserved."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Block Collaboration</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">Blocking stops further communication and meetings between these two creators and cancels any pending meeting proposals.</p>
      </div>
      <Field label="Reason" htmlFor="bl-reason" required><Textarea id="bl-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

// ---- Restore collaboration -------------------------------------------------
export function RestoreConfirmModal({ collab, onClose }: { collab: CollaborationRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  if (!collab) return null;
  const submit = () => {
    restoreCollaboration(collab.id, actor);
    toast('Collaboration restored.');
    onClose();
  };
  return (
    <Modal open={!!collab} onClose={onClose} title="Restore Collaboration" description="Re-enables collaboration activity between these creators."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Restore</Button></>}>
      <p className="text-sm text-charcoal">This lifts the block and returns the collaboration to its previous request state. Meetings must be re-proposed by the creators.</p>
    </Modal>
  );
}

// ---- Cancel meeting (safety) ----------------------------------------------
export function CancelMeetingModal({ collab, onClose }: { collab: CollaborationRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (collab && collab.id !== lastId) { setLastId(collab.id); setReason(''); setError(null); }
  if (!collab) return null;
  const submit = () => {
    if (!reason.trim()) return setError('A safety or policy reason is required.');
    cancelMeetingSafety(collab.id, reason.trim(), actor);
    toast('Meeting cancelled. Both creators notified.');
    onClose();
  };
  return (
    <Modal open={!!collab} onClose={onClose} title="Cancel Meeting for Safety Reason" description="Both creator records are notified and a Status History entry is added."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Cancel Meeting</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Reason" htmlFor="cm-reason" required><Textarea id="cm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

// ---- Admin notice ----------------------------------------------------------
export function AdminNoticeModal({ collab, onClose }: { collab: CollaborationRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (collab && collab.id !== lastId) { setLastId(collab.id); setBody(''); setError(null); }
  if (!collab) return null;
  const submit = () => {
    if (!body.trim()) return setError('Write the notice.');
    sendAdminNotice(collab.id, body.trim(), actor);
    toast('Admin notice logged (prototype — no real message sent).');
    onClose();
  };
  return (
    <Modal open={!!collab} onClose={onClose} title="Send Admin Notice" description="Prototype — logs an in-app notification record to both creators."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send & log</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Notice" htmlFor="an-body" required><Textarea id="an-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
    </Modal>
  );
}

// ---- Report decision -------------------------------------------------------
export interface ReportDecisionSpec { action: string; statusAfter: ReportStatus; requireReason: boolean; danger?: boolean }

export function ReportDecisionModal({ collab, report, decision, onClose }: { collab: CollaborationRecord | null; report: CollabReport | null; decision: ReportDecisionSpec | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = collab && report && decision ? `${collab.id}:${report.id}:${decision.action}` : null;
  if (key !== lastKey) { setLastKey(key); setReason(''); setError(null); }
  if (!collab || !report || !decision) return null;
  const submit = () => {
    if (decision.requireReason && !reason.trim()) return setError('A decision reason is required.');
    reviewReport(collab.id, report.id, decision.statusAfter, actor, reason.trim() || undefined);
    toast(`${decision.action}.`);
    onClose();
  };
  return (
    <Modal open={!!decision} onClose={onClose} title={decision.action} description="Recorded against the report and in Status History."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={decision.danger ? 'danger' : 'primary'} onClick={submit}>Confirm</Button></>}>
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <p className="mb-3 rounded-lg border border-cream-200 bg-cream-100/50 px-3 py-2 text-xs text-charcoal-muted">Reviewing a report does not automatically suspend either creator.</p>
      <Field label="Decision reason" htmlFor="rd-reason" required={decision.requireReason} hint={decision.requireReason ? undefined : 'Optional'}>
        <Textarea id="rd-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
