"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type MeResponse = { event: { slug: string; name: string } };

export default function EventPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<MeResponse | null>(null);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<MeResponse>("/api/me")
      .then((r) => {
        setCurrent(r);
        const saved = localStorage.getItem("eventSlug")?.trim();
        setSlug(saved || r.event.slug);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  async function apply() {
    setError(null);
    const value = slug.trim();
    if (!value) {
      localStorage.removeItem("eventSlug");
      router.push("/");
      return;
    }
    localStorage.setItem("eventSlug", value);
    try {
      await apiFetch("/api/me");
      router.push("/");
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? "Ивент не найден. Проверьте код или включите ALLOW_PUBLIC_EVENT_CREATE=1 для авто‑создания."
          : "Ивент не найден",
      );
    }
  }

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Ивент</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Введите код ивента (slug). Встречи и QR будут привязаны к выбранному ивенту.
        </p>
      </header>

      {current ? (
        <div className="card p-4 text-sm">
          Текущий: <span className="font-medium">{current.event.name}</span>{" "}
          <span className="text-zinc-500">({current.event.slug})</span>
        </div>
      ) : null}

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="card p-4">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Код ивента</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input"
            placeholder="например: popova-meetup-2025"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>
        <div className="mt-3 text-xs text-zinc-500">
          Пустое значение = ивент по умолчанию.
        </div>
        <button
          type="button"
          onClick={apply}
          className="btn btn-primary mt-4 w-full"
        >
          Применить
        </button>
      </section>
    </main>
  );
}
