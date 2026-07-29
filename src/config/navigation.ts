import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  FolderOpen,
  Video,
  CalendarDays,
  Tags,
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
    title: 'People & Profiles',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'manage_users' },
      { label: 'Catalogue', to: '/admin/catalogue', icon: LayoutGrid, permission: 'manage_catalogue' },
      { label: 'Portfolios', to: '/admin/portfolios', icon: FolderOpen, permission: 'moderate_portfolios' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Archive', to: '/admin/archive', icon: Video, permission: 'moderate_portfolios' },
      { label: 'Events', to: '/admin/events', icon: CalendarDays, permission: 'manage_commerce' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Categories', to: '/admin/categories', icon: Tags, permission: 'manage_catalogue' },
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
