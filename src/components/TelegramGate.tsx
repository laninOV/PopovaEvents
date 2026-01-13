"use client";

import { useState } from "react";
import { getTelegramWebApp } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

export function TelegramGate() {
  const { t } = useAppSettings();
  const initialDevId =
    typeof window !== "undefined" ? localStorage.getItem("devTelegramId")?.trim() ?? "" : "";
  const initialAllowed =
    typeof window !== "undefined" ? Boolean(getTelegramWebApp()?.initData || initialDevId) : true;

  const [allowed] = useState(initialAllowed);
  const [devId, setDevId] = useState(initialDevId);

  if (allowed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--background)] px-4">
      <div className="card w-full max-w-md p-5">
        <h1 className="text-2xl">{t("gate.telegram.title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-fg)]">{t("gate.telegram.body")}</p>

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="text-sm font-semibold">{t("gate.dev.title")}</div>
          <p className="mt-1 text-sm text-[color:var(--muted-fg)]">{t("gate.dev.body")}</p>
          <div className="mt-2 flex gap-2">
            <input
              value={devId}
              onChange={(e) => setDevId(e.target.value)}
              className="input flex-1"
              placeholder="например: 123456789"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => {
                const v = devId.trim();
                if (!v) return;
                localStorage.setItem("devTelegramId", v);
                window.location.reload();
              }}
              className="btn btn-primary px-3"
            >
              OK
            </button>
          </div>
          <div className="mt-2 text-xs text-[color:var(--muted-fg)]">{t("gate.dev.hint")}</div>
        </div>
      </div>
    </div>
  );
}
