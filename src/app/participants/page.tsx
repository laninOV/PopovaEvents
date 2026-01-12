"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type Participant = {
  userId: string;
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

export default function ParticipantsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ participants: Participant[] }>("/api/participants")
      .then((r) => setItems(r.participants))
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
      return name.includes(query) || niche.includes(query) || instagram.includes(query);
    });
  }, [items, q]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Участники</h1>
        <p className="mt-1 text-sm text-zinc-600">Нажмите на карточку, чтобы раскрыть подробности.</p>
      </header>

      <div className="card p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input w-full"
          placeholder="Поиск по имени / нише / Instagram…"
        />
      </div>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && filtered.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Пока нет участников с заполненным профилем.</div>
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
                    {p.profile.niche ? <div className="mt-0.5 text-sm text-zinc-600">{p.profile.niche}</div> : null}
                  </div>
                  <div className="text-sm text-zinc-600">▾</div>
                </summary>

                <div className="mt-3 grid gap-3 text-sm">
                  {p.profile.about ? (
                    <div>
                      <div className="text-zinc-600">Коротко о себе</div>
                      <div className="whitespace-pre-wrap">{p.profile.about}</div>
                    </div>
                  ) : null}
                  {p.profile.helpful ? (
                    <div>
                      <div className="text-zinc-600">Чем может быть полезен</div>
                      <div className="whitespace-pre-wrap">{p.profile.helpful}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-zinc-600">Instagram</div>
                    {instagramHref ? (
                      <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                        {p.profile.instagram}
                      </a>
                    ) : (
                      <div className="text-zinc-600">—</div>
                    )}
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

