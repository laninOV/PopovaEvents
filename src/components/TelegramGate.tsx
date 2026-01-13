"use client";

import { useState } from "react";
import { getTelegramWebApp } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

export function TelegramGate() {
  const { t } = useAppSettings();
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const hasTelegramObject = typeof window !== "undefined" && Boolean(window.Telegram);
  const hasWebAppObject = typeof window !== "undefined" && Boolean(window.Telegram?.WebApp);
  const initialDevId =
    typeof window !== "undefined" ? localStorage.getItem("devTelegramId")?.trim() ?? "" : "";
  const initData = typeof window !== "undefined" ? (getTelegramWebApp()?.initData ?? "") : "";
  const initialAllowed =
    typeof window !== "undefined" ? Boolean(initData || (isDevHost && initialDevId)) : true;

  const [allowed] = useState(initialAllowed);
  const [devId, setDevId] = useState(initialDevId);

  if (allowed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--background)] px-4">
      <div className="card w-full max-w-md p-5">
        <h1 className="text-2xl">{t("gate.telegram.title")}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-fg)]">{t("gate.telegram.body")}</p>

        <details className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-3 text-xs text-[color:var(--muted-fg)]">
          <summary className="cursor-pointer select-none font-semibold">Диагностика</summary>
          <div className="mt-2 grid gap-1">
            <div>
              <span className="font-semibold">window.Telegram:</span> {String(hasTelegramObject)}
            </div>
            <div>
              <span className="font-semibold">window.Telegram.WebApp:</span> {String(hasWebAppObject)}
            </div>
            <div>
              <span className="font-semibold">initData length:</span> {String(initData.length)}
            </div>
            <div>
              <span className="font-semibold">url:</span> {typeof window !== "undefined" ? window.location.href : ""}
            </div>
          </div>
          <div className="mt-2">
            Если <span className="font-semibold">initData length = 0</span>, значит Telegram не передаёт данные WebApp:
            проверьте, что открываете именно как Mini App (Main App/Menu Button) и что URL начинается с{" "}
            <span className="font-semibold">https://</span>.
          </div>
        </details>

        {isDevHost ? (
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
        ) : null}
      </div>
    </div>
  );
}
