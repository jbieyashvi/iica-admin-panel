// YouTube URL parsing + thumbnail helpers (prototype, client-side only).

const PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
];

/** Extract the 11-char video ID, or null if the URL is not a valid YouTube link. */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  for (const re of PATTERNS) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  // Bare 11-char ID
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
