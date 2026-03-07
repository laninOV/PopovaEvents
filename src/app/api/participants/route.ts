import { NextRequest, NextResponse } from "next/server";
import { listParticipants } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  const { event } = resolved.ctx;

  const q = req.nextUrl.searchParams.get("q");
  const participants = await listParticipants(event.id, { q, limit: 300 });
  return NextResponse.json({ participants });
}
