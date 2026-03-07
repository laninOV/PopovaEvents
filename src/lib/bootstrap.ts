import type { DbMeetingListItem, DbProfile } from "@/lib/db";

export type BootstrapResponse = {
  event: { slug: string; name: string };
  user: { publicId: string };
  profile: DbProfile | null;
  stats: { meetingsCount: number; ratedCount: number; avgRating: number | null; notesCount: number };
  meetingsPreview: DbMeetingListItem[];
  chatLink: string | null;
};
