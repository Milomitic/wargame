import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BUILDING_TYPES } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief } from "../services/fief.service.js";
import {
  startConstruction,
  upgradeBuilding,
  getBuildCost,
} from "../services/building.service.js";

const buildSchema = z.object({
  buildingType: z.enum(BUILDING_TYPES),
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
