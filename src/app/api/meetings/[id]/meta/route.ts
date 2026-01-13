import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureEventParticipant, getMeetingDetail, getOrCreateUserByTelegramId, updateMeetingMeta } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { getEventForRequest } from "@/lib/getEventForRequest";

export const runtime = "nodejs";

const BodySchema = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId);
  await ensureEventParticipant(event.id, user.id);

  const { id } = await ctx.params;
  const meeting = await getMeetingDetail(event.id, user.id, id);
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await updateMeetingMeta(id, user.id, parsed.data.note ?? null, parsed.data.rating ?? null);
  const updated = await getMeetingDetail(event.id, user.id, id);
  return NextResponse.json({ meeting: updated });
}
