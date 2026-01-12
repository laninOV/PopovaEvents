"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

export default function AdminSettingsPage() {
  const [chatLink, setChatLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ chatLink: string | null }>("/api/admin/settings")
      .then((r) => setChatLink(r.chatLink ?? ""))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify({ chatLink: chatLink.trim() || null }) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Настройки</h1>
        <Link href="/admin" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="card p-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Ссылка на чат</span>
          <input value={chatLink} onChange={(e) => setChatLink(e.target.value)} className="input" placeholder="https://t.me/..." />
        </label>
        <button type="button" onClick={save} disabled={saving} className={`btn btn-primary mt-3 w-full ${saving ? "opacity-70" : ""}`}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </section>
    </main>
  );
}

