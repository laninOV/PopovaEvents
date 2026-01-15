"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import type { I18nKey, Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

export type Theme = "light" | "dark";

type Ctx = {
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
};

const AppSettingsContext = createContext<Ctx | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const lang: Lang = "ru";
  const theme: Theme = "dark";

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<Ctx>(() => {
    return {
      t: (key, vars) => translate(lang, key, vars),
    };
  }, [lang]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
