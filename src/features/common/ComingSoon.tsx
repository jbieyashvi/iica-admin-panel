import { useLocation } from 'react-router-dom';
import { Construction, Sparkles } from 'lucide-react';
import { NAV_LOOKUP } from '../../config/navigation';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';

export function ComingSoon() {
  const { pathname } = useLocation();
  const label = NAV_LOOKUP[pathname] ?? 'Module';

  return (
    <div>
      <PageHeader
        title={label}
        description={`Manage ${label.toLowerCase()} for the IICA platform.`}
        actions={
          <Badge tone="magenta">
            <Sparkles className="h-3 w-3" /> Next phase
          </Badge>
        }
      />

      <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-magenta-50 text-magenta-600">
          <Construction className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="font-serif text-xl font-medium text-charcoal">
          {label} is coming in the next phase
        </h2>
        <p className="mt-2 max-w-md text-sm text-charcoal-muted">
          This module is scaffolded and routed. Full tables, filters, drawers and workflows for
          <span className="font-medium text-charcoal"> {label} </span>
          will be built in an upcoming iteration of the admin panel.
        </p>
      </div>
    </div>
  );
}
