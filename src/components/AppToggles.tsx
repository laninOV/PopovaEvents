"use client";

import { useAppSettings } from "@/components/AppSettingsProvider";

export function AppToggles() {
  const { theme, toggleTheme, lang, toggleLang } = useAppSettings();

  return (
    <div className="app-toggles">
      <div className="app-toggles-inner">
        <button type="button" onClick={toggleTheme} className="btn btn-ghost h-8 px-3 text-xs">
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button type="button" onClick={toggleLang} className="btn btn-ghost h-8 px-3 text-xs">
          {lang === "ru" ? "EN" : "RU"}
        </button>
      </div>
    </div>
  );
}
