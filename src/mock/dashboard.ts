import type { DashboardData, MembershipCategory } from '../types';

// Central, shared membership category list. Do NOT edit ad hoc — mirrors mobile.
export const MEMBERSHIP_CATEGORIES: MembershipCategory[] = [
  'Artist',
  'Model',
  'Legacy Brand of Impact',
  'Fitness Champion',
  'Yoga Coach',
  'Athlete',
  'Sports Coach/Trainer/Enthusiast',
  'VIP Host',
  'VIP Venue',
  'VIP Connoisseur',
  'VIP Manager',
];

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const DASHBOARD_DATA: DashboardData = {
  metrics: [
    { id: 'users', label: 'Total Users', value: '48,392', rawValue: 48392, change: 6.4, direction: 'up', hint: 'All registered app users' },
    { id: 'creators', label: 'Active Creator Memberships', value: '3,412', rawValue: 3412, change: 4.1, direction: 'up', hint: 'Paid memberships currently active' },
    { id: 'reviews', label: 'Pending Portfolio Reviews', value: '86', rawValue: 86, change: 12.5, direction: 'up', hint: 'Awaiting moderator action' },
    { id: 'orders', label: 'Total Orders', value: '12,740', rawValue: 12740, change: 2.8, direction: 'up', hint: 'Across physical & digital' },
    { id: 'gross', label: 'Gross Sales', value: inr(8642000), rawValue: 8642000, change: 9.2, direction: 'up', hint: 'Last 30 days' },
    { id: 'commission', label: 'Platform Commission', value: inr(1296300), rawValue: 1296300, change: 8.1, direction: 'up', hint: '15% average take rate' },
    { id: 'events', label: 'Upcoming Events', value: '24', rawValue: 24, change: 0, direction: 'flat', hint: 'Scheduled next 30 days' },
    { id: 'tickets', label: 'Open Support Tickets', value: '37', rawValue: 37, change: 5.3, direction: 'down', hint: 'Unresolved queries' },
  ],
  revenue: {
    '7d': [
      { label: 'Mon', grossSales: 268000, commission: 40200, refunds: 6200 },
      { label: 'Tue', grossSales: 312000, commission: 46800, refunds: 4800 },
      { label: 'Wed', grossSales: 289000, commission: 43350, refunds: 8100 },
      { label: 'Thu', grossSales: 341000, commission: 51150, refunds: 5400 },
      { label: 'Fri', grossSales: 402000, commission: 60300, refunds: 9200 },
      { label: 'Sat', grossSales: 458000, commission: 68700, refunds: 7600 },
      { label: 'Sun', grossSales: 421000, commission: 63150, refunds: 6100 },
    ],
    '30d': Array.from({ length: 30 }, (_, i) => {
      const base = 260000 + Math.round(Math.sin(i / 3) * 60000) + i * 2400;
      return {
        label: `${i + 1}`,
        grossSales: base,
        commission: Math.round(base * 0.15),
        refunds: 4000 + ((i * 733) % 6000),
      };
    }),
    '90d': Array.from({ length: 13 }, (_, i) => {
      const base = 1600000 + Math.round(Math.cos(i / 2) * 240000) + i * 30000;
      return {
        label: `W${i + 1}`,
        grossSales: base,
        commission: Math.round(base * 0.15),
        refunds: 28000 + ((i * 4211) % 22000),
      };
    }),
    '12m': [
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan',
      'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    ].map((m, i) => {
      const base = 6200000 + Math.round(Math.sin(i / 2) * 900000) + i * 180000;
      return {
        label: m,
        grossSales: base,
        commission: Math.round(base * 0.15),
        refunds: 120000 + ((i * 33701) % 90000),
      };
    }),
  },
  funnel: [
    { key: 'submitted', label: 'Membership Form Submitted', count: 5820 },
    { key: 'iica_id', label: 'IICA ID Generated', count: 5210 },
    { key: 'purchase_started', label: 'Purchase Started', count: 4360 },
    { key: 'store_pending', label: 'Apple / Google Purchase Pending', count: 3980 },
    { key: 'active', label: 'Active Membership', count: 3412 },
    { key: 'renewal_due', label: 'Renewal Due', count: 640 },
    { key: 'expired', label: 'Expired or Cancelled', count: 512 },
  ],
  pendingActions: [
    { id: 'pa_portfolios', label: 'Portfolios awaiting review', count: 86, route: '/admin/portfolios', severity: 'high' },
    { id: 'pa_archive', label: 'Archive videos awaiting moderation', count: 42, route: '/admin/archive', severity: 'medium' },
    { id: 'pa_reviews', label: 'Reported reviews', count: 11, route: '/admin/reviews', severity: 'medium' },
    { id: 'pa_orders', label: 'Physical orders awaiting tracking', count: 28, route: '/admin/orders', severity: 'high' },
    { id: 'pa_refunds', label: 'Open refund requests', count: 9, route: '/admin/finance', severity: 'high' },
    { id: 'pa_support', label: 'Unresolved support tickets', count: 37, route: '/admin/support', severity: 'medium' },
  ],
  activity: [
    { id: 'ac_1', type: 'membership_activated', title: 'Membership activated', meta: 'Rhea Kapoor · Artist', timestamp: '2026-07-27T09:12:00Z' },
    { id: 'ac_2', type: 'event_submitted', title: 'Event submitted for review', meta: 'Sufi Nights, Jaipur', timestamp: '2026-07-27T08:40:00Z' },
    { id: 'ac_3', type: 'archive_added', title: 'YouTube video added to Archive', meta: 'Kabir Rao · Portfolio Watch', timestamp: '2026-07-27T07:58:00Z' },
    { id: 'ac_4', type: 'order_received', title: 'Product order received', meta: 'Order #IICA-10428 · ₹2,499', timestamp: '2026-07-27T07:31:00Z' },
    { id: 'ac_5', type: 'collaboration_reported', title: 'Collaboration request reported', meta: 'Flagged by Meera S.', timestamp: '2026-07-26T19:22:00Z' },
    { id: 'ac_6', type: 'testimonial_submitted', title: 'Testimonial submitted', meta: 'Aditya Verma · 5★', timestamp: '2026-07-26T18:05:00Z' },
    { id: 'ac_7', type: 'membership_activated', title: 'Membership activated', meta: 'Nikhil Joshi · Fitness Champion', timestamp: '2026-07-26T16:44:00Z' },
    { id: 'ac_8', type: 'order_received', title: 'Product order received', meta: 'Order #IICA-10427 · ₹899', timestamp: '2026-07-26T15:10:00Z' },
  ],
  categories: [
    { category: 'Artist', count: 742 },
    { category: 'Model', count: 531 },
    { category: 'Legacy Brand of Impact', count: 118 },
    { category: 'Fitness Champion', count: 496 },
    { category: 'Yoga Coach', count: 287 },
    { category: 'Athlete', count: 364 },
    { category: 'Sports Coach/Trainer/Enthusiast', count: 209 },
    { category: 'VIP Host', count: 176 },
    { category: 'VIP Venue', count: 98 },
    { category: 'VIP Connoisseur', count: 141 },
    { category: 'VIP Manager', count: 84 },
  ],
  locations: [
    { city: 'Mumbai', count: 1042 },
    { city: 'Delhi', count: 876 },
    { city: 'Bengaluru', count: 693 },
    { city: 'Jaipur', count: 412 },
    { city: 'Kolkata', count: 388 },
    { city: 'Chennai', count: 341 },
  ],
  commerce: {
    physicalProducts: 3820,
    digitalProducts: 5140,
    masterclasses: 2260,
    eventTickets: 1520,
    ordersAwaitingAction: 28,
  },
  collaboration: {
    matchesGenerated: 8420,
    requestsSent: 3260,
    acceptedRequests: 1874,
    upcomingMeetings: 96,
    reportedInteractions: 14,
  },
};

export { inr };
