import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  FolderOpen,
  Video,
  CalendarDays,
  Tags,
  Package,
  ShoppingBag,
  Receipt,
  Wallet,
  Handshake,
  MessageSquareQuote,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '../types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' }],
  },
  {
    title: 'People & Profiles',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'manage_users' },
      { label: 'Collaborations', to: '/admin/collaborations', icon: Handshake, permission: 'manage_collaborations' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Archive', to: '/admin/archive', icon: Video, permission: 'manage_archive' },
      { label: 'Events', to: '/admin/events', icon: CalendarDays, permission: 'manage_events' },
      { label: 'Reviews', to: '/admin/reviews', icon: MessageSquareQuote, permission: 'manage_reviews' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Products', to: '/admin/products', icon: Package, permission: 'manage_products' },
      { label: 'Orders', to: '/admin/orders', icon: ShoppingBag, permission: 'manage_orders' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Transactions', to: '/admin/transactions', icon: Receipt, permission: 'manage_transactions' },
      { label: 'Commissions & Payouts', to: '/admin/commissions-payouts', icon: Wallet, permission: 'manage_payouts' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Home & App Content', to: '/admin/banners', icon: Megaphone, permission: 'manage_banners' },
      { label: 'Membership Categories', to: '/admin/categories', icon: Tags, permission: 'manage_categories' },
      { label: 'Admin Users', to: '/admin/admin-users', icon: ShieldCheck, permission: 'manage_admins' },
    ],
  },
];

// Module-search aliases: searching "Catalogue" or "Portfolio" opens the
// Creator Members view in Users (creator profile info lives in User Details).
export const SEARCH_ALIASES: NavItem[] = [
  { label: 'Creator Catalogue — in User Details', to: '/admin/users?accountType=creator', icon: LayoutGrid, permission: 'manage_users' },
  { label: 'Portfolios — in User Details', to: '/admin/users?accountType=creator', icon: FolderOpen, permission: 'manage_users' },
];

// Flat lookup for breadcrumbs.
export const NAV_LOOKUP: Record<string, string> = NAV_GROUPS.flatMap((g) => g.items).reduce(
  (acc, item) => {
    acc[item.to] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);
