import crypto from "node:crypto";
import { createPool, type VercelPool } from "@vercel/postgres";
import type { DbProfile, DbUser, UpsertProfileInput } from "@/lib/db";

export type EventMode = "legacy" | "tenant";

export type ControlEvent = {
  id: string;
  slug: string;
  name: string;
  status: string;
  mode: EventMode;
};

export type EventTenantConfig = {
  eventSlug: string;
  pooledConnectionString: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type SqlParam = string | number | boolean | null | undefined | Date | string[] | number[] | boolean[];
type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount: number;
};

const poolCache = new Map<string, VercelPool>();
const initByConnection = new Map<string, Promise<void>>();

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function normalizeSqlParam(
  value: SqlParam,
): string | number | boolean | null | string[] | number[] | boolean[] {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function buildPgQuery(strings: TemplateStringsArray, values: SqlParam[]) {
  let text = "";
  for (let i = 0; i < strings.length; i += 1) {
    text += strings[i];
    if (i < strings.length - 1) text += `$${i + 1}`;
  }
  return { text, params: values.map(normalizeSqlParam) };
}

function getControlConnectionString() {
  return (
    process.env.CONTROL_POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    ""
  );
}

function getControlPool(): VercelPool {
  const connectionString = getControlConnectionString();
  if (!connectionString) {
    throw new Error("missing_control_postgres_url");
  }

  const cached = poolCache.get(connectionString);
  if (cached) return cached;

  const pool = createPool({ connectionString });
  poolCache.set(connectionString, pool);
  return pool;
}

async function controlQuery<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: SqlParam[]) {
  const pool = getControlPool();
  const { text, params } = buildPgQuery(strings, values);
  const result = await pool.query(text, params);
  return {
    rows: (result.rows ?? []) as T[],
    rowCount: Number(result.rowCount ?? (result.rows ?? []).length),
  } satisfies QueryResult<T>;
}

export function isMultiDbRoutingEnabled() {
  return process.env.MULTI_DB_ROUTING === "1";
}

export function maskConnectionString(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const keep = Math.min(6, raw.length);
  return `${"*".repeat(Math.max(0, raw.length - keep))}${raw.slice(-keep)}`;
}

function getDefaultEventName() {
  return process.env.DEFAULT_EVENT_NAME?.trim() || "Popova Events";
}

function getDefaultEventSlug() {
  return process.env.DEFAULT_EVENT_SLUG?.trim() || "default";
}

export async function ensureControlSchema() {
  const connectionString = getControlConnectionString();
  if (!connectionString) throw new Error("missing_control_postgres_url");

  const existing = initByConnection.get(connectionString);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    await controlQuery`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        mode TEXT NOT NULL DEFAULT 'legacy',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    await controlQuery`
      CREATE TABLE IF NOT EXISTS event_tenants (
        event_slug TEXT PRIMARY KEY REFERENCES events(slug) ON DELETE CASCADE,
        pooled_connection_string TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    await controlQuery`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        telegram_id TEXT UNIQUE NOT NULL,
        public_id TEXT UNIQUE NOT NULL,
        telegram_photo_url TEXT,
        created_at TEXT NOT NULL
      )
    `;

    await controlQuery`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        photo_url TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT,
        instagram TEXT,
        niche TEXT,
        about TEXT,
        helpful TEXT,
        updated_at TEXT NOT NULL
      )
    `;

    await controlQuery`
      CREATE TABLE IF NOT EXISTS bot_users (
        telegram_id TEXT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        is_registered INTEGER NOT NULL DEFAULT 0
      )
    `;

    const defaultSlug = getDefaultEventSlug();
    const defaultName = getDefaultEventName();
    const ts = nowIso();

    await controlQuery`
      INSERT INTO events (id, slug, name, status, mode, created_at, updated_at)
      VALUES (${newId()}, ${defaultSlug}, ${defaultName}, 'active', 'legacy', ${ts}, ${ts})
      ON CONFLICT (slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
    `;
  })();

  initByConnection.set(connectionString, promise);
  await promise;
}

function mapEvent(row: {
  id: string;
  slug: string;
  name: string;
  status: string;
  mode: string;
}): ControlEvent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    mode: row.mode === "tenant" ? "tenant" : "legacy",
  };
}

export async function getControlEventBySlug(slug: string): Promise<ControlEvent | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    id: string;
    slug: string;
    name: string;
    status: string;
    mode: string;
  }>`
    SELECT id, slug, name, status, mode
    FROM events
    WHERE slug = ${slug}
    LIMIT 1
  `;
  const row = result.rows[0];
  return row ? mapEvent(row) : null;
}

