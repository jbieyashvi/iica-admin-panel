import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-100 text-charcoal-muted border-cream-200',
  magenta: 'bg-magenta-50 text-magenta-700 border-magenta-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  blue: 'bg-sky-50 text-sky-700 border-sky-100',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
