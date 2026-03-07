import * as legacy from "@/lib/db";
import {
  deleteTenantConfig,
  ensureControlEventBySlug,
  ensureDefaultControlEvent,
  findControlUserByPublicId,
  getActiveEventTenantBySlug,
  getControlDbStatus,
  getControlEventById,
  getControlEventBySlug,
  getControlProfileByUserId,
  getControlUserById,
  getOrCreateControlUserByTelegramId,
  isMultiDbRoutingEnabled,
  listControlProfilesByUserIds,
  listControlUsersByIds,
  listTenantConfigs,
  patchTenantConfig,
  setControlBotUserRegistered,
  upsertControlBotUser,
  upsertControlProfile,
  upsertTenantConfig,
  type ControlEvent,
  type EventMode,
} from "@/lib/controlDb";
import {
  createOrGetTenantMeeting,
  deleteTenantScheduleItem,
  deleteTenantSpeaker,
  ensureTenantParticipant,
  getTenantChatLink,
  getTenantMeetingDetail,
  getTenantStats,
  listTenantAdminProfiles,
  listTenantMeetings,
  listTenantParticipants,
  listTenantSchedule,
  listTenantSpeakers,
  seedTenantDemoIfEmpty,
  setTenantChatLink,
  upsertTenantProfileMirror,
  upsertTenantScheduleItem,
  upsertTenantSpeaker,
  updateTenantMeetingMeta,
} from "@/lib/tenantDb";

export type {
  DbAdminProfile,
  DbMeetingDetail,
  DbMeetingListItem,
  DbParticipant,
  DbProfile,
  DbScheduleItem,
  DbSpeaker,
  DbUser,
  UpsertProfileInput,
} from "@/lib/db";

export type EventTenantMode = EventMode;

export class EventNotConfiguredError extends Error {
  code = "event_not_configured" as const;
  slug: string;

  constructor(slug: string) {
    super(`event_not_configured:${slug}`);
    this.slug = slug;
  }
}

export function isEventNotConfiguredError(error: unknown): error is EventNotConfiguredError {
  if (error instanceof EventNotConfiguredError) return true;
  if (!error || typeof error !== "object") return false;
  if (!("code" in error)) return false;
  return (error as { code?: unknown }).code === "event_not_configured";
}

type EventStoreRouting =
  | { mode: "legacy" }
  | { mode: "tenant"; event: ControlEvent; tenantConnectionString: string };

async function resolveEventStoreByEventId(eventId: string): Promise<EventStoreRouting> {
  if (!isMultiDbRoutingEnabled()) return { mode: "legacy" };

  const controlEvent = await getControlEventById(eventId);
  if (!controlEvent || controlEvent.mode !== "tenant") return { mode: "legacy" };

  const tenant = await getActiveEventTenantBySlug(controlEvent.slug);
  if (!tenant) throw new EventNotConfiguredError(controlEvent.slug);

  return {
    mode: "tenant",
    event: controlEvent,
    tenantConnectionString: tenant.pooledConnectionString,
  };
}

async function ensureTenantEventReady(event: ControlEvent) {
  const tenant = await getActiveEventTenantBySlug(event.slug);
  if (!tenant) throw new EventNotConfiguredError(event.slug);
  await seedTenantDemoIfEmpty(tenant.pooledConnectionString, event.id);
  return tenant.pooledConnectionString;
}

export async function ensureDefaultEvent() {
  if (!isMultiDbRoutingEnabled()) return legacy.ensureDefaultEvent();

  const controlEvent = await ensureDefaultControlEvent();
  if (controlEvent.mode !== "tenant") return legacy.ensureDefaultEvent();

  await ensureTenantEventReady(controlEvent);
  return controlEvent;
}

export async function getEventBySlug(slug: string) {
  if (!isMultiDbRoutingEnabled()) return legacy.getEventBySlug(slug);

  const controlEvent = await getControlEventBySlug(slug);
  if (controlEvent?.mode === "tenant") {
    await ensureTenantEventReady(controlEvent);
    return controlEvent;
  }

  return legacy.getEventBySlug(slug);
}

export async function ensureEventBySlug(slug: string) {
  if (!isMultiDbRoutingEnabled()) return legacy.ensureEventBySlug(slug);

  const controlEvent = await getControlEventBySlug(slug);
  if (controlEvent?.mode === "tenant") {
    await ensureTenantEventReady(controlEvent);
    return controlEvent;
  }

  const legacyEvent = await legacy.ensureEventBySlug(slug);
  if (legacyEvent) return legacyEvent;

  const ensuredControl = await ensureControlEventBySlug(slug);
  if (!ensuredControl) return null;

  if (ensuredControl.mode === "tenant") {
    await ensureTenantEventReady(ensuredControl);
    return ensuredControl;
  }

  return legacy.ensureEventBySlug(slug);
}

