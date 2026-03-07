import { NextRequest, NextResponse } from "next/server";
import { isAdminTelegramId } from "@/lib/admin";
import { getAdminDbStatus } from "@/lib/dbx";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isAdminTelegramId(auth.telegramId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json(await getAdminDbStatus());
}
