export function isAdminTelegramId(telegramId: string) {
  const raw = process.env.ADMIN_TELEGRAM_IDS ?? "";
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return set.has(String(telegramId).trim());
}

