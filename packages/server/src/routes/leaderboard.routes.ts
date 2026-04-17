import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/middleware.js";
import { getLeaderboard } from "../services/leaderboard.service.js";

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/leaderboard",
    { preHandler: authMiddleware },
    async (request) => {
      return getLeaderboard(request.playerId!, 10);
    }
  );
}
