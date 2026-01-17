import crypto from "node:crypto";
import { sql } from "@vercel/postgres";

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
    plannedAt: string | null;
    plannedPlace: string | null;
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

let initPromise: Promise<void> | null = null;

function ensurePostgresUrl() {
  if (!process.env.POSTGRES_URL) {
    const fallback = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
    if (fallback) process.env.POSTGRES_URL = fallback;
  }
  if (!process.env.POSTGRES_URL) {
    throw new Error("missing_postgres_url");
  }
}

async function ensureDb() {
  if (!initPromise) {
    ensurePostgresUrl();
    initPromise = initDb();
  }
  await initPromise;
}

async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id TEXT UNIQUE NOT NULL,
      public_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `;

  await sql`
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

  await sql`
    CREATE TABLE IF NOT EXISTS event_participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL,
      UNIQUE(event_id, user_id)
    )
  `;

  await sql`
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

  await sql`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      created_by_user_id TEXT,
      UNIQUE(event_id, user_a_id, user_b_id)
    )
  `;

  await sql`
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

  // Backward-compatible migrations for existing tables
  await sql`ALTER TABLE meeting_meta ADD COLUMN IF NOT EXISTS planned_at TEXT`;
  await sql`ALTER TABLE meeting_meta ADD COLUMN IF NOT EXISTS planned_place TEXT`;

  await sql`
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
    )
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY CHECK (id = 'singleton'),
      chat_link TEXT,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    INSERT INTO settings (id, chat_link, updated_at)
    VALUES ('singleton', NULL, ${nowIso()})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function ensureDefaultEvent() {
  await ensureDb();
  const slug = process.env.DEFAULT_EVENT_SLUG ?? "default";
  const name = process.env.DEFAULT_EVENT_NAME ?? "Popova Events";

  const existing = await getEventBySlug(slug);
  if (existing) return existing;

  const id = newId();
  await sql`
    INSERT INTO events (id, slug, name, status, created_at)
    VALUES (${id}, ${slug}, ${name}, 'active', ${nowIso()})
  `;
  return { id, slug, name, status: "active" as const };
}

export async function getEventBySlug(slug: string) {
  await ensureDb();
  const result = await sql`
    SELECT id, slug, name, status, starts_at, ends_at
    FROM events
    WHERE slug = ${slug}
  `;
  const row = result.rows[0] as
    | { id: string; slug: string; name: string; status: string; starts_at: string | null; ends_at: string | null }
    | undefined;
  if (!row) return null;
  return { id: row.id, slug: row.slug, name: row.name, status: row.status };
}

export async function ensureEventBySlug(slug: string) {
  const existing = await getEventBySlug(slug);
  if (existing) return existing;

  const allowPublicCreate = process.env.ALLOW_PUBLIC_EVENT_CREATE === "1";
  if (!allowPublicCreate) return null;

  await ensureDb();
  const id = newId();
  const defaultName = process.env.DEFAULT_EVENT_NAME ?? "Popova Events";
  const name = slug === (process.env.DEFAULT_EVENT_SLUG ?? "default") ? defaultName : slug;
  await sql`
    INSERT INTO events (id, slug, name, status, created_at)
    VALUES (${id}, ${slug}, ${name}, 'active', ${nowIso()})
  `;
  return { id, slug, name, status: "active" as const };
}

export async function getOrCreateUserByTelegramId(telegramId: string): Promise<DbUser> {
  await ensureDb();
  const createdAt = nowIso();
  const result = await sql`
    INSERT INTO users (id, telegram_id, public_id, created_at)
    VALUES (${newId()}, ${telegramId}, ${newId()}, ${createdAt})
    ON CONFLICT (telegram_id)
    DO UPDATE SET telegram_id = EXCLUDED.telegram_id
    RETURNING id, telegram_id, public_id, created_at
  `;
  const row = result.rows[0] as { id: string; telegram_id: string; public_id: string; created_at: string };
  return {
    id: row.id,
    telegramId: row.telegram_id,
    publicId: row.public_id,
    createdAt: row.created_at,
  };
}

export async function ensureEventParticipant(eventId: string, userId: string) {
  await ensureDb();
  await sql`
    INSERT INTO event_participants (id, event_id, user_id, joined_at)
    VALUES (${newId()}, ${eventId}, ${userId}, ${nowIso()})
    ON CONFLICT (event_id, user_id) DO NOTHING
  `;
}

export async function getProfileByUserId(userId: string): Promise<DbProfile | null> {
  await ensureDb();
  const result = await sql`
    SELECT user_id, photo_url, first_name, last_name, instagram, niche, about, helpful, updated_at
    FROM profiles
    WHERE user_id = ${userId}
  `;
  const row = result.rows[0] as
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

export async function upsertProfile(userId: string, input: UpsertProfileInput): Promise<DbProfile> {
  await ensureDb();
  const updatedAt = nowIso();
  await sql`
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

  const profile = await getProfileByUserId(userId);
  return profile!;
}

