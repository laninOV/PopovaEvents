"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import QRCode from "qrcode";

type QrResponse = { payload: string };

export default function QrPage() {
  const [payload, setPayload] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tgReady();
    apiFetch<QrResponse>("/api/qr")
      .then((r) => setPayload(r.payload))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки QR"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, { margin: 1, width: 560, errorCorrectionLevel: "M" })
      .then(setQrUrl)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка генерации QR"));
  }, [payload]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">Мой QR</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Пусть другой участник откроет «Сканировать QR» и отсканирует этот код.
        </p>
      </header>

      {error ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="card p-4">
        <div className="flex items-center justify-center">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR" className="h-64 w-64 rounded-xl bg-white p-2" />
          ) : (
            <div className="text-sm text-zinc-600">{loading ? "Генерация…" : "—"}</div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if (!payload) return;
              await navigator.clipboard.writeText(payload);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="btn btn-ghost flex-1"
          >
            {copied ? "Скопировано" : "Скопировать код"}
          </button>
        </div>
        <div className="mt-3 text-center text-xs text-zinc-500">
          {payload ? `${payload.slice(0, 12)}…${payload.slice(-8)}` : "—"}
        </div>
      </section>
    </main>
  );
}
