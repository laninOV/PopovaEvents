"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type StatsResponse = {
  event: { slug: string; name: string };
  stats: { meetingsCount: number; ratedCount: number; avgRating: number | null; notesCount: number };
};

export default function StatsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<StatsResponse>("/api/stats")
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Статистика</h1>
          <div className="mt-1 text-sm text-zinc-600">{data?.event?.name ?? "Ивент"}</div>
        </div>
        <Link href="/" className="btn btn-ghost h-10 px-3">
          На главную
        </Link>
      </header>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

      {data ? (
        <section className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="text-2xl font-semibold">{data.stats.meetingsCount}</div>
            <div className="text-sm text-zinc-600">встреч</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-semibold">{data.stats.notesCount}</div>
            <div className="text-sm text-zinc-600">заметок</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-semibold">{data.stats.ratedCount}</div>
            <div className="text-sm text-zinc-600">оценок</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-semibold">
              {data.stats.avgRating != null ? data.stats.avgRating.toFixed(1) : "—"}
            </div>
            <div className="text-sm text-zinc-600">средняя оценка</div>
          </div>
        </section>
      ) : (
        <div className="text-sm text-zinc-600">Загрузка…</div>
      )}
    </main>
  );
}
