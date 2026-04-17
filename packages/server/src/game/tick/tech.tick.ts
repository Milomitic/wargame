import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { TECH_MAP, techResearchScore } from "@wargame/shared";
import type { Server as SocketIOServer } from "socket.io";
import { awardScore } from "../../services/score.service.js";

export async function processTechTick(io: SocketIOServer | null) {
  const researching = await db
    .select()
    .from(schema.playerTechnologies)
    .where(eq(schema.playerTechnologies.status, "researching"));

  const now = Date.now();

  for (const row of researching) {
    try {
      // Pure wall-clock: check if enough real time has passed since research started.
      const def = TECH_MAP[row.techId];
      const totalDurationMs = (def?.researchTicks ?? row.researchTicksRemaining) * 60_000;
      const elapsed = row.researchStartedAt
        ? now - row.researchStartedAt
        : Infinity; // no startedAt → treat as expired (legacy)

      if (elapsed >= totalDurationMs) {
        // Research complete
        await db
          .update(schema.playerTechnologies)
          .set({
            status: "completed",
            researchTicksRemaining: 0,
            researchedAt: now,
          })
          .where(eq(schema.playerTechnologies.id, row.id));

        await awardScore(row.playerId, techResearchScore());

        if (io) {
          io.to(`player:${row.playerId}`).emit("tech:completed", {
            techId: row.techId,
            techName: def?.name ?? row.techId,
          });
        }
      }
      // No else/decrement — client shows progress from researchStartedAt.
    } catch (err) {
      console.error(`Tech tick error for ${row.id}:`, err);
    }
  }
}
