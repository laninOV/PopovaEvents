"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type Speaker = {
  id: string;
  name: string;
  photoUrl?: string | null;
  topic?: string | null;
  bio?: string | null;
  socials?: string[];
  sortOrder?: number;
};

type ScheduleItem = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  description: string | null;
  speakerId: string | null;
  location: string | null;
  sortOrder: number;
};

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export default function ProgramPage() {
  const [tab, setTab] = useState<"program" | "speakers">("program");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ schedule: ScheduleItem[]; speakers: Speaker[] }>("/api/program")
      .then((r) => {
        setItems(r.schedule);
        setSpeakers(r.speakers);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  const speakersById = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Программа</h1>
      </header>

      <div className="card p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("program")}
            className={`btn h-10 ${tab === "program" ? "btn-primary" : "btn-ghost"}`}
          >
            Программа
          </button>
          <button
            type="button"
            onClick={() => setTab("speakers")}
            className={`btn h-10 ${tab === "speakers" ? "btn-primary" : "btn-ghost"}`}
          >
            Спикеры
          </button>
        </div>
      </div>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && tab === "program" && items.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Программа появится здесь позже.</div>
        </section>
      ) : null}

      {!loading && tab === "speakers" && speakers.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Спикеры появятся здесь позже.</div>
        </section>
      ) : null}

      {tab === "program" ? (
        <ul className="space-y-2">
          {items.map((it) => {
            const start = new Date(it.startsAt);
            const end = it.endsAt ? new Date(it.endsAt) : null;
            const time = `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}${
              end ? `–${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""
            }`;
            const speakerName = it.speakerId ? speakersById.get(it.speakerId) : null;

            return (
              <li key={it.id} className="card p-4">
                <div className="text-sm text-zinc-600">{time}</div>
                <div className="mt-1 text-base font-semibold">{it.title}</div>
                {speakerName ? <div className="mt-0.5 text-sm text-zinc-600">{speakerName}</div> : null}
                {it.location ? <div className="mt-0.5 text-sm text-zinc-600">{it.location}</div> : null}
                {it.description ? <div className="mt-3 whitespace-pre-wrap text-sm">{it.description}</div> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-2">
          {speakers.map((s) => (
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
              {s.socials?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {s.socials.map((raw) => {
                    const href = normalizeLink(raw);
                    if (!href) return null;
                    return (
                      <a key={raw} href={href} className="text-accent underline" target="_blank" rel="noreferrer">
                        {raw}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

