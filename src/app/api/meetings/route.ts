import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getOrCreateUserByTelegramId, listMeetings } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { getEventForRequest } from "@/lib/getEventForRequest";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  return NextResponse.json({ meetings: listMeetings(event.id, user.id) });
}
