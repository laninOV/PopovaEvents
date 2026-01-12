import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type DbUser = {
  id: string;
  telegramId: string;
  publicId: string;
  createdAt: string;
};

export type DbProfile = {
  userId: string;
  photoUrl: string | null;
  firstName: string;
  lastName: string | null;
  instagram: string | null;
  niche: string | null;
  about: string | null;
  helpful: string | null;
  updatedAt: string;
};

export type DbMeetingListItem = {
  id: string;
  createdAt: string;
  other: {
    userId: string;
    telegramId: string;
    publicId: string;
    displayName: string | null;
    photoUrl: string | null;
    niche: string | null;
  };
  meta: {
    note: string | null;
    rating: number | null;
  };
};

export type DbMeetingDetail = DbMeetingListItem & {
  otherProfile: DbProfile | null;
};

export type UpsertProfileInput = {
  firstName: string;
  lastName?: string | null;
  instagram?: string | null;
  niche?: string | null;
  about?: string | null;
  helpful?: string | null;
  photoUrl?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function parseJsonArray(value: string | null): string[] {
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

function migrateProfiles(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(profiles)").all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === "first_name")) return;
  if (!cols.some((c) => c.name === "display_name")) return;

  db.pragma("foreign_keys = OFF");
  try {
    db.exec(`
      ALTER TABLE profiles RENAME TO profiles_old;
      CREATE TABLE profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        photo_url TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT,
        instagram TEXT,
        niche TEXT,
        about TEXT,
        helpful TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    const rows = db
      .prepare(
        `SELECT user_id, photo_url, display_name, occupation, goal, about, updated_at
         FROM profiles_old`,
      )
      .all() as Array<{
      user_id: string;
      photo_url: string | null;
      display_name: string | null;
      occupation: string | null;
      goal: string | null;
      about: string | null;
      updated_at: string | null;
    }>;

    const insert = db.prepare(
      `INSERT INTO profiles (user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    );

    for (const r of rows) {
      const name = splitDisplayName(r.display_name ?? "");
      insert.run(
        r.user_id,
        r.photo_url,
        name.firstName,
        name.lastName,
        r.occupation ?? null,
        r.about ?? null,
        r.goal ?? null,
        r.updated_at ?? nowIso(),
      );
    }

    db.exec("DROP TABLE profiles_old;");
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_PATH ?? "./data/dev.sqlite";
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id TEXT UNIQUE NOT NULL,
      public_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

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
    );

    CREATE TABLE IF NOT EXISTS event_participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL,
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS bot_users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      is_registered INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      created_by_user_id TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_unique
      ON meetings(event_id, user_a_id, user_b_id);

    CREATE INDEX IF NOT EXISTS idx_meetings_event_created_at
      ON meetings(event_id, created_at);

    CREATE TABLE IF NOT EXISTS meeting_meta (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note TEXT,
      rating INTEGER,
      updated_at TEXT NOT NULL,
      UNIQUE(meeting_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      photo_url TEXT,
      topic TEXT,
      bio TEXT,
      socials_json TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      title TEXT NOT NULL,
      description TEXT,
      speaker_id TEXT REFERENCES speakers(id) ON DELETE SET NULL,
      location TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY CHECK (id = 'singleton'),
      chat_link TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  db.prepare("INSERT OR IGNORE INTO settings (id, chat_link, updated_at) VALUES ('singleton', NULL, ?)").run(
    nowIso(),
  );

  migrateProfiles(db);

  _db = db;
  return db;
}

export function ensureDefaultEvent() {
  const db = getDb();
  const slug = process.env.DEFAULT_EVENT_SLUG ?? "default";
  const name = process.env.DEFAULT_EVENT_NAME ?? "Popova Events";

  const existing = getEventBySlug(slug);
  if (existing) return existing;

  const id = newId();
  db.prepare("INSERT INTO events (id, slug, name, status, created_at) VALUES (?, ?, ?, 'active', ?)").run(
    id,
    slug,
    name,
    nowIso(),
  );
  return { id, slug, name, status: "active" as const };
}

export function getEventBySlug(slug: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT id, slug, name, status, starts_at, ends_at FROM events WHERE slug = ?")
    .get(slug) as
    | { id: string; slug: string; name: string; status: string; starts_at: string | null; ends_at: string | null }
    | undefined;
  if (!row) return null;
  return { id: row.id, slug: row.slug, name: row.name, status: row.status };
}

export function ensureEventBySlug(slug: string) {
  const existing = getEventBySlug(slug);
  if (existing) return existing;

  const allowPublicCreate = process.env.ALLOW_PUBLIC_EVENT_CREATE === "1";
  if (!allowPublicCreate) return null;

  const db = getDb();
  const id = newId();
  const defaultName = process.env.DEFAULT_EVENT_NAME ?? "Popova Events";
  const name = slug === (process.env.DEFAULT_EVENT_SLUG ?? "default") ? defaultName : slug;
  db.prepare("INSERT INTO events (id, slug, name, status, created_at) VALUES (?, ?, ?, 'active', ?)").run(
    id,
    slug,
    name,
    nowIso(),
  );
  return { id, slug, name, status: "active" as const };
}

export function getOrCreateUserByTelegramId(telegramId: string): DbUser {
  const db = getDb();
  const existing = db
    .prepare("SELECT id, telegram_id, public_id, created_at FROM users WHERE telegram_id = ?")
    .get(telegramId) as
    | { id: string; telegram_id: string; public_id: string; created_at: string }
    | undefined;

  if (existing) {
    return {
      id: existing.id,
      telegramId: existing.telegram_id,
      publicId: existing.public_id,
      createdAt: existing.created_at,
    };
  }

  const user: DbUser = { id: newId(), telegramId, publicId: newId(), createdAt: nowIso() };
  db.prepare("INSERT INTO users (id, telegram_id, public_id, created_at) VALUES (?, ?, ?, ?)").run(
    user.id,
    user.telegramId,
    user.publicId,
    user.createdAt,
  );
  return user;
}

export function ensureEventParticipant(eventId: string, userId: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId) as { id: string } | undefined;
  if (existing) return;
  db.prepare("INSERT INTO event_participants (id, event_id, user_id, joined_at) VALUES (?, ?, ?, ?)").run(
    newId(),
    eventId,
    userId,
    nowIso(),
  );
}

export function getProfileByUserId(userId: string): DbProfile | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
       FROM profiles
       WHERE user_id = ?`,
    )
    .get(userId) as
    | {
        user_id: string;
        photo_url: string | null;
        first_name: string;
        last_name: string | null;
        instagram: string | null;
        niche: string | null;
        about: string | null;
        helpful: string | null;
        updated_at: string;
      }
    | undefined;

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

export function upsertProfile(userId: string, input: UpsertProfileInput): DbProfile {
  const db = getDb();
  const updatedAt = nowIso();
  const existing = getProfileByUserId(userId);

  if (existing) {
    db.prepare(
      `UPDATE profiles SET
        photo_url = ?,
        first_name = ?,
        last_name = ?,
        instagram = ?,
        niche = ?,
        about = ?,
        helpful = ?,
        updated_at = ?
      WHERE user_id = ?`,
    ).run(
      input.photoUrl ?? null,
      input.firstName,
      input.lastName ?? null,
      input.instagram ?? null,
      input.niche ?? null,
      input.about ?? null,
      input.helpful ?? null,
      updatedAt,
      userId,
    );
  } else {
    db.prepare(
      `INSERT INTO profiles (
        user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      input.photoUrl ?? null,
      input.firstName,
      input.lastName ?? null,
      input.instagram ?? null,
      input.niche ?? null,
      input.about ?? null,
      input.helpful ?? null,
      updatedAt,
    );
  }

  return getProfileByUserId(userId)!;
}

export function findUserByPublicId(publicId: string): DbUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, telegram_id, public_id, created_at FROM users WHERE public_id = ?")
    .get(publicId) as { id: string; telegram_id: string; public_id: string; created_at: string } | undefined;
  if (!row) return null;
  return { id: row.id, telegramId: row.telegram_id, publicId: row.public_id, createdAt: row.created_at };
}

export function createOrGetMeeting(eventId: string, meUserId: string, otherPublicId: string) {
  const otherUser = findUserByPublicId(otherPublicId);
  if (!otherUser) return { ok: false as const, error: "not_found" as const };
  if (otherUser.id === meUserId) return { ok: false as const, error: "self_scan" as const };

  const [userAId, userBId] = meUserId < otherUser.id ? [meUserId, otherUser.id] : [otherUser.id, meUserId];
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM meetings WHERE event_id = ? AND user_a_id = ? AND user_b_id = ?")
    .get(eventId, userAId, userBId) as { id: string } | undefined;

  const meetingId = existing?.id ?? newId();
  if (!existing) {
    db.prepare(
      "INSERT INTO meetings (id, event_id, user_a_id, user_b_id, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(meetingId, eventId, userAId, userBId, nowIso(), meUserId);
  }

  const ensureMeta = db.prepare(
    "INSERT OR IGNORE INTO meeting_meta (id, meeting_id, user_id, note, rating, updated_at) VALUES (?, ?, ?, NULL, NULL, ?)",
  );
  const ts = nowIso();
  ensureMeta.run(newId(), meetingId, meUserId, ts);
  ensureMeta.run(newId(), meetingId, otherUser.id, ts);

  return { ok: true as const, meetingId, otherUserId: otherUser.id };
}

export function listMeetings(eventId: string, meUserId: string): DbMeetingListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        m.id as meeting_id,
        m.created_at as created_at,
        uo.id as other_user_id,
        uo.telegram_id as other_telegram_id,
        uo.public_id as other_public_id,
        po.first_name as other_first_name,
        po.last_name as other_last_name,
        po.photo_url as other_photo_url,
        po.niche as other_niche,
        mm.note as my_note,
        mm.rating as my_rating
      FROM meetings m
      JOIN users uo
        ON uo.id = CASE WHEN m.user_a_id = ? THEN m.user_b_id ELSE m.user_a_id END
      LEFT JOIN profiles po ON po.user_id = uo.id
      LEFT JOIN meeting_meta mm ON mm.meeting_id = m.id AND mm.user_id = ?
      WHERE m.event_id = ? AND (m.user_a_id = ? OR m.user_b_id = ?)
      ORDER BY m.created_at DESC
      `,
    )
    .all(meUserId, meUserId, eventId, meUserId, meUserId) as Array<{
    meeting_id: string;
    created_at: string;
    other_user_id: string;
    other_telegram_id: string;
    other_public_id: string;
    other_first_name: string | null;
    other_last_name: string | null;
    other_photo_url: string | null;
    other_niche: string | null;
    my_note: string | null;
    my_rating: number | null;
  }>;

  return rows.map((r) => ({
    id: r.meeting_id,
    createdAt: r.created_at,
    other: {
      userId: r.other_user_id,
      telegramId: r.other_telegram_id,
      publicId: r.other_public_id,
      displayName: r.other_first_name ? buildDisplayName({ firstName: r.other_first_name, lastName: r.other_last_name }) : null,
      photoUrl: r.other_photo_url,
      niche: r.other_niche,
    },
    meta: { note: r.my_note, rating: r.my_rating },
  }));
}

export function getMeetingDetail(eventId: string, meUserId: string, meetingId: string): DbMeetingDetail | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        m.id as meeting_id,
        m.created_at as created_at,
        uo.id as other_user_id,
        uo.telegram_id as other_telegram_id,
        uo.public_id as other_public_id,
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
        mm.rating as my_rating
      FROM meetings m
      JOIN users uo
        ON uo.id = CASE WHEN m.user_a_id = ? THEN m.user_b_id ELSE m.user_a_id END
      LEFT JOIN profiles po ON po.user_id = uo.id
      LEFT JOIN meeting_meta mm ON mm.meeting_id = m.id AND mm.user_id = ?
      WHERE m.id = ? AND m.event_id = ? AND (m.user_a_id = ? OR m.user_b_id = ?)
      LIMIT 1
      `,
    )
    .get(meUserId, meUserId, meetingId, eventId, meUserId, meUserId) as
    | {
        meeting_id: string;
        created_at: string;
        other_user_id: string;
        other_telegram_id: string;
        other_public_id: string;
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
      }
    | undefined;

  if (!row) return null;
  const otherProfile: DbProfile | null = row.profile_user_id
    ? {
        userId: row.profile_user_id,
        photoUrl: row.photo_url,
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
      displayName: otherProfile ? buildDisplayName({ firstName: otherProfile.firstName, lastName: otherProfile.lastName }) : null,
      photoUrl: otherProfile?.photoUrl ?? null,
      niche: otherProfile?.niche ?? null,
    },
    meta: { note: row.my_note, rating: row.my_rating },
    otherProfile,
  };
}

