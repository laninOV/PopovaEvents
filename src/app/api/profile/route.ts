import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureEventParticipant,
  getOrCreateUserByTelegramId,
  getProfileByUserId,
  setBotUserRegistered,
  upsertProfile,
} from "@/lib/db";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { getEventForRequest } from "@/lib/getEventForRequest";

export const runtime = "nodejs";

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().max(40).nullable().optional(),
  instagram: z.string().trim().max(200).nullable().optional(),
  niche: z.string().trim().max(80).nullable().optional(),
  about: z.string().trim().max(300).nullable().optional(),
  helpful: z.string().trim().max(300).nullable().optional(),
  photoUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://"), {
      message: "Invalid photoUrl",
    })
    .nullable()
    .optional(),
});

export function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  const profile = getProfileByUserId(user.id);
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  const profile = upsertProfile(user.id, {
    ...parsed.data,
    lastName: parsed.data.lastName ?? null,
    instagram: parsed.data.instagram ?? null,
    niche: parsed.data.niche ?? null,
    about: parsed.data.about ?? null,
    helpful: parsed.data.helpful ?? null,
    photoUrl: parsed.data.photoUrl ?? null,
  });
  setBotUserRegistered(auth.telegramId);
  return NextResponse.json({ ok: true, profile });
}
