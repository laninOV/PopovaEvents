import { NextRequest, NextResponse } from "next/server";
import { getChatLinkForEvent, getProfileByUserId, getStats, listMeetings } from "@/lib/dbx";
import type { BootstrapResponse } from "@/lib/bootstrap";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const { event, user } = resolved.ctx;

  const [profile, stats, meetings, chatLink] = await Promise.all([
    getProfileByUserId(user.id),
    getStats(event.id, user.id),
    listMeetings(event.id, user.id),
    getChatLinkForEvent(event.id),
  ]);

  const payload: BootstrapResponse = {
    event: { slug: event.slug, name: event.name },
    user: { publicId: user.publicId },
    profile,
    stats,
    meetingsPreview: meetings.slice(0, 3),
    chatLink,
  };

  return NextResponse.json(payload);
}
