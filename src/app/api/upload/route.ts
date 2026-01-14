import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuthFromRequest } from "@/lib/telegramAuth";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) return NextResponse.json({ error: "unsupported_type" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `profiles/${crypto.randomUUID()}.${ext}`;
  const blob = await put(name, bytes, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
