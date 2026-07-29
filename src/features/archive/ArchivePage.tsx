import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, FolderOpen, Play, Search, Video, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Select } from '../../components/ui/Field';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { useData } from '../../data/store';
import { formatDate } from '../../lib/format';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import type { ArchiveRecord } from '../../types/events';
import type { UserRecord } from '../../types/users';

const SORTS = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'oldest', label: 'Oldest' },
];

function Thumb({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-charcoal/80 text-white">
        <Play className="h-4 w-4" />
      </span>
    );
  }
  return (
    <img
      src={`https://i.ytimg.com/vi/${id}/default.jpg`}
      alt=""
      onError={() => setBroken(true)}
      className="h-10 w-16 shrink-0 rounded-md object-cover"
    />
  );
}

interface Row {
  a: ArchiveRecord;
  u?: UserRecord;
}

export function ArchivePage() {
  const { archives, users } = useData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const get = (k: string, d = '') => params.get(k) ?? d;
  const q = get('q');
  const cat = get('cat', 'all');
  const sort = get('sort', 'recent');
  const page = Number(get('page', '1'));
  const size = Number(get('size', '10'));

  const update = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const rows: Row[] = useMemo(
    () => archives.map((a) => ({ a, u: users.find((x) => x.id === a.userId) })),
    [archives, users],
  );

  const filtered = useMemo(() => {
    let list = rows.filter(({ a, u }) => {
      if (q) {
        const hay = `${a.title} ${u?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (cat !== 'all' && a.category !== cat) return false;
      return true;
    });
    list = [...list].sort((x, y) =>
      sort === 'oldest'
        ? +new Date(x.a.publishedAt) - +new Date(y.a.publishedAt)
        : +new Date(y.a.publishedAt) - +new Date(x.a.publishedAt),
    );
    return list;
  }, [rows, q, cat, sort]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * size, page * size);

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}` });
  if (cat !== 'all') chips.push({ key: 'cat', label: cat });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <div>
      <PageHeader title="Archive" description="A read-only directory of YouTube videos shared through creator portfolios." />

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
            <input
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search by video title or creator…"
              aria-label="Search archive"
              className="input-base pl-9"
            />
          </div>
          <Select value={cat} onChange={(e) => update({ cat: e.target.value })} className="lg:w-52 text-sm">
            <option value="all">All categories</option>
            {MEMBERSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="lg:w-48 text-sm">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>Sort: {s.label}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-charcoal-muted">
            <span className="font-medium text-charcoal">{total}</span> video{total === 1 ? '' : 's'}
          </span>
          {chips.length > 0 && <span className="text-cream-200">|</span>}
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => update({ [chip.key]: '' })}
              className="inline-flex items-center gap-1 rounded-full bg-magenta-50 px-2.5 py-1 text-xs font-medium text-magenta-700 hover:bg-magenta-100"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {chips.length > 0 && (
            <button onClick={clearAll} className="text-xs font-medium text-charcoal-muted hover:text-charcoal">Clear All</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Published Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {paged.map(({ a, u }) => (
                <tr key={a.id} className="hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <a href={a.youtubeUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                      <Thumb id={a.youtubeId} />
                      <span className="min-w-0">
                        <span className="block max-w-[280px] truncate font-medium text-charcoal group-hover:text-magenta-700">{a.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                          <Video className="h-3 w-3" /> YouTube
                        </span>
                      </span>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={u?.name ?? '—'} size="sm" />
                      <span>
                        <span className="block text-charcoal">{u?.name ?? 'Unknown'}</span>
                        <span className="block text-xs text-charcoal-muted">{a.iicaId ?? '—'}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{a.category}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(a.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DropdownMenu
                        items={[
                          { label: 'Open YouTube', icon: <ExternalLink className="h-4 w-4" />, onClick: () => window.open(a.youtubeUrl, '_blank', 'noopener,noreferrer') },
                          { label: 'Open Creator Profile', icon: <FolderOpen className="h-4 w-4" />, onClick: () => navigate(`/admin/portfolios/${a.portfolioId}`, { state: { from: '/admin/archive' } }) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total === 0 && (
          <EmptyState
            icon={<Video className="h-6 w-6" />}
            title="No videos match your filters"
            description="Try adjusting or clearing the filters above."
            action={<Button variant="secondary" onClick={clearAll}>Clear All</Button>}
          />
        )}
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            onPage={(p) => update({ page: String(p) }, false)}
            onPageSize={(n) => update({ size: String(n) })}
          />
        )}
      </div>
    </div>
  );
}
