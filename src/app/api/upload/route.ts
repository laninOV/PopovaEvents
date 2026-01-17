import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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

  const arrayBuffer = await file.arrayBuffer();
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const blobToken =
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim() ||
    undefined;

  // Prefer Vercel Blob (works reliably on Vercel), fallback to local disk for dev.
  const isVercel = process.env.VERCEL === "1";
  if (isVercel && !blobToken) {
    return NextResponse.json({ error: "missing_blob_token" }, { status: 500 });
  }

  if (blobToken || isVercel) {
    try {
      const key = `profiles/${auth.telegramId}/${fileName}`;
      const blob = await put(key, arrayBuffer, { access: "public", contentType: file.type, token: blobToken });
      return NextResponse.json({ url: blob.url });
    } catch (e) {
      console.error("Upload to Vercel Blob failed:", e);
      if (isVercel) return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(arrayBuffer));
  return NextResponse.json({ url: `/uploads/${fileName}` });
}
