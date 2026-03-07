import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetProgramDataForEvent } from "@/lib/dbx";
import { isAdminTelegramId } from "@/lib/admin";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

const ResetSchema = z.object({
  confirm: z.literal("RESET_PROGRAM_DATA"),
});

export async function POST(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = ResetSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await resetProgramDataForEvent(resolved.ctx.event.id);
  return NextResponse.json({ ok: true });
}
