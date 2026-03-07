import crypto from "node:crypto";
import { createPool, type VercelPool } from "@vercel/postgres";
import type {
  DbAdminProfile,
  DbMeetingDetail,
  DbMeetingListItem,
  DbParticipant,
  DbProfile,
  DbScheduleItem,
  DbSpeaker,
  DbUser,
} from "@/lib/db";
import type { ControlEvent } from "@/lib/controlDb";

type SqlParam = string | number | boolean | null | undefined | Date;

const poolCache = new Map<string, VercelPool>();
const initByConnection = new Map<string, Promise<void>>();

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function normalizeSqlParam(value: SqlParam): string | number | boolean | null {
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

function getTenantPool(connectionString: string) {
  const key = connectionString.trim();
  if (!key) throw new Error("missing_tenant_connection_string");

  const cached = poolCache.get(key);
  if (cached) return cached;

  const pool = createPool({ connectionString: key });
  poolCache.set(key, pool);
  return pool;
}

function tenantQuery<T = Record<string, unknown>>(connectionString: string) {
  return async (strings: TemplateStringsArray, ...values: SqlParam[]) => {
    const pool = getTenantPool(connectionString);
    const { text, params } = buildPgQuery(strings, values);
    const result = await pool.query(text, params);
    return {
      rows: (result.rows ?? []) as T[],
      rowCount: Number(result.rowCount ?? (result.rows ?? []).length),
    };
  };
}

function buildDisplayName(profile: { firstName: string; lastName: string | null }) {
  const first = profile.firstName.trim();
  const last = (profile.lastName ?? "").trim();
  return [first, last].filter(Boolean).join(" ").trim();
}

function splitDisplayName(displayName: string) {
  const trimmed = displayName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "—", lastName: null as string | null };
  const parts = trimmed.split(" ");
  if (parts.length === 1) return { firstName: trimmed, lastName: null as string | null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) return parsed;
    return [];
  } catch {
    return [];
  }
}

function stringifyJsonArray(value: string[]) {
  return JSON.stringify(value);
}

