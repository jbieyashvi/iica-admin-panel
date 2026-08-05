import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { youtubeThumbnail } from '../../lib/youtube';
import { cn } from '../../lib/cn';

// YouTube thumbnail with a graceful fallback when the image is unavailable.
export function YtThumb({ videoId, className }: { videoId: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={cn('relative flex items-center justify-center overflow-hidden rounded-md bg-cream-100', className)}>
      {broken ? (
        <PlayCircle className="h-4 w-4 text-charcoal-muted" />
      ) : (
        <img
          src={youtubeThumbnail(videoId)}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
}
