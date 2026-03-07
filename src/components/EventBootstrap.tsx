"use client";

import { useEffect } from "react";

export function EventBootstrap() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const event = url.searchParams.get("event")?.trim();
    let changed = false;
    if (event) {
      localStorage.setItem("eventSlug", event);
      window.dispatchEvent(new Event("pe:event-slug-change"));
      url.searchParams.delete("event");
      changed = true;
    }

    const devTelegramId = url.searchParams.get("devTelegramId")?.trim();
    if (devTelegramId) {
      localStorage.setItem("devTelegramId", devTelegramId);
      window.dispatchEvent(new Event("pe:auth-change"));
      url.searchParams.delete("devTelegramId");
      changed = true;
    }

    if (changed) window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}
