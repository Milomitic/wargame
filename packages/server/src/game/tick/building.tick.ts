import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { BUILDING_MAP } from "@wargame/shared";
import type { Server as SocketIOServer } from "socket.io";

export async function processBuildingTick(io: SocketIOServer | null) {
  // Find all buildings currently under construction
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.isConstructing, true),
        gt(schema.buildings.constructionTicksRemaining, 0)
      )
    );

  for (const building of constructing) {
    const remaining = building.constructionTicksRemaining! - 1;

    if (remaining <= 0) {
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

      // Notify player via WebSocket
      if (io) {
        const fiefRows = await db
          .select({ playerId: schema.fiefs.playerId })
          .from(schema.fiefs)
          .where(eq(schema.fiefs.id, building.fiefId));

        const playerId = fiefRows[0]?.playerId;
        if (playerId) {
          io.to(`player:${playerId}`).emit("building:complete", {
            fiefId: building.fiefId,
            buildingType: building.buildingType,
            level: building.level,
          });
        }
      }
    } else {
      // Decrement timer
      await db
        .update(schema.buildings)
        .set({ constructionTicksRemaining: remaining })
        .where(eq(schema.buildings.id, building.id));

      // Notify progress
      if (io) {
        const fiefRows = await db
          .select({ playerId: schema.fiefs.playerId })
          .from(schema.fiefs)
          .where(eq(schema.fiefs.id, building.fiefId));

        const playerId = fiefRows[0]?.playerId;
        if (playerId) {
          io.to(`player:${playerId}`).emit("building:progress", {
            fiefId: building.fiefId,
            buildingType: building.buildingType,
            ticksRemaining: remaining,
          });
        }
      }
    }
  }
}
