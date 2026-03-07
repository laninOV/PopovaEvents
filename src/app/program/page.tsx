"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";
import { AppToggles } from "@/components/AppToggles";
import { localDateTimeToUtcIso, normalizeEventTimeZone, utcIsoToLocalDateTime } from "@/lib/timezone";

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

type ProgramResponse = {
  schedule: ScheduleItem[];
  speakers: Speaker[];
  serverNow?: string;
  eventTimeZone?: string;
};

type ParsedScheduleItem = {
  item: ScheduleItem;
  start: Date;
  end: Date | null;
  effectiveEnd: Date;
};

function parseScheduleDateTime(raw: string | null, timeZone = "Europe/Moscow", baseDate = new Date()): Date | null {
  const tz = normalizeEventTimeZone(timeZone);
  const v = (raw ?? "").trim();
  if (!v) return null;

  // ISO or near-ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    // If timezone is missing, interpret value in event timezone.
    const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(v);
    if (!hasTz) {
      const iso = localDateTimeToUtcIso(v, tz);
      if (!iso) return null;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "YYYY-MM-DD HH:mm[:ss]" → make it ISO-like (important for some WebViews)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) {
    const normalized = v.replace(" ", "T");
    const iso = localDateTimeToUtcIso(normalized, tz);
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "DD.MM.YYYY HH:mm"
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
    const iso = localDateTimeToUtcIso(`${yyyy}-${mm}-${dd}T${hh}:${mi}`, tz);
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "HH:mm" (assume today in event timezone)
  const t = v.match(/^(\d{2}):(\d{2})$/);
  if (t) {
    const [, hh, mi] = t;
    const baseLocal = utcIsoToLocalDateTime(baseDate.toISOString(), tz);
    if (!baseLocal) return null;
    const dayPrefix = baseLocal.slice(0, 10);
    const iso = localDateTimeToUtcIso(`${dayPrefix}T${hh}:${mi}`, tz);
    if (!iso) return null;
    const d = new Date(iso);
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

function resolveSafeTimeZone(raw: string | null | undefined) {
  return normalizeEventTimeZone(raw);
}

export default function ProgramPage() {
  const [tab, setTab] = useState<"program" | "speakers">("program");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeCorrectionMsRef = useRef<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const [eventTimeZone, setEventTimeZone] = useState<string>("Europe/Moscow");
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
    let active = true;
    tgReady();
    apiFetch<ProgramResponse>("/api/program")
      .then((r) => {
        if (!active) return;
        setItems(r.schedule);
        setSpeakers(r.speakers);
        setEventTimeZone(resolveSafeTimeZone(r.eventTimeZone));
        const serverNow = parseScheduleDateTime(r.serverNow ?? null);
        timeCorrectionMsRef.current = serverNow ? serverNow.getTime() - Date.now() : 0;
        setNow(new Date(Date.now() + timeCorrectionMsRef.current));
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Ошибка");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + timeCorrectionMsRef.current));
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const speakersById = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: eventTimeZone,
      }),
    [eventTimeZone],
  );
  const parsedTimeline = useMemo<ParsedScheduleItem[]>(() => {
    const parsed = items
      .map((item) => {
        const start = parseScheduleDateTime(item.startsAt, eventTimeZone, now);
        if (!start) return null;
        const end = parseScheduleDateTime(item.endsAt, eventTimeZone, now);
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
  }, [eventTimeZone, items, now]);
  const parsedTimelineById = useMemo(
    () => new Map(parsedTimeline.map((entry) => [entry.item.id, entry])),
    [parsedTimeline],
  );
  const speakerIdSet = useMemo(() => new Set(speakers.map((s) => s.id)), [speakers]);
  const current = useMemo<ParsedScheduleItem | null>(() => {
    let currentItem: ParsedScheduleItem | null = null;
    for (const entry of parsedTimeline) {
      if (now >= entry.start && now < entry.effectiveEnd) {
        // Keep the last active item: when slots overlap, we select the latest started one.
        currentItem = entry;
      }
    }
    return currentItem;
  }, [now, parsedTimeline]);
  const currentItemId = current?.item.id ?? null;
  const currentSpeakerId =
    current?.item.speakerId && speakerIdSet.has(current.item.speakerId) ? current.item.speakerId : null;

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
    if (!currentItemId) {
      lastProgramScrollIdRef.current = null;
      return;
    }
    if (lastProgramScrollIdRef.current === currentItemId) return;
    lastProgramScrollIdRef.current = currentItemId;
    const el = programRefs.current[currentItemId] ?? document.getElementById(`program-item-${currentItemId}`);
    scrollToEl(el);
    const tId = setTimeout(() => {
      const retry = programRefs.current[currentItemId] ?? document.getElementById(`program-item-${currentItemId}`);
      scrollToEl(retry);
    }, 350);
    return () => clearTimeout(tId);
  }, [tab, currentItemId]);

  useEffect(() => {
    if (tab !== "speakers") return;
    if (!currentSpeakerId) {
      lastSpeakerScrollIdRef.current = null;
      return;
    }
    const defer = (fn: () => void) => {
      if (typeof queueMicrotask === "function") queueMicrotask(fn);
      else setTimeout(fn, 0);
    };
    defer(() => setExpandedSpeakerId(currentSpeakerId));
    if (lastSpeakerScrollIdRef.current === currentSpeakerId) return;
    lastSpeakerScrollIdRef.current = currentSpeakerId;
    const el =
      speakerRefs.current[currentSpeakerId] ?? document.getElementById(`speaker-item-${currentSpeakerId}`);
    scrollToEl(el);
    const tId = setTimeout(() => {
      const retry =
        speakerRefs.current[currentSpeakerId] ?? document.getElementById(`speaker-item-${currentSpeakerId}`);
      scrollToEl(retry);
    }, 350);
    return () => clearTimeout(tId);
  }, [tab, currentSpeakerId]);

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
            <div>eventTimeZone: {eventTimeZone}</div>
            <div>currentItemId: {currentItemId ?? "—"}</div>
            <div>currentSpeakerId: {currentSpeakerId ?? "—"}</div>
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
              const start = parsed?.start ?? parseScheduleDateTime(it.startsAt, eventTimeZone, now);
              const end = parsed?.end ?? parseScheduleDateTime(it.endsAt, eventTimeZone, now);
              const time = start
                ? `${timeFormatter.format(start)}${end ? `–${timeFormatter.format(end)}` : ""}`
                : it.startsAt;
              const speakerName = it.speakerId ? speakersById.get(it.speakerId) : null;
              const isCurrent = currentItemId === it.id;

              return (
                <li
                  key={it.id}
                  id={`program-item-${it.id}`}
                  ref={(el) => {
                    programRefs.current[it.id] = el;
                  }}
                  className={`card p-4 ${isCurrent ? "program-current" : ""}`}
                >
                  <div className="flex items-center justify-between text-sm text-[color:var(--muted-fg)]">
                    <div>{time}</div>
                    {isCurrent ? <span className="program-current-badge">{t("program.badge.now")}</span> : null}
                  </div>
                  <div className="mt-1 text-base font-semibold">{it.title}</div>
                  {speakerName ? (
                    <div className={`mt-0.5 text-sm ${isCurrent ? "program-current-speaker" : "text-[color:var(--muted-fg)]"}`}>
                      {speakerName}
                    </div>
                  ) : null}
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
              const isFocused = currentSpeakerId === s.id;
              return (
                <li
                  key={s.id}
                  id={`speaker-item-${s.id}`}
                  ref={(el) => {
                    speakerRefs.current[s.id] = el;
                  }}
                  className={`card p-4 ${isFocused ? "program-current" : ""}`}
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
                          {isFocused ? <span className="program-current-badge">{t("program.badge.now")}</span> : null}
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
