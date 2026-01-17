import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { EventBootstrap } from "@/components/EventBootstrap";
import { TelegramGate } from "@/components/TelegramGate";
import { ProfileGate } from "@/components/ProfileGate";
import { AppSettingsProvider } from "@/components/AppSettingsProvider";
import { AppToggles } from "@/components/AppToggles";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <AppSettingsProvider>
          <EventBootstrap />
          <TelegramGate />
          <ProfileGate />
          <AppToggles />
          <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-20 pt-4 text-[color:var(--foreground)]">
            {children}
          </div>
          <BottomNav />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