export async function findUserByPublicId(publicId: string): Promise<DbUser | null> {
  await ensureDb();
  const result = await sql`
    SELECT id, telegram_id, public_id, created_at
    FROM users
    WHERE public_id = ${publicId}
  `;
  const row = result.rows[0] as { id: string; telegram_id: string; public_id: string; created_at: string } | undefined;
  if (!row) return null;
  return { id: row.id, telegramId: row.telegram_id, publicId: row.public_id, createdAt: row.created_at };
}

export async function createOrGetMeeting(eventId: string, meUserId: string, otherPublicId: string) {
  const otherUser = await findUserByPublicId(otherPublicId);
  if (!otherUser) return { ok: false as const, error: "not_found" as const };
  if (otherUser.id === meUserId) return { ok: false as const, error: "self_scan" as const };

  const [userAId, userBId] = meUserId < otherUser.id ? [meUserId, otherUser.id] : [otherUser.id, meUserId];
  await ensureDb();

  const existing = await sql`
    SELECT id FROM meetings WHERE event_id = ${eventId} AND user_a_id = ${userAId} AND user_b_id = ${userBId}
  `;

  const meetingId = (existing.rows[0] as { id: string } | undefined)?.id ?? newId();
  let created = false;
  if (!existing.rows.length) {
    const inserted = await sql`
      INSERT INTO meetings (id, event_id, user_a_id, user_b_id, created_at, created_by_user_id)
      VALUES (${meetingId}, ${eventId}, ${userAId}, ${userBId}, ${nowIso()}, ${meUserId})
      ON CONFLICT (event_id, user_a_id, user_b_id) DO NOTHING
    `;
    created = (inserted as unknown as { rowCount?: number }).rowCount === 1;
  }

  const ts = nowIso();
  await sql`
    INSERT INTO meeting_meta (id, meeting_id, user_id, note, rating, updated_at)
    VALUES (${newId()}, ${meetingId}, ${meUserId}, NULL, NULL, ${ts})
    ON CONFLICT (meeting_id, user_id) DO NOTHING
  `;
  await sql`
    INSERT INTO meeting_meta (id, meeting_id, user_id, note, rating, updated_at)
    VALUES (${newId()}, ${meetingId}, ${otherUser.id}, NULL, NULL, ${ts})
    ON CONFLICT (meeting_id, user_id) DO NOTHING
  `;

  return { ok: true as const, meetingId, otherUserId: otherUser.id, created };
}

