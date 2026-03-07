import { NextRequest } from "next/server";
import { ensureDefaultEvent, ensureEventBySlug, seedDemoIfEmpty } from "@/lib/dbx";
import { getDefaultEventSlug, getEventSlugFromRequest } from "@/lib/eventContext";

export async function getEventForRequest(req: NextRequest) {
  const slug = getEventSlugFromRequest(req) ?? getDefaultEventSlug();
  const event = slug === getDefaultEventSlug() ? await ensureDefaultEvent() : await ensureEventBySlug(slug);
  if (!event) return null;
  await seedDemoIfEmpty(event.id);
  return event;
}
