import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;
  const { event, user } = resolved.ctx;

  return NextResponse.json({
    event: { slug: event.slug, name: event.name },
    stats: await getStats(event.id, user.id),
  });
}
