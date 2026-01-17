"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function parseScheduleDateTime(raw: string | null): Date | null {
  const v = (raw ?? "").trim();
  if (!v) return null;

  // ISO or near-ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "YYYY-MM-DD HH:mm[:ss]" → make it ISO-like (important for some WebViews)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) {
    const d = new Date(v.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
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
  const [now, setNow] = useState<Date>(() => new Date());
  const { t } = useAppSettings();
  const programRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const lastProgramScrollIdRef = useRef<string | null>(null);
  const speakerRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const lastSpeakerScrollIdRef = useRef<string | null>(null);
  const [expandedSpeakerId, setExpandedSpeakerId] = useState<string | null>(null);

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
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const speakersById = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);
  const focus = useMemo(() => {
    const speakerIdSet = new Set(speakers.map((s) => s.id));
    const parsed = items
      .map((it) => {
        const start = parseScheduleDateTime(it.startsAt);
        const end = parseScheduleDateTime(it.endsAt);
        if (!start) return null;
        const fallbackEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000);
        return { it, start, end, fallbackEnd };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    let current: (typeof parsed)[number] | null = null;
    for (const x of parsed) {
      if (now >= x.start && now < x.fallbackEnd) {
        current = x;
        break;
      }
    }

    let next: (typeof parsed)[number] | null = null;
    for (const x of parsed) {
      if (x.start > now && (!next || x.start < next.start)) next = x;
    }

    const focused = current ?? next ?? (parsed.length ? parsed[parsed.length - 1] : null);
    const kind: "current" | "next" | "closest" | null = current ? "current" : next ? "next" : focused ? "closest" : null;

    const focusedWithSpeaker =
      focused?.it.speakerId && speakerIdSet.has(focused.it.speakerId)
        ? focused
        : (kind === "next" ? next : null) ||
          parsed.find((x) => x.start > now && x.it.speakerId && speakerIdSet.has(x.it.speakerId)) ||
          parsed.find((x) => x.it.speakerId && speakerIdSet.has(x.it.speakerId)) ||
          null;

    return {
      kind,
      itemId: focused?.it.id ?? null,
      speakerId: focusedWithSpeaker?.it.speakerId ?? speakers[0]?.id ?? null,
    };
  }, [items, now, speakers]);

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

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">{t("program.title")}</h1>
        <AppToggles />
      </header>

      <div className="card p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab("program")}
            className={`btn h-10 ${tab === "program" ? "btn-primary" : "btn-ghost"}`}
          >
            {t("program.tab.program")}
          </button>
          <button
            type="button"
            onClick={() => setTab("speakers")}
            className={`btn h-10 ${tab === "speakers" ? "btn-primary" : "btn-ghost"}`}
          >
            {t("program.tab.speakers")}
          </button>
        </div>
      </div>

      {error ? <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-600">Загрузка…</div> : null}

      {!loading && tab === "program" && items.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-[color:var(--muted-fg)]">{t("program.empty")}</div>
        </section>
      ) : null}

      {!loading && tab === "speakers" && speakers.length === 0 ? (
        <section className="card p-4">
          <div className="text-sm text-[color:var(--muted-fg)]">{t("speakers.empty")}</div>
        </section>
      ) : null}

      {tab === "program" ? (
        <ul className="space-y-2">
          {items.map((it) => {
            const start = parseScheduleDateTime(it.startsAt);
            const end = parseScheduleDateTime(it.endsAt);
            const time = start
              ? `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}${
                  end ? `–${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""
                }`
              : it.startsAt;
            const speakerName = it.speakerId ? speakersById.get(it.speakerId) : null;
            const fallbackEnd = start ? end ?? new Date(start.getTime() + 60 * 60 * 1000) : null;
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
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <div>{time}</div>
                  {isCurrent ? <span className="program-current-badge">{t("program.badge.now")}</span> : null}
                  {isFocusNext ? <span className="program-next-badge">{t("program.badge.next")}</span> : null}
                  {isFocusClosest ? <span className="program-next-badge">{t("program.badge.closest")}</span> : null}
                </div>
                <div className="mt-1 text-base font-semibold">{it.title}</div>
                {speakerName ? <div className="mt-0.5 text-sm text-zinc-600">{speakerName}</div> : null}
                {it.location ? <div className="mt-0.5 text-sm text-zinc-600">{it.location}</div> : null}
                {it.description ? <div className="mt-3 whitespace-pre-wrap text-sm">{it.description}</div> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-2">
          {speakers.map((s) => {
            const isFocused = focus.speakerId === s.id && (focus.kind === "current" || focus.kind === "next" || focus.kind === "closest");
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
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-xs text-zinc-600">
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
                      {s.topic ? <div className="mt-0.5 text-sm text-zinc-600">{s.topic}</div> : null}
                    </div>
                    <div className="text-sm text-zinc-600">▾</div>
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
      )}
    </main>
  );
}
