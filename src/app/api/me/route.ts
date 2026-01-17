import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { ensureEventParticipant, getOrCreateUserByTelegramId, getProfileByUserId, getStats } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId, auth.telegramUser);
  await ensureEventParticipant(event.id, user.id);

  const profile = await getProfileByUserId(user.id);
  const stats = await getStats(event.id, user.id);

  return NextResponse.json({
    event: { slug: event.slug, name: event.name },
    user: { publicId: user.publicId },
    profile: profile ? { displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") } : null,
    stats,
  });
}
