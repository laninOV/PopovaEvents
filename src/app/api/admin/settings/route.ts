import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getChatLinkForEvent, setChatLinkForEvent } from "@/lib/dbx";
import { isAdminTelegramId } from "@/lib/admin";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

const BodySchema = z.object({
  chatLink: z.string().trim().max(500).nullable(),
});

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ chatLink: await getChatLinkForEvent(resolved.ctx.event.id) });
}

export async function PUT(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await setChatLinkForEvent(
    resolved.ctx.event.id,
    parsed.data.chatLink?.trim() ? parsed.data.chatLink.trim() : null,
  );
  return NextResponse.json({ ok: true });
}
