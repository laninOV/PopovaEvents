import { NextRequest, NextResponse } from "next/server";
import { signQrPayload } from "@/lib/qr";
import { resolveRequestContext } from "@/lib/requestContext";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = await resolveRequestContext(req);
  if (!resolved.ok) return resolved.response;

  const secret = process.env.QR_SECRET?.trim();
  const allowUnsigned = process.env.ALLOW_UNSIGNED_QR === "1";
  const { event, user } = resolved.ctx;

  if (!secret) {
    if (!allowUnsigned) return NextResponse.json({ error: "missing_qr_secret" }, { status: 500 });
    const payload = `pe:${event.slug}:${user.publicId}`;
    return NextResponse.json({ payload, ts: null });
  }

  const ts = Date.now();
  const payload = signQrPayload(event.slug, user.publicId, ts, secret);
  return NextResponse.json({ payload, ts });
}
