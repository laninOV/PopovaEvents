"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

type Speaker = {
  id: string;
  name: string;
  photoUrl: string | null;
  topic: string | null;
  bio: string | null;
  socials: string[];
  sortOrder: number;
};

export default function AdminSpeakersPage() {
  const [items, setItems] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [socials, setSocials] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  async function reload() {
    setError(null);
    const r = await apiFetch<{ speakers: Speaker[] }>("/api/admin/speakers");
    setItems(r.speakers);
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
      await apiFetch("/api/admin/speakers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          topic: topic.trim() || null,
          photoUrl: photoUrl.trim() || null,
          bio: bio.trim() || null,
          socials: socials
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      setName("");
      setTopic("");
      setPhotoUrl("");
      setBio("");
      setSocials("");
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
    await apiFetch(`/api/admin/speakers/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Спикеры</h1>
        <Link href="/admin" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <section className="card p-4">
        <div className="text-sm font-semibold">Добавить спикера</div>
        <div className="mt-3 grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Имя *" />
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className="input" placeholder="Тема/титул" />
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="input" placeholder="Фото URL (опц.)" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="textarea" placeholder="Описание (опц.)" />
          <textarea value={socials} onChange={(e) => setSocials(e.target.value)} className="textarea" placeholder="Ссылки (по одной на строку)" />
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input" placeholder="Sort order" inputMode="numeric" />
          <button type="button" onClick={add} disabled={saving || !name.trim()} className={`btn w-full ${name.trim() ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}>
            {saving ? "Сохранение…" : "Добавить"}
          </button>
        </div>
      </section>

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">{s.name}</div>
                {s.topic ? <div className="text-sm text-zinc-600">{s.topic}</div> : null}
              </div>
              <button type="button" onClick={() => remove(s.id)} className="btn btn-ghost h-10 px-3 text-red-700">
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
