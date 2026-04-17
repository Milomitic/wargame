import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  parseTileId,
  MARCH_SPEED_TICKS_PER_TILE,
  TICK_INTERVAL_MS,
  NEWBIE_SHIELD_HOURS,
  MAX_RAIDS_PER_24H,
  type TroopComposition,
} from "@wargame/shared";
import { areAllied } from "./alliance.service.js";
import { getPlayerBonuses } from "./tech.service.js";

interface MarchInput {
  playerId: string;
  fiefId: string;
  originTileId: string;
  targetTileId: string;
  troops: TroopComposition;
  marchType: "attack_camp" | "attack_player";
}

interface MarchResult {
  ok: boolean;
  error?: string;
  march?: any;
}

export async function createMarch(input: MarchInput): Promise<MarchResult> {
  const { playerId, fiefId, originTileId, targetTileId, troops, marchType } = input;

  // Validate troop composition is not empty
  const totalTroops = Object.values(troops).reduce((sum, qty) => sum + qty, 0);
  if (totalTroops <= 0) {
    return { ok: false, error: "Must send at least one troop" };
  }

  // Check player actually has these troops in their fief
  for (const [troopType, qty] of Object.entries(troops)) {
    if (qty <= 0) continue;

    const troopRows = await db
      .select()
      .from(schema.troops)
      .where(
        and(
          eq(schema.troops.fiefId, fiefId),
          eq(schema.troops.troopType, troopType)
        )
      );

    const troopRow = troopRows[0];
    if (!troopRow || troopRow.quantity < qty) {
      return {
        ok: false,
        error: `Not enough ${troopType}: need ${qty}, have ${troopRow?.quantity ?? 0}`,
      };
    }

    if (troopRow.isRecruiting) {
      return {
        ok: false,
        error: `Cannot send ${troopType} while recruiting`,
      };
    }
  }

  // Validate target based on march type
  if (marchType === "attack_camp") {
    const campRows = await db
      .select()
      .from(schema.barbarianCamps)
      .where(eq(schema.barbarianCamps.tileId, targetTileId));

    if (!campRows[0]) {
      return { ok: false, error: "No barbarian camp at target tile" };
    }
    if (campRows[0].isDefeated) {
      return { ok: false, error: "Camp has already been defeated" };
    }
  }

  if (marchType === "attack_player") {
    // Find enemy fief at target tile
    const targetFiefRows = await db
      .select()
      .from(schema.fiefs)
      .where(eq(schema.fiefs.tileId, targetTileId));

    const targetFief = targetFiefRows[0];
    if (!targetFief) {
      return { ok: false, error: "No fief at target tile" };
    }
    if (targetFief.playerId === playerId) {
      return { ok: false, error: "Cannot raid your own fief" };
    }

    // Check alliance — cannot raid allies
    if (targetFief.playerId && await areAllied(playerId, targetFief.playerId)) {
      return { ok: false, error: "Cannot raid an allied player" };
    }

    // Check defender newbie shield
    const defenderRows = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, targetFief.playerId!));

    const defender = defenderRows[0];
    if (defender?.newbieShieldUntil && defender.newbieShieldUntil > Date.now()) {
      return { ok: false, error: "Target player is under newbie protection" };
    }

    // Check attacker newbie shield (attacking removes your own shield)
    const attackerRows = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, playerId));

    const attacker = attackerRows[0];
    if (attacker?.newbieShieldUntil && attacker.newbieShieldUntil > Date.now()) {
      // Remove attacker's shield when they initiate PvP
      await db
        .update(schema.players)
        .set({ newbieShieldUntil: null })
        .where(eq(schema.players.id, playerId));
    }

    // Check raid cooldown: target fief can only be raided MAX_RAIDS_PER_24H times per 24h
    const now24h = Date.now() - 24 * 60 * 60 * 1000;
    if (
      targetFief.lastRaidedAt &&
      targetFief.lastRaidedAt > now24h &&
      targetFief.raidCount24h >= MAX_RAIDS_PER_24H
    ) {
      return { ok: false, error: "Target has been raided too many times recently" };
    }
  }

  // Calculate travel time (Manhattan distance * ticks per tile, reduced by march_speed tech)
  const origin = parseTileId(originTileId);
  const target = parseTileId(targetTileId);
  const distance = Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y);
  const bonuses = await getPlayerBonuses(playerId);
  const speedMultiplier = 1 - Math.min(bonuses["march_speed"] || 0, 0.5); // cap at 50% reduction
  const ticksToTravel = Math.max(1, Math.round(distance * MARCH_SPEED_TICKS_PER_TILE * speedMultiplier));

  // Deduct troops from fief
  for (const [troopType, qty] of Object.entries(troops)) {
    if (qty <= 0) continue;

    const troopRows = await db
      .select()
      .from(schema.troops)
      .where(
        and(
          eq(schema.troops.fiefId, fiefId),
          eq(schema.troops.troopType, troopType)
        )
      );

    const troopRow = troopRows[0];
    await db
      .update(schema.troops)
      .set({ quantity: troopRow!.quantity - qty })
      .where(eq(schema.troops.id, troopRow!.id));
  }

  // Create march record
  const now = Date.now();
  const marchId = nanoid();
  const arrivesAt = now + ticksToTravel * TICK_INTERVAL_MS;

  await db.insert(schema.marches).values({
    id: marchId,
    playerId,
    fiefId,
    originTileId,
    targetTileId,
    troopsJson: JSON.stringify(troops),
    marchType,
    status: "marching",
    departedAt: now,
    arrivesAt,
    ticksRemaining: ticksToTravel,
    createdAt: now,
  });

  const created = await db
    .select()
    .from(schema.marches)
    .where(eq(schema.marches.id, marchId));

  return { ok: true, march: created[0] };
}

