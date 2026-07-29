import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/toast';
import { readStorage, writeStorage } from '../../lib/storage';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => readStorage('sidebar_collapsed', false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Persist collapse preference.
  useEffect(() => {
    writeStorage('sidebar_collapsed', collapsed);
  }, [collapsed]);

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
