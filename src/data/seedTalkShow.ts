import type { TalkShowEpisode, GuestResume } from '../types/talkshow';
import { youtubeThumbnail } from '../lib/youtube';

interface EpRow {
  id: string;
  title: string;
  description: string;
  host: string;
  guest: string;
  videoId: string;
  daysAgo: number;
  featured?: boolean;
  order: number;
}

const EPISODES: EpRow[] = [
  { id: 'ep_1', title: 'The Craft of Indian Songwriting', description: 'Nikhil Kapoor on turning ragas into modern songs, and writing for film.', host: 'Aparna Menon', guest: 'Nikhil Kapoor', videoId: 'kJQP7kiw5Fk', daysAgo: 4, featured: true, order: 0 },
  { id: 'ep_2', title: 'Movement & Discipline', description: 'Meera Kulkarni on building a yoga practice that lasts a lifetime.', host: 'Aparna Menon', guest: 'Meera Kulkarni', videoId: '3JZ_D3ELwOQ', daysAgo: 12, order: 1 },
  { id: 'ep_3', title: 'Behind the Canvas', description: 'Ananya Rao on colour, commissions and creative burnout.', host: 'Rohan Desai', guest: 'Ananya Rao', videoId: 'OPf0YbXqDm0', daysAgo: 20, order: 2 },
];

export function buildTalkShowEpisodes(now: number): TalkShowEpisode[] {
  const day = 86400000;
  return EPISODES.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    host: e.host,
    featuredGuest: e.guest,
    youtubeUrl: `https://www.youtube.com/watch?v=${e.videoId}`,
    youtubeVideoId: e.videoId,
    thumbnailUrl: youtubeThumbnail(e.videoId),
    releaseDate: new Date(now - e.daysAgo * day).toISOString(),
    featuredThisWeek: !!e.featured,
    displayOrder: e.order,
    createdAt: new Date(now - e.daysAgo * day).toISOString(),
    updatedAt: new Date(now - e.daysAgo * day).toISOString(),
  }));
}

interface ResumeRow {
  id: string;
  type: GuestResume['applicantType'];
  userId?: string;
  name: string;
  fileName: string;
  sizeKb: number;
  daysAgo: number;
  available: boolean;
}

const RESUMES: ResumeRow[] = [
  { id: 'res_1', type: 'creator', userId: 'usr_meera', name: 'Meera Kulkarni', fileName: 'meera-kulkarni-resume.pdf', sizeKb: 248, daysAgo: 3, available: true },
  { id: 'res_2', type: 'registered', userId: 'usr_nisha', name: 'Nisha Reddy', fileName: 'nisha-reddy-profile.pdf', sizeKb: 512, daysAgo: 5, available: false },
  { id: 'res_3', type: 'guest', name: 'Rahul Menon', fileName: 'rahul-menon-cv.pdf', sizeKb: 190, daysAgo: 9, available: true },
  { id: 'res_4', type: 'creator', userId: 'usr_ananya', name: 'Ananya Rao', fileName: 'ananya-rao-portfolio.pdf', sizeKb: 1340, daysAgo: 14, available: true },
];

export function buildGuestResumes(now: number): GuestResume[] {
  const day = 86400000;
  return RESUMES.map((r) => ({
    id: r.id,
    applicantType: r.type,
    connectedUserId: r.userId ?? null,
    applicantName: r.name,
    fileName: r.fileName,
    fileSizeKb: r.sizeKb,
    submittedAt: new Date(now - r.daysAgo * day).toISOString(),
    fileAvailable: r.available,
  }));
}
