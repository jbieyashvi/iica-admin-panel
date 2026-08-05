import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Users as UsersIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { CategoryStatusBadge } from '../../components/ui/PortfolioBadges';
import { CategoryIcon } from '../../lib/iconMap';
import { Tooltip } from '../../components/ui/Tooltip';
import { Modal } from '../../components/ui/Modal';
import {
  useData,
  setCategoryStatus,
  reorderCategory,
  categoryUsage,
  setMembershipPurchaseEnabled,
} from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import { formatDate } from '../../lib/format';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { Tabs } from '../../components/ui/Tabs';
import { AddCategoryModal, EditDescriptionModal, DeactivateCategoryModal, CategoryDrawer } from './CategoryModals';
import { PricingCurrencyTab } from './PricingCurrencyTab';
import type { CategoryRecord } from '../../types/portfolio';

export function CategoriesPage() {
  const { categories, users, memberships } = useData();
  const { abilities, actor } = useActor();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'pricing' ? 'pricing' : 'categories';
  const setTab = (t: string) => { const n = new URLSearchParams(params); if (t === 'categories') n.delete('tab'); else n.set('tab', t); setParams(n, { replace: true }); };

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryRecord | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<CategoryRecord | null>(null);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);

  const counts = useMemo(() => {
    const profiles: Record<string, number> = {};
    const active: Record<string, number> = {};
    users.forEach((u) => {
      if (u.membershipCategory) profiles[u.membershipCategory] = (profiles[u.membershipCategory] ?? 0) + 1;
    });
    memberships.forEach((m) => {
      if (m.membershipStatus === 'active') active[m.category] = (active[m.category] ?? 0) + 1;
    });
    return { profiles, active };
  }, [users, memberships]);

  return (
    <div>
      <PageHeader
        title="Membership Categories"
        description="Centrally controlled profile categories shared with the IICA app."
        actions={
          tab === 'categories' ? (
            <Tooltip label={abilities.manageCategories ? '' : RESTRICTED_HINT} side="bottom">
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)} disabled={!abilities.manageCategories}>
                Add Category
              </Button>
            </Tooltip>
          ) : undefined
        }
      />

      <div className="mb-5"><Tabs tabs={[{ key: 'categories', label: 'Categories' }, { key: 'pricing', label: 'Pricing & Currency' }]} active={tab} onChange={setTab} /></div>

      {tab === 'pricing' ? <PricingCurrencyTab /> : (
      <>
      <MembershipPurchaseCard />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Profiles</th>
                <th className="px-4 py-3">Active Memberships</th>
                <th className="px-4 py-3">Catalogue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {sorted.map((c, i) => (
                <tr key={c.id} className="hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetailTarget(c)} className="flex items-center gap-2.5 text-left">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-magenta-50 text-magenta-600">
                        <CategoryIcon name={c.icon} className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-charcoal hover:text-magenta-700">{c.name}</span>
                    </button>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-charcoal-muted">
                    <span className="line-clamp-1">{c.description}</span>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{counts.profiles[c.name] ?? 0}</td>
                  <td className="px-4 py-3 text-charcoal">{counts.active[c.name] ?? 0}</td>
                  <td className="px-4 py-3">
                    {c.catalogueVisible ? <Badge tone="green">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDate(c.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip label="Move up" side="bottom">
                        <button
                          onClick={() => reorderCategory(c.id, 'up', actor)}
                          disabled={i === 0 || !abilities.manageCategories}
                          className="rounded p-1 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Move down" side="bottom">
                        <button
                          onClick={() => reorderCategory(c.id, 'down', actor)}
                          disabled={i === sorted.length - 1 || !abilities.manageCategories}
                          className="rounded p-1 text-charcoal-muted hover:bg-cream-100 hover:text-charcoal disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <DropdownMenu
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => setDetailTarget(c) },
                          { label: 'View Profiles', icon: <UsersIcon className="h-4 w-4" />, onClick: () => navigate(`/admin/users?cat=${encodeURIComponent(c.name)}`) },
                          { divider: true, label: 'd' },
                          {
                            label: 'Edit Description',
                            icon: <Pencil className="h-4 w-4" />,
                            disabled: !abilities.manageCategories,
                            disabledHint: RESTRICTED_HINT,
                            onClick: () => setEditTarget(c),
                          },
                          c.status === 'active'
                            ? {
                                label: 'Deactivate',
                                icon: <Ban className="h-4 w-4" />,
                                danger: true,
                                disabled: !abilities.manageCategories,
                                disabledHint: RESTRICTED_HINT,
                                onClick: () => setDeactivateTarget(c),
                              }
                            : {
                                label: 'Activate',
                                icon: <CheckCircle2 className="h-4 w-4" />,
                                disabled: !abilities.manageCategories,
                                disabledHint: RESTRICTED_HINT,
                                onClick: () => {
                                  setCategoryStatus(c.id, 'active', actor);
                                  toast(`${c.name} activated.`);
                                },
                              },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-cream-200 px-4 py-3 text-xs text-charcoal-muted">
          Categories are centrally managed. Deleting a category assigned to profiles is not permitted — deactivate
          instead to stop new selections while preserving existing assignments.
        </div>
      </div>

      <AddCategoryModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditDescriptionModal category={editTarget} onClose={() => setEditTarget(null)} />
      <DeactivateCategoryModal category={deactivateTarget} usage={deactivateTarget ? categoryUsage(deactivateTarget.name) : 0} onClose={() => setDeactivateTarget(null)} />
      <CategoryDrawer category={detailTarget} counts={counts} onClose={() => setDetailTarget(null)} />
      </>
      )}
    </div>
  );
}

function MembershipPurchaseCard() {
  const { membershipPurchaseConfig } = useData();
  const { abilities, actor } = useActor();
  const [confirm, setConfirm] = useState(false);
  const enabled = membershipPurchaseConfig.membershipPurchaseEnabled;
  const target = !enabled;
  const apply = () => { setMembershipPurchaseEnabled(target, actor); setConfirm(false); toast(target ? 'New membership purchases enabled.' : 'New membership purchases disabled.'); };

  return (
    <div className="card mb-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-charcoal">New Membership Purchases</h3>
            <Badge tone={enabled ? 'green' : 'neutral'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-charcoal-muted">
            {enabled
              ? 'The Mobile App shows “Apply for Membership”, and users with an unpaid IICA ID can complete purchase.'
              : 'New application/purchase entry points are hidden in the Mobile App. Existing IICA IDs and active members are unaffected; normal product, event and donation purchases stay available.'}
          </p>
          <p className="mt-1 text-[11px] text-charcoal-muted">Last updated {formatDate(membershipPurchaseConfig.updatedAt)} · {membershipPurchaseConfig.updatedBy}</p>
        </div>
        <Button
          variant={enabled ? 'danger' : 'primary'}
          onClick={() => setConfirm(true)}
          disabled={!abilities.manageCategories}
          title={abilities.manageCategories ? '' : RESTRICTED_HINT}
        >
          {enabled ? 'Disable Purchases' : 'Enable Purchases'}
        </Button>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title={target ? 'Enable new membership purchases' : 'Disable new membership purchases'}
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant={target ? 'primary' : 'danger'} onClick={apply}>{target ? 'Enable' : 'Disable'}</Button></>}>
        <p className="text-sm text-charcoal">
          {target
            ? 'Re-enable “Apply for Membership” in the Mobile App and allow unpaid IICA IDs to complete purchase?'
            : 'Hide new application and purchase entry points in the Mobile App? Existing IICA IDs, active members and normal product/event/donation purchases are not affected.'}
        </p>
      </Modal>
    </div>
  );
}
