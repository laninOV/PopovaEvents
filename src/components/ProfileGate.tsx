"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";

const ALLOWLIST_PREFIXES = ["/api", "/form", "/admin"];

export function ProfileGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const profileExistsRef = useRef<boolean | null>(null);

  const allowlisted = ALLOWLIST_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    const defer = (fn: () => void) => {
      if (typeof queueMicrotask === "function") queueMicrotask(fn);
      else setTimeout(fn, 0);
    };

    if (allowlisted) {
      defer(() => setChecked(true));
      return;
    }
    if (profileExistsRef.current === true) {
      defer(() => setChecked(true));
      return;
    }

    defer(() => setChecked(false));
    tgReady();
    apiFetch<{ profile: unknown | null }>("/api/profile")
      .then((r) => {
        const exists = Boolean(r.profile);
        profileExistsRef.current = exists;
        setChecked(true);
        if (!exists) router.replace("/form");
      })
      .catch(() => {
        setChecked(true);
      });
  }, [allowlisted, router]);

  if (allowlisted || checked) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white" aria-hidden>
      <div className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-4">
        <div className="text-sm text-zinc-600">Загрузка…</div>
      </div>
    </div>
  );
}
