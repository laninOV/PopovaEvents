import { getTelegramInitData } from "@/lib/tgWebApp";

function isDevHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

type GetCacheEntry = {
  ts: number;
  promise: Promise<unknown>;
};

const GET_CACHE_TTL_MS = 3_000;
const getCache = new Map<string, GetCacheEntry>();

function getInitUserKey(initData: string) {
  try {
    const userJson = new URLSearchParams(initData).get("user");
    if (!userJson) return `len:${initData.length}`;
    const parsed = JSON.parse(userJson) as unknown;
    const id = parsed && typeof parsed === "object" && "id" in parsed ? (parsed as { id?: unknown }).id : undefined;
    if (typeof id === "number" || typeof id === "string") return String(id);
    return `len:${initData.length}`;
  } catch {
    return `len:${initData.length}`;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = Boolean(init?.body);
  const isGet = method === "GET" && !hasBody;

  const headers = new Headers(init?.headers);
  const hasFormDataBody =
    typeof FormData !== "undefined" && init?.body && init.body instanceof FormData;
  if (!hasFormDataBody) {
    headers.set("content-type", headers.get("content-type") ?? "application/json");
  }

  const initData = getTelegramInitData();
  const userKey = initData ? getInitUserKey(initData) : "no-init";
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

  const eventSlug = localStorage.getItem("eventSlug")?.trim() ?? "";
  if (eventSlug) headers.set("x-event-slug", eventSlug);

  if (!isGet) {
    // Avoid stale data after mutations.
    getCache.clear();
  } else {
    const cacheKey = `${path}|event:${eventSlug || "default"}|user:${userKey}`;
    const existing = getCache.get(cacheKey);
    if (existing && Date.now() - existing.ts < GET_CACHE_TTL_MS) {
      return (await existing.promise) as T;
    }

    const promise = (async () => {
      const res = await fetch(path, { ...init, method, headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
      }
      return (await res.json()) as T;
    })();

    getCache.set(cacheKey, { ts: Date.now(), promise });
    try {
      return (await promise) as T;
    } finally {
      // Keep the entry for TTL, but let promise settle.
    }
  }

  const res = await fetch(path, { ...init, method, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
