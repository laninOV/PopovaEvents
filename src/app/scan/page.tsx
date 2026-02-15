"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { AppToggles } from "@/components/AppToggles";

function getErrorName(err: unknown) {
  if (!err || typeof err !== "object") return null;
  if (!("name" in err)) return null;
  const name = (err as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const qrTabId = "scan-qr-tab";
  const scanTabId = "scan-current-tab";
  const scanPanelId = "scan-panel";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const { t } = useAppSettings();

  async function handleCode(code: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ meeting: { id: string } | null; created: boolean }>("/api/meetings/scan", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (!res.meeting?.id) throw new Error("Не удалось создать встречу");
      const status = res.created ? "added" : "exists";
      router.push(`/meetings/${res.meeting.id}?status=${status}`);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "Ошибка";
      if (raw.includes("self_scan")) setError("Нельзя сканировать свой QR.");
      else if (raw.includes("not_found")) setError("Профиль не найден. Попросите человека открыть приложение и зарегистрироваться.");
      else if (raw.includes("bad_code") || raw.includes("bad_signature") || raw.includes("expired"))
        setError("Неверный или просроченный QR-код.");
      else setError(raw);
      setBusy(false);
    }
  }

  useEffect(() => {
    tgReady();
    const video = videoRef.current;
    if (!video) return;

    const reader = new BrowserQRCodeReader();
    let canceled = false;

    reader
      .decodeFromVideoDevice(undefined, video, (result, err, controls) => {
        if (canceled) return;
        controlsRef.current = controls;
        if (result?.getText()) {
          controls.stop();
          handleCode(result.getText());
        } else if (err && getErrorName(err) !== "NotFoundException") {
          // NotFoundException is spammy while scanning, ignore it.
          setError("Не удалось распознать QR. Попробуйте ещё раз.");
        }
      })
      .catch(() => setError("Нет доступа к камере. Разрешите камеру или введите код вручную."));

    return () => {
      canceled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.9rem] leading-tight">Сканировать QR-код</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-fg)]">
            Наведите камеру на QR другого участника — встреча появится у вас обоих.
          </p>
        </div>
        <AppToggles />
      </header>

      <section className="segmented" role="tablist" aria-label={`${t("home.qr")} / ${t("home.scan")}`}>
        <div className="segmented-track grid-cols-2">
          <Link
            href="/qr"
            id={qrTabId}
            role="tab"
            aria-selected={false}
            aria-controls={scanPanelId}
            tabIndex={-1}
            className="segmented-tab"
          >
            {t("home.qr")}
          </Link>
          <button
            type="button"
            id={scanTabId}
            role="tab"
            aria-selected={true}
            aria-controls={scanPanelId}
            className="segmented-tab segmented-tab-active"
          >
            <span>{t("home.scan")}</span>
            <span className="segmented-tab-indicator" aria-hidden />
          </button>
        </div>
      </section>

      <div id={scanPanelId} role="tabpanel" aria-labelledby={scanTabId} className="space-y-4">
        {error ? (
          <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-black">
          <video ref={videoRef} className="h-80 w-full object-cover" muted playsInline />
        </section>

        <section className="card p-4">
          <div className="text-sm font-medium">Если камера недоступна</div>
          <div className="mt-1 text-xs text-[color:var(--muted-fg)]">
            Код берётся из раздела «Мой QR» — его можно скопировать кнопкой «Скопировать код».
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="input flex-1"
              placeholder="Вставьте код"
            />
            <button
              type="button"
              disabled={!manual.trim() || busy}
              onClick={() => handleCode(manual)}
              className={["btn px-4", !manual.trim() || busy ? "bg-zinc-200 text-zinc-500" : "btn-primary"].join(" ")}
            >
              OK
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
