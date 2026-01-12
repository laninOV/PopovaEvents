import { NextRequest } from "next/server";
import { ensureDefaultEvent, ensureEventBySlug } from "@/lib/db";
import { getDefaultEventSlug, getEventSlugFromRequest } from "@/lib/eventContext";

export function getEventForRequest(req: NextRequest) {
  const slug = getEventSlugFromRequest(req) ?? getDefaultEventSlug();
  const event = slug === getDefaultEventSlug() ? ensureDefaultEvent() : ensureEventBySlug(slug);
  if (!event) return null;
  return event;
}

