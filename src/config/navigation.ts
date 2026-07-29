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
      { label: 'Catalogue', to: '/admin/catalogue', icon: LayoutGrid, permission: 'manage_catalogue' },
      { label: 'Portfolios', to: '/admin/portfolios', icon: FolderOpen, permission: 'moderate_portfolios' },
      { label: 'Collaborations', to: '/admin/collaborations', icon: Handshake, permission: 'manage_collaborations' },
    ],
  },
  {
    title: 'Content & Commerce',
    items: [
      { label: 'Archive', to: '/admin/archive', icon: Video, permission: 'manage_archive' },
      { label: 'Events', to: '/admin/events', icon: CalendarDays, permission: 'manage_events' },
      { label: 'Products', to: '/admin/products', icon: Package, permission: 'manage_products' },
      { label: 'Orders', to: '/admin/orders', icon: ShoppingBag, permission: 'manage_orders' },
      { label: 'Transactions', to: '/admin/transactions', icon: Receipt, permission: 'manage_transactions' },
      { label: 'Commissions & Payouts', to: '/admin/commissions-payouts', icon: Wallet, permission: 'manage_payouts' },
      { label: 'Reviews', to: '/admin/reviews', icon: MessageSquareQuote, permission: 'manage_reviews' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Banners', to: '/admin/banners', icon: Megaphone, permission: 'manage_banners' },
      { label: 'Membership Categories', to: '/admin/categories', icon: Tags, permission: 'manage_categories' },
      { label: 'Admin Users', to: '/admin/admin-users', icon: ShieldCheck, permission: 'manage_admins' },
    ],
  },
];

// Flat lookup for breadcrumbs.
export const NAV_LOOKUP: Record<string, string> = NAV_GROUPS.flatMap((g) => g.items).reduce(
  (acc, item) => {
    acc[item.to] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);