export function updateMeetingMeta(meetingId: string, userId: string, note: string | null, rating: number | null) {
  const db = getDb();
  db.prepare(
    `UPDATE meeting_meta
     SET note = ?, rating = ?, updated_at = ?
     WHERE meeting_id = ? AND user_id = ?`,
  ).run(note, rating, nowIso(), meetingId, userId);
}

export function getStats(eventId: string, userId: string) {
  const db = getDb();
  const countRow = db
    .prepare(
      "SELECT COUNT(*) as c FROM meetings WHERE event_id = ? AND (user_a_id = ? OR user_b_id = ?)",
    )
    .get(eventId, userId, userId) as { c: number };
  const ratedRow = db
    .prepare(
      "SELECT COUNT(*) as c, AVG(rating) as avg FROM meeting_meta WHERE user_id = ? AND rating IS NOT NULL AND meeting_id IN (SELECT id FROM meetings WHERE event_id = ? AND (user_a_id = ? OR user_b_id = ?))",
    )
    .get(userId, eventId, userId, userId) as { c: number; avg: number | null };
  const notesRow = db
    .prepare(
      "SELECT COUNT(*) as c FROM meeting_meta WHERE user_id = ? AND note IS NOT NULL AND TRIM(note) <> '' AND meeting_id IN (SELECT id FROM meetings WHERE event_id = ? AND (user_a_id = ? OR user_b_id = ?))",
    )
    .get(userId, eventId, userId, userId) as { c: number };

  return { meetingsCount: countRow.c, ratedCount: ratedRow.c, avgRating: ratedRow.avg, notesCount: notesRow.c };
}

