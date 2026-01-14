import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getOrCreateUserByTelegramId } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { signQrPayload } from "@/lib/qr";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = await getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const secret = process.env.QR_SECRET?.trim();
  const allowUnsigned = process.env.ALLOW_UNSIGNED_QR === "1";

  const user = await getOrCreateUserByTelegramId(auth.telegramId);
  await ensureEventParticipant(event.id, user.id);

  if (!secret) {
    if (!allowUnsigned) return NextResponse.json({ error: "missing_qr_secret" }, { status: 500 });
    const payload = `pe:${event.slug}:${user.publicId}`;
    return NextResponse.json({ payload, ts: null });
  }

  const ts = Date.now();
  const payload = signQrPayload(event.slug, user.publicId, ts, secret);
  return NextResponse.json({ payload, ts });
}
