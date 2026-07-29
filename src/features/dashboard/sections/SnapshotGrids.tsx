import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  GraduationCap,
  Handshake,
  Package,
  Send,
  Sparkles,
  Ticket,
  TriangleAlert,
  Truck,
  UserCheck,
} from 'lucide-react';
import type { CollaborationSnapshot, CommerceSnapshot } from '../../../types';
import { SectionCard } from '../../../components/ui/SectionCard';
import { formatNumber } from '../../../lib/format';

interface Stat {
  label: string;
  value: number;
  Icon: typeof Package;
  accent?: boolean;
}

function StatList({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-cream-200 bg-cream-100/50 p-3"
        >
          <s.Icon
            className={`h-4 w-4 ${s.accent ? 'text-magenta-600' : 'text-charcoal-muted'}`}
            aria-hidden
          />
          <p className="mt-2 font-serif text-xl font-medium text-charcoal">
            {formatNumber(s.value)}
          </p>
          <p className="text-xs text-charcoal-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CommerceSnapshotCard({ data }: { data: CommerceSnapshot }) {
  const navigate = useNavigate();
  return (
    <SectionCard
      title="Commerce Snapshot"
      description="Units sold and orders needing action"
      actions={
        <button
          onClick={() => navigate('/admin/orders')}
          className="text-xs font-medium text-magenta-600 hover:text-magenta-700"
        >
          Open orders
        </button>
      }
    >
      <StatList
        stats={[
          { label: 'Physical products', value: data.physicalProducts, Icon: Package },
          { label: 'Digital products', value: data.digitalProducts, Icon: Sparkles },
          { label: 'Masterclasses', value: data.masterclasses, Icon: GraduationCap },
          { label: 'Event ticket sales', value: data.eventTickets, Icon: Ticket },
          { label: 'Orders awaiting action', value: data.ordersAwaitingAction, Icon: Truck, accent: true },
        ]}
      />
    </SectionCard>
  );
}

export function CollaborationSnapshotCard({ data }: { data: CollaborationSnapshot }) {
  const navigate = useNavigate();
  return (
    <SectionCard
      title="Collaboration Snapshot"
      description="Match-making activity across the platform"
      actions={
        <button
          onClick={() => navigate('/admin/collaborations')}
          className="text-xs font-medium text-magenta-600 hover:text-magenta-700"
        >
          Open collaborations
        </button>
      }
    >
      <StatList
        stats={[
          { label: 'Match recommendations', value: data.matchesGenerated, Icon: Sparkles },
          { label: 'Requests sent', value: data.requestsSent, Icon: Send },
          { label: 'Accepted requests', value: data.acceptedRequests, Icon: UserCheck },
          { label: 'Upcoming meetings', value: data.upcomingMeetings, Icon: CalendarCheck },
          { label: 'Reported interactions', value: data.reportedInteractions, Icon: TriangleAlert, accent: true },
          { label: 'Active collaborations', value: data.acceptedRequests, Icon: Handshake },
        ]}
      />
    </SectionCard>
  );
}
