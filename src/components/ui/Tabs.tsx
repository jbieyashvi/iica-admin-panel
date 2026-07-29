import { cn } from '../../lib/cn';

export interface TabDef {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="border-b border-cream-200" role="tablist">
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              active === t.key
                ? 'border-magenta-500 text-magenta-700'
                : 'border-transparent text-charcoal-muted hover:text-charcoal',
            )}
          >
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active === t.key ? 'bg-magenta-50 text-magenta-700' : 'bg-cream-100 text-charcoal-muted',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
