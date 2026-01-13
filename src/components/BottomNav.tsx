"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "@/components/AppSettingsProvider";

const items = [
  { href: "/profile", key: "nav.profile" as const, icon: "👤" },
  { href: "/scan", key: "nav.scan" as const, icon: "📷" },
  { href: "/participants", key: "nav.participants" as const, icon: "👥" },
  { href: "/program", key: "nav.program" as const, icon: "🗓️" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useAppSettings();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2">
      <div className="nav-dock mx-auto max-w-3xl">
        <ul className="grid grid-cols-4 gap-1 p-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={["nav-dock-item", active ? "nav-dock-item-active" : ""].join(" ")}
                >
                  <span className="nav-dock-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="nav-dock-label">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
