import crypto from "node:crypto";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function signQrPayload(eventSlug: string, publicId: string, ts: number, secret: string) {
  const data = `${eventSlug}:${publicId}:${ts}`;
  const sig = base64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `pe:${eventSlug}:${publicId}:${ts}:${sig}`;
}

export function parseAndVerifyQrPayload(
  code: string,
  opts: { secret: string; maxAgeSeconds: number; allowUnsigned: boolean; defaultEventSlug: string },
): { ok: true; eventSlug: string; publicId: string } | { ok: false; error: string } {
  const trimmed = code.trim();
  const normalized = trimmed.startsWith("popovaevents:") ? trimmed.slice("popovaevents:".length) : trimmed;
  const withoutPrefix = normalized.startsWith("pe:") ? normalized.slice(3) : normalized;

  const parts = withoutPrefix.split(":").filter(Boolean);
  if (parts.length === 1) {
    if (!opts.allowUnsigned) return { ok: false, error: "unsigned_qr_disabled" };
    return { ok: true, eventSlug: opts.defaultEventSlug, publicId: parts[0] };
  }

  if (parts.length === 2) {
    if (!opts.allowUnsigned) return { ok: false, error: "unsigned_qr_disabled" };
    return { ok: true, eventSlug: parts[0], publicId: parts[1] };
  }

  if (parts.length < 4) return { ok: false, error: "bad_code" };
  const [eventSlug, publicId, tsStr, sig] = parts;
  if (!opts.secret) return { ok: false, error: "missing_qr_secret" };
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || ts <= 0) return { ok: false, error: "bad_code" };

  const ageSeconds = Math.abs(Date.now() - ts) / 1000;
  if (ageSeconds > opts.maxAgeSeconds) return { ok: false, error: "expired" };

  const expected = signQrPayload(eventSlug, publicId, ts, opts.secret).split(":").pop()!;
  if (!timingSafeEqual(expected, sig)) return { ok: false, error: "bad_signature" };

  return { ok: true, eventSlug, publicId };
}
