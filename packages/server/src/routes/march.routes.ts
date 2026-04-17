import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { TROOP_TYPES, parseTileId, getTerrain, TERRAIN_MAP } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief } from "../services/fief.service.js";
import { createMarch, getPlayerMarches, getIncomingMarches } from "../services/march.service.js";
import { getPlayerReports } from "../services/report.service.js";
import { db, schema } from "../db/index.js";

const marchSchema = z.object({
  targetTileId: z.string().regex(/^-?\d+,-?\d+$/),
  troops: z.record(z.enum(TROOP_TYPES), z.number().int().min(1)),
  marchType: z.enum(["attack_camp", "attack_player"]),
});

export async function marchRoutes(app: FastifyInstance) {
  // Create a march
  app.post(
    "/api/v1/march",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = marchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: parsed.error.issues[0].message });
      }

      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }

      const result = await createMarch({
        playerId: request.playerId!,
        fiefId: data.fief.id,
        originTileId: data.fief.tileId,
        targetTileId: parsed.data.targetTileId,
        troops: parsed.data.troops,
        marchType: parsed.data.marchType,
      });

      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }

      return { march: result.march };
    }
  );

  // Get active marches
  app.get(
    "/api/v1/marches",
    { preHandler: authMiddleware },
    async (request) => {
      const marches = await getPlayerMarches(request.playerId!);
      return { marches };
    }
  );

  // Get incoming hostile marches targeting any of the player's fiefs
  app.get(
    "/api/v1/marches/incoming",
    { preHandler: authMiddleware },
    async (request) => {
      const incoming = await getIncomingMarches(request.playerId!);
      return { incoming };
    }
  );

  // Get single march detail
  app.get(
    "/api/v1/marches/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const rows = await db
        .select()
        .from(schema.marches)
        .where(eq(schema.marches.id, id))
        .limit(1);

      const march = rows[0];
      if (!march) return reply.status(404).send({ error: "March not found" });

      // Only allow owner or target to view
      const isOwner = march.playerId === request.playerId!;

      // Parse troops
      let troops: Record<string, number> = {};
      try { troops = JSON.parse(march.troopsJson); } catch {}

      // Get origin/target terrain info
      const originCoords = parseTileId(march.originTileId);
      const targetCoords = parseTileId(march.targetTileId);
      const originTerrain = getTerrain(originCoords.x, originCoords.y);
      const targetTerrain = getTerrain(targetCoords.x, targetCoords.y);

      // Get origin fief name
      const originFief = (await db.select({ name: schema.fiefs.name }).from(schema.fiefs).where(eq(schema.fiefs.id, march.fiefId)).limit(1))[0];

      // Get target fief/camp info
      let targetName = "";
      let targetOwner = "";
      const targetFief = (await db.select({ name: schema.fiefs.name, playerId: schema.fiefs.playerId }).from(schema.fiefs).where(sql`${schema.fiefs.tileId} = ${march.targetTileId}`).limit(1))[0];
      if (targetFief) {
        targetName = targetFief.name;
        if (targetFief.playerId) {
          const owner = (await db.select({ displayName: schema.players.displayName }).from(schema.players).where(eq(schema.players.id, targetFief.playerId)).limit(1))[0];
          targetOwner = owner?.displayName || "";
        }
      }
      const targetCamp = (await db.select({ difficulty: schema.barbarianCamps.difficulty }).from(schema.barbarianCamps).where(sql`${schema.barbarianCamps.tileId} = ${march.targetTileId}`).limit(1))[0];

      // Get associated battle report if completed
      let battleReport = null;
      if (march.status === "completed" || march.status === "arrived") {
        const report = (await db.select().from(schema.battleReports).where(sql`${schema.battleReports.attackerId} = ${march.playerId} AND ${schema.battleReports.tileId} = ${march.targetTileId}`).orderBy(sql`${schema.battleReports.createdAt} DESC`).limit(1))[0];
        if (report) {
          battleReport = {
            id: report.id,
            result: report.result,
            attackerTroops: JSON.parse(report.attackerTroopsJson || "{}"),
            defenderTroops: JSON.parse(report.defenderTroopsJson || "{}"),
            attackerLosses: JSON.parse(report.attackerLossesJson || "{}"),
            defenderLosses: JSON.parse(report.defenderLossesJson || "{}"),
            loot: report.lootJson ? JSON.parse(report.lootJson) : null,
            terrainType: report.terrainType,
            createdAt: report.createdAt,
          };
        }
      }

      // Distance in tiles
      const distance = Math.abs(targetCoords.x - originCoords.x) + Math.abs(targetCoords.y - originCoords.y);

      return {
        march: {
          id: march.id,
          status: march.status,
          marchType: march.marchType,
          troops: isOwner ? troops : "unknown",
          totalUnits: isOwner ? Object.values(troops).reduce((s, v) => s + v, 0) : "unknown",
          origin: {
            tileId: march.originTileId,
            coords: originCoords,
            terrain: { type: originTerrain, label: TERRAIN_MAP[originTerrain].label },
            fiefName: originFief?.name || null,
          },
          target: {
            tileId: march.targetTileId,
            coords: targetCoords,
            terrain: { type: targetTerrain, label: TERRAIN_MAP[targetTerrain].label },
            fiefName: targetName || null,
            ownerName: targetOwner || null,
            campDifficulty: targetCamp?.difficulty || null,
          },
          distance,
          departedAt: march.departedAt,
          arrivesAt: march.arrivesAt,
          createdAt: march.createdAt,
          isOwner,
        },
        battleReport,
      };
    }
  );

  // Cancel a march (within 5 minutes of departure)
  app.post(
    "/api/v1/marches/:id/cancel",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

      const rows = await db
        .select()
        .from(schema.marches)
        .where(eq(schema.marches.id, id))
        .limit(1);

      const march = rows[0];
      if (!march) return reply.status(404).send({ error: "March not found" });
      if (march.playerId !== request.playerId!) {
        return reply.status(403).send({ error: "Not your march" });
      }
      if (march.status !== "marching") {
        return reply.status(400).send({ error: "Can only cancel marching armies (not returning or completed)" });
      }

      const elapsed = Date.now() - march.departedAt;
      if (elapsed > CANCEL_WINDOW_MS) {
        return reply.status(400).send({
          error: "Cancel window expired. Marches can only be recalled within 5 minutes of departure.",
        });
      }

      // Parse troops from march
      let troops: Record<string, number> = {};
      try { troops = JSON.parse(march.troopsJson); } catch {}

      // Return troops to garrison
      for (const [troopType, qty] of Object.entries(troops)) {
        if (qty <= 0) continue;
        const troopRows = await db
          .select()
          .from(schema.troops)
          .where(
            sql`${schema.troops.fiefId} = ${march.fiefId} AND ${schema.troops.troopType} = ${troopType}`
          );

        if (troopRows[0]) {
          await db
            .update(schema.troops)
            .set({ quantity: troopRows[0].quantity + qty })
            .where(eq(schema.troops.id, troopRows[0].id));
        }
      }

      // Delete the march
      await db.delete(schema.marches).where(eq(schema.marches.id, id));

      return { ok: true };
    }
  );

  // Get battle reports
  app.get(
    "/api/v1/battle-reports",
    { preHandler: authMiddleware },
    async (request) => {
      const reports = await getPlayerReports(request.playerId!);
      return { reports };
    }
  );
}
