// ---------------------------------------------------------------------------
// Shared domain types for the IICA Admin Panel.
// Kept intentionally close to a future backend/API shape so the mock service
// layer can later be swapped for real API calls with minimal churn.
// ---------------------------------------------------------------------------

export type AdminRole =
  | 'super_admin'
  | 'operations_manager'
  | 'finance_manager'
  | 'portfolio_moderator';

export interface RoleMeta {
  id: AdminRole;
  label: string;
  description: string;
}

// Coarse-grained permissions. A real system would be finer, but this is enough
// to gate routes and actions in the prototype.
export type Permission =
  | 'view_dashboard'
  | 'manage_users'
  | 'manage_memberships'
  | 'manage_catalogue'
  | 'moderate_portfolios'
  | 'manage_commerce'
  | 'manage_finance'
  | 'manage_engagement'
  | 'manage_collaborations'
  | 'manage_reviews'
  | 'manage_transactions'
  | 'manage_platform'
  | 'manage_admins'
  | 'manage_settings';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  user: AdminUser;
  token: string;
  issuedAt: string;
}

// ---- Membership categories (centrally managed, shared with mobile app) -----

export type MembershipCategory =
  | 'Artist'
  | 'Model'
  | 'Legacy Brand of Impact'
  | 'Fitness Champion'
  | 'Yoga Coach'
  | 'Athlete'
  | 'Sports Coach/Trainer/Enthusiast'
  | 'VIP Host'
  | 'VIP Venue'
  | 'VIP Connoisseur'
  | 'VIP Manager';

// ---- Dashboard model -------------------------------------------------------

export type ChangeDirection = 'up' | 'down' | 'flat';

export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change: number; // percentage, signed
  direction: ChangeDirection;
  hint?: string;
}

export interface RevenuePoint {
  label: string;
  grossSales: number;
  commission: number;
  refunds: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

export interface PendingAction {
  id: string;
  label: string;
  count: number;
  route: string;
  severity: 'high' | 'medium' | 'low';
}

export type ActivityType =
  | 'membership_activated'
  | 'event_submitted'
  | 'archive_added'
  | 'order_received'
  | 'collaboration_reported'
  | 'testimonial_submitted';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  meta: string;
  timestamp: string; // ISO
}

export interface CategoryDistribution {
  category: MembershipCategory;
  count: number;
}

export interface LocationDistribution {
  city: string;
  count: number;
}

export interface CommerceSnapshot {
  physicalProducts: number;
  digitalProducts: number;
  masterclasses: number;
  eventTickets: number;
  ordersAwaitingAction: number;
}

export interface CollaborationSnapshot {
  matchesGenerated: number;
  requestsSent: number;
  acceptedRequests: number;
  upcomingMeetings: number;
  reportedInteractions: number;
}

export type DateRangeKey = '7d' | '30d' | '90d' | '12m';

export interface DashboardData {
  metrics: MetricCardData[];
  revenue: Record<DateRangeKey, RevenuePoint[]>;
  funnel: FunnelStage[];
  pendingActions: PendingAction[];
  activity: ActivityItem[];
  categories: CategoryDistribution[];
  locations: LocationDistribution[];
  commerce: CommerceSnapshot;
  collaboration: CollaborationSnapshot;
}
