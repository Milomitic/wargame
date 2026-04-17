import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware.js";
import {
  sendMessage,
  getInbox,
  getSent,
  getMessage,
  markMessageRead,
  markAllMessagesRead,
  getUnreadMessageCount,
  deleteMessage,
} from "../services/message.service.js";

const sendBodySchema = z.object({
  recipient: z.string().min(1).max(40),
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  parentId: z.string().nullable().optional(),
});

export async function messageRoutes(app: FastifyInstance) {
  // Inbox (received messages)
  app.get(
    "/api/v1/messages",
    { preHandler: authMiddleware },
    async (request) => {
      const unread = (request.query as any)?.unread === "true";
      const messages = await getInbox(request.playerId!, { unreadOnly: unread });
      return { messages };
    }
  );

  // Sent messages
  app.get(
    "/api/v1/messages/sent",
    { preHandler: authMiddleware },
    async (request) => {
      const messages = await getSent(request.playerId!);
      return { messages };
    }
  );

  // Unread count
  app.get(
    "/api/v1/messages/unread-count",
    { preHandler: authMiddleware },
    async (request) => {
      const count = await getUnreadMessageCount(request.playerId!);
      return { count };
    }
  );

  // Single message
  app.get(
    "/api/v1/messages/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const msg = await getMessage(request.playerId!, id);
      if (!msg) return reply.status(404).send({ error: "Message not found" });
      return { message: msg };
    }
  );

  // Send a new message
  app.post(
    "/api/v1/messages",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const parsed = sendBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const { recipient, subject, body, parentId } = parsed.data;
      // recipient is treated as a username
      const result = await sendMessage(request.playerId!, {
        recipientUsername: recipient,
        subject,
        body,
        parentId: parentId ?? null,
      });
      if (!result.ok) return reply.status(400).send({ error: result.error });
      return { ok: true, id: result.id };
    }
  );

  // Mark single read
  app.patch(
    "/api/v1/messages/:id/read",
    { preHandler: authMiddleware },
    async (request) => {
      const { id } = request.params as { id: string };
      await markMessageRead(request.playerId!, id);
      return { ok: true };
    }
  );

  // Mark all read
  app.post(
    "/api/v1/messages/read-all",
    { preHandler: authMiddleware },
    async (request) => {
      await markAllMessagesRead(request.playerId!);
      return { ok: true };
    }
  );

  // Delete
  app.delete(
    "/api/v1/messages/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await deleteMessage(request.playerId!, id);
      if (!ok) return reply.status(404).send({ error: "Message not found" });
      return { ok: true };
    }
  );
}