export async function getControlEventById(eventId: string): Promise<ControlEvent | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    id: string;
    slug: string;
    name: string;
    status: string;
    mode: string;
  }>`
    SELECT id, slug, name, status, mode
    FROM events
    WHERE id = ${eventId}
    LIMIT 1
  `;
  const row = result.rows[0];
  return row ? mapEvent(row) : null;
}

export async function ensureDefaultControlEvent() {
  const slug = getDefaultEventSlug();
  const name = getDefaultEventName();
  await ensureControlSchema();

  const existing = await getControlEventBySlug(slug);
  if (existing) return existing;

  const ts = nowIso();
  await controlQuery`
    INSERT INTO events (id, slug, name, status, mode, created_at, updated_at)
    VALUES (${newId()}, ${slug}, ${name}, 'active', 'legacy', ${ts}, ${ts})
  `;
  return (await getControlEventBySlug(slug))!;
}

export async function ensureControlEventBySlug(slug: string): Promise<ControlEvent | null> {
  await ensureControlSchema();
  const existing = await getControlEventBySlug(slug);
  if (existing) return existing;

  if (process.env.ALLOW_PUBLIC_EVENT_CREATE !== "1") return null;

  const ts = nowIso();
  const name = slug === getDefaultEventSlug() ? getDefaultEventName() : slug;
  await controlQuery`
    INSERT INTO events (id, slug, name, status, mode, created_at, updated_at)
    VALUES (${newId()}, ${slug}, ${name}, 'active', 'legacy', ${ts}, ${ts})
  `;

  return (await getControlEventBySlug(slug))!;
}

export async function getActiveEventTenantBySlug(slug: string): Promise<EventTenantConfig | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    event_slug: string;
    pooled_connection_string: string;
    active: number | boolean;
    created_at: string;
    updated_at: string;
  }>`
    SELECT event_slug, pooled_connection_string, active, created_at, updated_at
    FROM event_tenants
    WHERE event_slug = ${slug} AND active = 1
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) return null;
  return {
    eventSlug: row.event_slug,
    pooledConnectionString: row.pooled_connection_string,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTenantConfigs() {
  await ensureControlSchema();
  const result = await controlQuery<{
    id: string;
    slug: string;
    name: string;
    status: string;
    mode: string;
    pooled_connection_string: string | null;
    active: number | boolean | null;
    tenant_created_at: string | null;
    tenant_updated_at: string | null;
  }>`
    SELECT
      e.id,
      e.slug,
      e.name,
      e.status,
      e.mode,
      t.pooled_connection_string,
      t.active,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM events e
    LEFT JOIN event_tenants t ON t.event_slug = e.slug
    ORDER BY e.slug ASC
  `;

  return result.rows.map((row) => ({
    event: mapEvent(row),
    tenant: row.pooled_connection_string
      ? {
          eventSlug: row.slug,
          pooledConnectionString: row.pooled_connection_string,
          active: Boolean(row.active),
          createdAt: row.tenant_created_at ?? "",
          updatedAt: row.tenant_updated_at ?? "",
        }
      : null,
  }));
}

export async function upsertTenantConfig(input: {
  slug: string;
  name?: string | null;
  status?: string | null;
  mode?: EventMode;
  pooledConnectionString: string;
  active?: boolean;
}) {
  await ensureControlSchema();
  const slug = input.slug.trim();
  if (!slug) throw new Error("bad_slug");
  const pooledConnectionString = input.pooledConnectionString.trim();
  if (!pooledConnectionString) throw new Error("bad_connection_string");

  const existing = await getControlEventBySlug(slug);
  const ts = nowIso();

  if (existing) {
    await controlQuery`
      UPDATE events
      SET
        name = ${input.name?.trim() || existing.name},
        status = ${input.status?.trim() || existing.status},
        mode = ${input.mode ?? "tenant"},
        updated_at = ${ts}
      WHERE slug = ${slug}
    `;
  } else {
    await controlQuery`
      INSERT INTO events (id, slug, name, status, mode, created_at, updated_at)
      VALUES (
        ${newId()},
        ${slug},
        ${input.name?.trim() || slug},
        ${input.status?.trim() || "active"},
        ${input.mode ?? "tenant"},
        ${ts},
        ${ts}
      )
    `;
  }

  await controlQuery`
    INSERT INTO event_tenants (event_slug, pooled_connection_string, active, created_at, updated_at)
    VALUES (${slug}, ${pooledConnectionString}, ${input.active === false ? 0 : 1}, ${ts}, ${ts})
    ON CONFLICT (event_slug)
    DO UPDATE SET
      pooled_connection_string = EXCLUDED.pooled_connection_string,
      active = EXCLUDED.active,
      updated_at = EXCLUDED.updated_at
  `;

  return {
    event: (await getControlEventBySlug(slug))!,
    tenant: (await getActiveEventTenantBySlug(slug)) ?? null,
  };
}

export async function patchTenantConfig(
  slug: string,
  patch: {
    name?: string | null;
    status?: string | null;
    mode?: EventMode;
    pooledConnectionString?: string | null;
    active?: boolean;
  },
) {
  await ensureControlSchema();
  const existing = await getControlEventBySlug(slug);
  if (!existing) return null;

  const ts = nowIso();
  await controlQuery`
    UPDATE events
    SET
      name = ${patch.name?.trim() || existing.name},
      status = ${patch.status?.trim() || existing.status},
      mode = ${patch.mode ?? existing.mode},
      updated_at = ${ts}
    WHERE slug = ${slug}
  `;

  const tenant = await getActiveEventTenantBySlug(slug);
  if (tenant || patch.pooledConnectionString?.trim()) {
    await controlQuery`
      INSERT INTO event_tenants (event_slug, pooled_connection_string, active, created_at, updated_at)
      VALUES (
        ${slug},
        ${patch.pooledConnectionString?.trim() || tenant?.pooledConnectionString || ""},
        ${patch.active === undefined ? (tenant?.active === false ? 0 : 1) : patch.active ? 1 : 0},
        ${tenant?.createdAt || ts},
        ${ts}
      )
      ON CONFLICT (event_slug)
      DO UPDATE SET
        pooled_connection_string = EXCLUDED.pooled_connection_string,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `;
  }

  return {
    event: (await getControlEventBySlug(slug))!,
    tenant: (await getActiveEventTenantBySlug(slug)) ?? null,
  };
}

export async function deleteTenantConfig(slug: string) {
  await ensureControlSchema();
  const ts = nowIso();
  await controlQuery`DELETE FROM event_tenants WHERE event_slug = ${slug}`;
  await controlQuery`
    UPDATE events
    SET mode = 'legacy', updated_at = ${ts}
    WHERE slug = ${slug}
  `;
}

export async function getControlUserById(userId: string): Promise<DbUser | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    id: string;
    telegram_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    created_at: string;
  }>`
    SELECT id, telegram_id, public_id, telegram_photo_url, created_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    telegramId: row.telegram_id,
    publicId: row.public_id,
    telegramPhotoUrl: row.telegram_photo_url,
    createdAt: row.created_at,
  };
}

