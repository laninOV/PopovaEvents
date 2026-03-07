import { NextRequest, NextResponse } from "next/server";
import { deleteSpeaker } from "@/lib/dbx";
import { isAdminTelegramId } from "@/lib/admin";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await deleteSpeaker(resolved.ctx.event.id, id);
  return NextResponse.json({ ok: true });
}
