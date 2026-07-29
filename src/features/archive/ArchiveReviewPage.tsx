import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  EyeOff,
  ExternalLink,
  FileWarning,
  FlaskConical,
  FolderOpen,
  Play,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ArchiveStatusBadge, YtStatusBadge, ReportStatusBadge } from '../../components/ui/EventBadges';
import { MembershipTimeline } from '../memberships/MembershipTimeline';
import { ArchiveRequestChangesModal, ArchiveHideModal, ArchiveGuidelinesDrawer } from './ArchiveModals';
import {
  useData,
  publishArchive,
  restoreArchive,
  addArchiveNote,
  archiveReportAction,
  simBrokenLink,
  resetArchiveEventDemo,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { isEligible } from '../../data/portfolioLogic';
import { formatDate, formatDateTime, formatDuration, formatNumber } from '../../lib/format';
import { ARCHIVE_REPORT_REASON_LABEL } from '../../config/eventLabels';

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ArchiveReviewPage() {
  const { archiveId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { archives, users, memberships, portfolios } = useData();
  const { abilities, actor } = useActor();

  const a = archives.find((x) => x.id === archiveId);
  const user = users.find((u) => u.id === a?.userId);
  const membership = memberships.find((m) => m.userId === a?.userId);
  const portfolio = portfolios.find((p) => p.id === a?.portfolioId);

  const [changesOpen, setChangesOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [note, setNote] = useState('');
  const [embedError, setEmbedError] = useState(false);
  const [simKind, setSimKind] = useState<'broken' | 'reset' | null>(null);

  const back = (location.state as { from?: string } | null)?.from ?? '/admin/archive';

  if (!a) {
    return (
      <div>
        <Link to="/admin/archive" className="mb-4 inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Archive</Link>
        <div className="card"><EmptyState title="Video not found" description="This archive record may have been removed." /></div>
      </div>
    );
  }

  const canModerate = abilities.manageArchive;
  const eligible = isEligible(user, membership) && portfolio?.status === 'published';
  const embeddable = a.youtubeStatus === 'valid' || a.youtubeStatus === 'restricted' || a.youtubeStatus === 'not_checked';

  const submitNote = () => {
    if (!note.trim()) return;
    addArchiveNote(a.id, note.trim(), actor);
    toast('Note added.');
    setNote('');
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(back)} className="inline-flex items-center gap-1.5 text-sm text-charcoal-muted hover:text-charcoal"><ArrowLeft className="h-4 w-4" /> Back to Archive</button>
        <Button variant="secondary" size="sm" icon={<BookOpen className="h-4 w-4" />} onClick={() => setGuidelinesOpen(true)}>Guidelines</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* LEFT */}
        <div className="order-2 space-y-4 xl:order-1">
          <div className="card overflow-hidden">
            <div className="aspect-video w-full bg-charcoal">
              {embeddable && !embedError ? (
                <iframe
                  title={a.title}
                  src={`https://www.youtube.com/embed/${a.youtubeId}`}
                  className="h-full w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onError={() => setEmbedError(true)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
                  <AlertTriangle className="h-8 w-8" />
                  <p className="text-sm">Embed unavailable ({a.youtubeStatus})</p>
                  <img src={`https://i.ytimg.com/vi/${a.youtubeId}/hqdefault.jpg`} alt="" className="mt-2 max-h-40 rounded-md" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                  <a href={a.youtubeUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-magenta-300 hover:underline"><Play className="h-3 w-3" /> Open on YouTube</a>
                </div>
              )}
            </div>
            <div className="p-5">
              <h1 className="font-serif text-xl font-medium text-charcoal">{a.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-muted">
                <span>{formatDuration(a.durationSec)}</span>
                <span>{formatNumber(a.views)} views</span>
                <span>Published {formatDate(a.publishedAt)}</span>
                <a href={a.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-magenta-600 hover:underline">Original URL <ExternalLink className="h-3 w-3" /></a>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-charcoal">{a.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-cream-200 pt-3">
                <Avatar name={user?.name ?? '—'} size="sm" />
                <div className="text-sm">
                  <p className="font-medium text-charcoal">{user?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-charcoal-muted">{a.category} · {a.iicaId ?? '—'}</p>
                </div>
                {portfolio && (
                  <button onClick={() => navigate(`/admin/portfolios/${portfolio.id}`)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-magenta-600 hover:text-magenta-700">
                    <FolderOpen className="h-3.5 w-3.5" /> Portfolio Watch section
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="order-1 space-y-4 xl:order-2">
          <Card title="Moderation Status">
            <div className="flex flex-wrap items-center gap-2">
              <ArchiveStatusBadge status={a.archiveStatus} />
              <YtStatusBadge status={a.youtubeStatus} />
            </div>
            {a.hiddenReason && <p className="mt-2 text-xs text-charcoal-muted">Hidden reason: {a.hiddenReason}</p>}
          </Card>

          <Card title="Reports">
            {a.reports.length === 0 ? (
              <p className="text-sm text-charcoal-muted">No reports.</p>
            ) : (
              <ul className="space-y-3">
                {a.reports.map((r) => (
                  <li key={r.id} className="rounded-lg border border-cream-200 p-3">
                    <div className="flex items-center justify-between">
                      <Badge tone="red">{ARCHIVE_REPORT_REASON_LABEL[r.reason]}</Badge>
                      <ReportStatusBadge status={r.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-charcoal">{r.description}</p>
                    <p className="text-xs text-charcoal-muted">{r.reporterType} · {formatDate(r.at)}{r.assignedTo ? ` · ${r.assignedTo}` : ''}</p>
                    {canModerate && (r.status === 'new' || r.status === 'under_review') && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.status === 'new' && <button onClick={() => { archiveReportAction(a.id, r.id, 'under_review', actor); toast('Report marked under review.'); }} className="text-xs font-medium text-magenta-600 hover:text-magenta-700">Review</button>}
                        <button onClick={() => { archiveReportAction(a.id, r.id, 'action_taken', actor); toast('Report marked action taken.'); }} className="text-xs font-medium text-magenta-600 hover:text-magenta-700">Action taken</button>
                        <button onClick={() => { archiveReportAction(a.id, r.id, 'dismissed', actor, 'Not a violation'); toast('Report dismissed.'); }} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Dismiss</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Related Portfolio">
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal-muted">Portfolio status</span>
              <span className="font-medium text-charcoal">{portfolio?.status ?? '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-charcoal-muted">Membership eligible</span>
              <span className={eligible ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>{eligible ? 'Yes' : 'No'}</span>
            </div>
          </Card>

          <Card title="Internal Notes">
            {abilities.manageArchive && (
              <div className="mb-3">
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
                <div className="mt-2 flex justify-end"><Button size="sm" onClick={submitNote} disabled={!note.trim()}>Add note</Button></div>
              </div>
            )}
            {a.notes.length === 0 ? <p className="text-sm text-charcoal-muted">No notes yet.</p> : (
              <ul className="space-y-2">
                {a.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-cream-200 bg-cream-100/50 p-2.5">
                    <p className="text-sm text-charcoal">{n.body}</p>
                    <p className="mt-0.5 text-xs text-charcoal-muted">{n.author} · {formatDateTime(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Review History"><MembershipTimeline events={a.timeline} /></Card>

          <Card title="Moderation Actions">
            <div className="grid grid-cols-1 gap-2">
              {a.archiveStatus !== 'published' && (
                <Button icon={<Upload className="h-4 w-4" />} onClick={() => setPublishOpen(true)} disabled={!canModerate || !eligible} title={!canModerate ? RESTRICTED_HINT : !eligible ? 'Linked portfolio must be published and membership eligible.' : ''}>Publish to Archive</Button>
              )}
              {a.archiveStatus === 'hidden' && (
                <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRestoreOpen(true)} disabled={!canModerate} title={canModerate ? '' : RESTRICTED_HINT}>Restore to Archive</Button>
              )}
              <Button variant="secondary" icon={<FileWarning className="h-4 w-4" />} onClick={() => setChangesOpen(true)} disabled={!canModerate} title={canModerate ? '' : RESTRICTED_HINT}>Request Changes</Button>
              {a.archiveStatus === 'published' && (
                <Button variant="secondary" icon={<EyeOff className="h-4 w-4" />} onClick={() => setHideOpen(true)} disabled={!canModerate} title={canModerate ? '' : RESTRICTED_HINT}>Hide from Archive</Button>
              )}
            </div>
          </Card>

          {abilities.simulate && (
            <div className="rounded-xl border-2 border-dashed border-magenta-200 bg-magenta-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-magenta-600" />
                <h3 className="text-sm font-semibold text-charcoal">Prototype Tools</h3>
                <Badge tone="magenta">Prototype only</Badge>
              </div>
              <p className="mb-3 text-xs text-charcoal-muted">Super Admin only. Separate from normal moderation.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSimKind('broken')}>Simulate Broken YouTube Link</Button>
                <Button variant="danger" size="sm" onClick={() => setSimKind('reset')}>Reset Archive/Event Demo Data</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ArchiveRequestChangesModal archive={changesOpen ? a : null} creatorName={user?.name} onClose={() => setChangesOpen(false)} />
      <ArchiveHideModal archive={hideOpen ? a : null} onClose={() => setHideOpen(false)} />
      <ArchiveGuidelinesDrawer open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <ConfirmDialog open={publishOpen} title={`Publish "${a.title}"?`} description="Makes the video visible in the public Archive. Content status only." confirmLabel="Publish" onConfirm={() => { publishArchive(a.id, actor); toast('Published to Archive.'); setPublishOpen(false); }} onCancel={() => setPublishOpen(false)} />
      <ConfirmDialog open={restoreOpen} title="Restore video to Archive?" description="Confirms link validity and restores public Archive and Watch visibility." confirmLabel="Restore" onConfirm={() => { restoreArchive(a.id, actor); toast('Restored to Archive.'); setRestoreOpen(false); }} onCancel={() => setRestoreOpen(false)} />
      <ConfirmDialog
        open={!!simKind}
        title={simKind === 'reset' ? 'Reset Archive/Event Demo Data' : 'Simulate Broken YouTube Link'}
        description={simKind === 'reset' ? 'Prototype only. Rebuilds all Archive and Event demo data from seed. Users and portfolios untouched.' : 'Prototype only. Sets this video\'s YouTube status to Unavailable.'}
        confirmLabel={simKind === 'reset' ? 'Reset Demo' : 'Run Simulation'}
        tone="danger"
        onConfirm={() => {
          if (simKind === 'broken') { simBrokenLink(a.id, actor); toast('YouTube link marked unavailable.'); }
          if (simKind === 'reset') { resetArchiveEventDemo(actor); toast('Archive/Event demo data reset.'); navigate('/admin/archive'); }
          setSimKind(null);
        }}
        onCancel={() => setSimKind(null)}
      />
    </div>
  );
}