export function upsertBotUser(input: {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isRegistered?: boolean;
}) {
  const db = getDb();
  const ts = nowIso();
  const existing = db
    .prepare("SELECT telegram_id, is_registered FROM bot_users WHERE telegram_id = ?")
    .get(input.telegramId) as { telegram_id: string; is_registered: number } | undefined;
  if (!existing) {
    db.prepare(
      `INSERT INTO bot_users (telegram_id, username, first_name, last_name, created_at, last_seen_at, is_registered)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.telegramId,
      input.username ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      ts,
      ts,
      input.isRegistered ? 1 : 0,
    );
    return;
  }

  const nextIsRegistered = existing.is_registered === 1 || input.isRegistered ? 1 : 0;
  db.prepare(
    `UPDATE bot_users
     SET username = COALESCE(?, username),
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         last_seen_at = ?,
         is_registered = ?
     WHERE telegram_id = ?`,
  ).run(input.username ?? null, input.firstName ?? null, input.lastName ?? null, ts, nextIsRegistered, input.telegramId);
}

export function setBotUserRegistered(telegramId: string) {
  const db = getDb();
  db.prepare("UPDATE bot_users SET is_registered = 1, last_seen_at = ? WHERE telegram_id = ?").run(
    nowIso(),
    telegramId,
  );
}

export type DbParticipant = {
  userId: string;
  publicId: string;
  joinedAt: string;
  profile: DbProfile;
};

export function listParticipants(eventId: string, opts?: { q?: string | null; limit?: number }) {
  const db = getDb();
  const q = (opts?.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);

  const rows = db
    .prepare(
      `
      SELECT
        ep.joined_at as joined_at,
        u.id as user_id,
        u.public_id as public_id,
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
      JOIN profiles p ON p.user_id = u.id
      WHERE ep.event_id = ?
      ORDER BY ep.joined_at DESC
      LIMIT ?
      `,
    )
    .all(eventId, limit) as Array<{
    joined_at: string;
    user_id: string;
    public_id: string;
    photo_url: string | null;
    first_name: string;
    last_name: string | null;
    instagram: string | null;
    niche: string | null;
    about: string | null;
    helpful: string | null;
    updated_at: string;
  }>;

  const items: DbParticipant[] = rows.map((r) => ({
    userId: r.user_id,
    publicId: r.public_id,
    joinedAt: r.joined_at,
    profile: {
      userId: r.user_id,
      photoUrl: r.photo_url,
      firstName: r.first_name,
      lastName: r.last_name,
      instagram: r.instagram,
      niche: r.niche,
      about: r.about,
      helpful: r.helpful,
      updatedAt: r.updated_at,
    },
  }));

  if (!q) return items;
  return items.filter((p) => {
    const name = buildDisplayName({ firstName: p.profile.firstName, lastName: p.profile.lastName }).toLowerCase();
    const niche = (p.profile.niche ?? "").toLowerCase();
    const instagram = (p.profile.instagram ?? "").toLowerCase();
    return name.includes(q) || niche.includes(q) || instagram.includes(q);
  });
}

export type DbSpeaker = {
  id: string;
  name: string;
  photoUrl: string | null;
  topic: string | null;
  bio: string | null;
  socials: string[];
  sortOrder: number;
};

export function listSpeakers(eventId: string): DbSpeaker[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, photo_url, topic, bio, socials_json, sort_order
       FROM speakers
       WHERE event_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all(eventId) as Array<{
    id: string;
    name: string;
    photo_url: string | null;
    topic: string | null;
    bio: string | null;
    socials_json: string | null;
    sort_order: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    photoUrl: r.photo_url,
    topic: r.topic,
    bio: r.bio,
    socials: parseJsonArray(r.socials_json),
    sortOrder: r.sort_order,
  }));
}

export function upsertSpeaker(eventId: string, input: Omit<DbSpeaker, "id"> & { id?: string }) {
  const db = getDb();
  const ts = nowIso();
  const id = input.id ?? newId();
  const existing = db.prepare("SELECT id FROM speakers WHERE id = ? AND event_id = ?").get(id, eventId) as
    | { id: string }
    | undefined;
  if (existing) {
    db.prepare(
      `UPDATE speakers
       SET name = ?, photo_url = ?, topic = ?, bio = ?, socials_json = ?, sort_order = ?, updated_at = ?
       WHERE id = ? AND event_id = ?`,
    ).run(
      input.name,
      input.photoUrl ?? null,
      input.topic ?? null,
      input.bio ?? null,
      stringifyJsonArray(input.socials ?? []),
      input.sortOrder ?? 0,
      ts,
      id,
      eventId,
    );
  } else {
    db.prepare(
      `INSERT INTO speakers (id, event_id, name, photo_url, topic, bio, socials_json, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      eventId,
      input.name,
      input.photoUrl ?? null,
      input.topic ?? null,
      input.bio ?? null,
      stringifyJsonArray(input.socials ?? []),
      input.sortOrder ?? 0,
      ts,
      ts,
    );
  }
  return id;
}

export function deleteSpeaker(eventId: string, speakerId: string) {
  const db = getDb();
  db.prepare("DELETE FROM speakers WHERE id = ? AND event_id = ?").run(speakerId, eventId);
}

export type DbScheduleItem = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  description: string | null;
  speakerId: string | null;
  location: string | null;
  sortOrder: number;
};

