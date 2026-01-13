"use client";

import { useAppSettings } from "@/components/AppSettingsProvider";

export function AppToggles() {
  const { theme, toggleTheme, lang, toggleLang } = useAppSettings();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-3xl justify-end px-4 pt-3">
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={toggleTheme} className="btn btn-ghost h-9 px-3">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button type="button" onClick={toggleLang} className="btn btn-ghost h-9 px-3">
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>
      </div>
    </div>
  );
}

