"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type TenantListItem = {
  event: {
    id: string;
    slug: string;
    name: string;
    status: string;
    mode: "legacy" | "tenant";
  };
  tenant: {
    eventSlug: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type DbStatus = {
  multiDbRouting: boolean;
  configured: boolean;
  healthy: boolean;
  error: string | null;
  controlConnectionStringMasked: string;
};

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [items, setItems] = useState<TenantListItem[]>([]);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [pooledConnectionString, setPooledConnectionString] = useState("");
  const [active, setActive] = useState(true);

  async function reload() {
    const [dbStatus, list] = await Promise.all([
      apiFetch<DbStatus>("/api/admin/db/status"),
      apiFetch<{ items: TenantListItem[] }>("/api/admin/events/tenants"),
    ]);
    setStatus(dbStatus);
    setItems(list.items);
  }

  useEffect(() => {
    tgReady();
    (async () => {
      try {
        await reload();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreateOrUpdate() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/events/tenants", {
        method: "POST",
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim() || undefined,
          mode: "tenant",
          pooledConnectionString: pooledConnectionString.trim(),
          active,
        }),
      });

      setSlug("");
      setName("");
      setPooledConnectionString("");
      setActive(true);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(item: TenantListItem) {
    if (!item.tenant) return;
    setError(null);
    try {
      await apiFetch(`/api/admin/events/tenants/${encodeURIComponent(item.event.slug)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.tenant.active, mode: "tenant" }),
      });
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка обновления");
    }
  }

  async function onDelete(slugValue: string) {
    setError(null);
    try {
      await apiFetch(`/api/admin/events/tenants/${encodeURIComponent(slugValue)}`, {
        method: "DELETE",
      });
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Ивенты и БД</h1>
        <Link href="/admin" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="card p-4">
        <div className="text-sm font-semibold">Статус control DB</div>
        {loading ? <div className="mt-2 text-sm text-zinc-600">Загрузка…</div> : null}
        {status ? (
          <div className="mt-2 grid gap-1 text-sm">
            <div>Multi DB routing: {String(status.multiDbRouting)}</div>
            <div>Configured: {String(status.configured)}</div>
            <div>Healthy: {String(status.healthy)}</div>
            <div>Control URL: {status.controlConnectionStringMasked || "—"}</div>
            {status.error ? <div className="text-red-700">Error: {status.error}</div> : null}
          </div>
        ) : null}
      </section>

      <section className="card p-4">
        <div className="text-sm font-semibold">Привязать tenant DB к ивенту</div>
        <div className="mt-3 grid gap-3">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input"
            placeholder="event slug (например dubai-2026)"
          />
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Название ивента" />
          <textarea
            value={pooledConnectionString}
            onChange={(e) => setPooledConnectionString(e.target.value)}
            className="textarea"
            placeholder="Pooled Postgres connection string"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            active
          </label>
          <button
            type="button"
            onClick={onCreateOrUpdate}
            disabled={saving || !slug.trim() || !pooledConnectionString.trim()}
            className={`btn w-full ${slug.trim() && pooledConnectionString.trim() ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}
          >
            {saving ? "Сохранение…" : "Сохранить tenant конфиг"}
          </button>
        </div>
      </section>

      <section className="card p-4">
        <div className="text-sm font-semibold">Ивенты</div>
        <div className="mt-3 space-y-2">
          {items.length === 0 ? <div className="text-sm text-zinc-600">Пока пусто.</div> : null}
          {items.map((item) => (
            <div key={item.event.slug} className="rounded-xl border border-[color:var(--border)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{item.event.slug}</div>
                  <div className="text-xs text-zinc-600">{item.event.name}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    mode: {item.event.mode} · status: {item.event.status} · tenant: {item.tenant ? "yes" : "no"}
                  </div>
                  {item.tenant ? (
                    <div className="text-xs text-zinc-600">active: {String(item.tenant.active)}</div>
                  ) : null}
                </div>
                {item.tenant ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onToggleActive(item)} className="btn btn-ghost h-9 px-3 text-xs">
                      {item.tenant.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.event.slug)}
                      className="btn btn-ghost h-9 px-3 text-xs text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
