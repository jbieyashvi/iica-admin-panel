import type { MusicSubmission } from '../types/newmusic';
import { youtubeThumbnail } from '../lib/youtube';

// Prototype New Music submissions. Video IDs are plausible 11-char YouTube IDs.
interface Row {
  id: string;
  videoId: string;
  connectedUserId?: string;
  name: string;
  city: string;
  country: string;
  daysAgo: number;
  featured?: number | null; // display order if featured, else undefined
}

const ROWS: Row[] = [
  { id: 'music_1', videoId: 'dQw4w9WgXcQ', connectedUserId: 'usr_ananya', name: 'Ananya Rao', city: 'Mumbai', country: 'India', daysAgo: 3, featured: 0 },
  { id: 'music_2', videoId: 'kJQP7kiw5Fk', connectedUserId: 'usr_nikhil', name: 'Nikhil Kapoor', city: 'Mumbai', country: 'India', daysAgo: 5, featured: 1 },
  { id: 'music_3', videoId: '3JZ_D3ELwOQ', connectedUserId: 'usr_james', name: 'James Carter', city: 'London', country: 'United Kingdom', daysAgo: 8, featured: 2 },
  { id: 'music_4', videoId: 'OPf0YbXqDm0', connectedUserId: 'usr_nisha', name: 'Nisha Reddy', city: 'Bengaluru', country: 'India', daysAgo: 2 },
  { id: 'music_5', videoId: 'RgKAFK5djSk', name: 'Ishaan Verma', city: 'Pune', country: 'India', daysAgo: 11 },
  { id: 'music_6', videoId: 'fJ9rUzIMcZQ', connectedUserId: 'usr_sophia', name: 'Sophia Nguyen', city: 'New York', country: 'United States', daysAgo: 14 },
  { id: 'music_7', videoId: 'e-ORhEE9VVg', name: 'Tara Kapadia', city: 'Ahmedabad', country: 'India', daysAgo: 1 },
];

export function buildMusicSubmissions(now: number): MusicSubmission[] {
  const day = 86400000;
  return ROWS.map((r) => {
    const submittedAt = new Date(now - r.daysAgo * day).toISOString();
    const featured = r.featured != null;
    return {
      id: r.id,
      youtubeUrl: `https://www.youtube.com/watch?v=${r.videoId}`,
      youtubeVideoId: r.videoId,
      thumbnailUrl: youtubeThumbnail(r.videoId),
      connectedUserId: r.connectedUserId ?? null,
      submittedByName: r.name,
      city: r.city,
      country: r.country,
      submittedAt,
      featured,
      featuredAt: featured ? new Date(now - (r.daysAgo - 1) * day).toISOString() : null,
      displayOrder: r.featured ?? 0,
      source: 'submission',
    };
  });
}
