"use client";

import { useState } from "react";
import { useAppSettings } from "@/components/AppSettingsProvider";

export function AppToggles() {
  const { theme, toggleTheme, lang, toggleLang, t } = useAppSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 flex justify-end">
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost h-9 w-9 rounded-full px-0"
          aria-label={t("settings.title")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6 7h8v2H6V7Zm0 8h12v2H6v-2Zm0-4h4v2H6v-2Zm10-1h2v4h-2v-4Z"
            />
          </svg>
        </button>

        {open ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label={t("settings.close")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />

            <div className="absolute inset-x-0 bottom-0 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <div className="mx-auto max-w-3xl px-4">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{t("settings.title")}</div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="btn btn-ghost h-9 w-9 rounded-full px-0"
                      aria-label={t("settings.close")}
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        setOpen(false);
                      }}
                      className="btn btn-ghost h-11 w-full justify-between px-3"
                    >
                      <span className="text-sm font-semibold">{t("settings.theme")}</span>
                      <span className="text-sm text-[color:var(--muted-fg)]">
                        {theme === "dark" ? t("settings.value.dark") : t("settings.value.light")}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleLang();
                        setOpen(false);
                      }}
                      className="btn btn-ghost h-11 w-full justify-between px-3"
                    >
                      <span className="text-sm font-semibold">{t("settings.language")}</span>
                      <span className="text-sm text-[color:var(--muted-fg)]">
                        {lang === "ru" ? t("settings.lang.ru") : t("settings.lang.en")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
