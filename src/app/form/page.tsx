"use client";

import { useRouter } from "next/navigation";
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

type WizardStep = 1 | 2 | 3;

const TOTAL_STEPS = 3;
const STEP_ORDER: WizardStep[] = [1, 2, 3];
const STEP_KEYS = {
  1: {
    title: "form.step.basic.title",
    subtitle: "form.step.basic.subtitle",
    short: "form.wizard.step.basic",
  },
  2: {
    title: "form.step.contacts.title",
    subtitle: "form.step.contacts.subtitle",
    short: "form.wizard.step.contacts",
  },
  3: {
    title: "form.step.about.title",
    subtitle: "form.step.about.subtitle",
    short: "form.wizard.step.about",
  },
} as const;

export default function FormPage() {
  const router = useRouter();
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [niche, setNiche] = useState("");
  const [about, setAbout] = useState("");
  const [helpful, setHelpful] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const tgUser = getTelegramUnsafeUser();
  const fallbackPhotoUrl = photoUrl ?? tgUser?.photo_url ?? null;

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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("form.error.load")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = window.setTimeout(() => {
      router.push("/");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [isSuccess, router]);

  const canSave = useMemo(() => firstName.trim().length > 0 && !saving && !uploading, [firstName, saving, uploading]);
  const canGoNext = useMemo(() => {
    if (currentStep === 1) return canSave;
    return !saving && !uploading;
  }, [canSave, currentStep, saving, uploading]);
  const stepInfo = STEP_KEYS[currentStep];

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
      const msg = e instanceof Error ? e.message : t("form.error.uploadGeneric");
      if (msg.includes("missing_blob_token")) {
        setError(t("form.error.uploadMissingBlobToken"));
      } else if (msg.includes("upload_failed")) {
        setError(t("form.error.uploadFailed"));
      } else if (msg.includes("file_too_large")) {
        setError(t("form.error.fileTooLarge"));
      } else if (msg.includes("unsupported_type")) {
        setError(t("form.error.unsupportedType"));
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  }

  function goBack() {
    setError(null);
    setCurrentStep((prev) => {
      if (prev === 1) return prev;
      if (prev === 2) return 1;
      return 2;
    });
  }

  function goNext() {
    setError(null);
    if (!canGoNext) return;
    if (currentStep === 1 && !firstName.trim()) {
      setError(t("form.error.required"));
      return;
    }
    setCurrentStep((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 3;
      return prev;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (currentStep !== 3) return;
    if (!canSave) {
      setError(t("form.error.required"));
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
      setIsSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("form.error.save"));
    } finally {
      setSaving(false);
    }
  }

  const reviewName = useMemo(() => {
    const combined = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    return combined || t("form.review.notSet");
  }, [firstName, lastName, t]);
  const reviewInstagram = useMemo(() => instagram.trim() || t("form.review.notSet"), [instagram, t]);
  const reviewNiche = useMemo(() => niche.trim() || t("form.review.notSet"), [niche, t]);
  const reviewAbout = useMemo(() => about.trim() || t("form.review.notSet"), [about, t]);
  const reviewHelpful = useMemo(() => helpful.trim() || t("form.review.notSet"), [helpful, t]);

  if (isSuccess) {
    return (
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl">{t("form.title")}</h1>
        </header>
        <section className="card form-success-panel p-5">
          <div className="form-success-mark" aria-hidden>
            ✓
          </div>
          <h2 className="text-xl">{t("form.success.title")}</h2>
          <p className="text-sm text-[color:var(--muted-fg)]">{t("form.success.body")}</p>
          <div className="text-xs text-[color:var(--muted-fg)]">{t("form.success.redirecting")}</div>
          <button type="button" onClick={() => router.push("/")} className="btn btn-primary mt-2 w-full">
            {t("form.action.home")}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="form-wizard-shell space-y-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{t("form.title")}</h1>
            <p className="mt-1 text-sm text-[color:var(--muted-fg)]">{t(stepInfo.subtitle)}</p>
          </div>
          <div className="form-wizard-progress-pill">
            {t("form.wizard.progress", { current: currentStep, total: TOTAL_STEPS })}
          </div>
        </div>
        <div
          className="form-wizard-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={currentStep}
          aria-label={t("form.wizard.progress", { current: currentStep, total: TOTAL_STEPS })}
        >
          <div
            className="form-wizard-progress-fill"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <ol className="form-wizard-steps" aria-label={t("form.wizard.stepsAria")}>
          {STEP_ORDER.map((step) => {
            const state = step < currentStep ? "done" : step === currentStep ? "current" : "upcoming";
            return (
              <li
                key={step}
                className={`form-wizard-step form-wizard-step-${state}`}
                aria-current={step === currentStep ? "step" : undefined}
              >
                <span className="form-wizard-step-dot" aria-hidden>
                  {step < currentStep ? "✓" : step}
                </span>
                <span className="form-wizard-step-label">{t(STEP_KEYS[step].short)}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-[color:var(--muted-fg)]">
          {t("form.requiredHint").replace("*", "")}
          <span className="text-red-600"> *</span>
        </p>
      </header>

      {loading ? <div className="text-sm text-[color:var(--muted-fg)]">{t("gate.loading")}</div> : null}
      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      {!loading ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <section key={currentStep} className="card form-wizard-panel p-4">
            <div className="mb-4">
              <h2 className="text-xl">{t(stepInfo.title)}</h2>
              <p className="mt-1 text-sm text-[color:var(--muted-fg)]">{t(stepInfo.subtitle)}</p>
            </div>

            {currentStep === 1 ? (
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
                  {fallbackPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fallbackPhotoUrl}
                      alt={t("form.photoPreviewAlt")}
                      className="mt-2 h-20 w-20 rounded-2xl object-cover"
                    />
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
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-4">
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
            ) : null}

            {currentStep === 3 ? (
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

                <section className="form-review card p-3">
                  <h3 className="text-base">{t("form.review.title")}</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div>
                      <dt className="text-[color:var(--muted-fg)]">{t("form.review.name")}</dt>
                      <dd>{reviewName}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--muted-fg)]">{t("form.review.instagram")}</dt>
                      <dd>{reviewInstagram}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--muted-fg)]">{t("form.review.niche")}</dt>
                      <dd>{reviewNiche}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--muted-fg)]">{t("form.review.about")}</dt>
                      <dd className="whitespace-pre-wrap">{reviewAbout}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--muted-fg)]">{t("form.review.helpful")}</dt>
                      <dd className="whitespace-pre-wrap">{reviewHelpful}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            ) : null}
          </section>

          <div className="form-wizard-actions" role="group" aria-label={t("form.wizard.actionsAria")}>
            <div className="form-wizard-actions-inner">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 1 || saving || uploading}
                className={`btn btn-ghost flex-1 ${currentStep === 1 || saving || uploading ? "opacity-50" : ""}`}
              >
                {t("form.action.back")}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className={`btn flex-1 ${canGoNext ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}
                >
                  {t("form.action.next")}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSave}
                  className={`btn flex-1 ${canSave ? "btn-primary" : "bg-zinc-200 text-zinc-500"}`}
                >
                  {saving ? t("form.saving") : t("form.save")}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : null}
    </main>
  );
}
