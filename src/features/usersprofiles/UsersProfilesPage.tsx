import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../context/AuthContext';
import { UsersPage } from '../users/UsersPage';
import { CataloguePage } from '../catalogue/CataloguePage';
import { PortfoliosPage } from '../portfolios/PortfoliosPage';
import type { Permission } from '../../types';

interface TabDef { key: string; label: string; permission: Permission }
const ALL_TABS: TabDef[] = [
  { key: 'users', label: 'All Users', permission: 'manage_users' },
  { key: 'catalogue', label: 'Creator Catalogue', permission: 'manage_catalogue' },
  { key: 'portfolios', label: 'Portfolios', permission: 'moderate_portfolios' },
];

export function UsersProfilesPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();

  const tabs = useMemo(() => ALL_TABS.filter((t) => can(t.permission)), [can]);
  const requested = params.get('tab') ?? '';
  const active = tabs.some((t) => t.key === requested) ? requested : (tabs[0]?.key ?? 'users');

  // Preserve each tab's own filters/search when switching between tabs.
  const saved = useRef<Record<string, string>>({});

  const switchTab = (next: string) => {
    if (next === active) return;
    // Snapshot the current tab's params (everything except `tab`).
    const cur = new URLSearchParams(params);
    cur.delete('tab');
    saved.current[active] = cur.toString();
    // Restore the target tab's saved params.
    const restored = new URLSearchParams(saved.current[next] ?? '');
    restored.set('tab', next);
    setParams(restored, { replace: false });
  };

  return (
    <div>
      <PageHeader
        title="Users & Profiles"
        description="Manage platform users, creator profiles and public catalogue visibility."
      />
      <div className="mb-5">
        <Tabs tabs={tabs.map((t) => ({ key: t.key, label: t.label }))} active={active} onChange={switchTab} />
      </div>

      {active === 'users' && <UsersPage embedded />}
      {active === 'catalogue' && <CataloguePage embedded />}
      {active === 'portfolios' && <PortfoliosPage embedded />}
    </div>
  );
}
