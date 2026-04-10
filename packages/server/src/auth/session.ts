import { nanoid } from "nanoid";
import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(playerId: string): Promise<string> {
  const id = nanoid(40);
  const now = Date.now();
  await db.insert(schema.sessions).values({
    id,
    playerId,
    expiresAt: now + SESSION_DURATION_MS,
    createdAt: now,
  });
  return id;
}

export async function validateSession(
  sessionId: string
): Promise<string | null> {
  const rows = await db
    .select({
      playerId: schema.sessions.playerId,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.id, sessionId),
        gt(schema.sessions.expiresAt, Date.now())
      )
    )
    .limit(1);

  return rows[0]?.playerId ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}
