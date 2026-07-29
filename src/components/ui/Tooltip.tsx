import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

// Lightweight CSS tooltip. Content is exposed via aria-label on the trigger for
// screen readers; the visual bubble is purely presentational.
export function Tooltip({
  label,
  children,
  side = 'top',
  className,
}: {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-xs font-medium text-white opacity-0 shadow-drawer transition-opacity duration-150 group-hover/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
