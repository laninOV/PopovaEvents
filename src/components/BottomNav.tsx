"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "@/components/AppSettingsProvider";

const items = [
  { href: "/", key: "nav.home" as const, icon: "🏠" },
  { href: "/participants", key: "nav.participants" as const, icon: "👥" },
  { href: "/program", key: "nav.program" as const, icon: "🗓️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useAppSettings();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex h-11 items-center justify-center rounded-xl text-xs font-semibold leading-tight transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "text-zinc-700 hover:bg-zinc-100",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{item.icon}</span>
                  <span>{t(item.key)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
