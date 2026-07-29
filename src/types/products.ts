import type { InternalNote, TimelineEvent } from './users';

// ---------------------------------------------------------------------------
// Products & Product Categories. Sellers are existing creator users (by ID).
// ---------------------------------------------------------------------------

export type ProductType = 'masterclass' | 'digital' | 'physical';

export type ProductStatus =
  | 'draft'
  | 'awaiting_review'
  | 'changes_requested'
  | 'published'
  | 'out_of_stock'
  | 'hidden'
  | 'archived';

export type ProductCategoryStatus = 'active' | 'inactive';

export interface ProductCategoryRecord {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  status: ProductCategoryStatus;
  createdAt: string;
}

// Type-specific detail blocks.
export interface PhysicalDetails {
  sku: string;
  stock: number;
  lowStockThreshold: number;
  weight: string;
  dimensions: string;
  shippingOrigin: string;
  dispatchTimeline: string;
  returnPolicy: string;
}

export interface MasterclassDetails {
  sessionAt: string;
  timezone: string;
  durationMins: number;
  capacity: number;
  seatsBooked: number;
  deliveryMode: string;
  deliveryInstructions: string;
}

export interface DigitalDetails {
  digitalFormat: string;
  availability: string;
  deliveryTime: string;
  deliveryInstructions: string;
}

export interface ProductRecord {
  id: string;
  sellerUserId: string;
  sellerName: string;
  sellerIicaId?: string;
  type: ProductType;
  category: string;
  title: string;
  description: string;
  images: string[];
  price: number; // 0 = Free
  discountPrice?: number | null;
  currency: string;
  status: ProductStatus;
  createdAt: string;
  lastUpdatedAt: string;
  timeline: TimelineEvent[];
  notes: InternalNote[];
  physical?: PhysicalDetails;
  masterclass?: MasterclassDetails;
  digital?: DigitalDetails;
}
