"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import type { DbMeetingDetail } from "@/lib/db";

function normalizeInstagramLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${encodeURIComponent(withoutAt)}`;
}

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;

  const [meeting, setMeeting] = useState<DbMeetingDetail | null>(null);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = searchParams.get("status"); // "added" | "exists"

  useEffect(() => {
    tgReady();
    apiFetch<{ meeting: DbMeetingDetail }>(`/api/meetings/${id}`)
      .then((r) => {
        setMeeting(r.meeting);
        setNote(r.meeting.meta.note ?? "");
        setRating(r.meeting.meta.rating ?? "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ meeting: DbMeetingDetail }>(`/api/meetings/${id}/meta`, {
        method: "PUT",
        body: JSON.stringify({ note: note.trim() ? note.trim() : null, rating: rating === "" ? null : rating }),
      });
      setMeeting(res.meeting);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const tgLink = meeting?.other?.telegramId ? `tg://user?id=${meeting.other.telegramId}` : null;
  const instagramHref = useMemo(
    () => (meeting?.otherProfile?.instagram ? normalizeInstagramLink(meeting.otherProfile.instagram) : null),
    [meeting?.otherProfile?.instagram],
  );
  const displayName = useMemo(() => {
    const p = meeting?.otherProfile;
    if (!p) return meeting?.other.displayName ?? "Участник";
    return [p.firstName, p.lastName].filter(Boolean).join(" ");
  }, [meeting]);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Знакомство</h1>
        <Link href="/meetings" className="btn btn-ghost h-10 px-3">
          Назад
        </Link>
      </header>

      {status === "added" ? (
        <div className="card border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm">
          Добавлено в знакомства.
        </div>
      ) : null}
      {status === "exists" ? (
        <div className="card border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm">
          Этот контакт уже был в знакомствах.
        </div>
      ) : null}

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {meeting ? (
        <>
          <section className="card p-4">
            <div className="text-sm text-zinc-600">
              {new Date(meeting.createdAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
            </div>

            <div className="mt-3 flex items-start gap-3">
              {meeting.otherProfile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meeting.otherProfile.photoUrl}
                  alt={displayName}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-sm text-zinc-600">
                  Фото
                </div>
              )}
              <div className="min-w-0">
                <div className="text-lg font-semibold">{displayName}</div>
                {meeting.otherProfile?.niche ? (
                  <div className="mt-0.5 text-sm text-zinc-600">{meeting.otherProfile.niche}</div>
                ) : null}
              </div>
            </div>

            {meeting.otherProfile ? (
              <dl className="mt-4 grid gap-3 text-sm">
                {meeting.otherProfile.about ? (
                  <div>
                    <dt className="text-zinc-600">Коротко о себе</dt>
                    <dd className="whitespace-pre-wrap">{meeting.otherProfile.about}</dd>
                  </div>
                ) : null}

                {meeting.otherProfile.helpful ? (
                  <div>
                    <dt className="text-zinc-600">Чем может быть полезен</dt>
                    <dd className="whitespace-pre-wrap">{meeting.otherProfile.helpful}</dd>
                  </div>
                ) : null}

                <div>
                  <dt className="text-zinc-600">Instagram</dt>
                  <dd>
                    {instagramHref ? (
                      <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                        {meeting.otherProfile.instagram}
                      </a>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-3 text-sm text-zinc-600">Анкета участника не заполнена.</div>
            )}

            {tgLink ? (
              <a href={tgLink} className="btn btn-secondary mt-4 w-full">
                Написать в Telegram
              </a>
            ) : null}
          </section>

          <section className="card p-4">
            <div className="text-sm font-medium">После знакомства</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600">Заметка</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="textarea"
                  maxLength={1000}
                  placeholder="Что обсудили? Чем полезен контакт?"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600">Оценка</span>
                <select value={rating} onChange={(e) => setRating(e.target.value ? Number(e.target.value) : "")} className="input">
                  <option value="">—</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <button type="button" disabled={saving} onClick={save} className={`btn w-full ${saving ? "bg-zinc-200 text-zinc-500" : "btn-primary"}`}>
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <div className="text-sm text-zinc-600">Загрузка…</div>
      )}
    </main>
  );
}
