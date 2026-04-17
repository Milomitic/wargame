import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { parseTileId } from "@wargame/shared";
import type { MapFief, MapData } from "@wargame/shared";
import { getMapCamps } from "./camp.service.js";

export async function getMapFiefs(requestingPlayerId: string): Promise<MapData> {
  const rows = await db
    .select({
      fiefId: schema.fiefs.id,
      fiefName: schema.fiefs.name,
      tileId: schema.fiefs.tileId,
      level: schema.fiefs.level,
      population: schema.fiefs.population,
      playerId: schema.fiefs.playerId,
      playerName: schema.players.displayName,
      newbieShieldUntil: schema.players.newbieShieldUntil,
    })
    .from(schema.fiefs)
    .leftJoin(schema.players, eq(schema.fiefs.playerId, schema.players.id));

  // Compute score per fief (sum of building levels) + keep level.
  const buildingAgg = await db
    .select({
      fiefId: schema.buildings.fiefId,
      score: sql<number>`COALESCE(SUM(${schema.buildings.level}), 0)`.as("score"),
      keepLevel: sql<number>`COALESCE(MAX(CASE WHEN ${schema.buildings.buildingType} = 'keep' THEN ${schema.buildings.level} END), 0)`.as("keep_level"),
    })
    .from(schema.buildings)
    .groupBy(schema.buildings.fiefId);
  const scoreMap = new Map<string, number>();
  const keepLevelMap = new Map<string, number>();
  for (const b of buildingAgg) {
    scoreMap.set(b.fiefId, Number(b.score));
    keepLevelMap.set(b.fiefId, Number(b.keepLevel));
  }

  // Build player -> alliance tag map
  const allMembers = await db
    .select({
      playerId: schema.allianceMembers.playerId,
      allianceId: schema.allianceMembers.allianceId,
      tag: schema.alliances.tag,
    })
    .from(schema.allianceMembers)
    .leftJoin(schema.alliances, eq(schema.allianceMembers.allianceId, schema.alliances.id));

  const playerAllianceMap = new Map<string, { allianceId: string; tag: string }>();
  for (const m of allMembers) {
    if (m.tag) playerAllianceMap.set(m.playerId, { allianceId: m.allianceId, tag: m.tag });
  }

  const now = Date.now();
  let playerFief: { x: number; y: number } | null = null;

  const fiefs: MapFief[] = rows.map((r) => {
    const { x, y } = parseTileId(r.tileId);
    if (r.playerId === requestingPlayerId) {
      playerFief = { x, y };
    }
    const allianceInfo = r.playerId ? playerAllianceMap.get(r.playerId) : undefined;
    return {
      x,
      y,
      fiefId: r.fiefId,
      fiefName: r.fiefName,
      level: r.level,
      keepLevel: keepLevelMap.get(r.fiefId) ?? 0,
      population: r.population,
      playerId: r.playerId,
      playerName: r.playerName,
      hasNewbieShield: r.newbieShieldUntil ? r.newbieShieldUntil > now : false,
      allianceTag: allianceInfo?.tag ?? null,
      allianceId: allianceInfo?.allianceId ?? null,
      score: scoreMap.get(r.fiefId) ?? 0,
    };
  });

  const camps = await getMapCamps();
  const playerAllianceId = playerAllianceMap.get(requestingPlayerId)?.allianceId ?? null;

  return { fiefs, camps, playerFief, playerAllianceId };
}
