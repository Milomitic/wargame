import { nanoid } from "nanoid";
import { eq, and, or, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setMessageIO(io: SocketIOServer | null) {
  _io = io;
}

export interface SendMessageInput {
  recipientUsername?: string;
  recipientId?: string;
  subject: string;
  body: string;
  parentId?: string | null;
}

export interface MessageRow {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: number;
  parentId: string | null;
  createdAt: number;
  senderName?: string | null;
  senderAvatar?: string | null;
  recipientName?: string | null;
  recipientAvatar?: string | null;
}

/** Resolve a recipient by username (preferred) or id. */
async function resolveRecipientId(
  input: SendMessageInput
): Promise<string | null> {
  if (input.recipientId) {
    const rows = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.id, input.recipientId))
      .limit(1);
    return rows[0]?.id ?? null;
  }
  if (input.recipientUsername) {
    const rows = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.username, input.recipientUsername))
      .limit(1);
    return rows[0]?.id ?? null;
  }
  return null;
}

export async function sendMessage(
  senderId: string,
  input: SendMessageInput
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 1 || subject.length > 120) {
    return { ok: false, error: "Subject must be 1-120 characters" };
  }
  if (body.length < 1 || body.length > 4000) {
    return { ok: false, error: "Body must be 1-4000 characters" };
  }

  const recipientId = await resolveRecipientId(input);
  if (!recipientId) return { ok: false, error: "Recipient not found" };
  if (recipientId === senderId)
    return { ok: false, error: "Cannot send messages to yourself" };

  const id = nanoid();
  const now = Date.now();

  await db.insert(schema.messages).values({
    id,
    senderId,
    recipientId,
    subject,
    body,
    isRead: 0,
    parentId: input.parentId ?? null,
    createdAt: now,
  });

  // Look up sender display info for the socket payload
  const senderRows = await db
    .select({
      displayName: schema.players.displayName,
      avatar: schema.players.avatar,
    })
    .from(schema.players)
    .where(eq(schema.players.id, senderId))
    .limit(1);

  const senderName = senderRows[0]?.displayName ?? "Unknown";
  const senderAvatar = senderRows[0]?.avatar ?? "knight";

  if (_io) {
    _io.to(`player:${recipientId}`).emit("message:new", {
      id,
      senderId,
      senderName,
      senderAvatar,
      subject,
      body,
      createdAt: now,
    });
  }

  return { ok: true, id };
}

/** Get messages received by player (with sender info). */
export async function getInbox(
  playerId: string,
  opts: { limit?: number; unreadOnly?: boolean } = {}
): Promise<MessageRow[]> {
  const limit = opts.limit ?? 50;
  const conditions = [eq(schema.messages.recipientId, playerId)];
  if (opts.unreadOnly) {
    conditions.push(eq(schema.messages.isRead, 0));
  }

  const rows = await db
    .select({
      id: schema.messages.id,
      senderId: schema.messages.senderId,
      recipientId: schema.messages.recipientId,
      subject: schema.messages.subject,
      body: schema.messages.body,
      isRead: schema.messages.isRead,
      parentId: schema.messages.parentId,
      createdAt: schema.messages.createdAt,
      senderName: schema.players.displayName,
      senderAvatar: schema.players.avatar,
    })
    .from(schema.messages)
    .leftJoin(schema.players, eq(schema.messages.senderId, schema.players.id))
    .where(and(...conditions))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);

  return rows;
}

/** Get messages sent by player (with recipient info). */
export async function getSent(
  playerId: string,
  opts: { limit?: number } = {}
): Promise<MessageRow[]> {
  const limit = opts.limit ?? 50;

  const rows = await db
    .select({
      id: schema.messages.id,
      senderId: schema.messages.senderId,
      recipientId: schema.messages.recipientId,
      subject: schema.messages.subject,
      body: schema.messages.body,
      isRead: schema.messages.isRead,
      parentId: schema.messages.parentId,
      createdAt: schema.messages.createdAt,
      recipientName: schema.players.displayName,
      recipientAvatar: schema.players.avatar,
    })
    .from(schema.messages)
    .leftJoin(schema.players, eq(schema.messages.recipientId, schema.players.id))
    .where(eq(schema.messages.senderId, playerId))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);

  return rows;
}

/** Get a single message — only if user is sender or recipient. */
export async function getMessage(
  playerId: string,
  messageId: string
): Promise<MessageRow | null> {
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.id, messageId))
    .limit(1);

  const msg = rows[0];
  if (!msg) return null;
  if (msg.senderId !== playerId && msg.recipientId !== playerId) return null;

  // Fetch both sender and recipient names
  const peopleRows = await db
    .select({
      id: schema.players.id,
      displayName: schema.players.displayName,
      avatar: schema.players.avatar,
    })
    .from(schema.players)
    .where(or(eq(schema.players.id, msg.senderId), eq(schema.players.id, msg.recipientId)));

  const sender = peopleRows.find((p) => p.id === msg.senderId);
  const recipient = peopleRows.find((p) => p.id === msg.recipientId);

  return {
    ...msg,
    senderName: sender?.displayName ?? null,
    senderAvatar: sender?.avatar ?? null,
    recipientName: recipient?.displayName ?? null,
    recipientAvatar: recipient?.avatar ?? null,
  };
}

export async function markMessageRead(playerId: string, messageId: string) {
  await db
    .update(schema.messages)
    .set({ isRead: 1 })
    .where(
      and(
        eq(schema.messages.id, messageId),
        eq(schema.messages.recipientId, playerId)
      )
    );
}

export async function markAllMessagesRead(playerId: string) {
  await db
    .update(schema.messages)
    .set({ isRead: 1 })
    .where(
      and(
        eq(schema.messages.recipientId, playerId),
        eq(schema.messages.isRead, 0)
      )
    );
}

export async function getUnreadMessageCount(playerId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.recipientId, playerId),
        eq(schema.messages.isRead, 0)
      )
    );
  return rows.length;
}

export async function deleteMessage(
  playerId: string,
  messageId: string
): Promise<boolean> {
  // Allow deletion only if user is sender or recipient
  const rows = await db
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.id, messageId),
        or(
          eq(schema.messages.senderId, playerId),
          eq(schema.messages.recipientId, playerId)
        )
      )
    )
    .limit(1);

  if (rows.length === 0) return false;
  await db.delete(schema.messages).where(eq(schema.messages.id, messageId));
  return true;
}
