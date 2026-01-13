"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

type MeResponse = {
  user: { publicId: string };
  profile: { displayName: string } | null;
  stats: { meetingsCount: number; ratedCount: number; avgRating: number | null; notesCount: number };
  event: { slug: string; name: string };
};

export default function HomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useAppSettings();

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
        <div className="text-sm text-[color:var(--muted-fg)]">{me?.event?.name ?? "Ивент"}</div>
        <h1 className="mt-1 text-3xl">{t("home.title", { name })}</h1>
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/qr" className="btn btn-primary">
              {t("home.qr")}
            </Link>
            <Link href="/scan" className="btn btn-secondary">
              {t("home.scan")}
            </Link>
          </div>
          <Link href="/meetings" className="btn btn-ghost">
            {t("home.meetings", { n: me?.stats?.meetingsCount ?? "—" })}
          </Link>
          <Link href="/chat" className="btn btn-ghost">
            {t("home.chat")}
          </Link>
        </div>
      </header>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="grid grid-cols-2 gap-2">
        <Link href="/participants" className="btn btn-ghost">
          {t("home.participants")}
        </Link>
        <Link href="/program" className="btn btn-ghost">
          {t("home.programSpeakers")}
        </Link>
      </section>
    </main>
  );
}
