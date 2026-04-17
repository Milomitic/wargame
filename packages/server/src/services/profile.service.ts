import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  PLAYER_AVATARS,
  ALLIANCE_AVATARS,
  type PlayerProfile,
  type AllianceProfile,
  type AllianceMember,
  type AllianceRole,
} from "@wargame/shared";

const PLAYER_AVATAR_SET = new Set<string>(PLAYER_AVATARS);
const ALLIANCE_AVATAR_SET = new Set<string>(ALLIANCE_AVATARS);

const MAX_BIO = 500;
const MAX_DESCRIPTION = 200;
const MAX_MANIFESTO = 1500;

export async function getPlayerProfile(
  targetPlayerId: string,
  requestingPlayerId: string
): Promise<PlayerProfile | null> {
  const playerRows = await db
    .select()
    .from(schema.players)
    .where(eq(schema.players.id, targetPlayerId))
    .limit(1);

  const player = playerRows[0];
  if (!player) return null;

  const fiefRows = await db
    .select()
    .from(schema.fiefs)
    .where(eq(schema.fiefs.playerId, targetPlayerId))
    .limit(1);
  const fief = fiefRows[0];

  let buildingsTotalLevel = 0;
  if (fief) {
    const totals = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.buildings.level}), 0)`.as("total"),
      })
      .from(schema.buildings)
      .where(eq(schema.buildings.fiefId, fief.id));
    buildingsTotalLevel = Number(totals[0]?.total ?? 0);
  }

  const techRows = await db
    .select()
    .from(schema.playerTechnologies)
    .where(eq(schema.playerTechnologies.playerId, targetPlayerId));
  const techsResearched = techRows.filter((t) => t.status === "completed").length;

  const memberRow = await db
    .select()
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, targetPlayerId))
    .limit(1);

  let allianceId: string | null = null;
  let allianceTag: string | null = null;
  let allianceName: string | null = null;
  if (memberRow[0]) {
    const a = await db
      .select()
      .from(schema.alliances)
      .where(eq(schema.alliances.id, memberRow[0].allianceId))
      .limit(1);
    if (a[0]) {
      allianceId = a[0].id;
      allianceTag = a[0].tag;
      allianceName = a[0].name;
    }
  }

  return {
    id: player.id,
    username: player.username,
    displayName: player.displayName,
    bio: player.bio ?? "",
    avatar: player.avatar ?? "knight",
    createdAt: player.createdAt,
    lastLoginAt: player.lastLoginAt ?? null,
    score: player.score ?? 0,
    attackKills: player.attackKills ?? 0,
    defenseKills: player.defenseKills ?? 0,
    fiefName: fief?.name ?? null,
    fiefLevel: fief?.level ?? 0,
    fiefTileId: fief?.tileId ?? null,
    population: fief?.population ?? 0,
    allianceId,
    allianceTag,
    allianceName,
    buildingsTotalLevel,
    techsResearched,
    isMe: targetPlayerId === requestingPlayerId,
    isAdmin: !!player.isAdmin,
  };
}

export async function updateMyProfile(
  playerId: string,
  patch: { bio?: string; avatar?: string; displayName?: string }
): Promise<{ ok: boolean; error?: string }> {
  const set: Record<string, unknown> = {};

  if (patch.bio != null) {
    if (patch.bio.length > MAX_BIO) {
      return { ok: false, error: `Bio too long (max ${MAX_BIO} chars)` };
    }
    set.bio = patch.bio;
  }
  if (patch.avatar != null) {
    if (!PLAYER_AVATAR_SET.has(patch.avatar)) {
      return { ok: false, error: "Invalid avatar" };
    }
    set.avatar = patch.avatar;
  }
  if (patch.displayName != null) {
    const trimmed = patch.displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      return { ok: false, error: "Display name must be 2-30 characters" };
    }
    set.displayName = trimmed;
  }

  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(schema.players).set(set).where(eq(schema.players.id, playerId));
  return { ok: true };
}

export async function getAllianceProfile(
  allianceId: string,
  requestingPlayerId: string
): Promise<AllianceProfile | null> {
  const allianceRows = await db
    .select()
    .from(schema.alliances)
    .where(eq(schema.alliances.id, allianceId))
    .limit(1);

  const alliance = allianceRows[0];
  if (!alliance) return null;

  const memberRows = await db
    .select({
      playerId: schema.allianceMembers.playerId,
      role: schema.allianceMembers.role,
      joinedAt: schema.allianceMembers.joinedAt,
      displayName: schema.players.displayName,
      score: schema.players.score,
      attackKills: schema.players.attackKills,
      defenseKills: schema.players.defenseKills,
    })
    .from(schema.allianceMembers)
    .leftJoin(schema.players, eq(schema.allianceMembers.playerId, schema.players.id))
    .where(eq(schema.allianceMembers.allianceId, allianceId));

  const members: AllianceMember[] = [];
  let totalScore = 0;
  let totalAttackKills = 0;
  let totalDefenseKills = 0;
  let myRole: AllianceRole | null = null;

  for (const m of memberRows) {
    const fiefRows = await db
      .select({ level: schema.fiefs.level })
      .from(schema.fiefs)
      .where(eq(schema.fiefs.playerId, m.playerId))
      .limit(1);

    const role = m.role as AllianceRole;
    members.push({
      playerId: m.playerId,
      displayName: m.displayName ?? "Unknown",
      role,
      fiefLevel: fiefRows[0]?.level ?? 1,
      joinedAt: m.joinedAt,
    });

    totalScore += m.score ?? 0;
    totalAttackKills += m.attackKills ?? 0;
    totalDefenseKills += m.defenseKills ?? 0;

    if (m.playerId === requestingPlayerId) myRole = role;
  }

  const leader = members.find((m) => m.role === "leader");

  return {
    id: alliance.id,
    name: alliance.name,
    tag: alliance.tag,
    description: alliance.description,
    manifesto: alliance.manifesto ?? "",
    avatar: alliance.avatar ?? "banner_red",
    leaderId: alliance.leaderId,
    leaderName: leader?.displayName ?? "Unknown",
    memberCount: members.length,
    totalScore,
    totalAttackKills,
    totalDefenseKills,
    createdAt: alliance.createdAt,
    members,
    isMyAlliance: myRole !== null,
    myRole,
  };
}

export async function updateAllianceProfile(
  playerId: string,
  allianceId: string,
  patch: { description?: string; manifesto?: string; avatar?: string }
): Promise<{ ok: boolean; error?: string }> {
  // Verify the requesting player is leader/officer of this alliance
  const memberRow = await db
    .select()
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, playerId))
    .limit(1);

  if (!memberRow[0] || memberRow[0].allianceId !== allianceId) {
    return { ok: false, error: "Not a member of this alliance" };
  }
  if (memberRow[0].role !== "leader" && memberRow[0].role !== "officer") {
    return { ok: false, error: "Only leaders and officers can edit the alliance" };
  }

  const set: Record<string, unknown> = {};
  if (patch.description != null) {
    if (patch.description.length > MAX_DESCRIPTION) {
      return { ok: false, error: `Description too long (max ${MAX_DESCRIPTION} chars)` };
    }
    set.description = patch.description;
  }
  if (patch.manifesto != null) {
    if (patch.manifesto.length > MAX_MANIFESTO) {
      return { ok: false, error: `Manifesto too long (max ${MAX_MANIFESTO} chars)` };
    }
    set.manifesto = patch.manifesto;
  }
  if (patch.avatar != null) {
    if (!ALLIANCE_AVATAR_SET.has(patch.avatar)) {
      return { ok: false, error: "Invalid avatar" };
    }
    set.avatar = patch.avatar;
  }

  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(schema.alliances).set(set).where(eq(schema.alliances.id, allianceId));
  return { ok: true };
}
