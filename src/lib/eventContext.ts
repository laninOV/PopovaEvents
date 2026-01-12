import { NextRequest } from "next/server";

export function getEventSlugFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("x-event-slug")?.trim();
  if (header) return header;
  const qp = req.nextUrl.searchParams.get("event")?.trim();
  if (qp) return qp;
  return null;
}

export function getDefaultEventSlug() {
  return process.env.DEFAULT_EVENT_SLUG ?? "default";
}

