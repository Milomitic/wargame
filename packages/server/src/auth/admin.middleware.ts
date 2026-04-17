import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "./middleware.js";

/**
 * Combined auth + admin check. Run this as `preHandler` for admin-only routes.
 * Returns 401 if not logged in, 403 if not admin.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // First run normal auth
  await authMiddleware(request, reply);
  if (reply.sent) return;

  const playerId = request.playerId;
  if (!playerId) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const rows = await db
    .select({ isAdmin: schema.players.isAdmin })
    .from(schema.players)
    .where(eq(schema.players.id, playerId))
    .limit(1);

  if (!rows[0]?.isAdmin) {
    return reply.status(403).send({ error: "Admin privileges required" });
  }
}
