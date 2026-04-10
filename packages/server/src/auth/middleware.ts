import type { FastifyRequest, FastifyReply } from "fastify";
import { validateSession } from "./session.js";

declare module "fastify" {
  interface FastifyRequest {
    playerId?: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionId = request.cookies?.session;
  if (!sessionId) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  const playerId = await validateSession(sessionId);
  if (!playerId) {
    return reply.status(401).send({ error: "Invalid or expired session" });
  }

  request.playerId = playerId;
}
