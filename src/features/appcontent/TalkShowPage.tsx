import { useMemo, useState } from 'react';
import { ExternalLink, FileText, Pencil, Plus, Radio, Star, Trash2, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';
import { YtThumb } from './YtThumb';
import {
  useData, addEpisode, updateEpisode, featureEpisodeThisWeek, removeEpisode, removeResume,
} from '../../data/store';
import type { EpisodeInput } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import { youtubeWatchUrl } from '../../lib/youtube';
import type { TalkShowEpisode, GuestResume } from '../../types/talkshow';

const APPLICANT_LABEL: Record<GuestResume['applicantType'], string> = { guest: 'Guest', registered: 'Registered User', creator: 'Creator Member' };

export function TalkShowPage() {
  const { talkShowEpisodes, guestResumes } = useData();
  const { abilities, actor } = useActor();
  const canManage = abilities.manageBanners;
  const [sub, setSub] = useState('episodes');
  const [form, setForm] = useState<{ mode: 'add' | 'edit'; ep: TalkShowEpisode | null } | null>(null);
  const [toFeature, setToFeature] = useState<TalkShowEpisode | null>(null);
  const [toRemove, setToRemove] = useState<TalkShowEpisode | null>(null);
  const [resumeInfo, setResumeInfo] = useState<GuestResume | null>(null);
  const [resumeRemove, setResumeRemove] = useState<GuestResume | null>(null);

  const episodes = useMemo(() => [...talkShowEpisodes].sort((a, b) => a.displayOrder - b.displayOrder), [talkShowEpisodes]);
  const resumes = useMemo(() => [...guestResumes].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)), [guestResumes]);

  const doFeature = () => { if (!toFeature) return; featureEpisodeThisWeek(toFeature.id, actor); toast(`“${toFeature.title}” is featured this week.`); setToFeature(null); };
  const doRemove = () => { if (!toRemove) return; removeEpisode(toRemove.id, actor); toast('Episode removed.'); setToRemove(null); };
  const doResumeRemove = () => { if (!resumeRemove) return; removeResume(resumeRemove.id, actor); toast('Résumé submission removed.'); setResumeRemove(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-charcoal">Talk Show</h2>
          <p className="text-sm text-charcoal-muted">Only the <span className="font-medium text-charcoal">Featured This Week</span> episode shows on Mobile Home. All other episodes stay stored here for management and are not rendered on Home.</p>
        </div>
        {sub === 'episodes' && <Button icon={<Plus className="h-4 w-4" />} disabled={!canManage} title={canManage ? '' : RESTRICTED_HINT} onClick={() => setForm({ mode: 'add', ep: null })}>Add Episode</Button>}
      </div>

      <Tabs tabs={[{ key: 'episodes', label: 'Episodes', count: episodes.length }, { key: 'resumes', label: 'Guest Artist Résumés', count: resumes.length }]} active={sub} onChange={setSub} />

      {sub === 'episodes' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-4 py-3">Episode</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Released</th>
                  <th className="px-4 py-3">Mobile Home</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {episodes.map((e) => (
                  <tr key={e.id} className={e.featuredThisWeek ? 'bg-magenta-50/60' : 'hover:bg-cream-100/50'}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <YtThumb videoId={e.youtubeVideoId} className="h-9 w-16 shrink-0" />
                        <span className="block max-w-[220px] truncate font-medium text-charcoal">{e.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{e.host}</td>
                    <td className="px-4 py-2.5 text-charcoal">{e.featuredGuest}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{formatDate(e.releaseDate)}</td>
                    <td className="px-4 py-2.5">{e.featuredThisWeek ? <Badge tone="magenta">Featured This Week</Badge> : <span className="text-xs text-charcoal-muted">Stored · not on Home</span>}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <a href={youtubeWatchUrl(e.youtubeVideoId)} target="_blank" rel="noreferrer" className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="Open YouTube"><ExternalLink className="h-4 w-4" /></a>
                        {!e.featuredThisWeek && <button onClick={() => setToFeature(e)} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-magenta-600 disabled:opacity-30" aria-label="Feature this week"><Star className="h-4 w-4" /></button>}
                        <button onClick={() => setForm({ mode: 'edit', ep: e })} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-charcoal disabled:opacity-30" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToRemove(e)} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-red-600 disabled:opacity-30" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {episodes.length === 0 && <EmptyState icon={<Radio className="h-6 w-6" />} title="No episodes" description="Add a Talk Show episode to feature on the Mobile App." />}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-4 py-3">Submission ID</th>
                  <th className="px-4 py-3">Applicant Type</th>
                  <th className="px-4 py-3">Connected User</th>
                  <th className="px-4 py-3">Résumé</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Source Episode</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {resumes.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-100/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-charcoal-muted">{r.id}</td>
                    <td className="px-4 py-2.5"><Badge tone={r.applicantType === 'creator' ? 'magenta' : r.applicantType === 'registered' ? 'blue' : 'neutral'}>{APPLICANT_LABEL[r.applicantType]}</Badge></td>
                    <td className="px-4 py-2.5 text-charcoal">{r.connectedUserId ? r.applicantName : <span className="text-charcoal-muted">Guest — {r.applicantName}</span>}</td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-1.5 text-charcoal"><FileText className="h-3.5 w-3.5 text-charcoal-muted" /><span className="max-w-[180px] truncate">{r.fileName}</span></span></td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{r.fileSizeKb >= 1024 ? `${(r.fileSizeKb / 1024).toFixed(1)} MB` : `${r.fileSizeKb} KB`}</td>
                    <td className="px-4 py-2.5 text-charcoal-muted"><span className="block max-w-[160px] truncate">{r.sourceEpisodeTitle ?? '—'}</span></td>
                    <td className="px-4 py-2.5 text-charcoal-muted">{formatDate(r.submittedAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setResumeInfo(r)} className="rounded p-1 text-charcoal-muted hover:text-magenta-700" aria-label="View / download PDF"><Download className="h-4 w-4" /></button>
                        <button onClick={() => setResumeRemove(r)} disabled={!canManage} className="rounded p-1 text-charcoal-muted hover:text-red-600 disabled:opacity-30" aria-label="Remove invalid submission"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resumes.length === 0 && <EmptyState icon={<FileText className="h-6 w-6" />} title="No résumés" description="Guest artist résumé submissions appear here." />}
        </div>
      )}

      {form && <EpisodeModal mode={form.mode} ep={form.ep} actor={actor} onClose={() => setForm(null)} />}

      <Modal open={!!toFeature} onClose={() => setToFeature(null)} title="Feature this week"
        description="Normally only one episode is featured. This replaces the current weekly feature."
        footer={<><Button variant="secondary" onClick={() => setToFeature(null)}>Cancel</Button><Button onClick={doFeature}>Feature This Week</Button></>}>
        <p className="text-sm text-charcoal">Feature <span className="font-medium">{toFeature?.title}</span> as this week’s episode?</p>
      </Modal>

      <Modal open={!!toRemove} onClose={() => setToRemove(null)} title="Remove episode"
        footer={<><Button variant="secondary" onClick={() => setToRemove(null)}>Cancel</Button><Button variant="danger" onClick={doRemove}>Remove</Button></>}>
        <p className="text-sm text-charcoal">Remove <span className="font-medium">{toRemove?.title}</span> from the Talk Show?</p>
      </Modal>

      <Modal open={!!resumeInfo} onClose={() => setResumeInfo(null)} title={resumeInfo?.fileName ?? 'Résumé'} footer={<Button onClick={() => setResumeInfo(null)}>Close</Button>}>
        {resumeInfo?.fileAvailable ? (
          <p className="text-sm text-charcoal">Prototype: the résumé file for <span className="font-medium">{resumeInfo?.applicantName}</span> would download here. File is not bundled in the standalone Admin prototype.</p>
        ) : (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <span className="font-medium">Prototype limitation:</span> only file metadata was preserved for this submission. The actual PDF is unavailable after refresh, so no file is generated.
          </div>
        )}
      </Modal>

      <Modal open={!!resumeRemove} onClose={() => setResumeRemove(null)} title="Remove submission"
        footer={<><Button variant="secondary" onClick={() => setResumeRemove(null)}>Cancel</Button><Button variant="danger" onClick={doResumeRemove}>Remove</Button></>}>
        <p className="text-sm text-charcoal">Remove <span className="font-medium">{resumeRemove?.applicantName}</span>’s résumé submission?</p>
      </Modal>
    </div>
  );
}

function EpisodeModal({ mode, ep, actor, onClose }: { mode: 'add' | 'edit'; ep: TalkShowEpisode | null; actor: { name: string; role: string }; onClose: () => void }) {
  const [v, setV] = useState<EpisodeInput>({
    title: ep?.title ?? '', description: ep?.description ?? '', host: ep?.host ?? '', featuredGuest: ep?.featuredGuest ?? '',
    youtubeUrl: ep?.youtubeUrl ?? '', releaseDate: ep?.releaseDate ? ep.releaseDate.slice(0, 10) : '',
  });
  const set = (k: keyof EpisodeInput) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));
  const submit = () => {
    const err = mode === 'add' ? addEpisode(v, actor) : updateEpisode(ep!.id, v, actor);
    if (err) return toast(err, 'error');
    toast(mode === 'add' ? 'Episode added.' : 'Episode updated.');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={mode === 'add' ? 'Add Episode' : 'Edit Episode'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>{mode === 'add' ? 'Add Episode' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <Field label="Episode title" required><Input value={v.title} onChange={set('title')} placeholder="Episode title" /></Field>
        <Field label="Description"><Textarea rows={2} value={v.description} onChange={set('description')} placeholder="Short description" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Host"><Input value={v.host} onChange={set('host')} placeholder="Host name" /></Field>
          <Field label="Featured guest"><Input value={v.featuredGuest} onChange={set('featuredGuest')} placeholder="Guest name" /></Field>
        </div>
        <Field label="YouTube URL" required><Input value={v.youtubeUrl} onChange={set('youtubeUrl')} placeholder="https://www.youtube.com/watch?v=…" /></Field>
        <Field label="Release date"><Input type="date" value={v.releaseDate} onChange={set('releaseDate')} /></Field>
      </div>
    </Modal>
  );
}