export async function listControlUsersByIds(userIds: string[]) {
  await ensureControlSchema();
  const normalized = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (!normalized.length) return new Map<string, DbUser>();

  const result = await controlQuery<{
    id: string;
    telegram_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    created_at: string;
  }>`
    SELECT id, telegram_id, public_id, telegram_photo_url, created_at
    FROM users
    WHERE id = ANY(${normalized})
  `;

  const map = new Map<string, DbUser>();
  for (const row of result.rows) {
    map.set(row.id, {
      id: row.id,
      telegramId: row.telegram_id,
      publicId: row.public_id,
      telegramPhotoUrl: row.telegram_photo_url,
      createdAt: row.created_at,
    });
  }
  return map;
}

export async function getOrCreateControlUserByTelegramId(
  telegramId: string,
  telegramUser?: unknown | null,
): Promise<DbUser> {
  await ensureControlSchema();
  const telegramPhotoUrl =
    telegramUser && typeof telegramUser === "object" && "photo_url" in telegramUser
      ? (() => {
          const value = (telegramUser as { photo_url?: unknown }).photo_url;
          return typeof value === "string" && value.trim() ? value.trim() : null;
        })()
      : null;

  const ts = nowIso();
  const result = await controlQuery<{
    id: string;
    telegram_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    created_at: string;
  }>`
    INSERT INTO users (id, telegram_id, public_id, telegram_photo_url, created_at)
    VALUES (${newId()}, ${telegramId}, ${newId()}, ${telegramPhotoUrl}, ${ts})
    ON CONFLICT (telegram_id)
    DO UPDATE SET
      telegram_photo_url = COALESCE(EXCLUDED.telegram_photo_url, users.telegram_photo_url)
    RETURNING id, telegram_id, public_id, telegram_photo_url, created_at
  `;

  const row = result.rows[0]!;
  return {
    id: row.id,
    telegramId: row.telegram_id,
    publicId: row.public_id,
    telegramPhotoUrl: row.telegram_photo_url,
    createdAt: row.created_at,
  };
}

