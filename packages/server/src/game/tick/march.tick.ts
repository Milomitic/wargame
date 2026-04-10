import { eq, and, ne } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import {
  getTerrain,
  parseTileId,
  RAID_LOOT_CAP,
  OFFLINE_DEFENSE_BONUS,
  type TroopComposition,
} from "@wargame/shared";
import { resolveCombat } from "../combat/resolver.js";
import { defeatCamp } from "../../services/camp.service.js";
import { returnTroops, addLootToFief } from "../../services/march.service.js";
import { createBattleReport } from "../../services/report.service.js";
import type { Server as SocketIOServer } from "socket.io";

export async function processMarchTick(io: SocketIOServer | null) {
  // Get all active marches
  const active = await db
    .select()
    .from(schema.marches)
    .where(
      and(
        eq(schema.marches.status, "marching"),
      )
    );

  for (const march of active) {
    const remaining = march.ticksRemaining - 1;

    if (remaining <= 0) {
      // March arrived at target — process combat
      await handleArrival(march, io);
    } else {
      // Decrement timer
      await db
        .update(schema.marches)
        .set({ ticksRemaining: remaining })
        .where(eq(schema.marches.id, march.id));

      if (io) {
        io.to(`player:${march.playerId}`).emit("march:progress", {
          marchId: march.id,
          ticksRemaining: remaining,
          status: "marching",
        });
      }
    }
  }

  // Process returning marches
  const returning = await db
    .select()
    .from(schema.marches)
    .where(eq(schema.marches.status, "returning"));

  for (const march of returning) {
    const remaining = march.ticksRemaining - 1;

    if (remaining <= 0) {
      // Troops arrived home
      const survivors = JSON.parse(march.troopsJson) as TroopComposition;
      await returnTroops(march.fiefId, survivors);

      await db
        .update(schema.marches)
        .set({ status: "completed", ticksRemaining: 0 })
        .where(eq(schema.marches.id, march.id));

      if (io) {
        io.to(`player:${march.playerId}`).emit("march:progress", {
          marchId: march.id,
          ticksRemaining: 0,
          status: "completed",
        });
      }
    } else {
      await db
        .update(schema.marches)
        .set({ ticksRemaining: remaining })
        .where(eq(schema.marches.id, march.id));

      if (io) {
        io.to(`player:${march.playerId}`).emit("march:progress", {
          marchId: march.id,
          ticksRemaining: remaining,
          status: "returning",
        });
      }
    }
  }
}

async function handleArrival(
  march: typeof schema.marches.$inferSelect,
  io: SocketIOServer | null
) {
  const attackerTroops = JSON.parse(march.troopsJson) as TroopComposition;
  const { x, y } = parseTileId(march.targetTileId);
  const terrain = getTerrain(x, y);

  if (march.marchType === "attack_camp") {
    // Find the camp
    const campRows = await db
      .select()
      .from(schema.barbarianCamps)
      .where(eq(schema.barbarianCamps.tileId, march.targetTileId));

    const camp = campRows[0];
    if (!camp || camp.isDefeated) {
      // Camp already defeated or doesn't exist — return troops
      await startReturn(march, attackerTroops, io);
      return;
    }

    const defenderTroops = JSON.parse(camp.troopsJson) as TroopComposition;
    const lootPool = JSON.parse(camp.lootJson) as Record<string, number>;

    // Resolve combat
    const result = resolveCombat(attackerTroops, defenderTroops, terrain, lootPool);

    // Create battle report
    const reportId = await createBattleReport({
      attackerId: march.playerId,
      defenderType: "camp",
      defenderId: null,
      tileId: march.targetTileId,
      attackerTroops,
      defenderTroops,
      attackerLosses: result.attackerLosses,
      defenderLosses: result.defenderLosses,
      loot: result.loot,
      result: result.winner === "attacker" ? "victory" : "defeat",
      terrainType: terrain,
    });

    // If attacker won, defeat camp and give loot
    if (result.winner === "attacker") {
      await defeatCamp(camp.id);
      if (result.loot) {
        await addLootToFief(march.fiefId, result.loot);
      }
    }

    // Emit combat result
    if (io) {
      io.to(`player:${march.playerId}`).emit("combat:result", {
        reportId,
        result: result.winner === "attacker" ? "victory" : "defeat",
        loot: result.loot,
        attackerLosses: result.attackerLosses,
        defenderType: "camp",
      });

      io.to(`player:${march.playerId}`).emit("march:arrived", {
        marchId: march.id,
        targetTileId: march.targetTileId,
      });
    }

    // Start return march with surviving troops
    await startReturn(march, result.attackerSurvivors, io);
  }

  if (march.marchType === "attack_player") {
    await handlePvPArrival(march, attackerTroops, terrain, io);
  }
}

