import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware.js";
import { getPlayerFief } from "../services/fief.service.js";
import { getPlayerTechs, startResearch } from "../services/tech.service.js";

const researchSchema = z.object({
  techId: z.string().min(1),
});

export async function techRoutes(app: FastifyInstance) {
  // Get player's technologies
  app.get("/api/v1/techs", { preHandler: authMiddleware }, async (request) => {
    const techs = await getPlayerTechs(request.playerId!);
    return { techs };
  });

  // Start researching a technology
  app.post("/api/v1/techs/research", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = researchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = await getPlayerFief(request.playerId!);
    if (!data) {
      return reply.status(404).send({ error: "No fief found" });
    }

    const result = await startResearch(request.playerId!, parsed.data.techId, data.fief.id);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }

    return { ok: true };
  });
}
