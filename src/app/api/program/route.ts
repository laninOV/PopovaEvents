import { NextRequest, NextResponse } from "next/server";
import { listSchedule, listSpeakers } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  const { event } = resolved.ctx;

  const [speakers, schedule] = await Promise.all([listSpeakers(event.id), listSchedule(event.id)]);
  return NextResponse.json({ schedule, speakers, serverNow: new Date().toISOString() });
}