export async function getOrCreateUserByTelegramId(telegramId: string, telegramUser?: unknown | null) {
  if (!isMultiDbRoutingEnabled()) return legacy.getOrCreateUserByTelegramId(telegramId, telegramUser);
  return getOrCreateControlUserByTelegramId(telegramId, telegramUser);
}

export async function getOrCreateUserForEvent(eventId: string, telegramId: string, telegramUser?: unknown | null) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.getOrCreateUserByTelegramId(telegramId, telegramUser);
  return getOrCreateControlUserByTelegramId(telegramId, telegramUser);
}

export async function ensureEventParticipant(eventId: string, userId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.ensureEventParticipant(eventId, userId);

  const user = await getControlUserById(userId);
  if (!user) throw new Error("control_user_not_found");
  const profile = await getControlProfileByUserId(userId);
  await ensureTenantParticipant(routing.tenantConnectionString, routing.event, user, profile);
}

export async function getProfileByUserId(userId: string) {
  if (!isMultiDbRoutingEnabled()) return legacy.getProfileByUserId(userId);

  const controlProfile = await getControlProfileByUserId(userId);
  if (controlProfile) return controlProfile;
  return legacy.getProfileByUserId(userId);
}

export async function upsertProfile(userId: string, input: legacy.UpsertProfileInput) {
  if (!isMultiDbRoutingEnabled()) return legacy.upsertProfile(userId, input);

  const controlUser = await getControlUserById(userId);
  if (!controlUser) {
    return legacy.upsertProfile(userId, input);
  }

  const profile = await upsertControlProfile(userId, input);

  // Keep legacy mirrors best-effort while rollout is mixed.
  try {
    await legacy.upsertProfile(userId, input);
  } catch {
    // ignore
  }

  return profile;
}

export async function findUserByPublicId(publicId: string) {
  if (!isMultiDbRoutingEnabled()) return legacy.findUserByPublicId(publicId);
  const user = await findControlUserByPublicId(publicId);
  if (user) return user;
  return legacy.findUserByPublicId(publicId);
}

function applyLiveProfileToMeetingItem(
  item: legacy.DbMeetingListItem,
  controlUsers: Map<string, legacy.DbUser>,
  controlProfiles: Map<string, legacy.DbProfile>,
): legacy.DbMeetingListItem {
  const user = controlUsers.get(item.other.userId);
  const profile = controlProfiles.get(item.other.userId);
  const displayName = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() : item.other.displayName;

  return {
    ...item,
    other: {
      ...item.other,
      telegramId: user?.telegramId ?? item.other.telegramId,
      publicId: user?.publicId ?? item.other.publicId,
      displayName: displayName || item.other.displayName,
      photoUrl: profile?.photoUrl ?? user?.telegramPhotoUrl ?? item.other.photoUrl,
      niche: profile?.niche ?? item.other.niche,
    },
  };
}

function applyLiveProfileToMeetingDetail(
  item: legacy.DbMeetingDetail,
  controlUsers: Map<string, legacy.DbUser>,
  controlProfiles: Map<string, legacy.DbProfile>,
): legacy.DbMeetingDetail {
  const user = controlUsers.get(item.other.userId);
  const profile = controlProfiles.get(item.other.userId);

  const mergedProfile = profile
    ? {
        ...profile,
        photoUrl: profile.photoUrl ?? user?.telegramPhotoUrl ?? item.otherProfile?.photoUrl ?? null,
      }
    : item.otherProfile;

  return {
    ...item,
    other: {
      ...item.other,
      telegramId: user?.telegramId ?? item.other.telegramId,
      publicId: user?.publicId ?? item.other.publicId,
      displayName: mergedProfile ? [mergedProfile.firstName, mergedProfile.lastName].filter(Boolean).join(" ").trim() : item.other.displayName,
      photoUrl: mergedProfile?.photoUrl ?? user?.telegramPhotoUrl ?? item.other.photoUrl,
      niche: mergedProfile?.niche ?? item.other.niche,
    },
    otherProfile: mergedProfile,
  };
}

export async function createOrGetMeeting(eventId: string, meUserId: string, otherPublicId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.createOrGetMeeting(eventId, meUserId, otherPublicId);

  const me = await getControlUserById(meUserId);
  const other = await findControlUserByPublicId(otherPublicId);
  if (!me || !other) return { ok: false as const, error: "not_found" as const };
  if (me.id === other.id) return { ok: false as const, error: "self_scan" as const };

  const [meProfile, otherProfile] = await Promise.all([
    getControlProfileByUserId(me.id),
    getControlProfileByUserId(other.id),
  ]);

  await ensureTenantParticipant(routing.tenantConnectionString, routing.event, me, meProfile);
  await ensureTenantParticipant(routing.tenantConnectionString, routing.event, other, otherProfile);

  const result = await createOrGetTenantMeeting(routing.tenantConnectionString, eventId, me.id, other.id);
  return { ok: true as const, meetingId: result.meetingId, otherUserId: other.id, created: result.created };
}

