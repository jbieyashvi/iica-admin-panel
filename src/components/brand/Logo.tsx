import { cn } from '../../lib/cn';

// IICA monogram mark. Pure inline SVG so it renders offline with no asset deps.
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-magenta-500 font-serif text-white',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-full w-full p-1.5" fill="none">
        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="15"
          fontWeight="600"
          fill="currentColor"
        >
          ii
        </text>
      </svg>
    </span>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0" />
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-serif text-base font-semibold tracking-tight text-charcoal">IICA</div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">
            Admin Panel
          </div>
        </div>
      )}
    </div>
  );
}
