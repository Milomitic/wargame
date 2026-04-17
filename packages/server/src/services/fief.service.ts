import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
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
  warehouseCapacityMultiplier,
  granaryCapacityMultiplier,
} from "@wargame/shared";
import { getPlayerBonuses } from "./tech.service.js";

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

  // Load buildings up-front so capacity bonuses from warehouse/granary
  // can be applied alongside tech bonuses.
  const buildingRows = await db
    .select()
    .from(schema.buildings)
    .where(eq(schema.buildings.fiefId, fief.id));

  const warehouseLevel =
    buildingRows.find((b) => b.buildingType === "warehouse" && !b.isConstructing)?.level ?? 0;
  const granaryLevel =
    buildingRows.find((b) => b.buildingType === "granary" && !b.isConstructing)?.level ?? 0;
  const warehouseMult = warehouseCapacityMultiplier(warehouseLevel);
  const granaryMult = granaryCapacityMultiplier(granaryLevel);

  // Apply tech bonuses + building bonuses to production and capacity
  const bonuses = await getPlayerBonuses(playerId);
  const prodAllBonus = 1 + (bonuses["production_all"] || 0);
  const capAllBonus = 1 + (bonuses["capacity_all"] || 0);

  const now = Date.now();
  const resources = resourceRows.map((r) => {
    const resBonus = bonuses[`production_${r.resourceType}`] || 0;
    const effectiveRate = r.productionRate * prodAllBonus * (1 + resBonus);
    // Storage: warehouse boosts wood/stone/iron/gold, granary boosts food.
    const storageMult = r.resourceType === "food" ? granaryMult : warehouseMult;
    const effectiveCapacity = r.capacity * capAllBonus * storageMult;
    const elapsed = (now - r.updatedAt) / TICK_MS;
    const current = Math.min(r.amount + effectiveRate * elapsed, effectiveCapacity);
    return {
      ...r,
      productionRate: Math.round(effectiveRate * 100) / 100,
      capacity: Math.round(effectiveCapacity),
      amount: Math.floor(current * 100) / 100,
    };
  });

  const troopRows = await db
    .select()
    .from(schema.troops)
    .where(eq(schema.troops.fiefId, fief.id));

  return { fief, resources, buildings: buildingRows, troops: troopRows };
}

export interface FiefSummary {
  id: string;
  name: string;
  tileId: string;
  level: number;
  population: number;
  morale: number;
  score: number;
}

/** Return all fiefs owned by a player (each with a computed score). */
export async function getPlayerFiefs(playerId: string): Promise<FiefSummary[]> {
  const fiefs = await db
    .select({
      id: schema.fiefs.id,
      name: schema.fiefs.name,
      tileId: schema.fiefs.tileId,
      level: schema.fiefs.level,
      population: schema.fiefs.population,
      morale: schema.fiefs.morale,
    })
    .from(schema.fiefs)
    .where(eq(schema.fiefs.playerId, playerId));

  if (fiefs.length === 0) return [];

  const buildingScores = await db
    .select({
      fiefId: schema.buildings.fiefId,
      score: sql<number>`COALESCE(SUM(${schema.buildings.level}), 0)`.as("score"),
    })
    .from(schema.buildings)
    .groupBy(schema.buildings.fiefId);
  const scoreMap = new Map<string, number>();
  for (const b of buildingScores) {
    scoreMap.set(b.fiefId, Number(b.score));
  }

  return fiefs.map((f) => ({
    ...f,
    score: scoreMap.get(f.id) ?? 0,
  }));
}