export async function listMeetings(eventId: string, meUserId: string): Promise<legacy.DbMeetingListItem[]> {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.listMeetings(eventId, meUserId);

  const items = await listTenantMeetings(routing.tenantConnectionString, eventId, meUserId);
  const ids = items.map((item) => item.other.userId);
  const [controlUsers, controlProfiles] = await Promise.all([
    listControlUsersByIds(ids),
    listControlProfilesByUserIds(ids),
  ]);
  return items.map((item) => applyLiveProfileToMeetingItem(item, controlUsers, controlProfiles));
}

export async function getMeetingDetail(
  eventId: string,
  meUserId: string,
  meetingId: string,
): Promise<legacy.DbMeetingDetail | null> {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.getMeetingDetail(eventId, meUserId, meetingId);

  const detail = await getTenantMeetingDetail(routing.tenantConnectionString, eventId, meUserId, meetingId);
  if (!detail) return null;

  const [controlUsers, controlProfiles] = await Promise.all([
    listControlUsersByIds([detail.other.userId]),
    listControlProfilesByUserIds([detail.other.userId]),
  ]);
  return applyLiveProfileToMeetingDetail(detail, controlUsers, controlProfiles);
}

export async function updateMeetingMeta(
  meetingId: string,
  userId: string,
  note: string | null,
  rating: number | null,
  plannedAt: string | null,
  plannedPlace: string | null,
) {
  if (!isMultiDbRoutingEnabled()) {
    return legacy.updateMeetingMeta(meetingId, userId, note, rating, plannedAt, plannedPlace);
  }

  // Kept for backward compatibility. In multi-db mode, use updateMeetingMetaForEvent.
  return legacy.updateMeetingMeta(meetingId, userId, note, rating, plannedAt, plannedPlace);
}

export async function updateMeetingMetaForEvent(
  eventId: string,
  meetingId: string,
  userId: string,
  note: string | null,
  rating: number | null,
  plannedAt: string | null,
  plannedPlace: string | null,
) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") {
    return legacy.updateMeetingMeta(meetingId, userId, note, rating, plannedAt, plannedPlace);
  }

  return updateTenantMeetingMeta(
    routing.tenantConnectionString,
    meetingId,
    userId,
    note,
    rating,
    plannedAt,
    plannedPlace,
  );
}

export async function getStats(eventId: string, userId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.getStats(eventId, userId);
  return getTenantStats(routing.tenantConnectionString, eventId, userId);
}

export async function upsertBotUser(input: {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isRegistered?: boolean;
}) {
  if (!isMultiDbRoutingEnabled()) return legacy.upsertBotUser(input);
  await upsertControlBotUser(input);
  try {
    await legacy.upsertBotUser(input);
  } catch {
    // ignore
  }
}

export async function setBotUserRegistered(telegramId: string) {
  if (!isMultiDbRoutingEnabled()) return legacy.setBotUserRegistered(telegramId);
  await setControlBotUserRegistered(telegramId);
  try {
    await legacy.setBotUserRegistered(telegramId);
  } catch {
    // ignore
  }
}

function applyLiveProfileToParticipant(
  item: legacy.DbParticipant,
  controlUsers: Map<string, legacy.DbUser>,
  controlProfiles: Map<string, legacy.DbProfile>,
): legacy.DbParticipant {
  const user = controlUsers.get(item.userId);
  const profile = controlProfiles.get(item.userId);
  if (!profile && !user) return item;

  return {
    ...item,
    publicId: user?.publicId ?? item.publicId,
    profile: {
      ...item.profile,
      firstName: profile?.firstName ?? item.profile.firstName,
      lastName: profile?.lastName ?? item.profile.lastName,
      instagram: profile?.instagram ?? item.profile.instagram,
      niche: profile?.niche ?? item.profile.niche,
      about: profile?.about ?? item.profile.about,
      helpful: profile?.helpful ?? item.profile.helpful,
      photoUrl: profile?.photoUrl ?? user?.telegramPhotoUrl ?? item.profile.photoUrl,
      updatedAt: profile?.updatedAt ?? item.profile.updatedAt,
    },
  };
}

export async function listParticipants(eventId: string, opts?: { q?: string | null; limit?: number }) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.listParticipants(eventId, opts);

  const items = await listTenantParticipants(routing.tenantConnectionString, eventId, opts);
  const ids = items.map((item) => item.userId);
  const [controlUsers, controlProfiles] = await Promise.all([
    listControlUsersByIds(ids),
    listControlProfilesByUserIds(ids),
  ]);

  return items.map((item) => applyLiveProfileToParticipant(item, controlUsers, controlProfiles));
}

