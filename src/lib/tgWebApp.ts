export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  colorScheme?: "light" | "dark";
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

export function getTelegramUnsafeUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function tgReady() {
  const wa = getTelegramWebApp();
  wa?.ready?.();
  wa?.expand?.();
}
