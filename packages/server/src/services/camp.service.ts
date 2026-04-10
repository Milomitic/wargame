import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  MAP_RADIUS,
  getTerrain,
  TERRAIN_MAP,
  toTileId,
  parseTileId,
  CAMP_COUNT,
  CAMP_TROOPS,
  CAMP_LOOT,
  CAMP_RESPAWN_TICKS,
} from "@wargame/shared";
import type { MapCamp } from "@wargame/shared";

/**
 * Generate barbarian camps on habitable tiles that don't have fiefs.
 * Called at server startup if no camps exist.
 */
export async function seedBarbarianCamps() {
  const existing = await db.select().from(schema.barbarianCamps);
  if (existing.length > 0) return;

  // Get all occupied tiles (fiefs)
  const fiefTiles = new Set(
    (await db.select({ tileId: schema.fiefs.tileId }).from(schema.fiefs)).map(
      (r) => r.tileId
    )
  );

  // Collect all habitable tiles
  const candidates: string[] = [];
  for (let x = -MAP_RADIUS; x <= MAP_RADIUS; x++) {
    for (let y = -MAP_RADIUS; y <= MAP_RADIUS; y++) {
      const terrain = getTerrain(x, y);
      const id = toTileId(x, y);
      if (TERRAIN_MAP[terrain].habitable && !fiefTiles.has(id)) {
        candidates.push(id);
      }
    }
  }

  // Shuffle and pick CAMP_COUNT tiles
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const selected = candidates.slice(0, CAMP_COUNT);
  const now = Date.now();

  for (const tileId of selected) {
    // Difficulty based on distance from center
    const { x, y } = parseTileId(tileId);
    const dist = Math.abs(x) + Math.abs(y);
    const maxDist = MAP_RADIUS * 2;
    const difficulty = Math.min(5, Math.max(1, Math.ceil((dist / maxDist) * 5)));

    await db.insert(schema.barbarianCamps).values({
      id: nanoid(),
      tileId,
      difficulty,
      troopsJson: JSON.stringify(CAMP_TROOPS[difficulty]),
      lootJson: JSON.stringify(CAMP_LOOT[difficulty]),
      isDefeated: false,
      respawnAt: null,
      createdAt: now,
    });
  }

  console.log(`Seeded ${selected.length} barbarian camps`);
}

/** Get all camps for the map view. */
export async function getMapCamps(): Promise<MapCamp[]> {
  const rows = await db.select().from(schema.barbarianCamps);

  return rows.map((r) => {
    const { x, y } = parseTileId(r.tileId);
    return {
      x,
      y,
      campId: r.id,
      difficulty: r.difficulty,
      isDefeated: r.isDefeated,
    };
  });
}

/** Process camp respawns during tick. */
export async function processCampRespawns() {
  const now = Date.now();
  const defeated = await db
    .select()
    .from(schema.barbarianCamps)
    .where(eq(schema.barbarianCamps.isDefeated, true));

  for (const camp of defeated) {
    if (camp.respawnAt && camp.respawnAt <= now) {
      // Respawn: reset defeated status with same difficulty
      await db
        .update(schema.barbarianCamps)
        .set({
          isDefeated: false,
          respawnAt: null,
          troopsJson: JSON.stringify(CAMP_TROOPS[camp.difficulty]),
          lootJson: JSON.stringify(CAMP_LOOT[camp.difficulty]),
        })
        .where(eq(schema.barbarianCamps.id, camp.id));
    }
  }
}

/** Mark a camp as defeated and schedule respawn. */
export async function defeatCamp(campId: string) {
  const now = Date.now();
  const respawnAt = now + CAMP_RESPAWN_TICKS * 60_000;

  await db
    .update(schema.barbarianCamps)
    .set({
      isDefeated: true,
      respawnAt,
    })
    .where(eq(schema.barbarianCamps.id, campId));
}
