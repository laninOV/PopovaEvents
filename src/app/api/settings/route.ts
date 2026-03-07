import { NextRequest, NextResponse } from "next/server";
import { getChatLinkForEvent } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  return NextResponse.json({ chatLink: await getChatLinkForEvent(resolved.ctx.event.id) });
}
