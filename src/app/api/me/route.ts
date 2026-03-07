import { NextRequest, NextResponse } from "next/server";
import { getProfileByUserId, getStats } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const { event, user } = resolved.ctx;
  const [profile, stats] = await Promise.all([getProfileByUserId(user.id), getStats(event.id, user.id)]);

  return NextResponse.json({
    event: { slug: event.slug, name: event.name },
    user: { publicId: user.publicId },
    profile: profile ? { displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") } : null,
    stats,
  });
}
