import { useState } from 'react';
import { BookOpen, Info } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { requestPortfolioChanges, unpublishPortfolio } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { PortfolioRecord } from '../../types/portfolio';

export const PORTFOLIO_SECTIONS = [
  'Profile Basics', 'About', 'Domains & Skills', 'Highlights', 'Awards', 'Watch',
  'Spotify', 'Events', 'Gallery', 'Testimonials', "What's New", 'Collaborations',
];

export function RequestChangesModal({ portfolio, creatorName, onClose }: { portfolio: PortfolioRecord | null; creatorName?: string; onClose: () => void }) {
  const { actor } = useActor();
  const [sections, setSections] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (portfolio && portfolio.id !== lastId) {
    setLastId(portfolio.id);
    setSections([]);
    setMessage('');
    setNote('');
    setError(null);
  }
  if (!portfolio) return null;

  const toggle = (s: string) => setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = () => {
    if (sections.length === 0) return setError('Select at least one affected section.');
    if (!message.trim()) return setError('A message to the creator is required.');
    requestPortfolioChanges(portfolio.id, { sections, message: message.trim(), note: note.trim() || undefined }, actor);
    toast('Change request sent to creator.', 'info');
    onClose();
  };

  return (
    <Modal
      open={!!portfolio}
      onClose={onClose}
      title="Request Changes"
      description="Ask the creator to update specific sections before publishing."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Send request</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-charcoal">Affected sections</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PORTFOLIO_SECTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-lg border border-cream-200 px-2.5 py-1.5 text-sm text-charcoal">
                <input type="checkbox" checked={sections.includes(s)} onChange={() => toggle(s)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
                {s}
              </label>
            ))}
          </div>
        </div>
        <Field label="Message to creator" htmlFor="rc-msg" required>
          <Textarea id="rc-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explain what needs to change…" />
        </Field>
        <Field label="Internal note" htmlFor="rc-note" hint="Admins only.">
          <Input id="rc-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {message.trim() && (
          <div className="rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Notification preview</p>
            <p className="text-sm text-charcoal">
              Hi {creatorName ?? 'there'}, our team reviewed your portfolio and has requested changes to:{' '}
              <span className="font-medium">{sections.join(', ') || '—'}</span>. {message}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function UnpublishModal({ portfolio, onClose }: { portfolio: PortfolioRecord | null; onClose: () => void }) {
  const { actor } = useActor();
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  if (portfolio && portfolio.id !== lastId) {
    setLastId(portfolio.id);
    setReason('');
    setNotify(false);
    setError(null);
  }
  if (!portfolio) return null;

  const submit = () => {
    if (!reason.trim()) return setError('A reason is required to unpublish.');
    unpublishPortfolio(portfolio.id, reason.trim(), actor);
    toast(`Portfolio unpublished${notify ? ' and creator notified' : ''}.`, 'info');
    onClose();
  };

  return (
    <Modal
      open={!!portfolio}
      onClose={onClose}
      title="Unpublish portfolio"
      description="Hides the portfolio from the catalogue. Portfolio data is preserved; the account is not suspended."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit}>Unpublish</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Field label="Reason" htmlFor="up-reason" required>
          <Input id="up-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being unpublished?" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-charcoal">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded border-cream-200 text-magenta-500 focus:ring-magenta-500/30" />
          Notify the creator
        </label>
      </div>
    </Modal>
  );
}

export function PortfolioGuidelinesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections: { title: string; body: string }[] = [
    { title: 'Required profile information', body: 'Profile image, About, category, location and at least one domain or skill must be present before publishing.' },
    { title: 'Accepted image formats', body: 'JPG, PNG and WebP up to 8MB for profile, cover and gallery images.' },
    { title: 'YouTube URL guidance', body: 'Watch items accept standard YouTube watch or youtu.be links only. Invalid links are flagged and excluded from Archive.' },
    { title: 'Spotify link guidance', body: 'Use a Spotify embed or a public artist / playlist link. Private links fall back to an external-link state.' },
    { title: 'Safe content expectations', body: 'No hateful, explicit, misleading or unsafe content. Unsafe content may be hidden pending review.' },
    { title: 'Awards information', body: 'Awards should include a title, organisation and year. The top three show first; the rest expand on the public profile.' },
    { title: 'Testimonial moderation', body: 'Guest/user reviews can be reported. Reported reviews are hidden pending moderation and never silently edited.' },
    { title: "What's New link guidance", body: 'Upcoming shows and releases should link to a safe destination with a clear CTA label.' },
    { title: 'Reasons content may be hidden', body: 'Reported, unsafe, misleading, or policy-violating content. Hidden content is preserved for review history.' },
    { title: 'Publishing eligibility', body: 'Only creators with an active membership and all required sections complete can be published. Publishing is a content status — not creator verification.' },
  ];
  return (
    <Drawer open={open} onClose={onClose} title="Portfolio Guidelines" description="Reference for reviewing and publishing portfolios" width="lg">
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-cream-200 bg-cream-100/50 px-3.5 py-3">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-muted" />
        <p className="text-xs text-charcoal-muted">These guidelines are reference-only in this phase. "Published" reflects content status, not verification — there is no verified or approved badge.</p>
      </div>
      <ul className="space-y-4">
        {sections.map((s) => (
          <li key={s.title}>
            <p className="text-sm font-semibold text-charcoal">{s.title}</p>
            <p className="mt-0.5 text-sm text-charcoal-muted">{s.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800">Admins may correct locations, moderate unsafe content, request changes and fix obvious link-format issues (logged). Admins must not silently edit a creator's journey, award, testimonial or collaboration text.</p>
      </div>
    </Drawer>
  );
}
