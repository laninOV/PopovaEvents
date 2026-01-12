import { NextRequest, NextResponse } from "next/server";
import { deleteSpeaker, ensureEventParticipant, getOrCreateUserByTelegramId } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { isAdminTelegramId } from "@/lib/admin";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  const { id } = await ctx.params;
  deleteSpeaker(event.id, id);
  return NextResponse.json({ ok: true });
}

