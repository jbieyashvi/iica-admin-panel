import {
  LayoutDashboard,
  Users,
  IdCard,
  LayoutGrid,
  FolderOpen,
  Video,
  CalendarDays,
  Tags,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  Handshake,
  Star,
  LifeBuoy,
  MonitorSmartphone,
  Bell,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Settings,
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
    title: 'People',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'manage_users' },
      { label: 'Memberships', to: '/admin/memberships', icon: IdCard, permission: 'manage_memberships' },
      { label: 'Catalogue', to: '/admin/catalogue', icon: LayoutGrid, permission: 'manage_catalogue' },
      { label: 'Portfolios', to: '/admin/portfolios', icon: FolderOpen, permission: 'moderate_portfolios' },
    ],
  },
  {
    title: 'Content & Commerce',
    items: [
      { label: 'Archive', to: '/admin/archive', icon: Video, permission: 'moderate_portfolios' },
      { label: 'Events', to: '/admin/events', icon: CalendarDays, permission: 'manage_commerce' },
      { label: 'Product Categories', to: '/admin/categories', icon: Tags, permission: 'manage_catalogue' },
      { label: 'Products', to: '/admin/products', icon: Package, permission: 'manage_commerce' },
      { label: 'Orders', to: '/admin/orders', icon: ShoppingCart, permission: 'manage_commerce' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Transactions', to: '/admin/finance', icon: Receipt, permission: 'manage_finance' },
      { label: 'Commission & Payouts', to: '/admin/payouts', icon: Wallet, permission: 'manage_finance' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Collaborations', to: '/admin/collaborations', icon: Handshake, permission: 'manage_engagement' },
      { label: 'Reviews & Testimonials', to: '/admin/reviews', icon: Star, permission: 'manage_engagement' },
      { label: 'Support', to: '/admin/support', icon: LifeBuoy, permission: 'manage_engagement' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Home & App Content', to: '/admin/app-content', icon: MonitorSmartphone, permission: 'manage_platform' },
      { label: 'Notifications', to: '/admin/notifications', icon: Bell, permission: 'manage_platform' },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3, permission: 'manage_platform' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Admin Users', to: '/admin/admin-users', icon: ShieldCheck, permission: 'manage_admins' },
      { label: 'Audit Log', to: '/admin/audit-log', icon: ScrollText, permission: 'view_audit_log' },
      { label: 'Settings', to: '/admin/settings', icon: Settings, permission: 'manage_settings' },
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
