"use client";

import { useState } from "react";
import { getTelegramWebApp } from "@/lib/tgWebApp";

export function TelegramGate() {
  const initialDevId =
    typeof window !== "undefined" ? localStorage.getItem("devTelegramId")?.trim() ?? "" : "";
  const initialAllowed =
    typeof window !== "undefined" ? Boolean(getTelegramWebApp()?.initData || initialDevId) : true;

  const [allowed] = useState(initialAllowed);
  const [devId, setDevId] = useState(initialDevId);

  if (allowed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4">
      <div className="card w-full max-w-md p-5">
        <h1 className="text-2xl">Откройте через Telegram</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Mini App работает внутри Telegram. Откройте приложение из бота через кнопку WebApp.
        </p>

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="text-sm font-semibold">Dev режим (браузер)</div>
          <p className="mt-1 text-sm text-zinc-600">Введите Telegram ID, чтобы включить mock‑авторизацию.</p>
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
          <div className="mt-2 text-xs text-zinc-500">Нужен `DEV_ALLOW_MOCK_AUTH=1` на backend.</div>
        </div>
      </div>
    </div>
  );
}
