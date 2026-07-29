import type { MembershipRecord, UserRecord } from '../types/users';
import type {
  CatalogueVisibility,
  PortfolioContent,
  PortfolioRecord,
} from '../types/portfolio';

// --- Eligibility ------------------------------------------------------------
// Portfolio access requires a paid Creator Member with an active membership and
// a valid IICA ID: Account Type = Creator Member + Membership Active + Paid +
// IICA ID. Expired / cancelled / suspended keep their record but lose access.
export function isEligible(user?: UserRecord, membership?: MembershipRecord): boolean {
  if (!user || !membership) return false;
  if (user.accountType !== 'creator') return false;
  if (!membership.iicaId || membership.purchaseStatus !== 'completed') return false;
  return membership.membershipStatus === 'active' || membership.membershipStatus === 'renewal_due';
}

export function catalogueVisibility(
  portfolio: PortfolioRecord,
  user?: UserRecord,
  membership?: MembershipRecord,
): CatalogueVisibility {
  if (!isEligible(user, membership) || portfolio.status !== 'published') return 'ineligible';
  if (portfolio.hiddenFromCatalogue) return 'hidden';
  return 'visible';
}

// --- Completion checklist ---------------------------------------------------

export type Tier = 'required' | 'recommended' | 'optional';
export interface ChecklistItem {
  key: string;
  label: string;
  tier: Tier;
  done: boolean;
}

export function completionChecklist(content: PortfolioContent, hasLocation: boolean, hasCategory: boolean): ChecklistItem[] {
  const socials = content.socials;
  const hasSocial = !!(socials.instagram || socials.facebook || socials.youtube || socials.spotify);
  return [
    { key: 'profileImage', label: 'Profile image', tier: 'required', done: !!content.profileImage },
    { key: 'about', label: 'About', tier: 'required', done: content.about.trim().length > 20 },
    { key: 'category', label: 'Category', tier: 'required', done: hasCategory },
    { key: 'location', label: 'Location', tier: 'required', done: hasLocation },
    { key: 'domain', label: 'At least one domain / skill', tier: 'required', done: content.domains.length + content.skills.length > 0 },
    { key: 'social', label: 'Social links', tier: 'recommended', done: hasSocial },
    { key: 'highlight', label: 'Highlight / timeline', tier: 'recommended', done: content.highlights.length > 0 },
    { key: 'award', label: 'Award', tier: 'recommended', done: content.awards.length > 0 },
    { key: 'watch', label: 'Watch video', tier: 'recommended', done: content.watch.some((w) => !w.hidden) },
    { key: 'gallery', label: 'Gallery', tier: 'optional', done: content.gallery.some((g) => !g.hidden) },
    { key: 'whatsNew', label: "What's New", tier: 'optional', done: content.whatsNew.length > 0 },
    { key: 'collab', label: 'Collaboration information', tier: 'optional', done: content.collaborations.length > 0 },
  ];
}

const TIER_WEIGHT: Record<Tier, number> = { required: 2, recommended: 1.4, optional: 1 };

export function completionPercent(items: ChecklistItem[]): number {
  const total = items.reduce((s, i) => s + TIER_WEIGHT[i.tier], 0);
  const done = items.reduce((s, i) => s + (i.done ? TIER_WEIGHT[i.tier] : 0), 0);
  return Math.round((done / total) * 100);
}

export function requiredComplete(items: ChecklistItem[]): boolean {
  return items.filter((i) => i.tier === 'required').every((i) => i.done);
}

// --- Activity score (system-generated; no manual weights / overrides) -------

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function computeActivityScore(portfolio: PortfolioRecord, hasLocation: boolean): number {
  const c = portfolio.content;
  const completeness = completionPercent(completionChecklist(c, hasLocation, true));
  const visibleWatch = c.watch.filter((w) => !w.hidden && w.linkValid).length;
  const signals = {
    completeness,
    views: clamp(portfolio.profileViews / 25),
    products: clamp(portfolio.activity.productsListed * 10),
    archive: clamp(visibleWatch * 12),
    events: clamp(c.events.length * 20),
    collab: clamp(portfolio.activity.collaborationAttempts * 12),
    recent: portfolio.activity.recentActivity,
  };
  const score =
    signals.completeness * 0.25 +
    signals.views * 0.2 +
    signals.products * 0.1 +
    signals.archive * 0.15 +
    signals.events * 0.1 +
    signals.collab * 0.1 +
    signals.recent * 0.1;
  return Math.round(clamp(score));
}

export function activityBreakdown(portfolio: PortfolioRecord, hasLocation: boolean) {
  const c = portfolio.content;
  const completeness = completionPercent(completionChecklist(c, hasLocation, true));
  const visibleWatch = c.watch.filter((w) => !w.hidden && w.linkValid).length;
  return [
    { key: 'completeness', label: 'Portfolio completeness', value: `${completeness}%`, raw: completeness },
    { key: 'views', label: 'Profile views', value: portfolio.profileViews.toLocaleString('en-IN'), raw: clamp(portfolio.profileViews / 25) },
    { key: 'products', label: 'Products listed', value: String(portfolio.activity.productsListed), raw: clamp(portfolio.activity.productsListed * 10) },
    { key: 'archive', label: 'Archive videos added', value: String(visibleWatch), raw: clamp(visibleWatch * 12) },
    { key: 'events', label: 'Events published', value: String(c.events.length), raw: clamp(c.events.length * 20) },
    { key: 'collab', label: 'Collaboration attempts', value: String(portfolio.activity.collaborationAttempts), raw: clamp(portfolio.activity.collaborationAttempts * 12) },
    { key: 'recent', label: 'Recent platform activity', value: `${portfolio.activity.recentActivity}/100`, raw: portfolio.activity.recentActivity },
  ];
}

// Effective location for catalogue = admin correction if present, else self-reported.
export function effectiveLocation(portfolio: PortfolioRecord, user?: UserRecord): { country: string; state?: string; city: string; corrected: boolean } {
  if (portfolio.locationCorrection) {
    const l = portfolio.locationCorrection;
    return { country: l.country, state: l.state, city: l.city, corrected: true };
  }
  return { country: user?.country ?? '—', city: user?.city ?? '—', corrected: false };
}
