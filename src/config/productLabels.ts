import type { ProductStatus, ProductType } from '../types/products';

type Tone = 'neutral' | 'magenta' | 'green' | 'amber' | 'red' | 'blue';

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  masterclass: 'Masterclass',
  digital: 'Digital Product',
  physical: 'Physical Product',
};

export const PRODUCT_TYPES: ProductType[] = ['masterclass', 'digital', 'physical'];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  awaiting_review: 'Awaiting Review',
  changes_requested: 'Changes Requested',
  published: 'Published',
  out_of_stock: 'Out of Stock',
  hidden: 'Hidden',
  archived: 'Archived',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, Tone> = {
  draft: 'blue',
  awaiting_review: 'amber',
  changes_requested: 'red',
  published: 'green',
  out_of_stock: 'amber',
  hidden: 'neutral',
  archived: 'neutral',
};

export const PRODUCT_STATUSES: ProductStatus[] = [
  'draft',
  'awaiting_review',
  'changes_requested',
  'published',
  'out_of_stock',
  'hidden',
  'archived',
];

// Platform commission by type (all provisional / pending final approval).
export const COMMISSION_RATE: Record<ProductType, number> = {
  masterclass: 0.2,
  digital: 0.1,
  physical: 0.15,
};

export const COMMISSION_NOTE: Record<ProductType, string> = {
  masterclass: '20% proposed commission — pending final approval',
  digital: '10% provisional commission — not final',
  physical: '15% provisional commission — not final',
};