async function handlePvPArrival(
  march: typeof schema.marches.$inferSelect,
  attackerTroops: TroopComposition,
  terrain: string,
  io: SocketIOServer | null
) {
  // Find defender fief at target tile
  const fiefRows = await db
    .select()
    .from(schema.fiefs)
    .where(eq(schema.fiefs.tileId, march.targetTileId));

  const defenderFief = fiefRows[0];
  if (!defenderFief || !defenderFief.playerId) {
    // Fief gone — return troops
    await startReturn(march, attackerTroops, io);
    return;
  }

  // Get defender troops
  const defenderTroopRows = await db
    .select()
    .from(schema.troops)
    .where(eq(schema.troops.fiefId, defenderFief.id));

  const defenderTroops: TroopComposition = {};
  for (const row of defenderTroopRows) {
    if (row.quantity > 0) {
      defenderTroops[row.troopType] = row.quantity;
    }
  }

  // Get wall level for defense bonus (5% per level)
  const wallRows = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, defenderFief.id),
        eq(schema.buildings.buildingType, "wall")
      )
    );

  const wallLevel = wallRows[0]?.level ?? 0;
  const wallBonus = wallLevel * 0.05; // 5% per wall level, max 50% at level 10

  // Check if defender is offline (last login > 5 minutes ago)
  const defenderPlayerRows = await db
    .select()
    .from(schema.players)
    .where(eq(schema.players.id, defenderFief.playerId));

  const defenderPlayer = defenderPlayerRows[0];
  const isOffline =
    defenderPlayer?.lastLoginAt != null &&
    Date.now() - defenderPlayer.lastLoginAt > 5 * 60 * 1000;
  const offlineBonus = isOffline ? OFFLINE_DEFENSE_BONUS : 0;

  // Get defender resources for loot pool (capped at RAID_LOOT_CAP = 30%)
  const defenderResRows = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.fiefId, defenderFief.id));

  const now = Date.now();
  const lootPool: Record<string, number> = {};
  for (const res of defenderResRows) {
    const elapsed = (now - res.updatedAt) / 60_000;
    const current = Math.min(res.amount + res.productionRate * elapsed, res.capacity);
    lootPool[res.resourceType] = Math.floor(current * RAID_LOOT_CAP);
  }

  // Resolve combat with wall and offline bonuses
  const result = resolveCombat(
    attackerTroops,
    defenderTroops,
    terrain as any,
    lootPool,
    wallBonus,
    offlineBonus
  );

  // Apply defender troop losses
  for (const [troopType, lost] of Object.entries(result.defenderLosses)) {
    if (lost <= 0) continue;
    const row = defenderTroopRows.find((r) => r.troopType === troopType);
    if (row) {
      await db
        .update(schema.troops)
        .set({ quantity: Math.max(0, row.quantity - lost) })
        .where(eq(schema.troops.id, row.id));
    }
  }

  // If attacker won, deduct loot from defender and give to attacker
  if (result.winner === "attacker" && result.loot) {
    // Deduct from defender
    for (const [type, amount] of Object.entries(result.loot)) {
      if (amount <= 0) continue;
      const res = defenderResRows.find((r) => r.resourceType === type);
      if (res) {
        const elapsed = (now - res.updatedAt) / 60_000;
        const current = Math.min(res.amount + res.productionRate * elapsed, res.capacity);
        const newAmount = Math.max(0, current - amount);
        await db
          .update(schema.resources)
          .set({ amount: newAmount, updatedAt: now })
          .where(eq(schema.resources.id, res.id));
      }
    }

    // Add loot to attacker fief
    await addLootToFief(march.fiefId, result.loot);
  }

  // Update defender fief raid tracking
  const last24h = now - 24 * 60 * 60 * 1000;
  const newRaidCount =
    defenderFief.lastRaidedAt && defenderFief.lastRaidedAt > last24h
      ? defenderFief.raidCount24h + 1
      : 1;

  await db
    .update(schema.fiefs)
    .set({ lastRaidedAt: now, raidCount24h: newRaidCount })
    .where(eq(schema.fiefs.id, defenderFief.id));

  // Lower defender morale on successful raid
  if (result.winner === "attacker") {
    const moraleDrop = Math.min(15, 5 + wallLevel);
    await db
      .update(schema.fiefs)
      .set({ morale: Math.max(0, defenderFief.morale - moraleDrop) })
      .where(eq(schema.fiefs.id, defenderFief.id));
  }

  // Create battle reports (one for attacker perspective, one visible to defender)
  const reportId = await createBattleReport({
    attackerId: march.playerId,
    defenderType: "player",
    defenderId: defenderFief.playerId,
    tileId: march.targetTileId,
    attackerTroops,
    defenderTroops,
    attackerLosses: result.attackerLosses,
    defenderLosses: result.defenderLosses,
    loot: result.loot,
    result: result.winner === "attacker" ? "victory" : "defeat",
    terrainType: terrain as any,
  });

  // Emit combat result to attacker
  if (io) {
    io.to(`player:${march.playerId}`).emit("combat:result", {
      reportId,
      result: result.winner === "attacker" ? "victory" : "defeat",
      loot: result.loot,
      attackerLosses: result.attackerLosses,
      defenderType: "player",
    });

    io.to(`player:${march.playerId}`).emit("march:arrived", {
      marchId: march.id,
      targetTileId: march.targetTileId,
    });

    // Notify defender of the raid
    io.to(`player:${defenderFief.playerId}`).emit("combat:raid_incoming", {
      reportId,
      attackerName: (
        await db
          .select()
          .from(schema.players)
          .where(eq(schema.players.id, march.playerId))
      )[0]?.displayName ?? "Unknown",
      result: result.winner === "attacker" ? "defeat" : "victory",
      lootLost: result.winner === "attacker" ? result.loot : null,
      defenderLosses: result.defenderLosses,
    });
  }

  // Start return with surviving attacker troops
  await startReturn(march, result.attackerSurvivors, io);
}

