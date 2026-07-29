import { Badge } from './Badge';
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_TONE, PRODUCT_TYPE_LABEL } from '../../config/productLabels';
import type { ProductStatus, ProductType } from '../../types/products';

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => (
  <Badge tone={PRODUCT_STATUS_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</Badge>
);

export const ProductTypeBadge = ({ type }: { type: ProductType }) => (
  <Badge tone="neutral">{PRODUCT_TYPE_LABEL[type]}</Badge>
);