export async function seedDemoIfEmpty(eventId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.seedDemoIfEmpty(eventId);
  return seedTenantDemoIfEmpty(routing.tenantConnectionString, eventId);
}

export async function listAdminProfiles(eventId: string, opts?: { q?: string | null; limit?: number }) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.listAdminProfiles(eventId, opts);

  const items = await listTenantAdminProfiles(routing.tenantConnectionString, eventId, opts);
  const ids = items.map((item) => item.userId);
  const [controlUsers, controlProfiles] = await Promise.all([
    listControlUsersByIds(ids),
    listControlProfilesByUserIds(ids),
  ]);

  return items.map((item) => {
    const user = controlUsers.get(item.userId);
    const profile = controlProfiles.get(item.userId);
    return {
      ...item,
      telegramId: user?.telegramId ?? item.telegramId,
      publicId: user?.publicId ?? item.publicId,
      profile: {
        ...item.profile,
        firstName: profile?.firstName ?? item.profile.firstName,
        lastName: profile?.lastName ?? item.profile.lastName,
        instagram: profile?.instagram ?? item.profile.instagram,
        niche: profile?.niche ?? item.profile.niche,
        about: profile?.about ?? item.profile.about,
        helpful: profile?.helpful ?? item.profile.helpful,
        photoUrl: profile?.photoUrl ?? user?.telegramPhotoUrl ?? item.profile.photoUrl,
        updatedAt: profile?.updatedAt ?? item.profile.updatedAt,
      },
    };
  });
}

export async function listSpeakers(eventId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.listSpeakers(eventId);
  return listTenantSpeakers(routing.tenantConnectionString, eventId);
}

export async function upsertSpeaker(eventId: string, input: Omit<legacy.DbSpeaker, "id"> & { id?: string }) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.upsertSpeaker(eventId, input);
  return upsertTenantSpeaker(routing.tenantConnectionString, eventId, input);
}

export async function deleteSpeaker(eventId: string, speakerId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.deleteSpeaker(eventId, speakerId);
  return deleteTenantSpeaker(routing.tenantConnectionString, eventId, speakerId);
}

export async function listSchedule(eventId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.listSchedule(eventId);
  return listTenantSchedule(routing.tenantConnectionString, eventId);
}

export async function upsertScheduleItem(
  eventId: string,
  input: Omit<legacy.DbScheduleItem, "id"> & { id?: string },
) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.upsertScheduleItem(eventId, input);
  return upsertTenantScheduleItem(routing.tenantConnectionString, eventId, input);
}

export async function deleteScheduleItem(eventId: string, itemId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.deleteScheduleItem(eventId, itemId);
  return deleteTenantScheduleItem(routing.tenantConnectionString, eventId, itemId);
}

export async function getChatLink() {
  return legacy.getChatLink();
}

export async function setChatLink(url: string | null) {
  return legacy.setChatLink(url);
}

export async function getChatLinkForEvent(eventId: string) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.getChatLink();
  return getTenantChatLink(routing.tenantConnectionString);
}

export async function setChatLinkForEvent(eventId: string, url: string | null) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return legacy.setChatLink(url);
  return setTenantChatLink(routing.tenantConnectionString, url);
}

export function splitProfileDisplayName(displayName: string) {
  return legacy.splitProfileDisplayName(displayName);
}

export async function mirrorProfileToTenant(eventId: string, profile: legacy.DbProfile) {
  const routing = await resolveEventStoreByEventId(eventId);
  if (routing.mode === "legacy") return;
  await upsertTenantProfileMirror(routing.tenantConnectionString, profile);
}

export async function getEventStoreMode(eventId: string): Promise<"legacy" | "tenant"> {
  const routing = await resolveEventStoreByEventId(eventId);
  return routing.mode;
}

export async function listAdminTenantConfigs() {
  return listTenantConfigs();
}

export async function adminUpsertTenantConfig(input: {
  slug: string;
  name?: string | null;
  status?: string | null;
  mode?: EventMode;
  pooledConnectionString: string;
  active?: boolean;
}) {
  return upsertTenantConfig(input);
}

export async function adminPatchTenantConfig(
  slug: string,
  patch: {
    name?: string | null;
    status?: string | null;
    mode?: EventMode;
    pooledConnectionString?: string | null;
    active?: boolean;
  },
) {
  return patchTenantConfig(slug, patch);
}

export async function adminDeleteTenantConfig(slug: string) {
  return deleteTenantConfig(slug);
}

export async function getAdminDbStatus() {
  return getControlDbStatus();
}
