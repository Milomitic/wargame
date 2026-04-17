import { eq, and } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { BUILDING_MAP, buildingLevelScore } from "@wargame/shared";
import { createNotification } from "../../services/notification.service.js";
import type { Server as SocketIOServer } from "socket.io";
import { awardScore, playerIdForFief } from "../../services/score.service.js";

export async function processBuildingTick(io: SocketIOServer | null) {
  // Find all buildings currently under construction
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(eq(schema.buildings.isConstructing, true));

  const now = Date.now();

  for (const building of constructing) {
    try {
    // Pure wall-clock check: compute total build duration from definition,
    // see if enough real time has elapsed since constructionStartedAt.
    const def = BUILDING_MAP[building.buildingType];
    const totalTicks = def
      ? Math.ceil(def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, building.level - 1))
      : (building.constructionTicksRemaining ?? 1);
    const totalDurationMs = totalTicks * 60_000;
    const elapsed = building.constructionStartedAt
      ? now - building.constructionStartedAt
      : Infinity; // no startedAt → treat as expired (legacy row)

    if (elapsed >= totalDurationMs) {
      // Construction complete
      await db
        .update(schema.buildings)
        .set({
          isConstructing: false,
          constructionTicksRemaining: 0,
          constructionStartedAt: null,
        })
        .where(eq(schema.buildings.id, building.id));

      // Update resource production rate if this building produces resources
      const def = BUILDING_MAP[building.buildingType];
      if (def?.produces) {
        const resourceRows = await db
          .select()
          .from(schema.resources)
          .where(
            and(
              eq(schema.resources.fiefId, building.fiefId),
              eq(schema.resources.resourceType, def.produces.resource)
            )
          );

        if (resourceRows[0]) {
          const now = Date.now();
          // Materialize current amount before changing rate
          const elapsed = (now - resourceRows[0].updatedAt) / 60_000;
          const currentAmount = Math.min(
            resourceRows[0].amount + resourceRows[0].productionRate * elapsed,
            resourceRows[0].capacity
          );

          const newRate = def.produces.baseRate * building.level;
          // Add the difference from this building's contribution
          const oldBuildingRate = building.level > 1
            ? def.produces.baseRate * (building.level - 1)
            : 0;
          const totalNewRate = resourceRows[0].productionRate - oldBuildingRate + newRate;

          await db
            .update(schema.resources)
            .set({
              amount: currentAmount,
              productionRate: totalNewRate,
              updatedAt: now,
            })
            .where(eq(schema.resources.id, resourceRows[0].id));
        }
      }

      // Keep the fief.level in sync with the Keep building level, so that
      // the map and all other systems that read fiefs.level see the correct
      // "town hall" tier without a separate keepLevel lookup.
      if (building.buildingType === "keep") {
        await db
          .update(schema.fiefs)
          .set({ level: building.level })
          .where(eq(schema.fiefs.id, building.fiefId));
      }

      // Award score for reaching this level (build = level 1, upgrade = new level).
      const playerId = await playerIdForFief(building.fiefId);
      if (playerId) {
        await awardScore(playerId, buildingLevelScore(building.level));
      }

      // Notify player via WebSocket + persistent notification
      if (playerId) {
        const bName = def?.name || building.buildingType;
        await createNotification({
          playerId,
          type: "building_complete",
          title: "Construction Complete",
          body: `${bName} upgraded to level ${building.level}.`,
          icon: "\u{1F3D7}\uFE0F",
        });
      }
      if (io && playerId) {
        io.to(`player:${playerId}`).emit("building:complete", {
          fiefId: building.fiefId,
          buildingType: building.buildingType,
          level: building.level,
        });
      }
    }
    // No else/decrement needed — client computes progress from
    // constructionStartedAt + totalDurationMs in real time.
    } catch (err) {
      console.error(`Building tick error for ${building.id}:`, err);
    }
  }
}
