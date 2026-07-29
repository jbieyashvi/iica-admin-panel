export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  route: string;
}

export const NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'n1',
    title: 'New portfolios to review',
    body: '12 creator portfolios were submitted in the last hour.',
    time: '5m ago',
    unread: true,
    route: '/admin/portfolios',
  },
  {
    id: 'n2',
    title: 'Refund request escalated',
    body: 'Order #IICA-10402 refund awaiting finance approval.',
    time: '38m ago',
    unread: true,
    route: '/admin/finance',
  },
  {
    id: 'n3',
    title: 'Archive moderation queue',
    body: '9 YouTube submissions pending moderation.',
    time: '1h ago',
    unread: true,
    route: '/admin/archive',
  },
];
