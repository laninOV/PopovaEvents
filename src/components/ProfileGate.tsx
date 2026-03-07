"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { useBootstrap } from "@/components/BootstrapProvider";

const ALLOWLIST_PREFIXES = ["/api", "/form", "/admin"];

export function ProfileGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAppSettings();
  const { data, loading } = useBootstrap();

  const allowlisted = ALLOWLIST_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const waitingForBootstrap = !allowlisted && loading && !data;

  useEffect(() => {
    if (allowlisted) return;
    if (loading) return;
    if (!data) return;
    if (!data.profile) router.replace("/form");
  }, [allowlisted, data, loading, router]);

  if (!waitingForBootstrap) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[color:var(--background)]" aria-hidden>
      <div className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-4">
        <div className="text-sm text-[color:var(--muted-fg)]">{t("gate.loading")}</div>
      </div>
    </div>
  );
}
