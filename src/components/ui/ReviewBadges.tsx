import { Star } from 'lucide-react';
import { Badge } from './Badge';
import {
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  TESTIMONIAL_STATUS_LABEL,
  TESTIMONIAL_STATUS_TONE,
} from '../../config/reviewLabels';
import type { ReviewStatus, TestimonialStatus } from '../../types/reviews';

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={REVIEW_STATUS_TONE[status]}>{REVIEW_STATUS_LABEL[status]}</Badge>;
}

export function TestimonialStatusBadge({ status }: { status: TestimonialStatus }) {
  return <Badge tone={TESTIMONIAL_STATUS_TONE[status]}>{TESTIMONIAL_STATUS_LABEL[status]}</Badge>;
}

export function StarRating({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${px} ${n <= value ? 'fill-amber-400 text-amber-400' : 'fill-cream-200 text-cream-200'}`}
        />
      ))}
    </span>
  );
}
