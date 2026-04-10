import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TROOP_TYPES } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief } from "../services/fief.service.js";
import { createMarch, getPlayerMarches } from "../services/march.service.js";
import { getPlayerReports } from "../services/report.service.js";

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
