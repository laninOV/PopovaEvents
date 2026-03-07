import { NextRequest, NextResponse } from "next/server";
import { getMeetingDetail } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  const { event, user } = resolved.ctx;

  const { id } = await ctx.params;
  const meeting = await getMeetingDetail(event.id, user.id, id);
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ meeting });
}
