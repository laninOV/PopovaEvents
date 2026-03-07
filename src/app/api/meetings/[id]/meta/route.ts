import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMeetingDetail, updateMeetingMetaForEvent } from "@/lib/dbx";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

const BodySchema = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  plannedAt: z.string().datetime().nullable().optional(),
  plannedPlace: z.string().trim().max(200).nullable().optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { event, user } = resolved.ctx;

  const { id } = await ctx.params;
  const meeting = await getMeetingDetail(event.id, user.id, id);
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await updateMeetingMetaForEvent(
    event.id,
    id,
    user.id,
    parsed.data.note ?? null,
    parsed.data.rating ?? null,
    parsed.data.plannedAt ?? null,
    parsed.data.plannedPlace ?? null,
  );
  const updated = await getMeetingDetail(event.id, user.id, id);
  return NextResponse.json({ meeting: updated });
}
