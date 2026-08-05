// ---------------------------------------------------------------------------
// New Music — YouTube submissions curated for the Mobile App "New Music Today"
// Home section. Content SELECTION only (Featured / Not Featured), never a
// moderation-status workflow. Managed inside Home & App Content → New Music.
// ---------------------------------------------------------------------------

export interface MusicSubmission {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
  connectedUserId?: string | null; // linked IICA user, when the submitter has an account
  submittedByName: string;
  city: string;
  country: string;
  submittedAt: string;
  featured: boolean;       // Featured on Home
  featuredAt?: string | null;
  displayOrder: number;    // order among featured items on the Mobile Home
  source: 'submission' | 'admin'; // admin = added directly by an Admin as a featured item
}
