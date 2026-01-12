"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

export default function ChatPage() {
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [chatLink, setChatLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-2xl">Чат</h1>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {profileExists === false && !loading ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Заполните профиль, чтобы получить доступ к чату.</div>
          <Link href="/form" className="btn btn-primary mt-3 w-full">
            Заполнить профиль
          </Link>
        </section>
      ) : null}

      {profileExists && !loading ? (
        <section className="card p-4">
          {chatLink ? (
            <a href={chatLink} className="btn btn-secondary w-full" target="_blank" rel="noreferrer">
              Открыть чат
            </a>
          ) : (
            <div className="text-sm text-zinc-600">Ссылка на чат пока не настроена.</div>
          )}
        </section>
      ) : null}
    </main>
  );
}
