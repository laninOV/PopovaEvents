import { NextRequest, NextResponse } from "next/server";
import type { DbUser } from "@/lib/db";
import { ensureEventParticipant, getOrCreateUserByTelegramId } from "@/lib/db";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export type RequestContext = {
  auth: { telegramId: string; telegramUser: unknown | null };
  event: { id: string; slug: string; name: string; status: string };
  user: DbUser;
};

type RequestContextResult =
  | { ok: true; ctx: RequestContext }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function resolveRequestContext(req: NextRequest): Promise<RequestContextResult> {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return { ok: false, response: NextResponse.json({ error: auth.error }, { status: 401 }) };

  const event = await getEventForRequest(req);
  if (!event) return { ok: false, response: NextResponse.json({ error: "event_not_found" }, { status: 404 }) };

  const user = await getOrCreateUserByTelegramId(auth.telegramId, auth.telegramUser);
  await ensureEventParticipant(event.id, user.id);

  return {
    ok: true,
    ctx: {
      auth: { telegramId: auth.telegramId, telegramUser: auth.telegramUser },
      event,
      user,
    },
  };
}
