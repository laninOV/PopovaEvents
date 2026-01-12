"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";

type MeResponse = {
  user: { publicId: string };
  profile: { displayName: string } | null;
  stats: { meetingsCount: number; ratedCount: number; avgRating: number | null; notesCount: number };
  event: { slug: string; name: string };
};

export default function HomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<MeResponse>("/api/me")
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
  }, []);

  const tgUser = getTelegramUnsafeUser();
  const name = me?.profile?.displayName || tgUser?.first_name || "участник";

  return (
    <main className="space-y-4">
      <header className="card p-4">
        <div className="text-sm text-zinc-600">{me?.event?.name ?? "Ивент"}</div>
        <h1 className="mt-1 text-3xl">Привет, {name}</h1>
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/qr" className="btn btn-primary">
              Мой QR
            </Link>
            <Link href="/scan" className="btn btn-secondary">
              Сканировать
            </Link>
          </div>
          <Link href="/meetings" className="btn btn-ghost">
            Мои знакомства ({me?.stats?.meetingsCount ?? "—"})
          </Link>
          <Link href="/chat" className="btn btn-ghost">
            Чат
          </Link>
        </div>
      </header>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="grid grid-cols-2 gap-2">
        <Link href="/participants" className="btn btn-ghost">
          Участники
        </Link>
        <Link href="/program" className="btn btn-ghost">
          Программа / Спикеры
        </Link>
      </section>
    </main>
  );
}
