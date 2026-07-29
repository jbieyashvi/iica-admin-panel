import { Star } from 'lucide-react';

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
