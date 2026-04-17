import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../auth/middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/notifications",
    { preHandler: authMiddleware },
    async (request) => {
      const unread = (request.query as any)?.unread === "true";
      const notifications = await getNotifications(request.playerId!, {
        unreadOnly: unread,
      });
      return { notifications };
    }
  );

  app.get(
    "/api/v1/notifications/unread-count",
    { preHandler: authMiddleware },
    async (request) => {
      const count = await getUnreadCount(request.playerId!);
      return { count };
    }
  );

  app.patch(
    "/api/v1/notifications/:id/read",
    { preHandler: authMiddleware },
    async (request) => {
      const { id } = request.params as { id: string };
      await markAsRead(request.playerId!, id);
      return { ok: true };
    }
  );

  app.post(
    "/api/v1/notifications/read-all",
    { preHandler: authMiddleware },
    async (request) => {
      await markAllAsRead(request.playerId!);
      return { ok: true };
    }
  );
}