/** Start the return trip for surviving troops. */
async function startReturn(
  march: typeof schema.marches.$inferSelect,
  survivors: TroopComposition,
  io: SocketIOServer | null
) {
  // Calculate return ticks (same as outbound)
  const origin = parseTileId(march.originTileId);
  const target = parseTileId(march.targetTileId);
  const distance = Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y);
  const returnTicks = Math.max(1, distance * 2); // MARCH_SPEED_TICKS_PER_TILE = 2

  // Check if any survivors
  const totalSurvivors = Object.values(survivors).reduce((s, q) => s + q, 0);

  if (totalSurvivors <= 0) {
    // All troops died — mark as completed
    await db
      .update(schema.marches)
      .set({
        status: "completed",
        ticksRemaining: 0,
        troopsJson: JSON.stringify(survivors),
      })
      .where(eq(schema.marches.id, march.id));
    return;
  }

  await db
    .update(schema.marches)
    .set({
      status: "returning",
      ticksRemaining: returnTicks,
      troopsJson: JSON.stringify(survivors),
    })
    .where(eq(schema.marches.id, march.id));

  if (io) {
    io.to(`player:${march.playerId}`).emit("march:progress", {
      marchId: march.id,
      ticksRemaining: returnTicks,
      status: "returning",
    });
  }
}
