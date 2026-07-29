import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ImageIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StarRating } from '../../components/ui/ReviewBadges';
import { useActor } from '../../lib/useActor';
import { RESTRICTED_HINT } from '../../lib/abilities';
import { formatDate } from '../../lib/format';
import {
  REVIEW_TYPE_LABEL,
  REVIEW_SOURCE_LABEL,
  relatedItemRoute,
  relatedItemLabel,
  maskEmail,
} from '../../config/reviewLabels';
import type { ReviewRecord } from '../../types/reviews';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-200 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-charcoal-muted">{label}</span>
      <span className="text-right text-sm font-medium text-charcoal">{children}</span>
    </div>
  );
}

export function ReviewDrawer({
  review,
  onClose,
  onDelete,
}: {
  review: ReviewRecord | null;
  onClose: () => void;
  onDelete: (r: ReviewRecord) => void;
}) {
  const navigate = useNavigate();
  const { abilities } = useActor();
  if (!review) return null;
  const canDelete = abilities.reviewsModerate;
  const isGuest = review.reviewerType === 'guest';

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(relatedItemRoute(review.type, review.targetId))}>{relatedItemLabel(review.type)}</Button>
      <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} disabled={!canDelete} title={canDelete ? '' : RESTRICTED_HINT} onClick={() => onDelete(review)}>Delete Review</Button>
    </>
  );

  return (
    <Drawer open={!!review} onClose={onClose} title="Review Details" description={review.id} width="lg" footer={footer}>
      <div className="space-y-5">
        <div className="rounded-lg border border-cream-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <StarRating value={review.rating} size="md" />
            <Badge tone="magenta">{REVIEW_TYPE_LABEL[review.type]}</Badge>
          </div>
          {review.title && <p className="font-medium text-charcoal">{review.title}</p>}
          <p className="mt-1 text-sm text-charcoal">{review.body}</p>
        </div>

        {review.images.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Review Images</p>
            <div className="flex gap-2">
              {review.images.map((img) => (
                <span key={img} className="flex h-16 w-16 items-center justify-center rounded-lg border border-cream-200 bg-cream-100 text-charcoal-muted"><ImageIcon className="h-5 w-5" /></span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Reviewer</p>
          <Row label="Name">{review.reviewerName}{isGuest && <Badge tone="neutral" className="ml-2">Guest</Badge>}</Row>
          <Row label="Reviewer type">{isGuest ? 'Guest' : 'Registered User'}</Row>
          {isGuest ? (
            <Row label="Email">{maskEmail(review.reviewerEmail)}</Row>
          ) : (
            review.reviewerUserId && (
              <div className="pt-2">
                <Button size="sm" variant="secondary" icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate(`/admin/users/${review.reviewerUserId}`)}>Open User Profile</Button>
              </div>
            )
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Review Target</p>
          <Row label="Review ID">{review.id}</Row>
          <Row label="Review type">{REVIEW_TYPE_LABEL[review.type]}</Row>
          <Row label="Related item">{review.targetName}</Row>
          <Row label="Submitted">{formatDate(review.submittedAt)}</Row>
          <div className="pt-2">
            <Button size="sm" variant="secondary" icon={<ExternalLink className="h-4 w-4" />} onClick={() => navigate(relatedItemRoute(review.type, review.targetId))}>{relatedItemLabel(review.type)}</Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Source Context</p>
          <Row label={REVIEW_SOURCE_LABEL[review.source.kind]}>{review.source.id}</Row>
          <p className="pt-2 text-xs text-charcoal-muted">Reviews are visible immediately and need no approval. Admin can only view or delete them.</p>
        </div>
      </div>
    </Drawer>
  );
}
