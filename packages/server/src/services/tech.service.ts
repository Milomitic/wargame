import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  TECH_MAP,
  type PlayerTech,
  type TechBonus,
} from "@wargame/shared";
import { deductResources } from "./resource.helper.js";

export async function getPlayerTechs(playerId: string): Promise<PlayerTech[]> {
  const rows = await db
    .select()
    .from(schema.playerTechnologies)
    .where(eq(schema.playerTechnologies.playerId, playerId));

  return rows.map((r) => ({
    techId: r.techId,
    status: r.status as PlayerTech["status"],
    researchTicksRemaining: r.researchTicksRemaining,
    researchedAt: r.researchedAt,
    researchStartedAt: r.researchStartedAt ?? null,
  }));
}

export async function startResearch(
  playerId: string,
  techId: string,
  fiefId: string
): Promise<{ ok: boolean; error?: string }> {
  const def = TECH_MAP[techId];
  if (!def) return { ok: false, error: "Unknown technology" };

  // Check not already researched or researching
  const existing = await db
    .select()
    .from(schema.playerTechnologies)
    .where(
      and(
        eq(schema.playerTechnologies.playerId, playerId),
        eq(schema.playerTechnologies.techId, techId)
      )
    )
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "Technology already researched or in progress" };
  }

  // Check only one research at a time
  const researching = await db
    .select()
    .from(schema.playerTechnologies)
    .where(
      and(
        eq(schema.playerTechnologies.playerId, playerId),
        eq(schema.playerTechnologies.status, "researching")
      )
    )
    .limit(1);

  if (researching[0]) {
    return { ok: false, error: "Already researching a technology" };
  }

  // Check prerequisites
  for (const prereq of def.prerequisites) {
    const prereqRow = await db
      .select()
      .from(schema.playerTechnologies)
      .where(
        and(
          eq(schema.playerTechnologies.playerId, playerId),
          eq(schema.playerTechnologies.techId, prereq),
          eq(schema.playerTechnologies.status, "completed")
        )
      )
      .limit(1);

    if (!prereqRow[0]) {
      const prereqDef = TECH_MAP[prereq];
      return { ok: false, error: `Prerequisite not met: ${prereqDef?.name ?? prereq}` };
    }
  }

  // Check and deduct resources (using the shared helper that applies tech +
  // capacity bonuses — so the server's "have" matches what the client shows).
  const now = Date.now();
  const deductResult = await deductResources(fiefId, def.cost);
  if (!deductResult.ok) {
    return { ok: false, error: deductResult.error };
  }

  await db.insert(schema.playerTechnologies).values({
    id: nanoid(),
    playerId,
    techId,
    status: "researching",
    researchTicksRemaining: def.researchTicks,
    researchStartedAt: now,
    createdAt: now,
  });

  return { ok: true };
}

/** Compute aggregated bonuses for a player from completed techs. */
export async function getPlayerBonuses(
  playerId: string
): Promise<Record<string, number>> {
  const rows = await db
    .select()
    .from(schema.playerTechnologies)
    .where(
      and(
        eq(schema.playerTechnologies.playerId, playerId),
        eq(schema.playerTechnologies.status, "completed")
      )
    );

  const bonuses: Record<string, number> = {};

  for (const row of rows) {
    const def = TECH_MAP[row.techId];
    if (!def) continue;
    for (const bonus of def.bonuses) {
      bonuses[bonus.type] = (bonuses[bonus.type] || 0) + bonus.value;
    }
  }

  return bonuses;
}
