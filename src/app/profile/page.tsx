"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppToggles } from "@/components/AppToggles";
import { useAppSettings } from "@/components/AppSettingsProvider";
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

type MeResponse = {
  stats: {
    meetingsCount: number;
    ratedCount: number;
    avgRating: number | null;
    notesCount: number;
  };
};

function normalizeInstagramLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${encodeURIComponent(withoutAt)}`;
}

export default function ProfilePage() {
  const { t } = useAppSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<MeResponse["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpfulOpen, setHelpfulOpen] = useState(false);

  useEffect(() => {
    let active = true;
    tgReady();
    Promise.allSettled([apiFetch<{ profile: Profile | null }>("/api/profile"), apiFetch<MeResponse>("/api/me")])
      .then(([profileResult, meResult]) => {
        if (!active) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value.profile);
        } else {
          const reason = profileResult.reason;
          setError(reason instanceof Error ? reason.message : t("profile.error"));
        }

        if (meResult.status === "fulfilled") {
          setStats(meResult.value.stats);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const displayName = useMemo(() => {
    if (!profile) return t("profile.notSet");
    const combined = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    return combined || t("profile.notSet");
  }, [profile, t]);
  const profileInitial = useMemo(() => {
    const firstChar = displayName.trim().charAt(0);
    return firstChar ? firstChar.toUpperCase() : "•";
  }, [displayName]);

  const tgUser = getTelegramUnsafeUser();
  const fallbackPhotoUrl = profile?.photoUrl ?? tgUser?.photo_url ?? null;

  const instagramHref = useMemo(() => (profile?.instagram ? normalizeInstagramLink(profile.instagram) : null), [profile]);
  const instagramText = useMemo(() => profile?.instagram?.trim() || t("profile.notSet"), [profile, t]);

  const aboutText = profile?.about?.trim() ?? "";
  const helpfulText = profile?.helpful?.trim() ?? "";
  const nicheText = profile?.niche?.trim() || t("profile.notSet");

  return (
    <main className="profile-page space-y-4">
      <header className="profile-header flex items-center justify-between gap-3">
        <h1 className="text-[1.9rem] leading-tight">{t("profile.title")}</h1>
        <div className="profile-header-actions">
          <AppToggles />
          <Link href="/form" className="btn btn-ghost h-10 px-4">
            {t("profile.edit")}
          </Link>
        </div>
      </header>

      {loading ? <div className="text-sm text-[color:var(--muted-fg)]">{t("profile.loading")}</div> : null}

      {!loading && error ? (
        <section className="card profile-error p-4">
          <div className="text-sm">{error}</div>
        </section>
      ) : null}

      {!loading && !error && !profile ? (
        <section className="card profile-empty p-4">
          <h2 className="text-base font-semibold">{t("profile.empty.title")}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted-fg)]">{t("profile.empty.body")}</p>
          <Link href="/form" className="btn btn-primary mt-3 w-full">
            {t("profile.empty.cta")}
          </Link>
        </section>
      ) : null}

      {!loading && !error && profile ? (
        <>
          <section className="card profile-hero profile-hero-elevated p-5">
            <div className="flex items-start gap-3">
              {fallbackPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fallbackPhotoUrl}
                  alt={displayName}
                  className="profile-avatar h-20 w-20 rounded-3xl object-cover"
                />
              ) : (
                <div className="profile-avatar flex h-20 w-20 items-center justify-center rounded-3xl">
                  <span aria-hidden>{profileInitial}</span>
                </div>
              )}

              <div className="profile-meta min-w-0 flex-1">
                <div className="profile-display-name text-[1.5rem] font-semibold tracking-[0.01em]">{displayName}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="profile-chip">{nicheText}</span>
                </div>
                <div className="profile-hero-row mt-3 text-sm">
                  <span className="text-[color:var(--muted-fg)]">{t("profile.section.instagram")}:</span>{" "}
                  {instagramHref ? (
                    <a href={instagramHref} className="text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
                      {instagramText}
                    </a>
                  ) : (
                    <span className="text-[color:var(--muted-fg)]">{instagramText}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-actions mt-4">
              <Link href="/qr" className="btn btn-primary w-full">
                {t("profile.qr")}
              </Link>
            </div>
          </section>

          {stats ? (
            <section className="profile-metrics" aria-label={t("profile.title")}>
              <article className="profile-metric-pill">
                <div className="profile-metric-label">{t("profile.stats.meetings")}</div>
                <div className="profile-metric-value">{stats.meetingsCount}</div>
              </article>
              <article className="profile-metric-pill">
                <div className="profile-metric-label">{t("profile.stats.rated")}</div>
                <div className="profile-metric-value">{stats.ratedCount}</div>
              </article>
              <article className="profile-metric-pill">
                <div className="profile-metric-label">{t("profile.stats.notes")}</div>
                <div className="profile-metric-value">{stats.notesCount}</div>
              </article>
            </section>
          ) : null}

          <section className="card profile-section p-4">
            <div className="profile-section-head flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold tracking-[0.01em]">{t("profile.section.about")}</h2>
              {aboutText ? (
                <button
                  type="button"
                  className="profile-section-toggle"
                  onClick={() => setAboutOpen((v) => !v)}
                  aria-controls="profile-about"
                  aria-expanded={aboutOpen}
                >
                  {aboutOpen ? t("profile.section.showLess") : t("profile.section.showMore")}
                </button>
              ) : null}
            </div>
            {aboutText ? (
              <p
                id="profile-about"
                className={`profile-collapse mt-3 whitespace-pre-wrap text-sm ${aboutOpen ? "profile-collapse-open" : ""}`}
              >
                {aboutText}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted-fg)]">{t("profile.notSet")}</p>
            )}
          </section>

          <section className="card profile-section p-4">
            <div className="profile-section-head flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold tracking-[0.01em]">{t("profile.section.helpful")}</h2>
              {helpfulText ? (
                <button
                  type="button"
                  className="profile-section-toggle"
                  onClick={() => setHelpfulOpen((v) => !v)}
                  aria-controls="profile-helpful"
                  aria-expanded={helpfulOpen}
                >
                  {helpfulOpen ? t("profile.section.showLess") : t("profile.section.showMore")}
                </button>
              ) : null}
            </div>
            {helpfulText ? (
              <p
                id="profile-helpful"
                className={`profile-collapse mt-3 whitespace-pre-wrap text-sm ${helpfulOpen ? "profile-collapse-open" : ""}`}
              >
                {helpfulText}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--muted-fg)]">{t("profile.notSet")}</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
