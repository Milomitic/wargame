import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { registerSchema, loginSchema, NEWBIE_SHIELD_HOURS } from "@wargame/shared";
import { db, schema } from "../db/index.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { createSession, deleteSession } from "../auth/session.js";
import { authMiddleware } from "../auth/middleware.js";
import { createStarterFief } from "../services/fief.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { username, email, password, displayName } = parsed.data;

    // Case-insensitive uniqueness checks so "Milomitic" and "milomitic"
    // cannot coexist as different accounts.
    const existingUser = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(sql`LOWER(${schema.players.username}) = ${username.toLowerCase()}`)
      .limit(1);
    if (existingUser.length > 0) {
      return reply.status(409).send({ error: "Username already taken" });
    }

    const existingEmail = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(sql`LOWER(${schema.players.email}) = ${email.toLowerCase()}`)
      .limit(1);
    if (existingEmail.length > 0) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const now = Date.now();
    const playerId = nanoid();
    const passwordHash = await hashPassword(password);

    await db.insert(schema.players).values({
      id: playerId,
      username,
      email,
      passwordHash,
      displayName,
      createdAt: now,
      lastLoginAt: now,
      isActive: true,
      newbieShieldUntil: now + NEWBIE_SHIELD_HOURS * 60 * 60 * 1000,
      tutorialStep: 0,
    });

    await createStarterFief(playerId, displayName);

    const sessionId = await createSession(playerId);

    reply.setCookie("session", sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      player: {
        id: playerId,
        username,
        displayName,
        email,
      },
    };
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { login: loginInput, password } = parsed.data;

    // Case-insensitive username/email lookup — usernames like "Milomitic"
    // must match regardless of how the user typed them on the login form.
    const isEmail = loginInput.includes("@");
    const loginLower = loginInput.toLowerCase();
    const players = await db
      .select()
      .from(schema.players)
      .where(
        isEmail
          ? sql`LOWER(${schema.players.email}) = ${loginLower}`
          : sql`LOWER(${schema.players.username}) = ${loginLower}`
      )
      .limit(1);

    const player = players[0];
    if (!player) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(player.passwordHash, password);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    await db
      .update(schema.players)
      .set({ lastLoginAt: Date.now() })
      .where(eq(schema.players.id, player.id));

    const sessionId = await createSession(player.id);

    reply.setCookie("session", sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      player: {
        id: player.id,
        username: player.username,
        displayName: player.displayName,
        email: player.email,
      },
    };
  });

  app.post(
    "/api/v1/auth/logout",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const sessionId = request.cookies?.session;
      if (sessionId) {
        await deleteSession(sessionId);
      }
      reply.clearCookie("session", { path: "/" });
      return { ok: true };
    }
  );

  app.get(
    "/api/v1/auth/me",
    { preHandler: authMiddleware },
    async (request) => {
      const rows = await db
        .select({
          id: schema.players.id,
          username: schema.players.username,
          displayName: schema.players.displayName,
          email: schema.players.email,
          avatar: schema.players.avatar,
          bio: schema.players.bio,
          isAdmin: schema.players.isAdmin,
          createdAt: schema.players.createdAt,
          newbieShieldUntil: schema.players.newbieShieldUntil,
          tutorialStep: schema.players.tutorialStep,
        })
        .from(schema.players)
        .where(eq(schema.players.id, request.playerId!))
        .limit(1);

      const player = rows[0];
      if (!player) {
        throw { statusCode: 404, message: "Player not found" };
      }

      return { player };
    }
  );
}
