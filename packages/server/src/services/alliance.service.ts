import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  ALLIANCE_MAX_MEMBERS,
  type Alliance,
  type AllianceMember,
  type AllianceInvite,
} from "@wargame/shared";

// ── Queries ──────────────────────────────────────────────────────

export async function getPlayerAlliance(playerId: string) {
  const memberRow = await db
    .select()
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, playerId))
    .limit(1);

  if (!memberRow[0]) return null;

  const allianceRow = await db
    .select()
    .from(schema.alliances)
    .where(eq(schema.alliances.id, memberRow[0].allianceId))
    .limit(1);

  if (!allianceRow[0]) return null;

  const memberCount = (
    await db
      .select()
      .from(schema.allianceMembers)
      .where(eq(schema.allianceMembers.allianceId, allianceRow[0].id))
  ).length;

  const alliance: Alliance = {
    id: allianceRow[0].id,
    name: allianceRow[0].name,
    tag: allianceRow[0].tag,
    description: allianceRow[0].description,
    leaderId: allianceRow[0].leaderId,
    memberCount,
    createdAt: allianceRow[0].createdAt,
  };

  return { alliance, membership: memberRow[0] };
}

export async function getAllianceMembers(allianceId: string): Promise<AllianceMember[]> {
  const rows = await db
    .select({
      playerId: schema.allianceMembers.playerId,
      role: schema.allianceMembers.role,
      joinedAt: schema.allianceMembers.joinedAt,
      displayName: schema.players.displayName,
    })
    .from(schema.allianceMembers)
    .leftJoin(schema.players, eq(schema.allianceMembers.playerId, schema.players.id))
    .where(eq(schema.allianceMembers.allianceId, allianceId));

  // Get fief levels
  const result: AllianceMember[] = [];
  for (const r of rows) {
    const fiefRows = await db
      .select({ level: schema.fiefs.level })
      .from(schema.fiefs)
      .where(eq(schema.fiefs.playerId, r.playerId))
      .limit(1);

    result.push({
      playerId: r.playerId,
      displayName: r.displayName ?? "Unknown",
      role: r.role as AllianceMember["role"],
      fiefLevel: fiefRows[0]?.level ?? 1,
      joinedAt: r.joinedAt,
    });
  }

  return result;
}

export async function getPlayerInvites(playerId: string): Promise<AllianceInvite[]> {
  const rows = await db
    .select({
      id: schema.allianceInvites.id,
      allianceId: schema.allianceInvites.allianceId,
      inviterId: schema.allianceInvites.inviterId,
      status: schema.allianceInvites.status,
      createdAt: schema.allianceInvites.createdAt,
      allianceName: schema.alliances.name,
      allianceTag: schema.alliances.tag,
      inviterName: schema.players.displayName,
    })
    .from(schema.allianceInvites)
    .leftJoin(schema.alliances, eq(schema.allianceInvites.allianceId, schema.alliances.id))
    .leftJoin(schema.players, eq(schema.allianceInvites.inviterId, schema.players.id))
    .where(
      and(
        eq(schema.allianceInvites.inviteeId, playerId),
        eq(schema.allianceInvites.status, "pending")
      )
    )
    .orderBy(desc(schema.allianceInvites.createdAt));

  return rows.map((r) => ({
    id: r.id,
    allianceId: r.allianceId,
    allianceName: r.allianceName ?? "Unknown",
    allianceTag: r.allianceTag ?? "???",
    inviterName: r.inviterName ?? "Unknown",
    status: r.status as AllianceInvite["status"],
    createdAt: r.createdAt,
  }));
}

/** Check if two players are in the same alliance */
export async function areAllied(playerIdA: string, playerIdB: string): Promise<boolean> {
  const memberA = await db
    .select({ allianceId: schema.allianceMembers.allianceId })
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, playerIdA))
    .limit(1);

  if (!memberA[0]) return false;

  const memberB = await db
    .select({ allianceId: schema.allianceMembers.allianceId })
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, playerIdB))
    .limit(1);

  if (!memberB[0]) return false;

  return memberA[0].allianceId === memberB[0].allianceId;
}

