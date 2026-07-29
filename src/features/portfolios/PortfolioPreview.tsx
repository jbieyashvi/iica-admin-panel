import { useState } from 'react';
import {
  Award,
  CalendarDays,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  AtSign,
  Users,
  Video,
  Music,
  Play,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import { effectiveLocation } from '../../data/portfolioLogic';
import type { PortfolioRecord } from '../../types/portfolio';
import type { UserRecord } from '../../types/users';

interface ModerateApi {
  canModerate: boolean;
  onToggle: (section: 'watch' | 'testimonials' | 'gallery', itemId: string, hidden: boolean) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-cream-200 px-5 py-5 first:border-t-0">
      <h3 className="mb-3 font-serif text-base font-medium text-charcoal">{title}</h3>
      {children}
    </section>
  );
}

function HideBtn({ hidden, onClick }: { hidden: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        hidden ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-cream-200 bg-white text-charcoal-muted hover:text-charcoal',
      )}
    >
      {hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {hidden ? 'Restore' : 'Hide'}
    </button>
  );
}

const placeholder = 'flex items-center justify-center bg-cream-100 text-charcoal-muted/50';

export function PortfolioPreview({
  portfolio,
  user,
  device,
  moderate,
}: {
  portfolio: PortfolioRecord;
  user?: UserRecord;
  device: 'mobile' | 'desktop';
  moderate: ModerateApi;
}) {
  const c = portfolio.content;
  const [showAllAwards, setShowAllAwards] = useState(false);
  const loc = effectiveLocation(portfolio, user);
  const awards = showAllAwards ? c.awards : c.awards.slice(0, 3);
  const highlights = [...c.highlights].sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const socials = [
    { key: 'instagram', Icon: AtSign, url: c.socials.instagram },
    { key: 'facebook', Icon: Users, url: c.socials.facebook },
    { key: 'youtube', Icon: Video, url: c.socials.youtube },
    { key: 'spotify', Icon: Music, url: c.socials.spotify },
  ].filter((s) => s.url);

  return (
    <div className={cn('mx-auto w-full overflow-hidden rounded-xl border border-cream-200 bg-white', device === 'mobile' ? 'max-w-sm' : 'max-w-3xl')}>
      {/* Cover + profile */}
      <div className="relative">
        <div className={cn('h-32', placeholder, c.coverImage ? 'bg-magenta-100' : '')}>
          {!c.coverImage && <span className="text-xs">No cover image</span>}
        </div>
        <div className="flex items-end gap-3 px-5 pb-2">
          <div className={cn('-mt-8 h-16 w-16 rounded-full border-4 border-white', placeholder, c.profileImage ? 'bg-magenta-500 text-white' : '')}>
            {c.profileImage ? <span className="font-serif text-lg">{(user?.name ?? '?').slice(0, 1)}</span> : <span className="text-[10px]">No image</span>}
          </div>
        </div>
      </div>

      {/* Profile Basics */}
      <div className="px-5 pb-4">
        <h2 className="font-serif text-xl font-medium text-charcoal">{user?.name ?? 'Creator'}</h2>
        <p className="text-sm text-charcoal-muted">{portfolio.category} · {loc.city}, {loc.country}</p>
        {socials.length > 0 && (
          <div className="mt-3 flex gap-2">
            {socials.map(({ key, Icon, url }) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-charcoal-muted hover:text-magenta-600">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      {c.about && (
        <Section title="About">
          <p className="text-sm leading-relaxed text-charcoal">{c.about}</p>
        </Section>
      )}

      {/* Domains & Skills */}
      {(c.domains.length > 0 || c.skills.length > 0) && (
        <Section title="Domains & Skills">
          <div className="flex flex-wrap gap-1.5">
            {c.domains.map((d) => <Badge key={d} tone="magenta">{d}</Badge>)}
            {c.skills.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
          </div>
        </Section>
      )}

      {/* Highlights timeline */}
      {highlights.length > 0 && (
        <Section title="Highlights">
          <ol className="relative ml-2 space-y-3 border-l border-cream-200 pl-5">
            {highlights.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-magenta-400" />
                <p className="text-xs text-charcoal-muted">{formatDate(h.date)}</p>
                <p className="text-sm font-medium text-charcoal">{h.title}</p>
                <p className="text-sm text-charcoal-muted">{h.description}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Awards */}
      {c.awards.length > 0 && (
        <Section title="Awards & Recognition">
          <ul className="space-y-2">
            {awards.map((a) => (
              <li key={a.id} className="flex items-start gap-2.5">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-magenta-500" />
                <div>
                  <p className="text-sm font-medium text-charcoal">{a.title}</p>
                  <p className="text-xs text-charcoal-muted">{a.organisation} · {a.year}{a.details ? ` · ${a.details}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
          {c.awards.length > 3 && (
            <button onClick={() => setShowAllAwards((v) => !v)} className="mt-2 text-xs font-medium text-magenta-600 hover:text-magenta-700">
              {showAllAwards ? 'Show less' : `View all ${c.awards.length}`}
            </button>
          )}
        </Section>
      )}

      {/* Watch */}
      {c.watch.length > 0 && (
        <Section title="Watch">
          <div className="space-y-3">
            {c.watch.map((w) => (
              <div key={w.id} className={cn('rounded-lg border border-cream-200 p-3', w.hidden && 'opacity-50')}>
                <div className="flex gap-3">
                  <div className={cn('flex h-14 w-24 shrink-0 items-center justify-center rounded-md bg-charcoal/80 text-white')}>
                    <Play className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">{w.title}</p>
                    <p className="line-clamp-1 text-xs text-charcoal-muted">{w.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <a href={w.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-600 hover:underline">
                        YouTube <ExternalLink className="h-3 w-3" />
                      </a>
                      {w.linkValid ? <Badge tone="green">Valid link</Badge> : <Badge tone="red">Invalid link</Badge>}
                      {w.hidden && <Badge tone="amber">Hidden</Badge>}
                    </div>
                  </div>
                  {moderate.canModerate && <HideBtn hidden={!!w.hidden} onClick={() => moderate.onToggle('watch', w.id, !w.hidden)} />}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Spotify */}
      <Section title="Spotify">
        {c.spotify.type === 'none' ? (
          <p className="text-sm text-charcoal-muted">No Spotify linked.</p>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-cream-200 bg-cream-100/50 p-3">
            <Music className="h-5 w-5 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal">{c.spotify.type === 'embed' ? 'Spotify player embed' : 'Spotify external link'}</p>
              <a href={c.spotify.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-600 hover:underline">
                Open in Spotify <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {c.spotify.type === 'external' && <Badge tone="neutral">External fallback</Badge>}
          </div>
        )}
      </Section>

      {/* Events */}
      {c.events.length > 0 && (
        <Section title="Events">
          <ul className="space-y-2">
            {c.events.map((e) => (
              <li key={e.id} className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="h-4 w-4 text-charcoal-muted" />
                <span className="font-medium text-charcoal">{e.title}</span>
                <span className="text-charcoal-muted">· {e.city} · {formatDate(e.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gallery */}
      {c.gallery.length > 0 && (
        <Section title="Gallery">
          <div className="grid grid-cols-3 gap-2">
            {c.gallery.map((g) => (
              <div key={g.id} className={cn('relative aspect-square rounded-md', placeholder, g.hidden && 'opacity-40')}>
                <span className="px-1 text-center text-[10px]">{g.caption}</span>
                {moderate.canModerate && (
                  <div className="absolute right-1 top-1">
                    <HideBtn hidden={!!g.hidden} onClick={() => moderate.onToggle('gallery', g.id, !g.hidden)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Testimonials */}
      {c.testimonials.length > 0 && (
        <Section title="Testimonials">
          <div className="space-y-2.5">
            {c.testimonials.map((t) => (
              <div key={t.id} className={cn('rounded-lg border border-cream-200 p-3', t.hidden && 'opacity-50')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-charcoal">"{t.body}"</p>
                    <p className="mt-1 text-xs text-charcoal-muted">— {t.author} · {'★'.repeat(t.rating)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {t.reported && <Badge tone="red"><Flag className="h-3 w-3" /> Reported</Badge>}
                    {t.hidden && <Badge tone="amber">Hidden</Badge>}
                    {moderate.canModerate && <HideBtn hidden={!!t.hidden} onClick={() => moderate.onToggle('testimonials', t.id, !t.hidden)} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* What's New */}
      {c.whatsNew.length > 0 && (
        <Section title="What's New / Upcoming">
          <ul className="space-y-2.5">
            {c.whatsNew.map((n) => (
              <li key={n.id} className="rounded-lg border border-cream-200 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-magenta-500" />
                  <span className="text-sm font-medium text-charcoal">{n.title}</span>
                  <Badge tone="neutral">{n.type}</Badge>
                </div>
                <p className="mt-1 text-sm text-charcoal-muted">{n.description}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-charcoal-muted">{formatDate(n.date)}</span>
                  <a href={n.destination} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-magenta-50 px-2 py-0.5 font-medium text-magenta-700">
                    {n.ctaLabel} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Collaborations */}
      {c.collaborations.length > 0 && (
        <Section title="Collaborations">
          <ul className="space-y-2">
            {c.collaborations.map((col) => (
              <li key={col.id} className="rounded-lg border border-cream-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-charcoal">{col.collaborator}</span>
                  {col.awardWon ? <Badge tone="green">Award won</Badge> : <Badge tone="neutral">No award</Badge>}
                </div>
                <p className="text-charcoal-muted">{col.project} · {formatDate(col.date)}</p>
                {col.awardWon && col.awardDetails && <p className="mt-0.5 text-xs text-magenta-700">{col.awardDetails}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
