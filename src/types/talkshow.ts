// ---------------------------------------------------------------------------
// Talk Show — curated YouTube episodes for the Mobile App, plus Guest Artist
// résumé submissions. Managed inside Home & App Content → Talk Show.
// ---------------------------------------------------------------------------

export interface TalkShowEpisode {
  id: string;
  title: string;
  description: string;
  host: string;
  featuredGuest: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  releaseDate: string;
  featuredThisWeek: boolean; // normally exactly one episode is featured
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ResumeApplicantType = 'guest' | 'registered' | 'creator';

// Only file metadata is preserved in the prototype — the actual PDF is not
// re-created after refresh (documented cross-repository limitation).
export interface GuestResume {
  id: string;
  applicantType: ResumeApplicantType;
  connectedUserId?: string | null;
  applicantName: string;
  fileName: string;
  fileSizeKb: number;
  sourceEpisodeId?: string | null;
  sourceEpisodeTitle?: string | null;
  submittedAt: string;
  fileAvailable: boolean; // false = prototype-only metadata, PDF unavailable
}
