import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureEventParticipant, getOrCreateUserByTelegramId, listSpeakers, upsertSpeaker } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { isAdminTelegramId } from "@/lib/admin";

export const runtime = "nodejs";

const SpeakerSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  photoUrl: z.string().trim().max(300).nullable().optional(),
  topic: z.string().trim().max(200).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  socials: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
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

  return NextResponse.json({ speakers: await listSpeakers(event.id) });
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = SpeakerSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = await getOrCreateUserByTelegramId(auth.telegramId, auth.telegramUser);
  await ensureEventParticipant(event.id, user.id);

  const id = await upsertSpeaker(event.id, {
    id: parsed.data.id,
    name: parsed.data.name,
    photoUrl: parsed.data.photoUrl ?? null,
    topic: parsed.data.topic ?? null,
    bio: parsed.data.bio ?? null,
    socials: parsed.data.socials ?? [],
    sortOrder: parsed.data.sortOrder ?? 0,
  });
  return NextResponse.json({ ok: true, id });
}
