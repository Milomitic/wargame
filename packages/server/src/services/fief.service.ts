import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  STARTER_RESOURCES,
  BASE_CAPACITY,
  BASE_PRODUCTION,
  RESOURCE_TYPES,
  MAP_RADIUS,
  getTerrain,
  TERRAIN_MAP,
  toTileId,
} from "@wargame/shared";

const TICK_MS = 60_000;

async function findHabitableTile(): Promise<string> {
  // Get all occupied tile IDs
  const occupied = new Set(
    (await db.select({ tileId: schema.fiefs.tileId }).from(schema.fiefs)).map(
      (r) => r.tileId
    )
  );

  // Try random habitable tiles up to 200 attempts
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(Math.random() * (MAP_RADIUS * 2 + 1)) - MAP_RADIUS;
    const y = Math.floor(Math.random() * (MAP_RADIUS * 2 + 1)) - MAP_RADIUS;
    const terrain = getTerrain(x, y);
    const id = toTileId(x, y);
    if (TERRAIN_MAP[terrain].habitable && !occupied.has(id)) {
      return id;
    }
  }

  // Fallback: scan systematically
  for (let x = -MAP_RADIUS; x <= MAP_RADIUS; x++) {
    for (let y = -MAP_RADIUS; y <= MAP_RADIUS; y++) {
      const terrain = getTerrain(x, y);
      const id = toTileId(x, y);
      if (TERRAIN_MAP[terrain].habitable && !occupied.has(id)) {
        return id;
      }
    }
  }

  throw new Error("No habitable tiles available");
}

export async function createStarterFief(playerId: string, displayName: string) {
  const now = Date.now();
  const fiefId = nanoid();
  const tileId = await findHabitableTile();

  await db.insert(schema.fiefs).values({
    id: fiefId,
    playerId,
    name: `${displayName}'s Fief`,
    tileId,
    level: 1,
    population: 100,
    morale: 70,
    createdAt: now,
  });

  for (const type of RESOURCE_TYPES) {
    await db.insert(schema.resources).values({
      id: nanoid(),
      fiefId,
      resourceType: type,
      amount: STARTER_RESOURCES[type],
      capacity: BASE_CAPACITY[type],
      productionRate: BASE_PRODUCTION[type],
      updatedAt: now,
    });
  }

  return fiefId;
}

export async function getPlayerFief(playerId: string) {
  const fiefRows = await db
    .select()
    .from(schema.fiefs)
    .where(eq(schema.fiefs.playerId, playerId))
    .limit(1);

  const fief = fiefRows[0];
  if (!fief) return null;

  const resourceRows = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.fiefId, fief.id));

  const now = Date.now();
  const resources = resourceRows.map((r) => {
    const elapsed = (now - r.updatedAt) / TICK_MS;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    return {
      ...r,
      amount: Math.floor(current * 100) / 100,
    };
  });

  const buildingRows = await db
    .select()
    .from(schema.buildings)
    .where(eq(schema.buildings.fiefId, fief.id));

  const troopRows = await db
    .select()
    .from(schema.troops)
    .where(eq(schema.troops.fiefId, fief.id));

  return { fief, resources, buildings: buildingRows, troops: troopRows };
}
