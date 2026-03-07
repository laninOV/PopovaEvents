const FALLBACK_EVENT_TIMEZONE = "Europe/Moscow";

function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getDefaultEventTimeZone() {
  const raw = process.env.DEFAULT_EVENT_TIMEZONE?.trim() ?? "";
  if (!raw) return FALLBACK_EVENT_TIMEZONE;
  return isValidIanaTimeZone(raw) ? raw : FALLBACK_EVENT_TIMEZONE;
}
