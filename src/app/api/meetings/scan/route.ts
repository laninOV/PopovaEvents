import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrGetMeeting,
  ensureDefaultEvent,
  ensureEventBySlug,
  ensureEventParticipant,
  getMeetingDetail,
  getOrCreateUserForEvent,
  isEventNotConfiguredError,
} from "@/lib/dbx";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { getDefaultEventSlug } from "@/lib/eventContext";
import { parseAndVerifyQrPayload } from "@/lib/qr";

export const runtime = "nodejs";

const BodySchema = z.object({
  code: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const allowUnsigned = process.env.ALLOW_UNSIGNED_QR === "1";
  const secret = process.env.QR_SECRET?.trim() ?? "";
  const defaultSlug = getDefaultEventSlug();
  const verified = parseAndVerifyQrPayload(parsed.data.code, {
    secret,
    maxAgeSeconds: 60 * 60 * 24 * 7,
    allowUnsigned,
    defaultEventSlug: defaultSlug,
  });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });
  if (verified.publicId.length < 8) return NextResponse.json({ error: "bad_code" }, { status: 400 });

  let event: Awaited<ReturnType<typeof ensureDefaultEvent>> | null;
  try {
    event =
      verified.eventSlug === defaultSlug ? await ensureDefaultEvent() : await ensureEventBySlug(verified.eventSlug);
  } catch (error) {
    if (isEventNotConfiguredError(error)) {
      return NextResponse.json({ error: "event_not_configured" }, { status: 404 });
    }
    throw error;
  }
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  let user: Awaited<ReturnType<typeof getOrCreateUserForEvent>>;
  try {
    user = await getOrCreateUserForEvent(event.id, auth.telegramId, auth.telegramUser);
    await ensureEventParticipant(event.id, user.id);
  } catch (error) {
    if (isEventNotConfiguredError(error)) {
      return NextResponse.json({ error: "event_not_configured" }, { status: 404 });
    }
    throw error;
  }

  const result = await createOrGetMeeting(event.id, user.id, verified.publicId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const detail = await getMeetingDetail(event.id, user.id, result.meetingId);
  return NextResponse.json({ meeting: detail, created: result.created });
}
