import { NextRequest, NextResponse } from "next/server";
import { isAdminTelegramId } from "@/lib/admin";
import { listAdminProfiles } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  if (!isAdminTelegramId(resolved.ctx.auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { event } = resolved.ctx;

  const q = req.nextUrl.searchParams.get("q");
  const profiles = await listAdminProfiles(event.id, { q, limit: 1000 });
  return NextResponse.json({ profiles });
}
