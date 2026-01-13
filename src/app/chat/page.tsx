"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

export default function ChatPage() {
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [chatLink, setChatLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useAppSettings();

  useEffect(() => {
    tgReady();
    Promise.all([
      apiFetch<{ profile: unknown | null }>("/api/profile"),
      apiFetch<{ chatLink: string | null }>("/api/settings"),
    ])
      .then(([p, s]) => {
        setProfileExists(Boolean(p.profile));
        setChatLink(s.chatLink);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">{t("chat.title")}</h1>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {profileExists === false && !loading ? (
        <section className="card p-4">
          <div className="text-sm text-[color:var(--muted-fg)]">{t("chat.needProfile")}</div>
          <Link href="/form" className="btn btn-primary mt-3 w-full">
            {t("chat.fillProfile")}
          </Link>
        </section>
      ) : null}

      {profileExists && !loading ? (
        <section className="card p-4">
          {chatLink ? (
            <a href={chatLink} className="btn btn-secondary w-full" target="_blank" rel="noreferrer">
              {t("chat.open")}
            </a>
          ) : (
            <div className="text-sm text-[color:var(--muted-fg)]">{t("chat.notConfigured")}</div>
          )}
        </section>
      ) : null}
    </main>
  );
}