// ── Mutations ────────────────────────────────────────────────────

interface CreateAllianceResult {
  ok: boolean;
  error?: string;
  alliance?: Alliance;
}

export async function createAlliance(
  playerId: string,
  name: string,
  tag: string,
  description: string
): Promise<CreateAllianceResult> {
  // Check player not already in an alliance
  const existing = await getPlayerAlliance(playerId);
  if (existing) {
    return { ok: false, error: "You are already in an alliance" };
  }

  // Check name uniqueness
  const nameCheck = await db
    .select()
    .from(schema.alliances)
    .where(eq(schema.alliances.name, name))
    .limit(1);
  if (nameCheck[0]) {
    return { ok: false, error: "Alliance name already taken" };
  }

  // Check tag uniqueness
  const tagCheck = await db
    .select()
    .from(schema.alliances)
    .where(eq(schema.alliances.tag, tag.toUpperCase()))
    .limit(1);
  if (tagCheck[0]) {
    return { ok: false, error: "Alliance tag already taken" };
  }

  const now = Date.now();
  const allianceId = nanoid();

  await db.insert(schema.alliances).values({
    id: allianceId,
    name,
    tag: tag.toUpperCase(),
    description,
    leaderId: playerId,
    createdAt: now,
  });

  await db.insert(schema.allianceMembers).values({
    id: nanoid(),
    allianceId,
    playerId,
    role: "leader",
    joinedAt: now,
  });

  return {
    ok: true,
    alliance: {
      id: allianceId,
      name,
      tag: tag.toUpperCase(),
      description,
      leaderId: playerId,
      memberCount: 1,
      createdAt: now,
    },
  };
}

export async function disbandAlliance(
  playerId: string,
  allianceId: string
): Promise<{ ok: boolean; error?: string; memberIds?: string[] }> {
  const alliance = await db
    .select()
    .from(schema.alliances)
    .where(eq(schema.alliances.id, allianceId))
    .limit(1);

  if (!alliance[0]) return { ok: false, error: "Alliance not found" };
  if (alliance[0].leaderId !== playerId) return { ok: false, error: "Only the leader can disband" };

  // Collect member IDs for notification
  const members = await db
    .select({ playerId: schema.allianceMembers.playerId })
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.allianceId, allianceId));

  const memberIds = members.map((m) => m.playerId).filter((id) => id !== playerId);

  // Delete all related data
  await db.delete(schema.allianceInvites).where(eq(schema.allianceInvites.allianceId, allianceId));
  await db.delete(schema.allianceMembers).where(eq(schema.allianceMembers.allianceId, allianceId));
  await db.delete(schema.alliances).where(eq(schema.alliances.id, allianceId));

  return { ok: true, memberIds };
}

