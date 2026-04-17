import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware.js";
import {
  getPlayerProfile,
  updateMyProfile,
  getAllianceProfile,
  updateAllianceProfile,
} from "../services/profile.service.js";

const playerPatchSchema = z.object({
  bio: z.string().max(500).optional(),
  avatar: z.string().max(40).optional(),
  displayName: z.string().min(2).max(30).optional(),
});

const alliancePatchSchema = z.object({
  description: z.string().max(200).optional(),
  manifesto: z.string().max(1500).optional(),
  avatar: z.string().max(40).optional(),
});

export async function profileRoutes(app: FastifyInstance) {
  // Public player profile
  app.get(
    "/api/v1/players/:id/profile",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const profile = await getPlayerProfile(id, request.playerId!);
      if (!profile) return reply.status(404).send({ error: "Player not found" });
      return { profile };
    }
  );

  // Update own player profile
  app.patch(
    "/api/v1/players/me/profile",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = playerPatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const result = await updateMyProfile(request.playerId!, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return { ok: true };
    }
  );

  // Public alliance profile
  app.get(
    "/api/v1/alliances/:id/profile",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const profile = await getAllianceProfile(id, request.playerId!);
      if (!profile) return reply.status(404).send({ error: "Alliance not found" });
      return { profile };
    }
  );

  // Update alliance profile (leader/officer only)
  app.patch(
    "/api/v1/alliances/:id/profile",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = alliancePatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const result = await updateAllianceProfile(request.playerId!, id, parsed.data);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return { ok: true };
    }
  );
}
