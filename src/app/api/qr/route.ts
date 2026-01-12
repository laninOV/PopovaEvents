import { NextRequest, NextResponse } from "next/server";
import { ensureEventParticipant, getOrCreateUserByTelegramId } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { signQrPayload } from "@/lib/qr";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const event = getEventForRequest(req);
  if (!event) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  const secret = process.env.QR_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "missing_qr_secret" }, { status: 500 });

  const user = getOrCreateUserByTelegramId(auth.telegramId);
  ensureEventParticipant(event.id, user.id);

  const ts = Date.now();
  const payload = signQrPayload(event.slug, user.publicId, ts, secret);
  return NextResponse.json({ payload, ts });
}