/** Get active marches for a player — enriched with target player/village names. */
export async function getPlayerMarches(playerId: string) {
  const rows = await db
    .select()
    .from(schema.marches)
    .where(eq(schema.marches.playerId, playerId));

  // Filter out completed marches older than 5 minutes
  const now = Date.now();
  const active = rows.filter(
    (r) => r.status !== "completed" || now - r.createdAt < 300_000
  );

  // Batch-lookup target fiefs + owners for all marches
  const allFiefs = await db.select().from(schema.fiefs);
  const allPlayers = await db.select({ id: schema.players.id, displayName: schema.players.displayName }).from(schema.players);
  const fiefByTile = new Map(allFiefs.map((f) => [f.tileId, f]));
  const playerNameMap = new Map(allPlayers.map((p) => [p.id, p.displayName]));

  return active.map((r) => {
    const targetFief = fiefByTile.get(r.targetTileId);
    return {
      ...r,
      troops: JSON.parse(r.troopsJson) as TroopComposition,
      targetFiefName: targetFief?.name ?? null,
      targetPlayerName: targetFief?.playerId ? (playerNameMap.get(targetFief.playerId) ?? null) : null,
      targetPlayerId: targetFief?.playerId ?? null,
    };
  });
}

/** Get hostile marches currently incoming toward any of the player's fiefs. */
export async function getIncomingMarches(playerId: string) {
  const myFiefs = await db
    .select({ tileId: schema.fiefs.tileId })
    .from(schema.fiefs)
    .where(eq(schema.fiefs.playerId, playerId));

  if (myFiefs.length === 0) return [];

  const myTiles = new Set(myFiefs.map((f) => f.tileId));

  // Pull all marches not initiated by us, currently marching (i.e. not yet resolved/returning).
  const rows = await db.select().from(schema.marches);

  const incoming = rows
    .filter(
      (r) =>
        r.playerId !== playerId &&
        r.status === "marching" &&
        myTiles.has(r.targetTileId)
    )
    .map((r) => ({
      ...r,
      troops: JSON.parse(r.troopsJson) as TroopComposition,
    }));

  // Lookup attacker display names + attacker fief names
  if (incoming.length === 0) return [];
  const attackerRows = await db.select({ id: schema.players.id, displayName: schema.players.displayName }).from(schema.players);
  const nameMap = new Map(attackerRows.map((p) => [p.id, p.displayName]));
  const allFiefs = await db.select().from(schema.fiefs);
  const fiefByPlayer = new Map(allFiefs.map((f) => [f.playerId, f]));

  return incoming.map((m) => ({
    ...m,
    attackerName: nameMap.get(m.playerId) ?? "Unknown",
    attackerFiefName: fiefByPlayer.get(m.playerId)?.name ?? null,
  }));
}

/** Return surviving troops to the fief after combat. */
export async function returnTroops(
  fiefId: string,
  survivors: TroopComposition
) {
  for (const [troopType, qty] of Object.entries(survivors)) {
    if (qty <= 0) continue;

    const existing = await db
      .select()
      .from(schema.troops)
      .where(
        and(
          eq(schema.troops.fiefId, fiefId),
          eq(schema.troops.troopType, troopType)
        )
      );

    if (existing[0]) {
      await db
        .update(schema.troops)
        .set({ quantity: existing[0].quantity + qty })
        .where(eq(schema.troops.id, existing[0].id));
    }
  }
}

/** Add loot resources to a fief. */
export async function addLootToFief(
  fiefId: string,
  loot: Record<string, number>
) {
  const now = Date.now();
  for (const [type, amount] of Object.entries(loot)) {
    if (amount <= 0) continue;

    const resRows = await db
      .select()
      .from(schema.resources)
      .where(
        and(
          eq(schema.resources.fiefId, fiefId),
          eq(schema.resources.resourceType, type)
        )
      );

    const res = resRows[0];
    if (res) {
      // Compute current amount with production delta
      const elapsed = (now - res.updatedAt) / 60_000;
      const current = Math.min(
        res.amount + res.productionRate * elapsed,
        res.capacity
      );
      const newAmount = Math.min(current + amount, res.capacity);
      await db
        .update(schema.resources)
        .set({ amount: newAmount, updatedAt: now })
        .where(eq(schema.resources.id, res.id));
    }
  }
}
