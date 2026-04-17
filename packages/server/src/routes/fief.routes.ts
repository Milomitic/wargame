import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { BUILDING_TYPES } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief, getPlayerFiefs } from "../services/fief.service.js";
import { db, schema } from "../db/index.js";
import {
  startConstruction,
  upgradeBuilding,
  cancelConstruction,
  getBuildCost,
} from "../services/building.service.js";

const buildSchema = z.object({
  buildingType: z.enum(BUILDING_TYPES),
});

const renameSchema = z.object({
  name: z.string().min(2).max(30),
});

export async function fiefRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/fief",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }
      return data;
    }
  );

  app.get(
    "/api/v1/fiefs",
    { preHandler: authMiddleware },
    async (request) => {
      const fiefs = await getPlayerFiefs(request.playerId!);
      return { fiefs };
    }
  );

  app.patch(
    "/api/v1/fief/rename",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = renameSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const ownFief = await db
        .select({ id: schema.fiefs.id })
        .from(schema.fiefs)
        .where(eq(schema.fiefs.playerId, request.playerId!))
        .limit(1);
      const fiefId = ownFief[0]?.id;
      if (!fiefId) return reply.status(404).send({ error: "No fief found" });
      await db
        .update(schema.fiefs)
        .set({ name: parsed.data.name })
        .where(and(eq(schema.fiefs.id, fiefId), eq(schema.fiefs.playerId, request.playerId!)));
      return { ok: true, name: parsed.data.name };
    }
  );

  app.post(
    "/api/v1/fief/build",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = buildSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }

      const result = await startConstruction(data.fief.id, parsed.data.buildingType);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }

      return { building: result.building };
    }
  );

  app.post(
    "/api/v1/fief/upgrade",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = buildSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }

      const result = await upgradeBuilding(data.fief.id, parsed.data.buildingType);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }

      return { building: result.building };
    }
  );

  app.post(
    "/api/v1/fief/cancel",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = buildSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }

      const result = await cancelConstruction(data.fief.id, parsed.data.buildingType);
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }

      return { ok: true, deleted: result.deleted };
    }
  );

  app.get(
    "/api/v1/fief/buildings/costs",
    { preHandler: authMiddleware },
    async () => {
      const costs: Record<string, any> = {};
      for (const type of BUILDING_TYPES) {
        costs[type] = {
          new: getBuildCost(type, 0),
          // Levels 1-5 preview
          upgrades: Array.from({ length: 5 }, (_, i) => ({
            level: i + 2,
            ...getBuildCost(type, i + 1),
          })),
        };
      }
      return { costs };
    }
  );
}
