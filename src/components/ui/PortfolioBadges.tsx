import { Badge } from './Badge';
import {
  PORTFOLIO_STATUS_LABEL,
  PORTFOLIO_STATUS_TONE,
  VISIBILITY_LABEL,
  VISIBILITY_TONE,
  CATEGORY_STATUS_LABEL,
  CATEGORY_STATUS_TONE,
} from '../../config/portfolioLabels';
import type { CatalogueVisibility, CategoryStatus, PortfolioStatus } from '../../types/portfolio';

export function PortfolioStatusBadge({ status }: { status: PortfolioStatus }) {
  return <Badge tone={PORTFOLIO_STATUS_TONE[status]}>{PORTFOLIO_STATUS_LABEL[status]}</Badge>;
}
export function VisibilityBadge({ visibility }: { visibility: CatalogueVisibility }) {
  return <Badge tone={VISIBILITY_TONE[visibility]}>{VISIBILITY_LABEL[visibility]}</Badge>;
}
export function CategoryStatusBadge({ status }: { status: CategoryStatus }) {
  return <Badge tone={CATEGORY_STATUS_TONE[status]}>{CATEGORY_STATUS_LABEL[status]}</Badge>;
}
