import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  buildingLevelScore,
  troopRecruitmentScore,
  techResearchScore,
} from "@wargame/shared";

export type ScoreReason =
  | { kind: "building"; buildingType: string; level: number }
  | { kind: "troop"; troopType: string; quantity: number }
  | { kind: "tech"; techId: string };

/** Atomically add `points` to a player's score. */
export async function awardScore(playerId: string, points: number): Promise<void> {
  if (points <= 0) return;
  await db
    .update(schema.players)
    .set({ score: sql`${schema.players.score} + ${points}` })
    .where(eq(schema.players.id, playerId));
}

/** Atomically add to a player's attack-kill counter. */
export async function awardAttackKills(playerId: string, kills: number): Promise<void> {
  if (kills <= 0) return;
  await db
    .update(schema.players)
    .set({ attackKills: sql`${schema.players.attackKills} + ${kills}` })
    .where(eq(schema.players.id, playerId));
}

/** Atomically add to a player's defense-kill counter. */
export async function awardDefenseKills(playerId: string, kills: number): Promise<void> {
  if (kills <= 0) return;
  await db
    .update(schema.players)
    .set({ defenseKills: sql`${schema.players.defenseKills} + ${kills}` })
    .where(eq(schema.players.id, playerId));
}

/** Look up the player who owns a given fief. */
export async function playerIdForFief(fiefId: string): Promise<string | null> {
  const rows = await db
    .select({ playerId: schema.fiefs.playerId })
    .from(schema.fiefs)
    .where(eq(schema.fiefs.id, fiefId));
  return rows[0]?.playerId ?? null;
}

export function pointsFor(reason: ScoreReason): number {
  switch (reason.kind) {
    case "building":
      return buildingLevelScore(reason.level);
    case "troop":
      return troopRecruitmentScore(reason.troopType, reason.quantity);
    case "tech":
      return techResearchScore();
  }
}
