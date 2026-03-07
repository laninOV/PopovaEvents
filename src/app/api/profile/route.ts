import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProfileByUserId, setBotUserRegistered, upsertProfile } from "@/lib/db";
import { resolveRequestContext } from "@/lib/requestContext";

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

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const profile = await getProfileByUserId(resolved.ctx.user.id);
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const json = await req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { auth, user } = resolved.ctx;

  const telegramPhotoUrl =
    auth.telegramUser &&
    typeof auth.telegramUser === "object" &&
    "photo_url" in auth.telegramUser &&
    typeof (auth.telegramUser as { photo_url?: unknown }).photo_url === "string"
      ? (auth.telegramUser as { photo_url: string }).photo_url
      : null;

  const effectivePhotoUrl = parsed.data.photoUrl ?? telegramPhotoUrl ?? null;

  const profile = await upsertProfile(user.id, {
    ...parsed.data,
    lastName: parsed.data.lastName ?? null,
    instagram: parsed.data.instagram ?? null,
    niche: parsed.data.niche ?? null,
    about: parsed.data.about ?? null,
    helpful: parsed.data.helpful ?? null,
    photoUrl: effectivePhotoUrl,
  });

  await setBotUserRegistered(auth.telegramId);
  return NextResponse.json({ ok: true, profile });
}
