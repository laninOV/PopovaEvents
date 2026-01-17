"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { I18nKey, Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

export type Theme = "light" | "dark";

type Ctx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const AppSettingsContext = createContext<Ctx | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const stored = localStorage.getItem("lang")?.trim();
  if (stored === "en" || stored === "ru") return stored;
  return "ru";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme")?.trim();
  if (stored === "dark" || stored === "light") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  return prefersDark ? "dark" : "light";
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<Ctx>(() => {
    return {
      lang,
      setLang: (l) => setLangState(l),
      toggleLang: () => setLangState((prev) => (prev === "ru" ? "en" : "ru")),
      theme,
      setTheme: (t) => setThemeState(t),
      toggleTheme: () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
      t: (key, vars) => translate(lang, key, vars),
    };
  }, [lang, theme]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
