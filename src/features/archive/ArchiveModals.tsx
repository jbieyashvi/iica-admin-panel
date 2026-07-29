import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { requestArchiveChanges, hideArchive } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { ArchiveRecord } from '../../types/events';

const CHANGE_REASONS = [
  'Invalid YouTube URL',
  'Video unavailable',
  'Incorrect title',
  'Missing description',
  'Unsafe or inappropriate content',
  'Copyright concern',
  'Other',
];

export function ArchiveRequestChangesModal({ archive, creatorName, onClose }: { archive: ArchiveRecord | null; creatorName?: string; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState(CHANGE_REASONS[0]);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (archive && archive.id !== lastId) {
    setLastId(archive.id);
    setReason(CHANGE_REASONS[0]);
    setMessage('');
    setNote('');
    setError(null);
  }
  if (!archive) return null;

  const submit = () => {
    if (!message.trim()) return setError('A message to the creator is required.');
    requestArchiveChanges(archive.id, reason, message.trim(), actor, note.trim() || undefined);
    toast('Change request sent to creator.', 'info');
    onClose();
  };

  return (
    <Modal
      open={!!archive}
      onClose={onClose}
      title="Request Changes"
      description="Ask the creator to fix this Archive video."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send request</Button></>}
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Reason" htmlFor="arc-reason" required>
          <Select id="arc-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {CHANGE_REASONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Message to creator" htmlFor="arc-msg" required>
          <Textarea id="arc-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explain what needs to change…" />
        </Field>
        <Field label="Internal note" htmlFor="arc-note" hint="Admins only.">
          <Input id="arc-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {message.trim() && (
          <div className="rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Notification preview</p>
            <p className="text-sm text-charcoal">Hi {creatorName ?? 'there'}, changes were requested for your Archive video — <span className="font-medium">{reason}</span>: {message}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ArchiveHideModal({ archive, onClose }: { archive: ArchiveRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (archive && archive.id !== lastId) {
    setLastId(archive.id);
    setReason('');
    setError(null);
  }
  if (!archive) return null;

  const submit = () => {
    if (!reason.trim()) return setError('A reason is required to hide this video.');
    hideArchive(archive.id, reason.trim(), actor);
    toast('Video hidden — linked public Watch item hidden too.', 'info');
    onClose();
  };

  return (
    <Modal
      open={!!archive}
      onClose={onClose}
      title="Hide from Archive"
      description="Removes the video from the public Archive and hides the linked Watch item. Original creator record is preserved."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit}>Hide video</Button></>}
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Field label="Reason" htmlFor="arc-hide-reason" required>
        <Input id="arc-hide-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being hidden?" />
      </Field>
    </Modal>
  );
}

export function ArchiveGuidelinesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections = [
    { t: 'Source of content', b: 'Archive videos come only from YouTube links added in a creator\'s Portfolio Watch section. There are no direct uploads or server video storage.' },
    { t: 'Accepted links', b: 'Standard YouTube watch or youtu.be links. The link status must be Valid to publish.' },
    { t: 'Link statuses', b: 'Valid, Unavailable, Private, Restricted, Invalid URL, Not Checked. Broken or unavailable links should be sent back for changes.' },
    { t: 'Safe content', b: 'No unsafe, misleading or infringing content. Hide pending review when reported.' },
    { t: 'Publishing', b: 'Only publish when the linked portfolio is published and the creator membership is eligible. "Published" is content status — not creator verification.' },
    { t: 'Synchronisation', b: 'Hiding an Archive video also hides the public Watch item. The creator\'s original record and moderation history are always preserved.' },
  ];
  return (
    <Drawer open={open} onClose={onClose} title="Archive Guidelines" description="Reference for moderating Archive videos" width="lg">
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-muted" />
        <p className="text-xs text-charcoal-muted">Reference-only in this phase. No verified badges — publishing reflects content status only.</p>
      </div>
      <ul className="space-y-4">
        {sections.map((s) => (
          <li key={s.t}>
            <p className="text-sm font-semibold text-charcoal">{s.t}</p>
            <p className="mt-0.5 text-sm text-charcoal-muted">{s.b}</p>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
