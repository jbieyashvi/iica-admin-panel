import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream-100 text-charcoal-muted">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <p className="text-sm font-medium text-charcoal">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-charcoal-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
