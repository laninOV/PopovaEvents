"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { AppToggles } from "@/components/AppToggles";

type Speaker = {
  id: string;
  name: string;
  photoUrl?: string | null;
  topic?: string | null;
  bio?: string | null;
  socials?: string[];
  sortOrder?: number;
};

type ScheduleItem = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  description: string | null;
  speakerId: string | null;
  location: string | null;
  sortOrder: number;
};

type ParsedScheduleItem = {
  item: ScheduleItem;
  start: Date;
  end: Date | null;
  effectiveEnd: Date;
};

function parseScheduleDateTime(raw: string | null): Date | null {
  const v = (raw ?? "").trim();
  if (!v) return null;

  const parseIsoLocalNoTz = (value: string) => {
    const m = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
    );
    if (!m) return null;
    const [, y, mo, d, h, mi, s = "0", ms = "0"] = m;
    const msPadded = ms.padEnd(3, "0");
    const dt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
      Number(msPadded),
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  // ISO or near-ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    // If timezone is missing, parse as local time (Safari/iOS can treat it as UTC).
    const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(v);
    if (!hasTz) return parseIsoLocalNoTz(v);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "YYYY-MM-DD HH:mm[:ss]" → make it ISO-like (important for some WebViews)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) {
    const normalized = v.replace(" ", "T");
    return parseIsoLocalNoTz(normalized);
  }

  // "DD.MM.YYYY HH:mm"
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "HH:mm" (assume today, local)
  const t = v.match(/^(\d{2}):(\d{2})$/);
  if (t) {
    const [, hh, mi] = t;
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(Number(hh), Number(mi), 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export default function ProgramPage() {
  const [tab, setTab] = useState<"program" | "speakers">("program");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeCorrectionMsRef = useRef<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const { t } = useAppSettings();
  const programRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const lastProgramScrollIdRef = useRef<string | null>(null);
  const speakerRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const lastSpeakerScrollIdRef = useRef<string | null>(null);
  const [expandedSpeakerId, setExpandedSpeakerId] = useState<string | null>(null);
  const programTabId = "program-tab";
  const speakersTabId = "speakers-tab";
  const programPanelId = "program-panel";
  const speakersPanelId = "speakers-panel";
  const debugTime = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("debugTime") === "1";
  }, []);

  useEffect(() => {
    tgReady();
    apiFetch<{ schedule: ScheduleItem[]; speakers: Speaker[] }>("/api/program")
      .then((r) => {
        setItems(r.schedule);
        setSpeakers(r.speakers);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // If the device clock is off, Telegram's auth_date gives us a sane reference (server-side epoch seconds).
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { auth_date?: unknown } } } })
        .Telegram?.WebApp;
      const authDateSec = tg?.initDataUnsafe?.auth_date;
      if (typeof authDateSec === "number" && Number.isFinite(authDateSec) && authDateSec > 0) {
        const authMs = authDateSec * 1000;
        const offset = authMs - Date.now();
        // Apply correction only if the drift is significant (2+ minutes).
        if (Math.abs(offset) > 2 * 60 * 1000) timeCorrectionMsRef.current = offset;
      }
    } catch {
      // ignore
    }

    const tick = () => setNow(new Date(Date.now() + timeCorrectionMsRef.current));
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const speakersById = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);
  const parsedTimeline = useMemo<ParsedScheduleItem[]>(() => {
    const parsed = items
      .map((item) => {
        const start = parseScheduleDateTime(item.startsAt);
        if (!start) return null;
        const end = parseScheduleDateTime(item.endsAt);
        return { item, start, end };
      })
      .filter((x): x is { item: ScheduleItem; start: Date; end: Date | null } => Boolean(x))
      .sort((a, b) => {
        const byStart = a.start.getTime() - b.start.getTime();
        if (byStart !== 0) return byStart;
        return a.item.sortOrder - b.item.sortOrder;
      });

    return parsed.map((entry, index, arr) => {
      const nextStart = arr[index + 1]?.start ?? null;
      const explicitEnd = entry.end && entry.end > entry.start ? entry.end : null;
      const inferredEnd = !explicitEnd && nextStart && nextStart > entry.start ? nextStart : null;
      const effectiveEnd = explicitEnd ?? inferredEnd ?? new Date(entry.start.getTime() + 60 * 60 * 1000);
      return { ...entry, effectiveEnd };
    });
  }, [items]);
  const parsedTimelineById = useMemo(
    () => new Map(parsedTimeline.map((entry) => [entry.item.id, entry])),
    [parsedTimeline],
  );
  const focus = useMemo(() => {
    const speakerIdSet = new Set(speakers.map((s) => s.id));
    let current: ParsedScheduleItem | null = null;
    for (const x of parsedTimeline) {
      if (now >= x.start && now < x.effectiveEnd) {
        current = x;
        break;
      }
    }

    let next: ParsedScheduleItem | null = null;
    for (const x of parsedTimeline) {
      if (x.start > now && (!next || x.start < next.start)) next = x;
    }

    const focused = current ?? next ?? (parsedTimeline.length ? parsedTimeline[parsedTimeline.length - 1] : null);
    const kind: "current" | "next" | "closest" | null = current ? "current" : next ? "next" : focused ? "closest" : null;

    const focusedWithSpeaker =
      focused?.item.speakerId && speakerIdSet.has(focused.item.speakerId)
        ? focused
        : (kind === "next" ? next : null) ||
          parsedTimeline.find((x) => x.start > now && x.item.speakerId && speakerIdSet.has(x.item.speakerId)) ||
          parsedTimeline.find((x) => x.item.speakerId && speakerIdSet.has(x.item.speakerId)) ||
          null;

    return {
      kind,
      itemId: focused?.item.id ?? null,
      speakerId: focusedWithSpeaker?.item.speakerId ?? speakers[0]?.id ?? null,
    };
  }, [now, parsedTimeline, speakers]);

  function scrollToEl(el: HTMLElement | null) {
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  useEffect(() => {
    if (tab !== "program") return;
    if (!focus.itemId) return;
    const itemId = focus.itemId;
    if (lastProgramScrollIdRef.current === itemId) return;
    lastProgramScrollIdRef.current = itemId;
    const el = programRefs.current[itemId] ?? document.getElementById(`program-item-${itemId}`);
    scrollToEl(el);
    const tId = setTimeout(() => {
      const retry = programRefs.current[itemId] ?? document.getElementById(`program-item-${itemId}`);
      scrollToEl(retry);
    }, 350);
    return () => clearTimeout(tId);
  }, [tab, focus.itemId]);

  useEffect(() => {
    if (tab !== "speakers") return;
    if (!focus.speakerId) return;
    const speakerId = focus.speakerId;
    const defer = (fn: () => void) => {
      if (typeof queueMicrotask === "function") queueMicrotask(fn);
      else setTimeout(fn, 0);
    };
    defer(() => setExpandedSpeakerId(speakerId));
    if (lastSpeakerScrollIdRef.current === speakerId) return;
    lastSpeakerScrollIdRef.current = speakerId;
    const el = speakerRefs.current[speakerId] ?? document.getElementById(`speaker-item-${speakerId}`);
    scrollToEl(el);
    const tId = setTimeout(() => {
      const retry = speakerRefs.current[speakerId] ?? document.getElementById(`speaker-item-${speakerId}`);
      scrollToEl(retry);
    }, 350);
    return () => clearTimeout(tId);
  }, [tab, focus.speakerId]);

  function handleTabsKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
    }
    if (e.key === "ArrowRight" || e.key === "End") setTab("speakers");
    if (e.key === "ArrowLeft" || e.key === "Home") setTab("program");
  }

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[1.9rem] leading-tight">{t("program.title")}</h1>
        <AppToggles />
      </header>

      {debugTime ? (
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer select-none font-semibold">Time debug</summary>
          <div className="mt-2 grid gap-1 text-xs text-[color:var(--muted-fg)]">
            <div>device: {new Date().toString()}</div>
            <div>now: {now.toString()}</div>
            <div>nowMs: {now.getTime()}</div>
            <div>tz: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
            <div>offset(min): {-new Date().getTimezoneOffset()}</div>
            <div>correctionMs: {timeCorrectionMsRef.current}</div>
            <div>focus: {JSON.stringify(focus)}</div>
            <div>items: {items.length}</div>
            <div>sample: {items[0]?.startsAt ?? "—"}</div>
          </div>
        </details>
      ) : null}

      <section className="segmented" role="tablist" aria-label={t("program.title")}>
        <div className="segmented-track grid-cols-2">
          <button
            type="button"
            id={programTabId}
            role="tab"
            aria-selected={tab === "program"}
            aria-controls={programPanelId}
            tabIndex={tab === "program" ? 0 : -1}
            onClick={() => setTab("program")}
            onKeyDown={handleTabsKeyDown}
            className={`segmented-tab ${tab === "program" ? "segmented-tab-active" : ""}`}
          >
            <span>{t("program.tab.program")}</span>
            {tab === "program" ? <span className="segmented-tab-indicator" aria-hidden /> : null}
          </button>
          <button
            type="button"
            id={speakersTabId}
            role="tab"
            aria-selected={tab === "speakers"}
            aria-controls={speakersPanelId}
            tabIndex={tab === "speakers" ? 0 : -1}
            onClick={() => setTab("speakers")}
            onKeyDown={handleTabsKeyDown}
            className={`segmented-tab ${tab === "speakers" ? "segmented-tab-active" : ""}`}
          >
            <span>{t("program.tab.speakers")}</span>
            {tab === "speakers" ? <span className="segmented-tab-indicator" aria-hidden /> : null}
          </button>
        </div>
      </section>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-[color:var(--muted-fg)]">Загрузка…</div> : null}

      {tab === "program" ? (
        <section id={programPanelId} role="tabpanel" aria-labelledby={programTabId} className="space-y-2">
          {!loading && items.length === 0 ? (
            <section className="card p-4">
              <div className="text-sm text-[color:var(--muted-fg)]">{t("program.empty")}</div>
            </section>
          ) : null}
          <ul className="space-y-2">
            {items.map((it) => {
              const parsed = parsedTimelineById.get(it.id);
              const start = parsed?.start ?? parseScheduleDateTime(it.startsAt);
              const end = parsed?.end ?? parseScheduleDateTime(it.endsAt);
              const time = start
                ? `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}${
                    end ? `–${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""
                  }`
                : it.startsAt;
              const speakerName = it.speakerId ? speakersById.get(it.speakerId) : null;
              const fallbackEnd = start
                ? parsed?.effectiveEnd ??
                  (end && end > start ? end : new Date(start.getTime() + 60 * 60 * 1000))
                : null;
              const isCurrent = start ? now >= start && now < (fallbackEnd ?? start) : false;
              const isFocusNext = !isCurrent && focus.kind === "next" && focus.itemId === it.id;
              const isFocusClosest = !isCurrent && focus.kind === "closest" && focus.itemId === it.id;

              return (
                <li
                  key={it.id}
                  id={`program-item-${it.id}`}
                  ref={(el) => {
                    programRefs.current[it.id] = el;
                  }}
                  className={`card p-4 ${isCurrent ? "program-current" : isFocusNext || isFocusClosest ? "program-next" : ""}`}
                >
                  <div className="flex items-center justify-between text-sm text-[color:var(--muted-fg)]">
                    <div>{time}</div>
                    {isCurrent ? <span className="program-current-badge">{t("program.badge.now")}</span> : null}
                    {isFocusNext ? <span className="program-next-badge">{t("program.badge.next")}</span> : null}
                    {isFocusClosest ? <span className="program-next-badge">{t("program.badge.closest")}</span> : null}
                  </div>
                  <div className="mt-1 text-base font-semibold">{it.title}</div>
                  {speakerName ? <div className="mt-0.5 text-sm text-[color:var(--muted-fg)]">{speakerName}</div> : null}
                  {it.location ? <div className="mt-0.5 text-sm text-[color:var(--muted-fg)]">{it.location}</div> : null}
                  {it.description ? <div className="mt-3 whitespace-pre-wrap text-sm">{it.description}</div> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section id={speakersPanelId} role="tabpanel" aria-labelledby={speakersTabId} className="space-y-2">
          {!loading && speakers.length === 0 ? (
            <section className="card p-4">
              <div className="text-sm text-[color:var(--muted-fg)]">{t("speakers.empty")}</div>
            </section>
          ) : null}
          <ul className="space-y-2">
            {speakers.map((s) => {
              const isFocused =
                focus.speakerId === s.id &&
                (focus.kind === "current" || focus.kind === "next" || focus.kind === "closest");
              return (
                <li
                  key={s.id}
                  id={`speaker-item-${s.id}`}
                  ref={(el) => {
                    speakerRefs.current[s.id] = el;
                  }}
                  className={`card p-4 ${isFocused && focus.kind === "current" ? "program-current" : ""} ${isFocused && (focus.kind === "next" || focus.kind === "closest") ? "program-next" : ""}`}
                >
                  <details
                    open={expandedSpeakerId === s.id}
                    onToggle={(e) => {
                      const open = (e.currentTarget as HTMLDetailsElement).open;
                      setExpandedSpeakerId(open ? s.id : null);
                    }}
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-3">
                      {s.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photoUrl} alt={s.name} className="h-12 w-12 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--muted)] text-xs text-[color:var(--muted-fg)]">
                          Фото
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-base font-semibold">{s.name}</div>
                          {isFocused && focus.kind === "current" ? (
                            <span className="program-current-badge">{t("program.badge.now")}</span>
                          ) : null}
                          {isFocused && focus.kind === "next" ? (
                            <span className="program-next-badge">{t("program.badge.next")}</span>
                          ) : null}
                          {isFocused && focus.kind === "closest" ? (
                            <span className="program-next-badge">{t("program.badge.closest")}</span>
                          ) : null}
                        </div>
                        {s.topic ? <div className="mt-0.5 text-sm text-[color:var(--muted-fg)]">{s.topic}</div> : null}
                      </div>
                      <div className="text-sm text-[color:var(--muted-fg)]">▾</div>
                    </summary>

                    <div className="mt-3">
                      {s.bio ? <div className="whitespace-pre-wrap text-sm">{s.bio}</div> : null}
                      {s.socials?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          {s.socials.map((raw) => {
                            const href = normalizeLink(raw);
                            if (!href) return null;
                            return (
                              <a key={raw} href={href} className="text-accent underline" target="_blank" rel="noreferrer">
                                {raw}
                              </a>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
