"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTelegramUnsafeUser, tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

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
  const { t } = useAppSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpfulOpen, setHelpfulOpen] = useState(false);

  useEffect(() => {
    tgReady();
    apiFetch<{ profile: Profile | null }>("/api/profile")
      .then((r) => setProfile(r.profile))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("profile.error")))
      .finally(() => setLoading(false));
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
    <main className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-[1.9rem] leading-tight">{t("profile.title")}</h1>
        {profile ? (
          <Link href="/form" className="btn btn-ghost h-10">
            {t("profile.edit")}
          </Link>
        ) : null}
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
          <section className="card profile-hero p-5">
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
                <div className="text-[1.5rem] font-semibold tracking-[0.01em]">{displayName}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="profile-chip">{nicheText}</span>
                </div>
                <div className="mt-3 text-sm">
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
              <Link href="/qr" className="btn btn-primary flex-1">
                {t("profile.qr")}
              </Link>
              <Link href="/form" className="btn btn-ghost flex-1">
                {t("profile.edit")}
              </Link>
            </div>
          </section>

          <section className="card profile-section p-4">
            <div className="flex items-start justify-between gap-3">
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
            <div className="flex items-start justify-between gap-3">
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
