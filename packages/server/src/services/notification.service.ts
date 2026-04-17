import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setNotificationIO(io: SocketIOServer | null) {
  _io = io;
}

interface CreateNotificationInput {
  playerId: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  relatedId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const id = nanoid();
  const now = Date.now();

  await db.insert(schema.notifications).values({
    id,
    playerId: input.playerId,
    type: input.type,
    title: input.title,
    body: input.body,
    icon: input.icon,
    isRead: 0,
    relatedId: input.relatedId ?? null,
    createdAt: now,
  });

  // Emit real-time notification to the player
  if (_io) {
    _io.to(`player:${input.playerId}`).emit("notification:new", {
      id,
      type: input.type,
      title: input.title,
      body: input.body,
      icon: input.icon,
      relatedId: input.relatedId ?? null,
      createdAt: now,
    });
  }

  return id;
}

export async function getNotifications(
  playerId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {}
) {
  const limit = opts.limit ?? 30;
  const conditions = [eq(schema.notifications.playerId, playerId)];
  if (opts.unreadOnly) {
    conditions.push(eq(schema.notifications.isRead, 0));
  }

  return db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(playerId: string): Promise<number> {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.playerId, playerId),
        eq(schema.notifications.isRead, 0)
      )
    );
  return rows.length;
}

export async function markAsRead(playerId: string, notificationId: string) {
  await db
    .update(schema.notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.playerId, playerId)
      )
    );
}

export async function markAllAsRead(playerId: string) {
  await db
    .update(schema.notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(schema.notifications.playerId, playerId),
        eq(schema.notifications.isRead, 0)
      )
    );
}
