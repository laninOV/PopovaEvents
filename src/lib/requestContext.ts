import { NextRequest, NextResponse } from "next/server";
import type { DbUser } from "@/lib/db";
import {
  ensureEventParticipant,
  getEventStoreMode,
  getOrCreateUserForEvent,
  isEventNotConfiguredError,
} from "@/lib/dbx";
import { getEventForRequest } from "@/lib/getEventForRequest";
import { getAuthFromRequest } from "@/lib/telegramAuth";

export type RequestContext = {
  auth: { telegramId: string; telegramUser: unknown | null };
  event: { id: string; slug: string; name: string; status: string };
  user: DbUser;
  eventMode: "legacy" | "tenant";
  tenant: { eventSlug: string } | null;
};

type RequestContextResult =
  | { ok: true; ctx: RequestContext }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function resolveRequestContext(req: NextRequest): Promise<RequestContextResult> {
  const auth = getAuthFromRequest(req);
  if (!auth.ok) return { ok: false, response: NextResponse.json({ error: auth.error }, { status: 401 }) };

  let event: Awaited<ReturnType<typeof getEventForRequest>>;
  try {
    event = await getEventForRequest(req);
  } catch (error) {
    if (isEventNotConfiguredError(error)) {
      return { ok: false, response: NextResponse.json({ error: "event_not_configured" }, { status: 404 }) };
    }
    throw error;
  }
  if (!event) return { ok: false, response: NextResponse.json({ error: "event_not_found" }, { status: 404 }) };

  let user: DbUser;
  let eventMode: "legacy" | "tenant";
  try {
    user = await getOrCreateUserForEvent(event.id, auth.telegramId, auth.telegramUser);
    eventMode = await getEventStoreMode(event.id);
    await ensureEventParticipant(event.id, user.id);
  } catch (error) {
    if (isEventNotConfiguredError(error)) {
      return { ok: false, response: NextResponse.json({ error: "event_not_configured" }, { status: 404 }) };
    }
    throw error;
  }

  return {
    ok: true,
    ctx: {
      auth: { telegramId: auth.telegramId, telegramUser: auth.telegramUser },
      event,
      user,
      eventMode,
      tenant: eventMode === "tenant" ? { eventSlug: event.slug } : null,
    },
  };
}
