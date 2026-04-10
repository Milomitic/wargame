import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ALLIANCE_TAG_MIN, ALLIANCE_TAG_MAX } from "@wargame/shared";
import { authMiddleware } from "../auth/middleware.js";
import {
  getPlayerAlliance,
  getAllianceMembers,
  getPlayerInvites,
  createAlliance,
  disbandAlliance,
  invitePlayer,
  respondToInvite,
  leaveAlliance,
  promoteMember,
  transferLeadership,
  kickMember,
} from "../services/alliance.service.js";
import { getIO } from "../socket.js";

const createSchema = z.object({
  name: z.string().min(3).max(30),
  tag: z.string().min(ALLIANCE_TAG_MIN).max(ALLIANCE_TAG_MAX).regex(/^[A-Za-z0-9]+$/),
  description: z.string().max(200).default(""),
});

const inviteSchema = z.object({
  username: z.string().min(1),
});

const respondSchema = z.object({
  inviteId: z.string(),
  accept: z.boolean(),
});

const roleSchema = z.object({
  playerId: z.string(),
  role: z.enum(["officer", "member"]),
});

const transferSchema = z.object({
  playerId: z.string(),
});

const kickSchema = z.object({
  playerId: z.string(),
});

export async function allianceRoutes(app: FastifyInstance) {
  // Get current player's alliance + members
  app.get("/api/v1/alliance", { preHandler: authMiddleware }, async (request) => {
    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return { alliance: null, members: [], role: null };

    const members = await getAllianceMembers(data.alliance.id);
    return { alliance: data.alliance, members, role: data.membership.role };
  });

  // Get pending invites for current player
  app.get("/api/v1/alliance/invites", { preHandler: authMiddleware }, async (request) => {
    const invites = await getPlayerInvites(request.playerId!);
    return { invites };
  });

  // Create alliance
  app.post("/api/v1/alliance", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const result = await createAlliance(
      request.playerId!,
      parsed.data.name,
      parsed.data.tag,
      parsed.data.description
    );

    if (!result.ok) return reply.status(400).send({ error: result.error });
    return { alliance: result.alliance };
  });

  // Disband alliance
  app.delete("/api/v1/alliance", { preHandler: authMiddleware }, async (request, reply) => {
    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return reply.status(404).send({ error: "Not in an alliance" });

    const result = await disbandAlliance(request.playerId!, data.alliance.id);
    if (!result.ok) return reply.status(400).send({ error: result.error });

    // Notify ex-members
    const io = getIO();
    if (io && result.memberIds) {
      for (const memberId of result.memberIds) {
        io.to(`player:${memberId}`).emit("notification:generic", {
          title: "Alliance Disbanded",
          body: `${data.alliance.name} has been disbanded by the leader.`,
          type: "warning",
        });
      }
    }

    return { ok: true };
  });

  // Invite player
  app.post("/api/v1/alliance/invite", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return reply.status(404).send({ error: "Not in an alliance" });

    const result = await invitePlayer(request.playerId!, parsed.data.username, data.alliance.id);
    if (!result.ok) return reply.status(400).send({ error: result.error });

    // Notify invitee via WS
    const io = getIO();
    if (io && result.inviteeId) {
      io.to(`player:${result.inviteeId}`).emit("alliance:invite_received", {
        inviteId: "",
        allianceName: data.alliance.name,
        allianceTag: data.alliance.tag,
        inviterName: result.inviterName ?? "Unknown",
      });
    }

    return { ok: true };
  });

  // Respond to invite
  app.post(
    "/api/v1/alliance/invite/respond",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = respondSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      const result = await respondToInvite(
        request.playerId!,
        parsed.data.inviteId,
        parsed.data.accept
      );

      if (!result.ok) return reply.status(400).send({ error: result.error });

      // Notify alliance members
      if (parsed.data.accept && result.allianceId) {
        const io = getIO();
        if (io) {
          const members = await getAllianceMembers(result.allianceId);
          for (const m of members) {
            if (m.playerId !== request.playerId!) {
              io.to(`player:${m.playerId}`).emit("alliance:member_joined", {
                playerName: result.playerName ?? "Unknown",
              });
            }
          }
        }
      }

      return { ok: true };
    }
  );

  // Leave alliance
  app.post("/api/v1/alliance/leave", { preHandler: authMiddleware }, async (request, reply) => {
    const result = await leaveAlliance(request.playerId!);
    if (!result.ok) return reply.status(400).send({ error: result.error });

    // Notify remaining members
    if (result.allianceId) {
      const io = getIO();
      if (io) {
        const members = await getAllianceMembers(result.allianceId);
        for (const m of members) {
          io.to(`player:${m.playerId}`).emit("alliance:member_left", {
            playerName: result.playerName ?? "Unknown",
          });
        }
      }
    }

    return { ok: true };
  });

  // Promote/demote member
  app.post("/api/v1/alliance/role", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = roleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return reply.status(404).send({ error: "Not in an alliance" });

    const result = await promoteMember(
      request.playerId!,
      parsed.data.playerId,
      data.alliance.id,
      parsed.data.role
    );

    if (!result.ok) return reply.status(400).send({ error: result.error });
    return { ok: true };
  });

  // Transfer leadership
  app.post("/api/v1/alliance/transfer", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = transferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return reply.status(404).send({ error: "Not in an alliance" });

    const result = await transferLeadership(
      request.playerId!,
      parsed.data.playerId,
      data.alliance.id
    );

    if (!result.ok) return reply.status(400).send({ error: result.error });
    return { ok: true };
  });

  // Kick member
  app.post("/api/v1/alliance/kick", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = kickSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const data = await getPlayerAlliance(request.playerId!);
    if (!data) return reply.status(404).send({ error: "Not in an alliance" });

    const result = await kickMember(request.playerId!, parsed.data.playerId, data.alliance.id);
    if (!result.ok) return reply.status(400).send({ error: result.error });

    // Notify kicked player
    const io = getIO();
    if (io) {
      io.to(`player:${parsed.data.playerId}`).emit("notification:generic", {
        title: "Kicked from Alliance",
        body: `You have been removed from ${data.alliance.name}.`,
        type: "warning",
      });
    }

    return { ok: true };
  });
}
