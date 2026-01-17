"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tgReady } from "@/lib/tgWebApp";
import { useAppSettings } from "@/components/AppSettingsProvider";

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
  const currentRef = useRef<HTMLLIElement | null>(null);
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
    const parsed = items
      .map((it) => {
        const start = new Date(it.startsAt);
        const end = it.endsAt ? new Date(it.endsAt) : null;
        const fallbackEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000);
        return { it, start, end, fallbackEnd };
      })
      .filter((x) => Number.isFinite(x.start.getTime()));

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
    const kind: "current" | "next" | "past" | null = current ? "current" : next ? "next" : focused ? "past" : null;

    const focusedWithSpeaker =
      focused?.it.speakerId
        ? focused
        : (kind === "next" ? next : null) ||
          parsed.find((x) => x.start > now && x.it.speakerId) ||
          parsed.find((x) => x.it.speakerId) ||
          null;

    return {
      kind,
      itemId: focused?.it.id ?? null,
      speakerId: focusedWithSpeaker?.it.speakerId ?? null,
    };
  }, [items, now]);

  useEffect(() => {
    if (tab !== "program") return;
    if (!focus.itemId) return;
    if (lastProgramScrollIdRef.current === focus.itemId) return;
    lastProgramScrollIdRef.current = focus.itemId;
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tab, focus.itemId]);

  useEffect(() => {
    if (tab !== "speakers") return;
    if (!focus.speakerId) return;
    const defer = (fn: () => void) => {
      if (typeof queueMicrotask === "function") queueMicrotask(fn);
      else setTimeout(fn, 0);
    };
    defer(() => setExpandedSpeakerId(focus.speakerId));
    if (lastSpeakerScrollIdRef.current === focus.speakerId) return;
    lastSpeakerScrollIdRef.current = focus.speakerId;
    speakerRefs.current[focus.speakerId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tab, focus.speakerId]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl">{t("program.title")}</h1>
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
            const start = new Date(it.startsAt);
            const end = it.endsAt ? new Date(it.endsAt) : null;
            const time = `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}${
              end ? `–${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : ""
            }`;
            const speakerName = it.speakerId ? speakersById.get(it.speakerId) : null;
            const fallbackEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000);
            const isCurrent = now >= start && now < fallbackEnd;
            const isFocusNext = !isCurrent && focus.kind === "next" && focus.itemId === it.id;

            return (
              <li
                key={it.id}
                ref={isCurrent || isFocusNext ? currentRef : null}
                className={`card p-4 ${isCurrent ? "program-current" : isFocusNext ? "program-next" : ""}`}
              >
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <div>{time}</div>
                  {isCurrent ? <span className="program-current-badge">{t("program.badge.now")}</span> : null}
                  {isFocusNext ? <span className="program-next-badge">{t("program.badge.next")}</span> : null}
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
            const isFocused = focus.speakerId === s.id && (focus.kind === "current" || focus.kind === "next");
            return (
              <li
                key={s.id}
                ref={(el) => {
                  speakerRefs.current[s.id] = el;
                }}
                className={`card p-4 ${isFocused && focus.kind === "current" ? "program-current" : ""} ${
                  isFocused && focus.kind === "next" ? "program-next" : ""
                }`}
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
