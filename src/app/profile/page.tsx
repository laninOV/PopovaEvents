"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";

type Profile = {
  firstName: string;
  lastName: string | null;
  instagram: string | null;
  niche: string | null;
  about: string | null;
  helpful: string | null;
  photoUrl: string | null;
};

function normalizeInstagramLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${encodeURIComponent(withoutAt)}`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tgReady();
    apiFetch<{ profile: Profile | null }>("/api/profile")
      .then((r) => setProfile(r.profile))
      .finally(() => setLoading(false));
  }, []);

  const displayName = useMemo(() => {
    if (!profile) return null;
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  }, [profile]);

  const tgUser = getTelegramUnsafeUser();
  const fallbackPhotoUrl = profile?.photoUrl ?? tgUser?.photo_url ?? null;

  const instagramHref = useMemo(() => (profile?.instagram ? normalizeInstagramLink(profile.instagram) : null), [profile]);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Я</h1>
        <Link href="/form" className="btn btn-ghost h-10">
          Редактировать
        </Link>
      </header>

      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && !profile ? (
        <section className="card p-4">
          <div className="text-sm text-zinc-600">Профиль не заполнен.</div>
          <Link href="/form" className="btn btn-primary mt-3 w-full">
            Заполнить профиль
          </Link>
        </section>
      ) : null}

      {profile ? (
        <section className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {fallbackPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fallbackPhotoUrl}
                  alt={displayName ?? "Фото"}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-sm text-zinc-600">
                  Фото
                </div>
              )}
              <div>
                <div className="text-lg font-semibold">{displayName}</div>
                {profile.niche ? <div className="mt-0.5 text-sm text-zinc-600">{profile.niche}</div> : null}
              </div>
            </div>

            <Link href="/qr" className="btn btn-primary h-10 shrink-0 px-3">
              Мой QR
            </Link>
          </div>

          <dl className="mt-4 grid gap-3 text-sm">
            {profile.about ? (
              <div>
                <dt className="text-zinc-600">Коротко о себе</dt>
                <dd className="whitespace-pre-wrap">{profile.about}</dd>
              </div>
            ) : null}

            {profile.helpful ? (
              <div>
                <dt className="text-zinc-600">Чем могу быть полезен</dt>
                <dd className="whitespace-pre-wrap">{profile.helpful}</dd>
              </div>
            ) : null}

            <div>
              <dt className="text-zinc-600">Instagram</dt>
              <dd>
                {instagramHref ? (
                  <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                    {profile.instagram}
                  </a>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  );
}