export async function listMeetings(eventId: string, meUserId: string): Promise<DbMeetingListItem[]> {
  await ensureDb();
  const result = await sql`
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

  const rows = result.rows as Array<{
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
    my_planned_at: string | null;
    my_planned_place: string | null;
  }>;

  return rows.map((r) => ({
    id: r.meeting_id,
    createdAt: r.created_at,
    other: {
      userId: r.other_user_id,
      telegramId: r.other_telegram_id,
      publicId: r.other_public_id,
      displayName: r.other_first_name
        ? buildDisplayName({ firstName: r.other_first_name, lastName: r.other_last_name })
        : null,
      photoUrl: r.other_photo_url,
      niche: r.other_niche,
    },
    meta: { note: r.my_note, rating: r.my_rating, plannedAt: r.my_planned_at, plannedPlace: r.my_planned_place },
  }));
}

export async function getMeetingDetail(
  eventId: string,
  meUserId: string,
  meetingId: string,
): Promise<DbMeetingDetail | null> {
  await ensureDb();
  const result = await sql`
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
      mm.rating as my_rating,
      mm.planned_at as my_planned_at,
      mm.planned_place as my_planned_place
    FROM meetings m
    JOIN users uo
      ON uo.id = CASE WHEN m.user_a_id = ${meUserId} THEN m.user_b_id ELSE m.user_a_id END
    LEFT JOIN profiles po ON po.user_id = uo.id
    LEFT JOIN meeting_meta mm ON mm.meeting_id = m.id AND mm.user_id = ${meUserId}
    WHERE m.id = ${meetingId} AND m.event_id = ${eventId} AND (m.user_a_id = ${meUserId} OR m.user_b_id = ${meUserId})
    LIMIT 1
  `;

  const row = result.rows[0] as
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
        my_planned_at: string | null;
        my_planned_place: string | null;
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
    meta: { note: row.my_note, rating: row.my_rating, plannedAt: row.my_planned_at, plannedPlace: row.my_planned_place },
    otherProfile,
  };
}

export async function updateMeetingMeta(
  meetingId: string,
  userId: string,
  note: string | null,
  rating: number | null,
  plannedAt: string | null,
  plannedPlace: string | null,
) {
  await ensureDb();
  await sql`
    UPDATE meeting_meta
    SET note = ${note}, rating = ${rating}, planned_at = ${plannedAt}, planned_place = ${plannedPlace}, updated_at = ${nowIso()}
    WHERE meeting_id = ${meetingId} AND user_id = ${userId}
  `;
}

export async function getStats(eventId: string, userId: string) {
  await ensureDb();
  const countResult = await sql`
    SELECT COUNT(*) as c FROM meetings WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
  `;
  const ratedResult = await sql`
    SELECT COUNT(*) as c, AVG(rating) as avg
    FROM meeting_meta
    WHERE user_id = ${userId} AND rating IS NOT NULL
      AND meeting_id IN (
        SELECT id FROM meetings WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
      )
  `;
  const notesResult = await sql`
    SELECT COUNT(*) as c
    FROM meeting_meta
    WHERE user_id = ${userId} AND note IS NOT NULL AND TRIM(note) <> ''
      AND meeting_id IN (
        SELECT id FROM meetings WHERE event_id = ${eventId} AND (user_a_id = ${userId} OR user_b_id = ${userId})
      )
  `;

  const countRow = countResult.rows[0] as { c: string };
  const ratedRow = ratedResult.rows[0] as { c: string; avg: string | null };
  const notesRow = notesResult.rows[0] as { c: string };

  return {
    meetingsCount: Number(countRow.c),
    ratedCount: Number(ratedRow.c),
    avgRating: ratedRow.avg ? Number(ratedRow.avg) : null,
    notesCount: Number(notesRow.c),
  };
}

export async function upsertBotUser(input: {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isRegistered?: boolean;
}) {
  await ensureDb();
  const ts = nowIso();
  await sql`
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

export async function setBotUserRegistered(telegramId: string) {
  await ensureDb();
  await sql`
    UPDATE bot_users SET is_registered = 1, last_seen_at = ${nowIso()} WHERE telegram_id = ${telegramId}
  `;
}

export type DbParticipant = {
  userId: string;
  publicId: string;
  joinedAt: string;
  profile: DbProfile;
};

type DemoSlot = {
  title: string;
  speakerName: string;
  role: string;
  format: string;
};

const DEMO_SCHEDULE: DemoSlot[] = [
  { title: "Открытие ночи идей", speakerName: "Лира Сандерс", role: "куратор “ночных конференций”", format: "интро + правила + быстрый нетворкинг (3 знакомства за 5 минут)" },
  { title: "Как мозг принимает решения в 3 часа ночи", speakerName: "д-р Марк Вельтман", role: "нейропсихолог-экспериментатор", format: "лекция + мини-тест на внимание" },
  { title: "Уют как технология: почему нам важны ритуалы", speakerName: "Эйва Норр", role: "исследовательница поведенческих привычек", format: "talk + “собери свой ритуал” (упражнение)" },
  { title: "Микро-креатив: как генерить идеи, когда пусто", speakerName: "Реми Кай", role: "автор “1000 маленьких концептов”", format: "воркшоп: 30 идей за 30 минут" },
  { title: "Тёмная сторона продуктивности: когда KPI вредят", speakerName: "Саймон Крэддок", role: "консультант по выгоранию", format: "кейсы + Q&A" },
  { title: "Музыка и концентрация: что реально работает", speakerName: "Мина Д'Орсо", role: "саунд-дизайнер для “фокус-пространств”", format: "прослушивание примеров + разбор" },
  { title: "Утренний перезапуск: тело как интерфейс", speakerName: "Кай Рэнд", role: "тренер по восстановлению и мобильности", format: "лёгкая зарядка + дыхание (без фанатизма)" },
  { title: "Кофе, чай, вода: личная химия бодрости", speakerName: "Нора Лин", role: "нутрициолог-практик", format: "лекция + “карта энергии” на день" },
  { title: "Планирование без ненависти: система на 15 минут", speakerName: "Оливер Брик", role: "автор минималистичных методик", format: "воркшоп: собрать свой шаблон недели" },
  { title: "Как говорить так, чтобы вас слушали", speakerName: "Лиана Коваль", role: "тренер по речи и структуре выступлений", format: "практика: “1 мысль — 1 минута”" },
  { title: "Дизайн смысла: как делать понятные интерфейсы", speakerName: "Джун Пак", role: "продуктовый дизайнер-стратег", format: "разбор примеров + чек-лист" },
  { title: "Истории, которые продают: сторителлинг без клише", speakerName: "Рафаэль Грин", role: "сценарист и редактор питчей", format: "“до/после” + упражнения" },
  { title: "Обед-сессия: быстрые знакомства по интересам", speakerName: "Мэй Соло", role: "фасилитатор сообществ", format: "round-tables (5 тем на выбор)" },
  { title: "Как учиться быстрее и помнить дольше", speakerName: "профессор Эллиот Сторм", role: "когнитивист (вымышленный)", format: "техники + практика “вспомни через 10 минут”" },
  { title: "Деньги как поведение: почему бюджеты не работают", speakerName: "Ханна Вирк", role: "поведенческий экономист", format: "лекция + разбор ошибок" },
  { title: "Переговоры без токсичности: мягко и эффективно", speakerName: "Дамир Роше", role: "медиатор и переговорщик", format: "ролевые мини-сцены" },
  { title: "Команды: как не разрушать мотивацию", speakerName: "Ирис Нель", role: "руководительница “анти-микроменеджмента”", format: "кейсы + “фразы-замены”" },
  { title: "Ошибки как стратегия: строим систему экспериментов", speakerName: "Томас Юн", role: "продакт-экспериментатор", format: "шаблон эксперимента + примеры" },
  { title: "Спокойные технологии: цифровая гигиена без радикализма", speakerName: "Селин Мора", role: "исследовательница внимания", format: "аудит приложений + план “минус 20% шума”" },
  { title: "Творческая смелость: как делать, даже если страшно", speakerName: "Пабло Хейз", role: "арт-директор и ментор", format: "упражнения на “плохой первый черновик”" },
  { title: "Город будущего: как мы будем жить через 20 лет", speakerName: "д-р Сайя Ким", role: "урбанист-футуролог", format: "лекция + голосование за сценарии" },
  { title: "Этика решений: что делать, когда нет идеального выбора", speakerName: "Рут Эверетт", role: "философ-практик", format: "разбор дилемм + дискуссия" },
  { title: "Ночная лаборатория идей: собери проект за час", speakerName: "Нико Лаваль", role: "фасилитатор хакатонов", format: "команды по 3–4 человека, быстрый прототип" },
  { title: "Финал: шоу-питчи + награды “за дерзость”", speakerName: "Вэл Картер", role: "ведущий и “главный по финалу”", format: "питчи 60 секунд + закрытие + фото/музыка" },
];

export async function listParticipants(eventId: string, opts?: { q?: string | null; limit?: number }) {
  await ensureDb();
  const q = (opts?.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);

  const result = await sql`
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
    WHERE ep.event_id = ${eventId}
    ORDER BY ep.joined_at DESC
    LIMIT ${limit}
  `;

  const rows = result.rows as Array<{
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

const seededEvents = new Set<string>();

export async function seedDemoIfEmpty(eventId: string) {
  if (process.env.SEED_DEMO !== "1") return;
  if (seededEvents.has(eventId)) return;
  await ensureDb();

  const scheduleCount = await sql`SELECT COUNT(*) as c FROM schedule_items WHERE event_id = ${eventId}`;
  const countRow = scheduleCount.rows[0] as { c: string };
  if (Number(countRow.c) > 0) {
    seededEvents.add(eventId);
    return;
  }

  const speakerIds = new Map<string, string>();
  const ts = nowIso();
  for (const [index, slot] of DEMO_SCHEDULE.entries()) {
    const speakerId = newId();
    speakerIds.set(slot.speakerName, speakerId);
    await sql`
      INSERT INTO speakers (id, event_id, name, photo_url, topic, bio, socials_json, sort_order, created_at, updated_at)
      VALUES (
        ${speakerId},
        ${eventId},
        ${slot.speakerName},
        ${null},
        ${slot.role},
        ${`Формат: ${slot.format}`},
        ${stringifyJsonArray([])},
        ${index},
        ${ts},
        ${ts}
      )
    `;
  }

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  for (const [index, slot] of DEMO_SCHEDULE.entries()) {
    const startsAt = new Date(base.getTime() + index * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(base.getTime() + (index + 1) * 60 * 60 * 1000).toISOString();
    const speakerId = speakerIds.get(slot.speakerName) ?? null;
    await sql`
      INSERT INTO schedule_items (
        id, event_id, starts_at, ends_at, title, description, speaker_id, location, sort_order, created_at, updated_at
      )
      VALUES (
        ${newId()},
        ${eventId},
        ${startsAt},
        ${endsAt},
        ${slot.title},
        ${`Формат: ${slot.format}`},
        ${speakerId},
        ${null},
        ${index},
        ${ts},
        ${ts}
      )
    `;
  }

  seededEvents.add(eventId);
}

export type DbAdminProfile = {
  userId: string;
  telegramId: string;
  publicId: string;
  joinedAt: string;
  profile: DbProfile;
};

export async function listAdminProfiles(eventId: string, opts?: { q?: string | null; limit?: number }) {
  await ensureDb();
  const q = (opts?.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 1000);

  const result = await sql`
    SELECT
      ep.joined_at as joined_at,
      u.id as user_id,
      u.telegram_id as telegram_id,
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
    WHERE ep.event_id = ${eventId}
    ORDER BY ep.joined_at DESC
    LIMIT ${limit}
  `;

  const rows = result.rows as Array<{
    joined_at: string;
    user_id: string;
    telegram_id: string;
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

  const items: DbAdminProfile[] = rows.map((r) => ({
    userId: r.user_id,
    telegramId: r.telegram_id,
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
    const telegramId = (p.telegramId ?? "").toLowerCase();
    const publicId = (p.publicId ?? "").toLowerCase();
    return (
      name.includes(q) ||
      niche.includes(q) ||
      instagram.includes(q) ||
      telegramId.includes(q) ||
      publicId.includes(q)
    );
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

export async function listSpeakers(eventId: string): Promise<DbSpeaker[]> {
  await ensureDb();
  const result = await sql`
    SELECT id, name, photo_url, topic, bio, socials_json, sort_order
    FROM speakers
    WHERE event_id = ${eventId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  const rows = result.rows as Array<{
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

export async function upsertSpeaker(eventId: string, input: Omit<DbSpeaker, "id"> & { id?: string }) {
  await ensureDb();
  const ts = nowIso();
  const id = input.id ?? newId();
  const existing = await sql`
    SELECT id FROM speakers WHERE id = ${id} AND event_id = ${eventId}
  `;
  if (existing.rows.length) {
    await sql`
      UPDATE speakers
      SET name = ${input.name},
          photo_url = ${input.photoUrl ?? null},
          topic = ${input.topic ?? null},
          bio = ${input.bio ?? null},
          socials_json = ${stringifyJsonArray(input.socials ?? [])},
          sort_order = ${input.sortOrder ?? 0},
          updated_at = ${ts}
      WHERE id = ${id} AND event_id = ${eventId}
    `;
  } else {
    await sql`
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

export async function deleteSpeaker(eventId: string, speakerId: string) {
  await ensureDb();
  await sql`DELETE FROM speakers WHERE id = ${speakerId} AND event_id = ${eventId}`;
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

export async function listSchedule(eventId: string): Promise<DbScheduleItem[]> {
  await ensureDb();
  const result = await sql`
    SELECT id, starts_at, ends_at, title, description, speaker_id, location, sort_order
    FROM schedule_items
    WHERE event_id = ${eventId}
    ORDER BY starts_at ASC, sort_order ASC, created_at ASC
  `;
  const rows = result.rows as Array<{
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

export async function upsertScheduleItem(eventId: string, input: Omit<DbScheduleItem, "id"> & { id?: string }) {
  await ensureDb();
  const ts = nowIso();
  const id = input.id ?? newId();
  const existing = await sql`
    SELECT id FROM schedule_items WHERE id = ${id} AND event_id = ${eventId}
  `;
  if (existing.rows.length) {
    await sql`
      UPDATE schedule_items
      SET starts_at = ${input.startsAt},
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
    await sql`
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

export async function deleteScheduleItem(eventId: string, itemId: string) {
  await ensureDb();
  await sql`DELETE FROM schedule_items WHERE id = ${itemId} AND event_id = ${eventId}`;
}

export async function getChatLink() {
  await ensureDb();
  const result = await sql`SELECT chat_link FROM settings WHERE id = 'singleton'`;
  const row = result.rows[0] as { chat_link: string | null } | undefined;
  return row?.chat_link ?? null;
}

export async function setChatLink(url: string | null) {
  await ensureDb();
  await sql`UPDATE settings SET chat_link = ${url}, updated_at = ${nowIso()} WHERE id = 'singleton'`;
}

export function splitProfileDisplayName(displayName: string) {
  return splitDisplayName(displayName);
}
