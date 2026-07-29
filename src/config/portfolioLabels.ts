import type { CatalogueVisibility, CategoryStatus, PortfolioStatus } from '../types/portfolio';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  submitted: 'Submitted',
  changes_requested: 'Changes Requested',
  published: 'Published',
  archived: 'Archived',
};

export const PORTFOLIO_STATUS_TONE: Record<PortfolioStatus, Tone> = {
  not_started: 'neutral',
  draft: 'blue',
  submitted: 'amber',
  changes_requested: 'red',
  published: 'green',
  archived: 'neutral',
};

export const VISIBILITY_LABEL: Record<CatalogueVisibility, string> = {
  visible: 'Visible',
  hidden: 'Hidden',
  ineligible: 'Ineligible',
};

export const VISIBILITY_TONE: Record<CatalogueVisibility, Tone> = {
  visible: 'green',
  hidden: 'amber',
  ineligible: 'neutral',
};

export const CATEGORY_STATUS_LABEL: Record<CategoryStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const CATEGORY_STATUS_TONE: Record<CategoryStatus, Tone> = {
  active: 'green',
  inactive: 'neutral',
};

export const PORTFOLIO_STATUSES: PortfolioStatus[] = [
  'not_started',
  'draft',
  'submitted',
  'changes_requested',
  'published',
  'archived',
];

export const VISIBILITIES: CatalogueVisibility[] = ['visible', 'hidden', 'ineligible'];
