"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type Speaker = {
  id: string;
  name: string;
  photoUrl: string | null;
  topic: string | null;
  bio: string | null;
  socials: string[];
  sortOrder: number;
};

export default function SpeakersPage() {
  const [items, setItems] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ speakers: Speaker[] }>("/api/speakers")
      .then((r) => setItems(r.speakers))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Спикеры</h1>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && items.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Спикеры появятся здесь позже.</div>
        </section>
      ) : null}

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="card p-4">
            <div className="flex items-start gap-3">
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photoUrl} alt={s.name} className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-xs text-zinc-600">
                  Фото
                </div>
              )}
              <div className="min-w-0">
                <div className="text-base font-semibold">{s.name}</div>
                {s.topic ? <div className="mt-0.5 text-sm text-zinc-600">{s.topic}</div> : null}
              </div>
            </div>
            {s.bio ? <div className="mt-3 whitespace-pre-wrap text-sm">{s.bio}</div> : null}
            {s.socials.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {s.socials.map((url) => (
                  <a key={url} href={url} className="text-accent underline" target="_blank" rel="noreferrer">
                    {url}
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

