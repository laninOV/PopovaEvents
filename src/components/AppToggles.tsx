"use client";

import { useState } from "react";
import { useAppSettings } from "@/components/AppSettingsProvider";

export function AppToggles() {
  const { theme, toggleTheme, lang, toggleLang, t } = useAppSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-3xl justify-end px-4 pt-3">
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost h-9 w-9 px-0"
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm9-3.5a7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8.3 8.3 0 0 0-1.7-1L16.5 2h-4L11.2 5a8.3 8.3 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l1.3 3h4l1.3-3c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"
              />
            </svg>
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setOpen(false);
                }}
                className="btn btn-ghost h-10 w-full justify-start px-3"
              >
                {theme === "dark" ? t("settings.theme.light") : t("settings.theme.dark")}
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleLang();
                  setOpen(false);
                }}
                className="btn btn-ghost h-10 w-full justify-start px-3"
              >
                {lang === "ru" ? "English" : "Русский"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
