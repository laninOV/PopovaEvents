"use client";

import { useEffect } from "react";

export function EventBootstrap() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const event = url.searchParams.get("event")?.trim();
    if (event) {
      localStorage.setItem("eventSlug", event);
      url.searchParams.delete("event");
      window.history.replaceState({}, "", url.toString());
    }

    const devTelegramId = url.searchParams.get("devTelegramId")?.trim();
    if (devTelegramId) {
      localStorage.setItem("devTelegramId", devTelegramId);
      url.searchParams.delete("devTelegramId");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return null;
}

