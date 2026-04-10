import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TROOP_TYPES } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief } from "../services/fief.service.js";
import { startRecruiting } from "../services/troop.service.js";

const recruitSchema = z.object({
  troopType: z.enum(TROOP_TYPES),
  quantity: z.number().int().min(1).max(50),
});

export async function troopRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/fief/recruit",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = recruitSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: parsed.error.issues[0].message });
      }

      const data = await getPlayerFief(request.playerId!);
      if (!data) {
        return reply.status(404).send({ error: "No fief found" });
      }

      const result = await startRecruiting(
        data.fief.id,
        parsed.data.troopType,
        parsed.data.quantity
      );
      if (!result.ok) {
        return reply.status(400).send({ error: result.error });
      }

      return { troop: result.troop };
    }
  );
}
