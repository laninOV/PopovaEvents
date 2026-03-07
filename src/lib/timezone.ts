const FALLBACK_EVENT_TIMEZONE = "Europe/Moscow";

export function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeEventTimeZone(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return FALLBACK_EVENT_TIMEZONE;
  return isValidIanaTimeZone(raw) ? raw : FALLBACK_EVENT_TIMEZONE;
}

export function getDefaultEventTimeZone() {
  return normalizeEventTimeZone(process.env.DEFAULT_EVENT_TIMEZONE);
}

type WallDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string) {
  const key = `parts:${timeZone}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

function getWallDateInTimeZone(date: Date, timeZone: string): WallDateTime {
  const parts = getPartsFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
    millisecond: date.getUTCMilliseconds(),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const wall = getWallDateInTimeZone(date, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second, 0);
  return asUtc - date.getTime();
}

function wallDateTimeToDate(wall: WallDateTime, timeZone: string) {
  const utcGuess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
    wall.millisecond,
  );
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let ts = utcGuess - offset;
  const correctedOffset = getTimeZoneOffsetMs(new Date(ts), timeZone);
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    ts = utcGuess - offset;
  }
  const result = new Date(ts);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function localDateTimeToUtcIso(localDateTime: string, timeZone: string | null | undefined) {
  const normalizedTimeZone = normalizeEventTimeZone(timeZone);
  const value = (localDateTime ?? "").trim();
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "0", ms = "0"] = m;
  const msPadded = ms.padEnd(3, "0");
  const date = wallDateTimeToDate(
    {
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: Number(h),
      minute: Number(mi),
      second: Number(s),
      millisecond: Number(msPadded),
    },
    normalizedTimeZone,
  );
  return date ? date.toISOString() : null;
}

export function utcIsoToLocalDateTime(iso: string, timeZone: string | null | undefined) {
  const normalizedTimeZone = normalizeEventTimeZone(timeZone);
  const date = new Date((iso ?? "").trim());
  if (Number.isNaN(date.getTime())) return "";
  const wall = getWallDateInTimeZone(date, normalizedTimeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}
