"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { AppToggles } from "@/components/AppToggles";
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
  const displayNameSafe = useMemo(() => {
    const value = displayName?.trim();
    return value || t("profile.notSet");
  }, [displayName, t]);
  const instagramHref = useMemo(
    () => (profile?.instagram ? normalizeInstagramLink(profile.instagram) : null),
    [profile],
  );
  const instagramText = useMemo(() => profile?.instagram?.trim() || t("profile.notSet"), [profile, t]);

  return (
    <main className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-[1.9rem] leading-tight">{t("nav.home")}</h1>
        <AppToggles />
      </header>

      <section className="card profile-hero p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold tracking-[0.02em]">{t("home.profile.cardTitle")}</div>
          <Link href="/profile" className="text-xs font-semibold text-accent underline underline-offset-2">
            {t("home.profile.openProfile")}
          </Link>
        </div>
        {!profile ? (
          <div className="profile-empty mt-4 rounded-2xl p-3 text-sm text-[color:var(--muted-fg)]">
            {t("home.profileEmpty")}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-3">
            {fallbackPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fallbackPhotoUrl}
                alt={displayNameSafe}
                className="profile-avatar h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="profile-avatar flex h-16 w-16 items-center justify-center rounded-2xl text-sm">
                <span aria-hidden>{displayNameSafe.trim().charAt(0).toUpperCase() || "•"}</span>
              </div>
            )}
            <div className="profile-meta min-w-0 flex-1">
              <div className="text-[1.2rem] font-semibold tracking-[0.01em]">{displayNameSafe}</div>
              <div className="mt-2">
                <span className="profile-chip">{profile.niche?.trim() || t("profile.notSet")}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-[color:var(--muted-fg)]">{t("profile.section.instagram")}:</span>{" "}
                {instagramHref ? (
                  <a href={instagramHref} className="text-accent underline" target="_blank" rel="noreferrer">
                    {instagramText}
                  </a>
                ) : (
                  <span className="text-[color:var(--muted-fg)]">{instagramText}</span>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="profile-actions mt-4">
          <Link href="/form" className="btn btn-ghost flex-1">
            {profile ? t("home.editProfile") : t("home.fillProfile")}
          </Link>
          <Link href="/chat" className="btn btn-primary flex-1">
            {t("home.chat")}
          </Link>
        </div>
      </section>

      <section className="card home-meetings-card p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <div>{t("home.meetings", { n: me?.stats?.meetingsCount ?? "—" })}</div>
          <Link href="/meetings" className="text-xs font-semibold text-accent underline underline-offset-2">
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
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]/70 px-3 py-2 text-sm"
              >
                <div className="truncate font-medium">{m.other.displayName ?? "Участник"}</div>
                <Link href={`/meetings/${m.id}`} className="text-xs font-semibold text-accent underline underline-offset-2">
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
