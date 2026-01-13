import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getMeetingDetail, getOrCreateUserByTelegramId } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { getEventForRequest } from "@/lib/getEventForRequest";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId);
  await ensureEventParticipant(event.id, user.id);

  const { id } = await ctx.params;
  const meeting = await getMeetingDetail(event.id, user.id, id);
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ meeting });
}
