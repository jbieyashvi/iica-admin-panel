import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Menu, Search, Settings, UserCircle } from 'lucide-react';
import { NAV_GROUPS, NAV_LOOKUP } from '../../config/navigation';
import { NOTIFICATIONS } from '../../mock/notifications';
import { ROLES } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';
import { useClickOutside } from '../../lib/useClickOutside';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/cn';

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const notifRef = useClickOutside<HTMLDivElement>(() => setNotifOpen(false));
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));
  const searchRef = useClickOutside<HTMLDivElement>(() => setSearchFocused(false));

  const currentLabel = NAV_LOOKUP[location.pathname] ?? 'Dashboard';
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const roleLabel = user ? ROLES[user.role].label : '';

  const doLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-cream-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      {/* Mobile menu */}
      <button
        onClick={onOpenMobile}
        className="rounded-md p-2 text-charcoal-muted hover:bg-cream-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm sm:flex">
        <Link to="/admin/dashboard" className="text-charcoal-muted hover:text-charcoal">
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-charcoal-muted/60" aria-hidden />
        <span className="font-medium text-charcoal">{currentLabel}</span>
      </nav>

      {/* Global search */}
      <div ref={searchRef} className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder="Search modules…"
          aria-label="Global search"
          className="input-base h-10 pl-9"
        />
        {searchFocused && query.trim() && (
          <div className="absolute mt-1.5 w-full overflow-hidden rounded-lg border border-cream-200 bg-white py-1 shadow-drawer">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-charcoal-muted">No matches</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.to}
                  onMouseDown={() => {
                    navigate(r.to);
                    setQuery('');
                    setSearchFocused(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-charcoal hover:bg-cream-100"
                >
                  <r.icon className="h-4 w-4 text-charcoal-muted" aria-hidden />
                  {r.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <Tooltip label="Notifications" side="bottom">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-md p-2 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-magenta-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </Tooltip>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-drawer">
            <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
              <p className="text-sm font-semibold text-charcoal">Notifications</p>
              <span className="text-xs text-charcoal-muted">{unreadCount} unread</span>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      navigate(n.route);
                      setNotifOpen(false);
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-cream-100"
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        n.unread ? 'bg-magenta-500' : 'bg-cream-200',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-charcoal">{n.title}</span>
                      <span className="block text-xs text-charcoal-muted">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-charcoal-muted/70">{n.time}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Link
              to="/admin/notifications"
              onClick={() => setNotifOpen(false)}
              className="block border-t border-cream-200 px-4 py-2.5 text-center text-sm font-medium text-magenta-600 hover:bg-cream-100"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>

      {/* Profile menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-cream-100"
          aria-label="Account menu"
          aria-expanded={menuOpen}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta-500 text-sm font-semibold text-white">
            {user ? initials(user.name) : '–'}
          </span>
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-medium text-charcoal">{user?.name}</span>
            <span className="block text-[11px] text-charcoal-muted">{roleLabel}</span>
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-drawer">
            <div className="border-b border-cream-200 px-4 py-3">
              <p className="text-sm font-medium text-charcoal">{user?.name}</p>
              <p className="truncate text-xs text-charcoal-muted">{user?.email}</p>
              <span className="mt-1.5 inline-flex rounded-full bg-magenta-50 px-2 py-0.5 text-[11px] font-medium text-magenta-700">
                {roleLabel}
              </span>
            </div>
            <div className="py-1">
              <button
                onClick={() => {
                  navigate('/admin/admin-users');
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-charcoal hover:bg-cream-100"
              >
                <UserCircle className="h-4 w-4 text-charcoal-muted" /> Profile
              </button>
              <button
                onClick={() => {
                  navigate('/admin/settings');
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-charcoal hover:bg-cream-100"
              >
                <Settings className="h-4 w-4 text-charcoal-muted" /> Settings
              </button>
            </div>
            <div className="border-t border-cream-200 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmLogout(true);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out of Admin Panel?"
        description="You'll need to sign in again with your email, password and verification code."
        confirmLabel="Log out"
        tone="danger"
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </header>
  );
}
