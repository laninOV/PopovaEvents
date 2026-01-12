"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch("/api/admin/me")
      .then(() => setAllowed(true))
      .catch((e: unknown) => {
        setAllowed(false);
        setError(e instanceof Error ? e.message : "Нет доступа");
      });
  }, []);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Админка</h1>
      </header>

      {allowed === null ? <div className="text-sm text-zinc-600">Проверка…</div> : null}
      {allowed === false ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {allowed ? (
        <section className="card p-4">
          <div className="grid gap-2">
            <Link href="/admin/settings" className="btn btn-ghost justify-start">
              Настройки (чат)
            </Link>
            <Link href="/admin/speakers" className="btn btn-ghost justify-start">
              Спикеры
            </Link>
            <Link href="/admin/program" className="btn btn-ghost justify-start">
              Программа
            </Link>
          </div>
          <div className="mt-3 text-xs text-zinc-500">Доступ: `ADMIN_TELEGRAM_IDS` (через запятую).</div>
        </section>
      ) : null}
    </main>
  );
}

