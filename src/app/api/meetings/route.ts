import { NextRequest, NextResponse } from "next/server";
import { listMeetings } from "@/lib/db";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const { event, user } = resolved.ctx;
  return NextResponse.json({ meetings: await listMeetings(event.id, user.id) });
}
