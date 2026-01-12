import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { EventBootstrap } from "@/components/EventBootstrap";
import { TelegramGate } from "@/components/TelegramGate";
import { ProfileGate } from "@/components/ProfileGate";

export const metadata: Metadata = {
  title: "Popova Events",
  description: "Telegram Mini App для оффлайн-ивентов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <EventBootstrap />
        <TelegramGate />
        <ProfileGate />
        <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-20 pt-4 text-zinc-900">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