export async function invitePlayer(
  inviterId: string,
  inviteeUsername: string,
  allianceId: string
): Promise<{ ok: boolean; error?: string; inviteeId?: string; inviterName?: string }> {
  // Check inviter is leader or officer
  const inviterMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, inviterId)
      )
    )
    .limit(1);

  if (!inviterMember[0] || inviterMember[0].role === "member") {
    return { ok: false, error: "Only leaders and officers can invite" };
  }

  // Find invitee by username
  const inviteeRows = await db
    .select()
    .from(schema.players)
    .where(eq(schema.players.username, inviteeUsername))
    .limit(1);

  if (!inviteeRows[0]) return { ok: false, error: "Player not found" };

  const inviteeId = inviteeRows[0].id;
  if (inviteeId === inviterId) return { ok: false, error: "Cannot invite yourself" };

  // Check invitee not already in an alliance
  const inviteeMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, inviteeId))
    .limit(1);

  if (inviteeMember[0]) return { ok: false, error: "Player is already in an alliance" };

  // Check no pending invite already exists
  const existingInvite = await db
    .select()
    .from(schema.allianceInvites)
    .where(
      and(
        eq(schema.allianceInvites.allianceId, allianceId),
        eq(schema.allianceInvites.inviteeId, inviteeId),
        eq(schema.allianceInvites.status, "pending")
      )
    )
    .limit(1);

  if (existingInvite[0]) return { ok: false, error: "Invite already pending" };

  // Check alliance not full
  const memberCount = (
    await db
      .select()
      .from(schema.allianceMembers)
      .where(eq(schema.allianceMembers.allianceId, allianceId))
  ).length;

  if (memberCount >= ALLIANCE_MAX_MEMBERS) {
    return { ok: false, error: "Alliance is full" };
  }

  // Get inviter name
  const inviterRows = await db
    .select({ displayName: schema.players.displayName })
    .from(schema.players)
    .where(eq(schema.players.id, inviterId))
    .limit(1);

  await db.insert(schema.allianceInvites).values({
    id: nanoid(),
    allianceId,
    inviterId,
    inviteeId,
    status: "pending",
    createdAt: Date.now(),
  });

  return { ok: true, inviteeId, inviterName: inviterRows[0]?.displayName ?? "Unknown" };
}

export async function respondToInvite(
  playerId: string,
  inviteId: string,
  accept: boolean
): Promise<{ ok: boolean; error?: string; allianceId?: string; playerName?: string }> {
  const inviteRows = await db
    .select()
    .from(schema.allianceInvites)
    .where(
      and(
        eq(schema.allianceInvites.id, inviteId),
        eq(schema.allianceInvites.inviteeId, playerId),
        eq(schema.allianceInvites.status, "pending")
      )
    )
    .limit(1);

  if (!inviteRows[0]) return { ok: false, error: "Invite not found" };

  const invite = inviteRows[0];

  if (!accept) {
    await db
      .update(schema.allianceInvites)
      .set({ status: "declined" })
      .where(eq(schema.allianceInvites.id, inviteId));
    return { ok: true };
  }

  // Check player not already in an alliance
  const existing = await getPlayerAlliance(playerId);
  if (existing) {
    await db
      .update(schema.allianceInvites)
      .set({ status: "declined" })
      .where(eq(schema.allianceInvites.id, inviteId));
    return { ok: false, error: "You are already in an alliance" };
  }

  // Check alliance still exists and not full
  const memberCount = (
    await db
      .select()
      .from(schema.allianceMembers)
      .where(eq(schema.allianceMembers.allianceId, invite.allianceId))
  ).length;

  if (memberCount >= ALLIANCE_MAX_MEMBERS) {
    return { ok: false, error: "Alliance is full" };
  }

  const now = Date.now();

  await db.insert(schema.allianceMembers).values({
    id: nanoid(),
    allianceId: invite.allianceId,
    playerId,
    role: "member",
    joinedAt: now,
  });

  await db
    .update(schema.allianceInvites)
    .set({ status: "accepted" })
    .where(eq(schema.allianceInvites.id, inviteId));

  // Decline all other pending invites for this player
  const otherInvites = await db
    .select()
    .from(schema.allianceInvites)
    .where(
      and(
        eq(schema.allianceInvites.inviteeId, playerId),
        eq(schema.allianceInvites.status, "pending")
      )
    );

  for (const inv of otherInvites) {
    await db
      .update(schema.allianceInvites)
      .set({ status: "declined" })
      .where(eq(schema.allianceInvites.id, inv.id));
  }

  const playerRows = await db
    .select({ displayName: schema.players.displayName })
    .from(schema.players)
    .where(eq(schema.players.id, playerId))
    .limit(1);

  return {
    ok: true,
    allianceId: invite.allianceId,
    playerName: playerRows[0]?.displayName ?? "Unknown",
  };
}

