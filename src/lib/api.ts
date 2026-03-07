import { getTelegramInitData } from "@/lib/tgWebApp";

function dispatchClientEvent(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

export function isDevHost() {
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

export function getClientUserScopeKey() {
  const initData = getTelegramInitData();
  if (initData) return `tg:${getInitUserKey(initData)}`;

  if (typeof window === "undefined") return "server";
  if (!isDevHost()) return "anon";

  try {
    const devId = window.localStorage.getItem("devTelegramId") ?? "123456789";
    return `dev:${devId.trim() || "123456789"}`;
  } catch {
    return "dev:123456789";
  }
}

export function getClientEventSlug() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("eventSlug")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function clearApiGetCache() {
  getCache.clear();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const hasBody = Boolean(init?.body);
  const isGet = method === "GET" && !hasBody;

  const headers = new Headers(init?.headers);
  const hasFormDataBody = typeof FormData !== "undefined" && init?.body && init.body instanceof FormData;
  if (!hasFormDataBody) {
    headers.set("content-type", headers.get("content-type") ?? "application/json");
  }

  const initData = getTelegramInitData();
  const userKey = getClientUserScopeKey();
  if (initData) {
    headers.set("x-telegram-init-data", initData);
    try {
      localStorage.removeItem("devTelegramId");
      dispatchClientEvent("pe:auth-change");
    } catch {
      // ignore
    }
  } else if (isDevHost()) {
    headers.set("x-dev-telegram-id", localStorage.getItem("devTelegramId") ?? "123456789");
  }

  const eventSlug = getClientEventSlug();
  if (eventSlug) headers.set("x-event-slug", eventSlug);

  if (!isGet) {
    // Avoid stale data after mutations.
    clearApiGetCache();
    dispatchClientEvent("pe:api-mutation");
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
    return (await promise) as T;
  }

  const res = await fetch(path, { ...init, method, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
