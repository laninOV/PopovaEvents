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
          className="btn btn-ghost h-9 w-9 rounded-full px-0"
          aria-label={t("settings.title")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M19.4 15a8 8 0 0 0 .1-1 8 8 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7.8 7.8 0 0 0-1.7-1l-.3-2.5h-4L10.6 8a7.8 7.8 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 12a8 8 0 0 0 0 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.3 1 2-3.4-2-1.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
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
