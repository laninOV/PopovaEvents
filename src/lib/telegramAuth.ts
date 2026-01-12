import crypto from "node:crypto";
import { NextRequest } from "next/server";

export type AuthResult =
  | { ok: true; telegramId: string; telegramUser: unknown | null }
  | { ok: false; error: "unauthorized" | "bad_init_data" };

function timingSafeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 60 * 60 * 24) {
  const params = new URLSearchParams(initData);
  const providedHash = params.get("hash");
  if (!providedHash) return { ok: false as const };

  const authDate = params.get("auth_date");
  if (authDate) {
    const authDateMs = Number(authDate) * 1000;
    if (Number.isFinite(authDateMs)) {
      const ageSeconds = Math.abs(Date.now() - authDateMs) / 1000;
      if (ageSeconds > maxAgeSeconds) return { ok: false as const };
    }
  }

  params.delete("hash");
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!timingSafeEqualHex(calculatedHash, providedHash)) return { ok: false as const };
  return { ok: true as const, params: new URLSearchParams(initData) };
}

export function getAuthFromRequest(req: NextRequest): AuthResult {
  const initDataHeader = req.headers.get("x-telegram-init-data")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const initData =
    initDataHeader ||
    (authHeader?.toLowerCase().startsWith("tma ") ? authHeader.slice(4).trim() : "") ||
    "";

  const allowMock = process.env.DEV_ALLOW_MOCK_AUTH === "1";

  if (!initData) {
    if (!allowMock) return { ok: false, error: "unauthorized" };
    const devTelegramId =
      req.headers.get("x-dev-telegram-id")?.trim() ||
      req.nextUrl.searchParams.get("devTelegramId")?.trim() ||
      process.env.DEV_TELEGRAM_ID?.trim() ||
      "";
    if (!devTelegramId) return { ok: false, error: "unauthorized" };
    return { ok: true, telegramId: devTelegramId, telegramUser: null };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    if (!allowMock) return { ok: false, error: "unauthorized" };
    const unsafeTelegramId = new URLSearchParams(initData).get("user");
    return { ok: true, telegramId: unsafeTelegramId ?? "0", telegramUser: null };
  }

  const validated = validateTelegramInitData(initData, botToken);
  if (!validated.ok) return { ok: false, error: "bad_init_data" };

  const userJson = validated.params.get("user");
  let telegramId = "";
  let telegramUser: unknown | null = null;
  if (userJson) {
    try {
      telegramUser = JSON.parse(userJson) as unknown;
      const idValue =
        telegramUser && typeof telegramUser === "object" && "id" in telegramUser
          ? (telegramUser as { id?: unknown }).id
          : undefined;
      if (typeof idValue === "number") telegramId = String(idValue);
      if (typeof idValue === "string") telegramId = idValue;
    } catch {
      telegramUser = null;
    }
  }

  if (!telegramId) return { ok: false, error: "unauthorized" };
  return { ok: true, telegramId, telegramUser };
}
