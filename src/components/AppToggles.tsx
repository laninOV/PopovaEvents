"use client";

import { useState } from "react";
import { useAppSettings } from "@/components/AppSettingsProvider";

export function AppToggles() {
  const { theme, toggleTheme, lang, toggleLang, t } = useAppSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost settings-trigger h-9 w-9 rounded-full px-0"
          aria-label={t("settings.title")}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            shapeRendering="geometricPrecision"
          >
            <circle
              cx="12"
              cy="12"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="12"
              cy="12"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M12 1.5V4M12 20V22.5M1.5 12H4M20 12H22.5M4.5 4.5L6.5 6.5M17.5 17.5L19.5 19.5M4.5 19.5L6.5 17.5M17.5 6.5L19.5 4.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </button>

        {open ? (
          <div className="fixed inset-0 z-[70]">
            <button
              type="button"
              aria-label={t("settings.close")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />

            <div className="absolute inset-x-0 bottom-0 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <div className="mx-auto max-w-3xl px-4">
                <div className="card max-h-[calc(100dvh-120px)] overflow-auto p-4">
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
    </>
  );
}