export function listSchedule(eventId: string): DbScheduleItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, starts_at, ends_at, title, description, speaker_id, location, sort_order
       FROM schedule_items
       WHERE event_id = ?
       ORDER BY starts_at ASC, sort_order ASC, created_at ASC`,
    )
    .all(eventId) as Array<{
    id: string;
    starts_at: string;
    ends_at: string | null;
    title: string;
    description: string | null;
    speaker_id: string | null;
    location: string | null;
    sort_order: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    title: r.title,
    description: r.description,
    speakerId: r.speaker_id,
    location: r.location,
    sortOrder: r.sort_order,
  }));
}

export function upsertScheduleItem(eventId: string, input: Omit<DbScheduleItem, "id"> & { id?: string }) {
  const db = getDb();
  const ts = nowIso();
  const id = input.id ?? newId();
  const existing = db
    .prepare("SELECT id FROM schedule_items WHERE id = ? AND event_id = ?")
    .get(id, eventId) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE schedule_items
       SET starts_at = ?, ends_at = ?, title = ?, description = ?, speaker_id = ?, location = ?, sort_order = ?, updated_at = ?
       WHERE id = ? AND event_id = ?`,
    ).run(
      input.startsAt,
      input.endsAt ?? null,
      input.title,
      input.description ?? null,
      input.speakerId ?? null,
      input.location ?? null,
      input.sortOrder ?? 0,
      ts,
      id,
      eventId,
    );
  } else {
    db.prepare(
      `INSERT INTO schedule_items (id, event_id, starts_at, ends_at, title, description, speaker_id, location, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      eventId,
      input.startsAt,
      input.endsAt ?? null,
      input.title,
      input.description ?? null,
      input.speakerId ?? null,
      input.location ?? null,
      input.sortOrder ?? 0,
      ts,
      ts,
    );
  }
  return id;
}

export function deleteScheduleItem(eventId: string, itemId: string) {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items WHERE id = ? AND event_id = ?").run(itemId, eventId);
}

export function getChatLink() {
  const db = getDb();
  const row = db.prepare("SELECT chat_link FROM settings WHERE id = 'singleton'").get() as
    | { chat_link: string | null }
    | undefined;
  return row?.chat_link ?? null;
}

export function setChatLink(url: string | null) {
  const db = getDb();
  db.prepare("UPDATE settings SET chat_link = ?, updated_at = ? WHERE id = 'singleton'").run(url, nowIso());
}
