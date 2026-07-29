import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-cream-200 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-charcoal-muted">
        <span>
          Showing <span className="font-medium text-charcoal">{from}</span>–
          <span className="font-medium text-charcoal">{to}</span> of{' '}
          <span className="font-medium text-charcoal">{total}</span>
        </span>
        <span className="mx-1 text-cream-200">|</span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="rounded-md border border-cream-200 bg-white py-1 pl-2 pr-6 text-sm text-charcoal focus:border-magenta-500 focus:ring-2 focus:ring-magenta-500/20"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-cream-200 px-2.5 py-1.5 text-sm text-charcoal hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="px-2 text-sm text-charcoal-muted">
          Page <span className="font-medium text-charcoal">{page}</span> / {pages}
        </span>
        <button
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="inline-flex items-center gap-1 rounded-md border border-cream-200 px-2.5 py-1.5 text-sm text-charcoal hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
