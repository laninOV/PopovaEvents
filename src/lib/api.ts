import { getTelegramInitData } from "@/lib/tgWebApp";

function isDevHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasFormDataBody =
    typeof FormData !== "undefined" && init?.body && init.body instanceof FormData;
  if (!hasFormDataBody) {
    headers.set("content-type", headers.get("content-type") ?? "application/json");
  }

  const initData = getTelegramInitData();
  if (initData) {
    headers.set("x-telegram-init-data", initData);
    try {
      localStorage.removeItem("devTelegramId");
    } catch {
      // ignore
    }
  } else {
    if (isDevHost()) {
      headers.set("x-dev-telegram-id", localStorage.getItem("devTelegramId") ?? "123456789");
    }
  }

  const eventSlug = localStorage.getItem("eventSlug")?.trim();
  if (eventSlug) headers.set("x-event-slug", eventSlug);

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
