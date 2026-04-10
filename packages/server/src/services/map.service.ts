import { eq } from "drizzle-orm";
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
      population: r.population,
      playerId: r.playerId,
      playerName: r.playerName,
      hasNewbieShield: r.newbieShieldUntil ? r.newbieShieldUntil > now : false,
      allianceTag: allianceInfo?.tag ?? null,
      allianceId: allianceInfo?.allianceId ?? null,
    };
  });

  const camps = await getMapCamps();
  const playerAllianceId = playerAllianceMap.get(requestingPlayerId)?.allianceId ?? null;

  return { fiefs, camps, playerFief, playerAllianceId };
}
