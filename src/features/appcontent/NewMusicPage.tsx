import { useMemo, useState } from 'react';
import { ExternalLink, Music2, Plus, Smartphone, Star, StarOff, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';
import { YtThumb } from './YtThumb';
import {
  useData, featureMusic, unfeatureMusic, removeMusicSubmission, addFeaturedMusic, reorderMusic,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import { youtubeWatchUrl } from '../../lib/youtube';
import type { MusicSubmission } from '../../types/newmusic';

export function NewMusicPage() {
  const { musicSubmissions } = useData();
  const { abilities, actor } = useActor();
  const canManage = abilities.manageBanners;
  const [sub, setSub] = useState('submissions');
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toRemove, setToRemove] = useState<MusicSubmission | null>(null);

  const submissions = useMemo(() => [...musicSubmissions].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)), [musicSubmissions]);
  const featured = useMemo(() => musicSubmissions.filter((m) => m.featured).sort((a, b) => a.displayOrder - b.displayOrder), [musicSubmissions]);

  const doRemove = () => { if (!toRemove) return; removeMusicSubmission(toRemove.id, actor); toast('Submission removed.'); setToRemove(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-charcoal">New Music</h2>
          <p className="text-sm text-charcoal-muted">Curate YouTube submissions for the Mobile App “New Music Today” section. Selection only — Featured or Not Featured.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Smartphone className="h-4 w-4" />} onClick={() => setPreviewOpen(true)}>Preview Mobile Section</Button>
          {sub === 'featured' && <Button icon={<Plus className="h-4 w-4" />} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={() => setAddOpen(true)}>Add YouTube Link</Button>}
        </div>
      </div>

      <Tabs tabs={[{ key: 'submissions', label: 'Submissions', count: submissions.length }, { key: 'featured', label: 'Featured Music', count: featured.length }]} active={sub} onChange={setSub} />

      {sub === 'submissions' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-4 py-3">Submission</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {submissions.map((m) => (
                  <tr key={m.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <YtThumb videoId={m.youtubeVideoId} className="h-9 w-16 shrink-0" />
                        <div className="min-w-0">
                          <span className="block truncate font-mono text-xs text-charcoal-muted">{m.youtubeVideoId}</span>
                          {m.source === 'admin' && <span className="text-[11px] text-magenta-600">Added by Admin</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><span className="block max-w-[160px] truncate text-charcoal">{m.submittedByName}</span></td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{m.city}, {m.country}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{formatDate(m.submittedAt)}</td>
                    <td className="px-4 py-2.5">{m.featured ? <Badge tone="green">Featured</Badge> : <Badge tone="neutral">Not Featured</Badge>}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <a href={youtubeWatchUrl(m.youtubeVideoId)} target="_blank" rel="noreferrer" className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="Open YouTube"><ExternalLink className="h-4 w-4" /></a>
                        {m.featured ? (
                          <button onClick={() => { unfeatureMusic(m.id, actor); toast('Removed from Home.'); }} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-amber-600 disabled:opacity-30" aria-label="Unfeature"><StarOff className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => { featureMusic(m.id, actor); toast('Featured on Home.'); }} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-amber-600 disabled:opacity-30" aria-label="Feature on Home"><Star className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => setToRemove(m)} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-red-600 disabled:opacity-30" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {submissions.length === 0 && <EmptyState icon={<Music2 className="h-6 w-6" />} title="No submissions" description="New Music submissions from the Mobile App appear here." />}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <p className="border-b border-cream-200 px-4 py-2.5 text-xs text-charcoal-muted">Only featured records appear in the Mobile App “New Music Today”. Drag order sets their sequence on Home.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Video</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {featured.map((m, i) => (
                  <tr key={m.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <button onClick={() => reorderMusic(m.id, 'up', actor)} disabled={!canManage || i === 0} className="rounded p-0.5 text-charcoal-muted hover:bg-cream-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => reorderMusic(m.id, 'down', actor)} disabled={!canManage || i === featured.length - 1} className="rounded p-0.5 text-charcoal-muted hover:bg-cream-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><YtThumb videoId={m.youtubeVideoId} className="h-9 w-16 shrink-0" /><span className="font-mono text-xs text-charcoal-muted">{m.youtubeVideoId}</span></div></td>
                    <td className="px-4 py-2.5"><span className="block max-w-[160px] truncate text-charcoal">{m.submittedByName}</span></td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{m.city}, {m.country}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <a href={youtubeWatchUrl(m.youtubeVideoId)} target="_blank" rel="noreferrer" className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="Open YouTube"><ExternalLink className="h-4 w-4" /></a>
                        <button onClick={() => { unfeatureMusic(m.id, actor); toast('Removed from Home.'); }} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-red-600 disabled:opacity-30" aria-label="Remove from Home"><StarOff className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {featured.length === 0 && <EmptyState icon={<Music2 className="h-6 w-6" />} title="Nothing featured" description="Feature a submission or add a YouTube link to fill the Mobile section." />}
        </div>
      )}

      <AddMusicModal open={addOpen} onClose={() => setAddOpen(false)} actor={actor} />
      <MusicPreview open={previewOpen} onClose={() => setPreviewOpen(false)} featured={featured} />
      <Modal open={!!toRemove} onClose={() => setToRemove(null)} title="Remove submission"
        footer={<><Button variant="secondary" onClick={() => setToRemove(null)}>Cancel</Button><Button variant="danger" onClick={doRemove}>Remove</Button></>}>
        <p className="text-sm text-charcoal">Remove <span className="font-medium">{toRemove?.submittedByName}</span>’s submission? This cannot be undone in the prototype.</p>
      </Modal>
    </div>
  );
}

function AddMusicModal({ open, onClose, actor }: { open: boolean; onClose: () => void; actor: { name: string; role: string } }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const submit = () => {
    const err = addFeaturedMusic({ url, name, city, country }, actor);
    if (err) return toast(err, 'error');
    toast('Added and featured on Home.');
    setUrl(''); setName(''); setCity(''); setCountry('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add YouTube link" description="Adds a video directly as a featured item on the Mobile Home."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Add &amp; Feature</Button></>}>
      <div className="space-y-3">
        <Field label="YouTube URL" required><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Artist / submitted by"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name" /></Field>
          <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></Field>
        </div>
        <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" /></Field>
      </div>
    </Modal>
  );
}

function MusicPreview({ open, onClose, featured }: { open: boolean; onClose: () => void; featured: MusicSubmission[] }) {
  return (
    <Modal open={open} onClose={onClose} title="New Music Today — Mobile Preview" description="Prototype preview. Videos are not auto-played." footer={<Button onClick={onClose}>Close</Button>}>
      <div className="mx-auto max-w-[320px] rounded-2xl border border-cream-200 bg-cream-50 p-3">
        <p className="mb-2 font-serif text-base font-medium text-charcoal">New Music Today</p>
        {featured.length === 0 ? <p className="py-6 text-center text-xs text-charcoal-muted">No featured music.</p> : (
          <div className="flex gap-2 overflow-x-auto">
            {featured.map((m) => (
              <div key={m.id} className="w-32 shrink-0">
                <YtThumb videoId={m.youtubeVideoId} className="h-20 w-full" />
                <p className="mt-1 truncate text-xs font-medium text-charcoal">{m.submittedByName}</p>
                <p className="truncate text-[11px] text-charcoal-muted">{m.city}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
