"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
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

export default function FormPage() {
  const router = useRouter();
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [niche, setNiche] = useState("");
  const [about, setAbout] = useState("");
  const [helpful, setHelpful] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<{ profile: Profile | null }>("/api/profile")
      .then((r) => {
        if (!r.profile) return;
        setFirstName(r.profile.firstName ?? "");
        setLastName(r.profile.lastName ?? "");
        setInstagram(r.profile.instagram ?? "");
        setNiche(r.profile.niche ?? "");
        setAbout(r.profile.about ?? "");
        setHelpful(r.profile.helpful ?? "");
        setPhotoUrl(r.profile.photoUrl ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const canSave = useMemo(() => firstName.trim().length > 0 && !saving && !uploading, [firstName, saving, uploading]);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await apiFetch<{ url: string }>("/api/upload", { method: "POST", body: form });
      setPhotoUrl(res.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSave) {
      setError("Заполните обязательные поля.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() ? lastName.trim() : null,
          instagram: instagram.trim() ? instagram.trim() : null,
          niche: niche.trim() ? niche.trim() : null,
          about: about.trim() ? about.trim() : null,
          helpful: helpful.trim() ? helpful.trim() : null,
          photoUrl,
        }),
      });
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">{t("form.title")}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-fg)]">
          {t("form.requiredHint").replace("*", "")}
          <span className="text-red-600"> *</span>
        </p>
      </header>

      {loading ? <div className="text-sm text-[color:var(--muted-fg)]">{t("gate.loading")}</div> : null}
      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <section className="card p-4">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("form.photo")}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              <div className="text-xs text-[color:var(--muted-fg)]">
                {uploading ? t("form.photoUploading") : t("form.photoHint")}
              </div>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Фото профиля" className="mt-2 h-20 w-20 rounded-2xl object-cover" />
              ) : null}
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium">
                  {t("form.firstName")} <span className="text-red-600">*</span>
                </span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input"
                  placeholder={t("form.placeholder.firstName")}
                  autoComplete="given-name"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium">{t("form.lastName")}</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input"
                  placeholder={t("form.placeholder.lastName")}
                  autoComplete="family-name"
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("form.instagram")}</span>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="input"
                placeholder={t("form.placeholder.instagram")}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("form.niche")}</span>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="input"
                placeholder={t("form.placeholder.niche")}
                maxLength={80}
              />
            </label>
          </div>
        </section>

        <section className="card p-4">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("form.about")}</span>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="textarea"
                maxLength={300}
                placeholder={t("form.placeholder.about")}
              />
              <div className="text-xs text-[color:var(--muted-fg)]">{about.length}/300</div>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">{t("form.helpful")}</span>
              <textarea
                value={helpful}
                onChange={(e) => setHelpful(e.target.value)}
                className="textarea"
                maxLength={300}
                placeholder={t("form.placeholder.helpful")}
              />
              <div className="text-xs text-[color:var(--muted-fg)]">{helpful.length}/300</div>
            </label>
          </div>
        </section>

        <button type="submit" disabled={!canSave} className={`btn w-full ${canSave ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}>
          {saving ? t("form.saving") : t("form.save")}
        </button>
      </form>
    </main>
  );
}
