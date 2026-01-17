"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";
import type { DbMeetingListItem } from "@/lib/db";

type MeResponse = {
  user: { publicId: string };
  profile: { displayName: string } | null;
  stats: { meetingsCount: number; ratedCount: number; avgRating: number | null; notesCount: number };
  event: { slug: string; name: string };
};

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

export default function HomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<DbMeetingListItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const { t } = useAppSettings();

  useEffect(() => {
    tgReady();
    apiFetch<MeResponse>("/api/me")
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
    apiFetch<{ profile: Profile | null }>("/api/profile")
      .then((r) => setProfile(r.profile))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    apiFetch<{ meetings: DbMeetingListItem[] }>("/api/meetings")
      .then((r) => setMeetings(r.meetings))
      .finally(() => setMeetingsLoading(false));
  }, []);

  const tgUser = getTelegramUnsafeUser();
  const fallbackPhotoUrl = profile?.photoUrl ?? tgUser?.photo_url ?? null;
  const displayName = useMemo(() => {
    if (!profile) return null;
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  }, [profile]);
  const instagramHref = useMemo(
    () => (profile?.instagram ? normalizeInstagramLink(profile.instagram) : null),
    [profile],
  );

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">{t("nav.home")}</h1>
      </header>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{t("home.myProfile")}</div>
          <Link href="/form" className="btn btn-ghost h-8 px-3 text-xs">
            {profile ? t("home.editProfile") : t("home.fillProfile")}
          </Link>
        </div>
        {!profile ? (
          <div className="mt-3 text-sm text-[color:var(--muted-fg)]">{t("home.profileEmpty")}</div>
        ) : (
          <div className="mt-3 flex items-start gap-3">
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
            <div className="min-w-0">
              <div className="text-lg font-semibold">{displayName ?? "—"}</div>
              {profile.niche ? (
                <div className="mt-0.5 text-sm text-[color:var(--muted-fg)]">{profile.niche}</div>
              ) : null}
              {profile.about ? (
                <div className="mt-2 text-sm text-[color:var(--muted-fg)]">{profile.about}</div>
              ) : null}
              <div className="mt-2 text-sm">
                {instagramHref ? (
                  <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                    {profile.instagram}
                  </a>
                ) : (
                  <span className="text-[color:var(--muted-fg)]">{t("home.instagramMissing")}</span>
                )}
              </div>
            </div>
          </div>
        )}
        <Link href="/chat" className="btn btn-ghost mt-4 w-full">
          {t("home.chat")}
        </Link>
      </section>

      <section className="card p-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <div>{t("home.meetings", { n: me?.stats?.meetingsCount ?? "—" })}</div>
          <Link href="/meetings" className="text-xs text-accent underline">
            {t("home.meetingsAll")}
          </Link>
        </div>
        {meetingsLoading ? (
          <div className="mt-2 text-sm text-[color:var(--muted-fg)]">Загрузка…</div>
        ) : meetings.length === 0 ? (
          <div className="mt-2 text-sm text-[color:var(--muted-fg)]">{t("home.meetingsEmpty")}</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {meetings.slice(0, 3).map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div className="truncate font-medium">{m.other.displayName ?? "Участник"}</div>
                <Link href={`/meetings/${m.id}`} className="text-xs text-accent underline">
                  {t("home.open")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

    </main>
  );
}
