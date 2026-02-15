"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { apiFetch } from "@/lib/api";

const items = [
  {
    href: "/",
    key: "nav.profile" as const,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="nav-dock-svg">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5 19c0-3.2 3.1-5.3 7-5.3s7 2.1 7 5.3" />
      </svg>
    ),
  },
  {
    href: "/scan",
    key: "nav.scan" as const,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="nav-dock-svg">
        <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5V8" />
        <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
        <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
        <path d="M16 20h2.5A1.5 1.5 0 0 0 20 18.5V16" />
        <path d="M7 12h10" />
      </svg>
    ),
  },
  {
    href: "/participants",
    key: "nav.participants" as const,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="nav-dock-svg">
        <circle cx="8" cy="9" r="2.5" />
        <circle cx="16.5" cy="9.5" r="2" />
        <path d="M3.5 19c0-2.7 2.4-4.5 5-4.5s5 1.8 5 4.5" />
        <path d="M14 19c.2-2 1.7-3.4 3.8-3.4S21.5 17 21.5 19" />
      </svg>
    ),
  },
  {
    href: "/program",
    key: "nav.program" as const,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="nav-dock-svg">
        <rect x="4.5" y="6.5" width="15" height="12" rx="2" />
        <path d="M8 4.5v3M16 4.5v3M4.5 10h15" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useAppSettings();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<{ profile: unknown | null }>("/api/profile")
      .then((r) => {
        if (!active) return;
        setProfileComplete(Boolean(r.profile));
      })
      .catch(() => {
        if (!active) return;
        setProfileComplete(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2">
      <div className="nav-dock mx-auto max-w-3xl">
        <ul className="grid grid-cols-4 gap-1 p-1">
          {items.map((item) => {
            const active = pathname === item.href;
            const needsProfile = item.key === "nav.profile" && profileComplete === false;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={["nav-dock-item", active ? "nav-dock-item-active" : ""].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-dock-icon" aria-hidden>
                    {item.icon}
                    {needsProfile ? <span className="nav-dock-badge" /> : null}
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
