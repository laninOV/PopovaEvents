import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Bebas_Neue, Montserrat } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { EventBootstrap } from "@/components/EventBootstrap";
import { TelegramGate } from "@/components/TelegramGate";
import { ProfileGate } from "@/components/ProfileGate";
import { AppSettingsProvider } from "@/components/AppSettingsProvider";
import { PageContainer } from "@/components/PageContainer";

const fontSans = Montserrat({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans-family",
});

const fontHeading = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-heading-family",
});

export const metadata: Metadata = {
  title: "Mini App",
  description: "Telegram Mini App",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const storedLang = localStorage.getItem("lang");
    if (storedLang) document.documentElement.lang = storedLang;

    const storedTheme = localStorage.getItem("theme");
    const isValidTheme = storedTheme === "light" || storedTheme === "dark";
    let theme = isValidTheme ? storedTheme : null;

    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    try {
      if (tg && typeof tg.ready === "function") tg.ready();
      if (tg && typeof tg.expand === "function") tg.expand();
    } catch {
      // ignore
    }
    if (!theme && tg && (tg.colorScheme === "light" || tg.colorScheme === "dark")) {
      theme = tg.colorScheme;
    }
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }

    document.documentElement.dataset.theme = theme;
  } catch {
    // ignore
  }
})();
`;

const HYDRATED_SCRIPT = `
(() => {
  try {
    document.documentElement.dataset.hydrated = "1";
  } catch {
    // ignore
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${fontSans.variable} ${fontHeading.variable}`}>
      <body className="antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script id="bootstrap" strategy="beforeInteractive">
          {BOOTSTRAP_SCRIPT}
        </Script>
        <div className="app-splash" aria-hidden>
          <div className="app-splash-inner">
            <div className="app-splash-title">Popova Events</div>
            <div className="app-splash-subtitle">Загрузка…</div>
          </div>
        </div>
        <Script id="hydrated" strategy="afterInteractive">
          {HYDRATED_SCRIPT}
        </Script>
        <AppSettingsProvider>
          <EventBootstrap />
          <TelegramGate />
          <ProfileGate />
          <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-20 pt-4 text-[color:var(--foreground)]">
            <PageContainer>{children}</PageContainer>
          </div>
          <BottomNav />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
