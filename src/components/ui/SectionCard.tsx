import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('card flex flex-col', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-cream-200 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-charcoal-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
