"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type AdminProfile = {
  userId: string;
  telegramId: string;
  publicId: string;
  joinedAt: string;
  profile: {
    userId: string;
    photoUrl: string | null;
    firstName: string;
    lastName: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updatedAt: string;
  };
};

function normalizeInstagramLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${encodeURIComponent(withoutAt)}`;
}

export default function AdminProfilesPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ profiles: AdminProfile[] }>("/api/admin/profiles")
      .then((r) => setItems(r.profiles))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) => {
      const name = [p.profile.firstName, p.profile.lastName].filter(Boolean).join(" ").toLowerCase();
      const niche = (p.profile.niche ?? "").toLowerCase();
      const instagram = (p.profile.instagram ?? "").toLowerCase();
      return (
        name.includes(query) ||
        niche.includes(query) ||
        instagram.includes(query) ||
        p.telegramId.toLowerCase().includes(query) ||
        p.publicId.toLowerCase().includes(query)
      );
    });
  }, [items, q]);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Профили</h1>
        <Link href="/admin" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      <div className="card p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input w-full"
          placeholder="Поиск по имени / нише / Instagram / id"
        />
      </div>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && filtered.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-[color:var(--muted-fg)]">Профили не найдены.</div>
        </section>
      ) : null}

      <ul className="space-y-2">
        {filtered.map((p) => {
          const name = [p.profile.firstName, p.profile.lastName].filter(Boolean).join(" ");
          const instagramHref = p.profile.instagram ? normalizeInstagramLink(p.profile.instagram) : null;
          return (
            <li key={p.userId}>
              <details className="card p-4">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  {p.profile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.profile.photoUrl} alt={name} className="h-12 w-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-xs text-zinc-600">
                      Фото
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold">{name}</div>
                    <div className="mt-0.5 text-sm text-[color:var(--muted-fg)]">
                      tg: {p.telegramId} · public: {p.publicId}
                    </div>
                  </div>
                  <div className="text-sm text-[color:var(--muted-fg)]">▾</div>
                </summary>

                <div className="mt-3 grid gap-3 text-sm">
                  {p.profile.niche ? (
                    <div>
                      <div className="text-[color:var(--muted-fg)]">Ниша</div>
                      <div className="whitespace-pre-wrap">{p.profile.niche}</div>
                    </div>
                  ) : null}
                  {p.profile.about ? (
                    <div>
                      <div className="text-[color:var(--muted-fg)]">О себе</div>
                      <div className="whitespace-pre-wrap">{p.profile.about}</div>
                    </div>
                  ) : null}
                  {p.profile.helpful ? (
                    <div>
                      <div className="text-[color:var(--muted-fg)]">Чем полезен</div>
                      <div className="whitespace-pre-wrap">{p.profile.helpful}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-[color:var(--muted-fg)]">Instagram</div>
                    <div>
                      {instagramHref ? (
                        <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                          {p.profile.instagram}
                        </a>
                      ) : (
                        <span className="text-[color:var(--muted-fg)]">—</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-[color:var(--muted-fg)]">
                    Обновлено: {new Date(p.profile.updatedAt).toLocaleString("ru-RU")}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