export async function ensureTenantSchema(connectionString: string) {
  const key = connectionString.trim();
  const existing = initByConnection.get(key);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        telegram_id TEXT UNIQUE NOT NULL,
        public_id TEXT UNIQUE NOT NULL,
        telegram_photo_url TEXT,
        created_at TEXT NOT NULL
      )
    `;

    await tenantQuery(key)`
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

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS event_participants (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TEXT NOT NULL,
        UNIQUE(event_id, user_id)
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        created_by_user_id TEXT,
        UNIQUE(event_id, user_a_id, user_b_id)
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS meeting_meta (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note TEXT,
        rating INTEGER,
        planned_at TEXT,
        planned_place TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(meeting_id, user_id)
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS speakers (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        photo_url TEXT,
        topic TEXT,
        bio TEXT,
        socials_json TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS schedule_items (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        title TEXT NOT NULL,
        description TEXT,
        speaker_id TEXT REFERENCES speakers(id) ON DELETE SET NULL,
        location TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    await tenantQuery(key)`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY CHECK (id = 'singleton'),
        chat_link TEXT,
        updated_at TEXT NOT NULL
      )
    `;

    await tenantQuery(key)`
      INSERT INTO settings (id, chat_link, updated_at)
      VALUES ('singleton', NULL, ${nowIso()})
      ON CONFLICT (id) DO NOTHING
    `;
  })();

  initByConnection.set(key, promise);
  await promise;
}

export async function ensureTenantEvent(connectionString: string, event: ControlEvent) {
  await ensureTenantSchema(connectionString);
  const ts = nowIso();
  await tenantQuery(connectionString)`
    INSERT INTO events (id, slug, name, status, created_at, updated_at)
    VALUES (${event.id}, ${event.slug}, ${event.name}, ${event.status}, ${ts}, ${ts})
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function ensureTenantUserMirror(connectionString: string, user: DbUser) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    INSERT INTO users (id, telegram_id, public_id, telegram_photo_url, created_at)
    VALUES (${user.id}, ${user.telegramId}, ${user.publicId}, ${user.telegramPhotoUrl ?? null}, ${user.createdAt})
    ON CONFLICT (id) DO UPDATE SET
      telegram_id = EXCLUDED.telegram_id,
      public_id = EXCLUDED.public_id,
      telegram_photo_url = COALESCE(EXCLUDED.telegram_photo_url, users.telegram_photo_url)
  `;
}

export async function upsertTenantProfileMirror(connectionString: string, profile: DbProfile) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    INSERT INTO profiles (
      user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
    ) VALUES (
      ${profile.userId},
      ${profile.photoUrl ?? null},
      ${profile.firstName},
      ${profile.lastName ?? null},
      ${profile.instagram ?? null},
      ${profile.niche ?? null},
      ${profile.about ?? null},
      ${profile.helpful ?? null},
      ${profile.updatedAt}
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
}

export async function ensureTenantParticipant(
  connectionString: string,
  event: ControlEvent,
  user: DbUser,
  profile: DbProfile | null,
) {
  await ensureTenantEvent(connectionString, event);
  await ensureTenantUserMirror(connectionString, user);
  if (profile) await upsertTenantProfileMirror(connectionString, profile);

  await tenantQuery(connectionString)`
    INSERT INTO event_participants (id, event_id, user_id, joined_at)
    VALUES (${newId()}, ${event.id}, ${user.id}, ${nowIso()})
    ON CONFLICT (event_id, user_id) DO NOTHING
  `;
}

export async function createOrGetTenantMeeting(
  connectionString: string,
  eventId: string,
  meUserId: string,
  otherUserId: string,
) {
  const [userAId, userBId] = meUserId < otherUserId ? [meUserId, otherUserId] : [otherUserId, meUserId];
  await ensureTenantSchema(connectionString);

  const existing = await tenantQuery<{ id: string }>(connectionString)`
    SELECT id
    FROM meetings
    WHERE event_id = ${eventId} AND user_a_id = ${userAId} AND user_b_id = ${userBId}
    LIMIT 1
  `;

  const meetingId = existing.rows[0]?.id ?? newId();
  let created = false;
  if (!existing.rows.length) {
    const inserted = await tenantQuery(connectionString)`
      INSERT INTO meetings (id, event_id, user_a_id, user_b_id, created_at, created_by_user_id)
      VALUES (${meetingId}, ${eventId}, ${userAId}, ${userBId}, ${nowIso()}, ${meUserId})
      ON CONFLICT (event_id, user_a_id, user_b_id) DO NOTHING
    `;
    created = inserted.rowCount === 1;
  }

  const ts = nowIso();
  await tenantQuery(connectionString)`
    INSERT INTO meeting_meta (id, meeting_id, user_id, note, rating, updated_at)
    VALUES (${newId()}, ${meetingId}, ${meUserId}, NULL, NULL, ${ts})
    ON CONFLICT (meeting_id, user_id) DO NOTHING
  `;
  await tenantQuery(connectionString)`
    INSERT INTO meeting_meta (id, meeting_id, user_id, note, rating, updated_at)
    VALUES (${newId()}, ${meetingId}, ${otherUserId}, NULL, NULL, ${ts})
    ON CONFLICT (meeting_id, user_id) DO NOTHING
  `;

  return { meetingId, created };
}

export async function listTenantMeetings(
  connectionString: string,
  eventId: string,
  meUserId: string,
): Promise<DbMeetingListItem[]> {
  await ensureTenantSchema(connectionString);
  const result = await tenantQuery<{
    meeting_id: string;
    created_at: string;
    other_user_id: string;
    other_telegram_id: string;
    other_public_id: string;
    other_telegram_photo_url: string | null;
    other_first_name: string | null;
    other_last_name: string | null;
    other_photo_url: string | null;
    other_niche: string | null;
    my_note: string | null;
    my_rating: number | null;
    my_planned_at: string | null;
    my_planned_place: string | null;
  }>(connectionString)`
    SELECT
      m.id as meeting_id,
      m.created_at as created_at,
      uo.id as other_user_id,
      uo.telegram_id as other_telegram_id,
      uo.public_id as other_public_id,
      uo.telegram_photo_url as other_telegram_photo_url,
      po.first_name as other_first_name,
      po.last_name as other_last_name,
      po.photo_url as other_photo_url,
      po.niche as other_niche,
      mm.note as my_note,
      mm.rating as my_rating,
      mm.planned_at as my_planned_at,
      mm.planned_place as my_planned_place
    FROM meetings m
    JOIN users uo
      ON uo.id = CASE WHEN m.user_a_id = ${meUserId} THEN m.user_b_id ELSE m.user_a_id END
    LEFT JOIN profiles po ON po.user_id = uo.id
    LEFT JOIN meeting_meta mm ON mm.meeting_id = m.id AND mm.user_id = ${meUserId}
    WHERE m.event_id = ${eventId} AND (m.user_a_id = ${meUserId} OR m.user_b_id = ${meUserId})
    ORDER BY m.created_at DESC
  `;

  return result.rows.map((row) => ({
    id: row.meeting_id,
    createdAt: row.created_at,
    other: {
      userId: row.other_user_id,
      telegramId: row.other_telegram_id,
      publicId: row.other_public_id,
      displayName: row.other_first_name
        ? buildDisplayName({ firstName: row.other_first_name, lastName: row.other_last_name })
        : null,
      photoUrl: row.other_photo_url ?? row.other_telegram_photo_url,
      niche: row.other_niche,
    },
    meta: {
      note: row.my_note,
      rating: row.my_rating,
      plannedAt: row.my_planned_at,
      plannedPlace: row.my_planned_place,
    },
  }));
}

export async function getTenantMeetingDetail(
  connectionString: string,
  eventId: string,
  meUserId: string,
  meetingId: string,
): Promise<DbMeetingDetail | null> {
  await ensureTenantSchema(connectionString);
  const result = await tenantQuery<{
    meeting_id: string;
    created_at: string;
    other_user_id: string;
    other_telegram_id: string;
    other_public_id: string;
    other_telegram_photo_url: string | null;
    profile_user_id: string | null;
    photo_url: string | null;
    first_name: string | null;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string | null;
    my_note: string | null;
    my_rating: number | null;
    my_planned_at: string | null;
    my_planned_place: string | null;
  }>(connectionString)`
    SELECT
      m.id as meeting_id,
      m.created_at as created_at,
      uo.id as other_user_id,
      uo.telegram_id as other_telegram_id,
      uo.public_id as other_public_id,
      uo.telegram_photo_url as other_telegram_photo_url,
      po.user_id as profile_user_id,
      po.photo_url as photo_url,
      po.first_name as first_name,
      po.last_name as last_name,
      po.instagram as instagram,
      po.niche as niche,
      po.about as about,
      po.helpful as helpful,
      po.updated_at as updated_at,
      mm.note as my_note,
      mm.rating as my_rating,
      mm.planned_at as my_planned_at,
      mm.planned_place as my_planned_place
    FROM meetings m
    JOIN users uo
      ON uo.id = CASE WHEN m.user_a_id = ${meUserId} THEN m.user_b_id ELSE m.user_a_id END
    LEFT JOIN profiles po ON po.user_id = uo.id
    LEFT JOIN meeting_meta mm ON mm.meeting_id = m.id AND mm.user_id = ${meUserId}
    WHERE m.id = ${meetingId}
      AND m.event_id = ${eventId}
      AND (m.user_a_id = ${meUserId} OR m.user_b_id = ${meUserId})
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) return null;

  const otherProfile: DbProfile | null = row.profile_user_id
    ? {
        userId: row.profile_user_id,
        photoUrl: row.photo_url ?? row.other_telegram_photo_url,
        firstName: row.first_name ?? "—",
        lastName: row.last_name,
        instagram: row.instagram,
        niche: row.niche,
        about: row.about,
        helpful: row.helpful,
        updatedAt: row.updated_at ?? nowIso(),
      }
    : null;

  return {
    id: row.meeting_id,
    createdAt: row.created_at,
    other: {
      userId: row.other_user_id,
      telegramId: row.other_telegram_id,
      publicId: row.other_public_id,
      displayName: otherProfile
        ? buildDisplayName({ firstName: otherProfile.firstName, lastName: otherProfile.lastName })
        : null,
      photoUrl: otherProfile?.photoUrl ?? row.other_telegram_photo_url,
      niche: otherProfile?.niche ?? null,
    },
    meta: {
      note: row.my_note,
      rating: row.my_rating,
      plannedAt: row.my_planned_at,
      plannedPlace: row.my_planned_place,
    },
    otherProfile,
  };
}

export async function updateTenantMeetingMeta(
  connectionString: string,
  meetingId: string,
  userId: string,
  note: string | null,
  rating: number | null,
  plannedAt: string | null,
  plannedPlace: string | null,
) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    UPDATE meeting_meta
    SET
      note = ${note},
      rating = ${rating},
      planned_at = ${plannedAt},
      planned_place = ${plannedPlace},
      updated_at = ${nowIso()}
    WHERE meeting_id = ${meetingId} AND user_id = ${userId}
  `;
}

export async function getTenantStats(connectionString: string, eventId: string, userId: string) {
  await ensureTenantSchema(connectionString);
  const countResult = await tenantQuery<{ c: string }>(connectionString)`
    SELECT COUNT(*) as c
    FROM meetings
    WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
  `;
  const ratedResult = await tenantQuery<{ c: string; avg: string | null }>(connectionString)`
    SELECT COUNT(*) as c, AVG(rating) as avg
    FROM meeting_meta
    WHERE user_id = ${userId} AND rating IS NOT NULL
      AND meeting_id IN (
        SELECT id FROM meetings WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
      )
  `;
  const notesResult = await tenantQuery<{ c: string }>(connectionString)`
    SELECT COUNT(*) as c
    FROM meeting_meta
    WHERE user_id = ${userId} AND note IS NOT NULL AND TRIM(note) <> ''
      AND meeting_id IN (
        SELECT id FROM meetings WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
      )
  `;

  return {
    meetingsCount: Number(countResult.rows[0]?.c ?? 0),
    ratedCount: Number(ratedResult.rows[0]?.c ?? 0),
    avgRating: ratedResult.rows[0]?.avg ? Number(ratedResult.rows[0].avg) : null,
    notesCount: Number(notesResult.rows[0]?.c ?? 0),
  };
}

export async function listTenantParticipants(
  connectionString: string,
  eventId: string,
  opts?: { q?: string | null; limit?: number },
): Promise<DbParticipant[]> {
  await ensureTenantSchema(connectionString);
  const q = (opts?.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);

  const result = await tenantQuery<{
    joined_at: string;
    user_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    photo_url: string | null;
    first_name: string | null;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string | null;
  }>(connectionString)`
    SELECT
      ep.joined_at as joined_at,
      u.id as user_id,
      u.public_id as public_id,
      u.telegram_photo_url as telegram_photo_url,
      p.photo_url as photo_url,
      p.first_name as first_name,
      p.last_name as last_name,
      p.instagram as instagram,
      p.niche as niche,
      p.about as about,
      p.helpful as helpful,
      p.updated_at as updated_at
    FROM event_participants ep
    JOIN users u ON u.id = ep.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE ep.event_id = ${eventId}
    ORDER BY ep.joined_at DESC
    LIMIT ${limit}
  `;

  const items: DbParticipant[] = result.rows.map((row) => {
    const displayName = row.first_name ? buildDisplayName({ firstName: row.first_name, lastName: row.last_name }) : "";
    const split = splitDisplayName(displayName);
    return {
      userId: row.user_id,
      publicId: row.public_id,
      joinedAt: row.joined_at,
      profile: {
        userId: row.user_id,
        photoUrl: row.photo_url ?? row.telegram_photo_url,
        firstName: split.firstName,
        lastName: split.lastName,
        instagram: row.instagram,
        niche: row.niche,
        about: row.about,
        helpful: row.helpful,
        updatedAt: row.updated_at ?? nowIso(),
      },
    };
  });

  if (!q) return items;
  return items.filter((item) => {
    const name = buildDisplayName({ firstName: item.profile.firstName, lastName: item.profile.lastName }).toLowerCase();
    const niche = (item.profile.niche ?? "").toLowerCase();
    const instagram = (item.profile.instagram ?? "").toLowerCase();
    return name.includes(q) || niche.includes(q) || instagram.includes(q);
  });
}

export async function listTenantAdminProfiles(
  connectionString: string,
  eventId: string,
  opts?: { q?: string | null; limit?: number },
): Promise<DbAdminProfile[]> {
  await ensureTenantSchema(connectionString);
  const q = (opts?.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 1000);

  const result = await tenantQuery<{
    joined_at: string;
    user_id: string;
    telegram_id: string;
    public_id: string;
    telegram_photo_url: string | null;
    photo_url: string | null;
    first_name: string | null;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string | null;
  }>(connectionString)`
    SELECT
      ep.joined_at as joined_at,
      u.id as user_id,
      u.telegram_id as telegram_id,
      u.public_id as public_id,
      u.telegram_photo_url as telegram_photo_url,
      p.photo_url as photo_url,
      p.first_name as first_name,
      p.last_name as last_name,
      p.instagram as instagram,
      p.niche as niche,
      p.about as about,
      p.helpful as helpful,
      p.updated_at as updated_at
    FROM event_participants ep
    JOIN users u ON u.id = ep.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE ep.event_id = ${eventId}
    ORDER BY ep.joined_at DESC
    LIMIT ${limit}
  `;

  const items: DbAdminProfile[] = result.rows.map((row) => {
    const displayName = row.first_name ? buildDisplayName({ firstName: row.first_name, lastName: row.last_name }) : "";
    const split = splitDisplayName(displayName);
    return {
      userId: row.user_id,
      telegramId: row.telegram_id,
      publicId: row.public_id,
      joinedAt: row.joined_at,
      profile: {
        userId: row.user_id,
        photoUrl: row.photo_url ?? row.telegram_photo_url,
        firstName: split.firstName,
        lastName: split.lastName,
        instagram: row.instagram,
        niche: row.niche,
        about: row.about,
        helpful: row.helpful,
        updatedAt: row.updated_at ?? nowIso(),
      },
    };
  });

  if (!q) return items;
  return items.filter((item) => {
    const name = buildDisplayName({ firstName: item.profile.firstName, lastName: item.profile.lastName }).toLowerCase();
    const niche = (item.profile.niche ?? "").toLowerCase();
    const instagram = (item.profile.instagram ?? "").toLowerCase();
    const telegramId = item.telegramId.toLowerCase();
    const publicId = item.publicId.toLowerCase();
    return (
      name.includes(q) ||
      niche.includes(q) ||
      instagram.includes(q) ||
      telegramId.includes(q) ||
      publicId.includes(q)
    );
  });
}

export async function listTenantSpeakers(connectionString: string, eventId: string): Promise<DbSpeaker[]> {
  await ensureTenantSchema(connectionString);
  const result = await tenantQuery<{
    id: string;
    name: string;
    photo_url: string | null;
    topic: string | null;
    bio: string | null;
    socials_json: string | null;
    sort_order: number;
  }>(connectionString)`
    SELECT id, name, photo_url, topic, bio, socials_json, sort_order
    FROM speakers
    WHERE event_id = ${eventId}
    ORDER BY sort_order ASC, created_at ASC
  `;

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url,
    topic: row.topic,
    bio: row.bio,
    socials: parseJsonArray(row.socials_json),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function upsertTenantSpeaker(
  connectionString: string,
  eventId: string,
  input: Omit<DbSpeaker, "id"> & { id?: string },
) {
  await ensureTenantSchema(connectionString);
  const ts = nowIso();
  const id = input.id ?? newId();

  const existing = await tenantQuery<{ id: string }>(connectionString)`
    SELECT id FROM speakers WHERE id = ${id} AND event_id = ${eventId}
  `;

  if (existing.rows.length) {
    await tenantQuery(connectionString)`
      UPDATE speakers
      SET
        name = ${input.name},
        photo_url = ${input.photoUrl ?? null},
        topic = ${input.topic ?? null},
        bio = ${input.bio ?? null},
        socials_json = ${stringifyJsonArray(input.socials ?? [])},
        sort_order = ${input.sortOrder ?? 0},
        updated_at = ${ts}
      WHERE id = ${id} AND event_id = ${eventId}
    `;
  } else {
    await tenantQuery(connectionString)`
      INSERT INTO speakers (id, event_id, name, photo_url, topic, bio, socials_json, sort_order, created_at, updated_at)
      VALUES (
        ${id},
        ${eventId},
        ${input.name},
        ${input.photoUrl ?? null},
        ${input.topic ?? null},
        ${input.bio ?? null},
        ${stringifyJsonArray(input.socials ?? [])},
        ${input.sortOrder ?? 0},
        ${ts},
        ${ts}
      )
    `;
  }

  return id;
}

export async function deleteTenantSpeaker(connectionString: string, eventId: string, speakerId: string) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    DELETE FROM speakers
    WHERE id = ${speakerId} AND event_id = ${eventId}
  `;
}

export async function listTenantSchedule(connectionString: string, eventId: string): Promise<DbScheduleItem[]> {
  await ensureTenantSchema(connectionString);
  const result = await tenantQuery<{
    id: string;
    starts_at: string;
    ends_at: string | null;
    title: string;
    description: string | null;
    speaker_id: string | null;
    location: string | null;
    sort_order: number;
  }>(connectionString)`
    SELECT id, starts_at, ends_at, title, description, speaker_id, location, sort_order
    FROM schedule_items
    WHERE event_id = ${eventId}
    ORDER BY starts_at ASC, sort_order ASC, created_at ASC
  `;

  return result.rows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title,
    description: row.description,
    speakerId: row.speaker_id,
    location: row.location,
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function upsertTenantScheduleItem(
  connectionString: string,
  eventId: string,
  input: Omit<DbScheduleItem, "id"> & { id?: string },
) {
  await ensureTenantSchema(connectionString);
  const ts = nowIso();
  const id = input.id ?? newId();

  const existing = await tenantQuery<{ id: string }>(connectionString)`
    SELECT id FROM schedule_items WHERE id = ${id} AND event_id = ${eventId}
  `;

  if (existing.rows.length) {
    await tenantQuery(connectionString)`
      UPDATE schedule_items
      SET
        starts_at = ${input.startsAt},
        ends_at = ${input.endsAt ?? null},
        title = ${input.title},
        description = ${input.description ?? null},
        speaker_id = ${input.speakerId ?? null},
        location = ${input.location ?? null},
        sort_order = ${input.sortOrder ?? 0},
        updated_at = ${ts}
      WHERE id = ${id} AND event_id = ${eventId}
    `;
  } else {
    await tenantQuery(connectionString)`
      INSERT INTO schedule_items (id, event_id, starts_at, ends_at, title, description, speaker_id, location, sort_order, created_at, updated_at)
      VALUES (
        ${id},
        ${eventId},
        ${input.startsAt},
        ${input.endsAt ?? null},
        ${input.title},
        ${input.description ?? null},
        ${input.speakerId ?? null},
        ${input.location ?? null},
        ${input.sortOrder ?? 0},
        ${ts},
        ${ts}
      )
    `;
  }

  return id;
}

export async function deleteTenantScheduleItem(connectionString: string, eventId: string, itemId: string) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    DELETE FROM schedule_items
    WHERE id = ${itemId} AND event_id = ${eventId}
  `;
}

export async function getTenantChatLink(connectionString: string) {
  await ensureTenantSchema(connectionString);
  const result = await tenantQuery<{ chat_link: string | null }>(connectionString)`
    SELECT chat_link
    FROM settings
    WHERE id = 'singleton'
    LIMIT 1
  `;
  return result.rows[0]?.chat_link ?? null;
}

export async function setTenantChatLink(connectionString: string, url: string | null) {
  await ensureTenantSchema(connectionString);
  await tenantQuery(connectionString)`
    INSERT INTO settings (id, chat_link, updated_at)
    VALUES ('singleton', ${url}, ${nowIso()})
    ON CONFLICT (id) DO UPDATE SET
      chat_link = EXCLUDED.chat_link,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function seedTenantDemoIfEmpty(connectionString: string, eventId: string) {
  // Optional in multi-db rollout stage: tenant demo seeding is intentionally skipped.
  void connectionString;
  void eventId;
}
