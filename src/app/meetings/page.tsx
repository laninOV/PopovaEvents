"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import type { DbMeetingListItem } from "@/lib/db";

export default function MeetingsPage() {
  const [items, setItems] = useState<DbMeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tgReady();
    apiFetch<{ meetings: DbMeetingListItem[] }>("/api/meetings")
      .then((r) => setItems(r.meetings))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Мои знакомства</h1>
        <Link
          href="/scan"
          className="btn btn-primary h-10 px-3"
        >
          Сканировать
        </Link>
      </header>

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && items.length === 0 ? (
        <div className="card p-4 text-sm text-zinc-600">
          Пока нет знакомств. Отсканируйте QR другого участника.
        </div>
      ) : null}

      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              href={`/meetings/${m.id}`}
              className="card block p-4 hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{m.other.displayName ?? "Участник"}</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {new Date(m.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-600">
                  {m.other.niche ? `Ниша: ${m.other.niche}` : null}
                  {m.meta.rating ? <div>Оценка: {m.meta.rating}/5</div> : null}
                  {m.meta.plannedAt ? (
                    <div>
                      Встреча:{" "}
                      {new Date(m.meta.plannedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                      {m.meta.plannedPlace ? ` · ${m.meta.plannedPlace}` : ""}
                    </div>
                  ) : m.meta.plannedPlace ? (
                    <div>Встреча: {m.meta.plannedPlace}</div>
                  ) : null}
                </div>
              </div>
              {m.meta.note ? (
                <div className="mt-2 line-clamp-2 text-sm text-zinc-700">{m.meta.note}</div>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
