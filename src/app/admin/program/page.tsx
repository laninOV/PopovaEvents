"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type Speaker = { id: string; name: string };
type Item = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  description: string | null;
  speakerId: string | null;
  location: string | null;
  sortOrder: number;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdminProgramPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [location, setLocation] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const speakersById = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);

  async function reload() {
    setError(null);
    const [p, s] = await Promise.all([apiFetch<{ schedule: Item[] }>("/api/admin/program"), apiFetch<{ speakers: Speaker[] }>("/api/admin/speakers")]);
    setItems(p.schedule);
    setSpeakers(s.speakers);
  }

  useEffect(() => {
    tgReady();
    (async () => {
      try {
        await reload();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const startsIso = fromLocalInput(startsAt);
      if (!startsIso) throw new Error("Некорректное время начала");
      const endsIso = endsAt.trim() ? fromLocalInput(endsAt) : null;
      await apiFetch("/api/admin/program", {
        method: "POST",
        body: JSON.stringify({
          startsAt: startsIso,
          endsAt: endsIso,
          title: title.trim(),
          description: description.trim() || null,
          speakerId: speakerId.trim() || null,
          location: location.trim() || null,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      setStartsAt("");
      setEndsAt("");
      setTitle("");
      setDescription("");
      setSpeakerId("");
      setLocation("");
      setSortOrder("0");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    await apiFetch(`/api/admin/program/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Программа</h1>
        <Link href="/admin" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="card p-4">
        <div className="text-sm font-semibold">Добавить пункт</div>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600">Начало *</span>
            <input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input" type="datetime-local" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600">Конец</span>
            <input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input" type="datetime-local" />
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Название *" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" placeholder="Описание" />
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600">Спикер</span>
            <select value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} className="input">
              <option value="">—</option>
              {speakers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="Локация" />
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input" placeholder="Sort order" inputMode="numeric" />
          <button type="button" onClick={add} disabled={saving || !title.trim() || !startsAt.trim()} className={`btn w-full ${title.trim() && startsAt.trim() ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}>
            {saving ? "Сохранение…" : "Добавить"}
          </button>
        </div>
      </section>

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-zinc-600">
                  {toLocalInput(it.startsAt).replace("T", " ")}
                  {it.endsAt ? ` – ${toLocalInput(it.endsAt).replace("T", " ")}` : ""}
                </div>
                <div className="mt-1 text-base font-semibold">{it.title}</div>
                {it.speakerId ? <div className="text-sm text-zinc-600">{speakersById.get(it.speakerId) ?? it.speakerId}</div> : null}
                {it.location ? <div className="text-sm text-zinc-600">{it.location}</div> : null}
              </div>
              <button type="button" onClick={() => remove(it.id)} className="btn btn-ghost h-10 px-3 text-red-700">
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
