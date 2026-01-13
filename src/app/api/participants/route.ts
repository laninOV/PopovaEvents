import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getOrCreateUserByTelegramId, listParticipants } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const user = await getOrCreateUserByTelegramId(auth.telegramId);
  await ensureEventParticipant(event.id, user.id);

  const q = req.nextUrl.searchParams.get("q");
  const participants = await listParticipants(event.id, { q, limit: 300 });
  return NextResponse.json({ participants });
}
