import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listSchedule, upsertScheduleItem } from "@/lib/dbx";
import { isAdminTelegramId } from "@/lib/admin";
import { resolveRequestContext } from "@/lib/requestContext";
import { getDefaultEventTimeZone, localDateTimeToUtcIso } from "@/lib/timezone";

export const runtime = "nodejs";

const ItemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  startsAtLocal: z.string().trim().min(1).max(40),
  endsAtLocal: z.string().trim().max(40).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  speakerId: z.string().trim().min(1).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({
    schedule: await listSchedule(resolved.ctx.event.id),
    eventTimeZone: getDefaultEventTimeZone(),
  });
}

export async function POST(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = ItemSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { event } = resolved.ctx;
  const eventTimeZone = getDefaultEventTimeZone();
  const startsAt = localDateTimeToUtcIso(parsed.data.startsAtLocal, eventTimeZone);
  const endsAt = parsed.data.endsAtLocal?.trim()
    ? localDateTimeToUtcIso(parsed.data.endsAtLocal, eventTimeZone)
    : null;
  if (!startsAt) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (parsed.data.endsAtLocal?.trim() && !endsAt) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const id = await upsertScheduleItem(event.id, {
    id: parsed.data.id,
    startsAt,
    endsAt,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    speakerId: parsed.data.speakerId ?? null,
    location: parsed.data.location ?? null,
    sortOrder: parsed.data.sortOrder ?? 0,
  });
  return NextResponse.json({ ok: true, id });
}
