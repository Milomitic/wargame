import { nanoid } from "nanoid";
import { eq, or, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { TroopComposition, BattleReport, TerrainType } from "@wargame/shared";

interface CreateReportInput {
  attackerId: string;
  defenderType: "camp" | "player";
  defenderId: string | null;
  tileId: string;
  attackerTroops: TroopComposition;
  defenderTroops: TroopComposition;
  attackerLosses: TroopComposition;
  defenderLosses: TroopComposition;
  loot: Record<string, number> | null;
  result: "victory" | "defeat";
  terrainType: TerrainType;
}

export async function createBattleReport(
  input: CreateReportInput
): Promise<string> {
  const id = nanoid();
  const now = Date.now();

  await db.insert(schema.battleReports).values({
    id,
    attackerId: input.attackerId,
    defenderType: input.defenderType,
    defenderId: input.defenderId,
    tileId: input.tileId,
    attackerTroopsJson: JSON.stringify(input.attackerTroops),
    defenderTroopsJson: JSON.stringify(input.defenderTroops),
    attackerLossesJson: JSON.stringify(input.attackerLosses),
    defenderLossesJson: JSON.stringify(input.defenderLosses),
    lootJson: input.loot ? JSON.stringify(input.loot) : null,
    result: input.result,
    terrainType: input.terrainType,
    createdAt: now,
  });

  return id;
}

export async function getPlayerReports(
  playerId: string,
  limit = 20
): Promise<BattleReport[]> {
  const rows = await db
    .select()
    .from(schema.battleReports)
    .where(
      or(
        eq(schema.battleReports.attackerId, playerId),
        eq(schema.battleReports.defenderId, playerId)
      )
    )
    .orderBy(desc(schema.battleReports.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    attackerId: r.attackerId,
    defenderType: r.defenderType as "camp" | "player",
    defenderId: r.defenderId,
    tileId: r.tileId,
    attackerTroops: JSON.parse(r.attackerTroopsJson),
    defenderTroops: JSON.parse(r.defenderTroopsJson),
    attackerLosses: JSON.parse(r.attackerLossesJson),
    defenderLosses: JSON.parse(r.defenderLossesJson),
    loot: r.lootJson ? JSON.parse(r.lootJson) : null,
    result: r.result as "victory" | "defeat",
    terrainType: r.terrainType as any,
    createdAt: r.createdAt,
  }));
}
