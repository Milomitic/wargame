import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/middleware.js";
import { getMapFiefs } from "../services/map.service.js";

export async function mapRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/map",
    { preHandler: authMiddleware },
    async (request) => {
      return getMapFiefs(request.playerId!);
    }
  );
}
