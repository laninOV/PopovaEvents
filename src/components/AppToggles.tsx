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
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.214 1.281c.058.347.286.643.61.815.326.173.715.208 1.07.092l1.242-.414c.52-.173 1.102.028 1.371.473l1.296 2.247c.27.445.176 1.03-.22 1.389l-.98.89c-.265.24-.418.58-.418.938 0 .358.153.698.418.938l.98.89c.396.359.49.944.22 1.389l-1.296 2.247c-.27.445-.851.646-1.371.473l-1.242-.414c-.355-.116-.744-.081-1.07.092-.324.172-.552.468-.61.815l-.214 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.214-1.281c-.058-.347-.286-.643-.61-.815-.326-.173-.715-.208-1.07-.092l-1.242.414c-.52.173-1.102-.028-1.371-.473L2.805 15.93c-.27-.445-.176-1.03.22-1.389l.98-.89c.265-.24.418-.58.418-.938 0-.358-.153-.698-.418-.938l-.98-.89c-.396-.359-.49-.944-.22-1.389L4.1 6.25c.27-.445.851-.646 1.371-.473l1.242.414c.355.116.744.081 1.07-.092.324-.172.552-.468.61-.815l.214-1.281Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
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
