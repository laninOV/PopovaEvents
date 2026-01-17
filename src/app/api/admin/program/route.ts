import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureEventParticipant,
  getOrCreateUserByTelegramId,
  listSchedule,
  upsertScheduleItem,
} from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { isAdminTelegramId } from "@/lib/admin";

export const runtime = "nodejs";

const ItemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  startsAt: z.string().trim().min(1).max(40),
  endsAt: z.string().trim().max(40).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  speakerId: z.string().trim().min(1).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId, auth.telegramUser);
  await ensureEventParticipant(event.id, user.id);

  return NextResponse.json({ schedule: await listSchedule(event.id) });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = ItemSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId, auth.telegramUser);
  await ensureEventParticipant(event.id, user.id);

  const id = await upsertScheduleItem(event.id, {
    id: parsed.data.id,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    speakerId: parsed.data.speakerId ?? null,
    location: parsed.data.location ?? null,
    sortOrder: parsed.data.sortOrder ?? 0,
  });
  return NextResponse.json({ ok: true, id });
}
