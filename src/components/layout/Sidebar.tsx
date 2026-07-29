import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_GROUPS } from '../../config/navigation';
import { Logo } from '../brand/Logo';
import { Tooltip } from '../ui/Tooltip';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { can } = useAuth();

  const content = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand + collapse control */}
      <div className={cn('flex h-16 shrink-0 items-center border-b border-cream-200 px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <Logo collapsed={collapsed} />
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-md p-1.5 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <button
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-charcoal-muted hover:bg-cream-100 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((it) => !it.permission || can(it.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted/70">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const link = (
                    <NavLink
                      to={item.to}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center',
                          isActive
                            ? 'bg-magenta-50 text-magenta-700'
                            : 'text-charcoal-light hover:bg-cream-100 hover:text-charcoal',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-magenta-500" />
                          )}
                          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                  return (
                    <li key={item.to}>
                      {collapsed ? (
                        <Tooltip label={item.label} side="bottom">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-cream-200 px-4 py-3">
          <p className="text-[11px] text-charcoal-muted">IICA Admin · Prototype v0.1</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-cream-200 transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-charcoal/40" onClick={onCloseMobile} aria-hidden />
          <div className="absolute left-0 top-0 h-full w-72 shadow-drawer">{content}</div>
        </div>
      )}
    </>
  );
}