export async function findControlUserByPublicId(publicId: string): Promise<DbUser | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    id: string;
    telegram_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    created_at: string;
  }>`
    SELECT id, telegram_id, public_id, telegram_photo_url, created_at
    FROM users
    WHERE public_id = ${publicId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    telegramId: row.telegram_id,
    publicId: row.public_id,
    telegramPhotoUrl: row.telegram_photo_url,
    createdAt: row.created_at,
  };
}

export async function getControlProfileByUserId(userId: string): Promise<DbProfile | null> {
  await ensureControlSchema();
  const result = await controlQuery<{
    user_id: string;
    photo_url: string | null;
    first_name: string;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string;
  }>`
    SELECT user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
    FROM profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    photoUrl: row.photo_url,
    firstName: row.first_name,
    lastName: row.last_name,
    instagram: row.instagram,
    niche: row.niche,
    about: row.about,
    helpful: row.helpful,
    updatedAt: row.updated_at,
  };
}

export async function listControlProfilesByUserIds(userIds: string[]) {
  await ensureControlSchema();
  const normalized = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (!normalized.length) return new Map<string, DbProfile>();

  const result = await controlQuery<{
    user_id: string;
    photo_url: string | null;
    first_name: string;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string;
  }>`
    SELECT user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
    FROM profiles
    WHERE user_id = ANY(${normalized})
  `;

  const map = new Map<string, DbProfile>();
  for (const row of result.rows) {
    map.set(row.user_id, {
      userId: row.user_id,
      photoUrl: row.photo_url,
      firstName: row.first_name,
      lastName: row.last_name,
      instagram: row.instagram,
      niche: row.niche,
      about: row.about,
      helpful: row.helpful,
      updatedAt: row.updated_at,
    });
  }
  return map;
}

export async function upsertControlProfile(userId: string, input: UpsertProfileInput): Promise<DbProfile> {
  await ensureControlSchema();
  const updatedAt = nowIso();
  await controlQuery`
    INSERT INTO profiles (
      user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
    ) VALUES (
      ${userId},
      ${input.photoUrl ?? null},
      ${input.firstName},
      ${input.lastName ?? null},
      ${input.instagram ?? null},
      ${input.niche ?? null},
      ${input.about ?? null},
      ${input.helpful ?? null},
      ${updatedAt}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      photo_url = EXCLUDED.photo_url,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      instagram = EXCLUDED.instagram,
      niche = EXCLUDED.niche,
      about = EXCLUDED.about,
      helpful = EXCLUDED.helpful,
      updated_at = EXCLUDED.updated_at
  `;
  const profile = await getControlProfileByUserId(userId);
  return profile!;
}

export async function upsertControlBotUser(input: {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isRegistered?: boolean;
}) {
  await ensureControlSchema();
  const ts = nowIso();
  await controlQuery`
    INSERT INTO bot_users (telegram_id, username, first_name, last_name, created_at, last_seen_at, is_registered)
    VALUES (
      ${input.telegramId},
      ${input.username ?? null},
      ${input.firstName ?? null},
      ${input.lastName ?? null},
      ${ts},
      ${ts},
      ${input.isRegistered ? 1 : 0}
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, bot_users.username),
      first_name = COALESCE(EXCLUDED.first_name, bot_users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, bot_users.last_name),
      last_seen_at = EXCLUDED.last_seen_at,
      is_registered = CASE
        WHEN bot_users.is_registered = 1 OR EXCLUDED.is_registered = 1 THEN 1
        ELSE 0
      END
  `;
}

export async function setControlBotUserRegistered(telegramId: string) {
  await ensureControlSchema();
  await controlQuery`
    UPDATE bot_users
    SET is_registered = 1, last_seen_at = ${nowIso()}
    WHERE telegram_id = ${telegramId}
  `;
}

export async function getControlDbStatus() {
  const controlConnectionString = getControlConnectionString();
  const multiDbRouting = isMultiDbRoutingEnabled();
  if (!controlConnectionString) {
    return {
      multiDbRouting,
      configured: false,
      healthy: false,
      error: "missing_control_postgres_url",
      controlConnectionStringMasked: "",
    };
  }

  try {
    await ensureControlSchema();
    await controlQuery`SELECT 1 as ok`;
    return {
      multiDbRouting,
      configured: true,
      healthy: true,
      error: null,
      controlConnectionStringMasked: maskConnectionString(controlConnectionString),
    };
  } catch (error) {
    return {
      multiDbRouting,
      configured: true,
      healthy: false,
      error: error instanceof Error ? error.message : "control_db_unavailable",
      controlConnectionStringMasked: maskConnectionString(controlConnectionString),
    };
  }
}
