"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BootstrapResponse } from "@/lib/bootstrap";
import { apiFetch, getClientEventSlug, getClientUserScopeKey } from "@/lib/api";

type BootstrapContextValue = {
  data: BootstrapResponse | null;
  loading: boolean;
  error: string | null;
  revalidate: () => Promise<BootstrapResponse | null>;
};

const BOOTSTRAP_CACHE_TTL_MS = 20_000;
const BOOTSTRAP_STORAGE_PREFIX = "pe:bootstrap:v1";

type CacheEntry = {
  ts: number;
  data: BootstrapResponse;
};

type MemoryEntry = CacheEntry & {
  scopeKey: string;
};

let memoryEntry: MemoryEntry | null = null;
const inFlight = new Map<string, Promise<BootstrapResponse>>();

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

function nowMs() {
  return Date.now();
}

function isFresh(ts: number) {
  return nowMs() - ts < BOOTSTRAP_CACHE_TTL_MS;
}

function safeStorageKey(scopeKey: string) {
  return `${BOOTSTRAP_STORAGE_PREFIX}:${scopeKey}`;
}

function getScopeKey() {
  const eventSlug = getClientEventSlug() || "default";
  const userKey = getClientUserScopeKey();
  return `user:${userKey}|event:${eventSlug}`;
}

function readScopeCache(scopeKey: string): BootstrapResponse | null {
  if (memoryEntry && memoryEntry.scopeKey === scopeKey && isFresh(memoryEntry.ts)) {
    return memoryEntry.data;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(safeStorageKey(scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry | null;
    if (!parsed || typeof parsed.ts !== "number" || !parsed.data) return null;
    if (!isFresh(parsed.ts)) return null;
    memoryEntry = { scopeKey, ts: parsed.ts, data: parsed.data };
    return parsed.data;
  } catch {
    return null;
  }
}

function writeScopeCache(scopeKey: string, data: BootstrapResponse) {
  const ts = nowMs();
  memoryEntry = { scopeKey, ts, data };

  if (typeof window === "undefined") return;

  try {
    const payload: CacheEntry = { ts, data };
    window.localStorage.setItem(safeStorageKey(scopeKey), JSON.stringify(payload));
  } catch {
    // ignore storage quota / private mode failures
  }
}

function clearScopeCache(scopeKey: string) {
  if (memoryEntry?.scopeKey === scopeKey) memoryEntry = null;

  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(safeStorageKey(scopeKey));
  } catch {
    // ignore
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ошибка загрузки";
}

function fetchBootstrapFromNetwork(scopeKey: string): Promise<BootstrapResponse> {
  const existing = inFlight.get(scopeKey);
  if (existing) return existing;

  const promise = apiFetch<BootstrapResponse>("/api/bootstrap")
    .then((data) => {
      writeScopeCache(scopeKey, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(scopeKey);
    });

  inFlight.set(scopeKey, promise);
  return promise;
}

async function loadBootstrap(scopeKey: string) {
  const cached = readScopeCache(scopeKey);
  if (cached) return cached;
  return fetchBootstrapFromNetwork(scopeKey);
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [scopeKey, setScopeKey] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateScope = useCallback(() => {
    if (typeof window === "undefined") return;
    setScopeKey(getScopeKey());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize scope once on mount
    updateScope();

    const onStorage = (event: StorageEvent) => {
      if (event.key === null) {
        updateScope();
        return;
      }
      if (event.key === "eventSlug" || event.key === "devTelegramId" || event.key.startsWith(BOOTSTRAP_STORAGE_PREFIX)) {
        updateScope();
      }
    };

    const onScopeChange = () => updateScope();

    window.addEventListener("storage", onStorage);
    window.addEventListener("pe:event-slug-change", onScopeChange as EventListener);
    window.addEventListener("pe:auth-change", onScopeChange as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pe:event-slug-change", onScopeChange as EventListener);
      window.removeEventListener("pe:auth-change", onScopeChange as EventListener);
    };
  }, [updateScope]);

  useEffect(() => {
    if (!scopeKey) return;
    let active = true;

    const cached = readScopeCache(scopeKey);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed UI from hot cache before background revalidate
      setData(cached);
      setLoading(false);
      setError(null);
    } else {
      setData(null);
      setLoading(true);
      setError(null);
    }

    const request = cached ? fetchBootstrapFromNetwork(scopeKey) : loadBootstrap(scopeKey);

    request
      .then((next) => {
        if (!active) return;
        setData(next);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (!cached) {
          setData(null);
          setLoading(false);
          setError(getErrorMessage(err));
        }
      });

    return () => {
      active = false;
    };
  }, [scopeKey]);

  const revalidate = useCallback(async () => {
    if (!scopeKey) return null;

    try {
      const next = await fetchBootstrapFromNetwork(scopeKey);
      setData(next);
      setLoading(false);
      setError(null);
      return next;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [scopeKey]);

  useEffect(() => {
    if (!scopeKey) return;

    const onMutation = () => {
      clearScopeCache(scopeKey);
      void revalidate();
    };

    window.addEventListener("pe:api-mutation", onMutation as EventListener);
    return () => {
      window.removeEventListener("pe:api-mutation", onMutation as EventListener);
    };
  }, [revalidate, scopeKey]);

  const value = useMemo<BootstrapContextValue>(() => {
    return { data, loading, error, revalidate };
  }, [data, loading, error, revalidate]);

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error("useBootstrap must be used within BootstrapProvider");
  return ctx;
}
