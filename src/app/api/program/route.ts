import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getOrCreateUserByTelegramId, listSchedule, listSpeakers } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  const speakers = listSpeakers(event.id);
  const schedule = listSchedule(event.id);
  return NextResponse.json({ schedule, speakers });
}

