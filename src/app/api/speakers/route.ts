import { NextRequest, NextResponse } from "next/server";
import { listSpeakers } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  return NextResponse.json({ speakers: await listSpeakers(resolved.ctx.event.id) });
}