export async function leaveAlliance(
  playerId: string
): Promise<{ ok: boolean; error?: string; allianceId?: string; playerName?: string }> {
  const membership = await db
    .select()
    .from(schema.allianceMembers)
    .where(eq(schema.allianceMembers.playerId, playerId))
    .limit(1);

  if (!membership[0]) return { ok: false, error: "Not in an alliance" };

  const allianceId = membership[0].allianceId;

  // Leader can't leave, must disband or transfer
  if (membership[0].role === "leader") {
    return { ok: false, error: "Leaders must transfer leadership or disband" };
  }

  await db
    .delete(schema.allianceMembers)
    .where(eq(schema.allianceMembers.id, membership[0].id));

  const playerRows = await db
    .select({ displayName: schema.players.displayName })
    .from(schema.players)
    .where(eq(schema.players.id, playerId))
    .limit(1);

  return {
    ok: true,
    allianceId,
    playerName: playerRows[0]?.displayName ?? "Unknown",
  };
}

export async function promoteMember(
  leaderId: string,
  targetPlayerId: string,
  allianceId: string,
  newRole: "officer" | "member"
): Promise<{ ok: boolean; error?: string }> {
  // Check requester is leader
  const leaderMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, leaderId)
      )
    )
    .limit(1);

  if (!leaderMember[0] || leaderMember[0].role !== "leader") {
    return { ok: false, error: "Only the leader can change roles" };
  }

  const targetMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, targetPlayerId)
      )
    )
    .limit(1);

  if (!targetMember[0]) return { ok: false, error: "Player not in alliance" };
  if (targetMember[0].role === "leader") return { ok: false, error: "Cannot change leader role" };

  await db
    .update(schema.allianceMembers)
    .set({ role: newRole })
    .where(eq(schema.allianceMembers.id, targetMember[0].id));

  return { ok: true };
}

export async function transferLeadership(
  currentLeaderId: string,
  newLeaderId: string,
  allianceId: string
): Promise<{ ok: boolean; error?: string }> {
  const currentMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, currentLeaderId)
      )
    )
    .limit(1);

  if (!currentMember[0] || currentMember[0].role !== "leader") {
    return { ok: false, error: "Only the leader can transfer leadership" };
  }

  const newMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, newLeaderId)
      )
    )
    .limit(1);

  if (!newMember[0]) return { ok: false, error: "Target player not in alliance" };

  await db
    .update(schema.allianceMembers)
    .set({ role: "officer" })
    .where(eq(schema.allianceMembers.id, currentMember[0].id));

  await db
    .update(schema.allianceMembers)
    .set({ role: "leader" })
    .where(eq(schema.allianceMembers.id, newMember[0].id));

  await db
    .update(schema.alliances)
    .set({ leaderId: newLeaderId })
    .where(eq(schema.alliances.id, allianceId));

  return { ok: true };
}

export async function kickMember(
  requesterId: string,
  targetPlayerId: string,
  allianceId: string
): Promise<{ ok: boolean; error?: string; playerName?: string }> {
  const requesterMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, requesterId)
      )
    )
    .limit(1);

  if (!requesterMember[0] || requesterMember[0].role === "member") {
    return { ok: false, error: "Only leaders and officers can kick members" };
  }

  const targetMember = await db
    .select()
    .from(schema.allianceMembers)
    .where(
      and(
        eq(schema.allianceMembers.allianceId, allianceId),
        eq(schema.allianceMembers.playerId, targetPlayerId)
      )
    )
    .limit(1);

  if (!targetMember[0]) return { ok: false, error: "Player not in alliance" };
  if (targetMember[0].role === "leader") return { ok: false, error: "Cannot kick the leader" };
  if (targetMember[0].role === "officer" && requesterMember[0].role !== "leader") {
    return { ok: false, error: "Only the leader can kick officers" };
  }

  await db
    .delete(schema.allianceMembers)
    .where(eq(schema.allianceMembers.id, targetMember[0].id));

  const playerRows = await db
    .select({ displayName: schema.players.displayName })
    .from(schema.players)
    .where(eq(schema.players.id, targetPlayerId))
    .limit(1);

  return { ok: true, playerName: playerRows[0]?.displayName ?? "Unknown" };
}
