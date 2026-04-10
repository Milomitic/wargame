import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { BUILDING_MAP, type BuildingType } from "@wargame/shared";

interface BuildResult {
  ok: boolean;
  error?: string;
  building?: any;
}

export async function startConstruction(
  fiefId: string,
  buildingType: BuildingType
): Promise<BuildResult> {
  const def = BUILDING_MAP[buildingType];
  if (!def) {
    return { ok: false, error: "Unknown building type" };
  }

  // Check if building already exists
  const existing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.buildingType, buildingType)
      )
    );

  if (existing.length > 0) {
    return { ok: false, error: "Building already exists. Use upgrade instead." };
  }

  // Check prerequisite building
  if (def.requires) {
    const prereq = await db
      .select()
      .from(schema.buildings)
      .where(
        and(
          eq(schema.buildings.fiefId, fiefId),
          eq(schema.buildings.buildingType, def.requires),
          eq(schema.buildings.isConstructing, false)
        )
      );
    if (prereq.length === 0) {
      return {
        ok: false,
        error: `Requires ${BUILDING_MAP[def.requires]?.name || def.requires} to be built first`,
      };
    }
  }

  // Check if another building is already under construction
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.isConstructing, true)
      )
    );
  if (constructing.length > 0) {
    return { ok: false, error: "Another building is already under construction" };
  }

  // Check and deduct resources
  const cost = def.baseCost;
  const deductResult = await deductResources(fiefId, cost);
  if (!deductResult.ok) {
    return { ok: false, error: deductResult.error };
  }

  const now = Date.now();
  const buildingId = nanoid();
  const ticks = Math.ceil(def.baseBuildTicks);

  await db.insert(schema.buildings).values({
    id: buildingId,
    fiefId,
    buildingType,
    level: 1,
    isConstructing: true,
    constructionStartedAt: now,
    constructionTicksRemaining: ticks,
  });

  const building = await db
    .select()
    .from(schema.buildings)
    .where(eq(schema.buildings.id, buildingId));

  return { ok: true, building: building[0] };
}

export async function upgradeBuilding(
  fiefId: string,
  buildingType: BuildingType
): Promise<BuildResult> {
  const def = BUILDING_MAP[buildingType];
  if (!def) {
    return { ok: false, error: "Unknown building type" };
  }

  const existing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.buildingType, buildingType)
      )
    );

  if (existing.length === 0) {
    return { ok: false, error: "Building does not exist" };
  }

  const building = existing[0];

  if (building.isConstructing) {
    return { ok: false, error: "Building is already under construction" };
  }

  if (building.level >= def.maxLevel) {
    return { ok: false, error: "Building is already at max level" };
  }

  // Check if another building is under construction
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.isConstructing, true)
      )
    );
  if (constructing.length > 0) {
    return { ok: false, error: "Another building is already under construction" };
  }

  // Calculate upgrade cost
  const level = building.level;
  const multiplier = Math.pow(def.costMultiplier, level);
  const cost = {
    wood: Math.ceil(def.baseCost.wood * multiplier),
    stone: Math.ceil(def.baseCost.stone * multiplier),
    iron: Math.ceil(def.baseCost.iron * multiplier),
    gold: Math.ceil(def.baseCost.gold * multiplier),
  };

  const deductResult = await deductResources(fiefId, cost);
  if (!deductResult.ok) {
    return { ok: false, error: deductResult.error };
  }

  const ticks = Math.ceil(
    def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level)
  );

  await db
    .update(schema.buildings)
    .set({
      level: level + 1,
      isConstructing: true,
      constructionStartedAt: Date.now(),
      constructionTicksRemaining: ticks,
    })
    .where(eq(schema.buildings.id, building.id));

  const updated = await db
    .select()
    .from(schema.buildings)
    .where(eq(schema.buildings.id, building.id));

  return { ok: true, building: updated[0] };
}

async function deductResources(
  fiefId: string,
  cost: { wood: number; stone: number; iron: number; gold: number }
): Promise<{ ok: boolean; error?: string }> {
  const resources = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.fiefId, fiefId));

  const now = Date.now();
  const resMap: Record<string, (typeof resources)[0]> = {};
  const currentAmounts: Record<string, number> = {};

  for (const r of resources) {
    resMap[r.resourceType] = r;
    const elapsed = (now - r.updatedAt) / 60_000;
    currentAmounts[r.resourceType] = Math.min(
      r.amount + r.productionRate * elapsed,
      r.capacity
    );
  }

  // Check sufficiency
  for (const [type, needed] of Object.entries(cost)) {
    if (needed <= 0) continue;
    const available = currentAmounts[type] || 0;
    if (available < needed) {
      return {
        ok: false,
        error: `Not enough ${type}: need ${needed}, have ${Math.floor(available)}`,
      };
    }
  }

  // Deduct
  for (const [type, needed] of Object.entries(cost)) {
    if (needed <= 0) continue;
    const r = resMap[type];
    if (!r) continue;
    await db
      .update(schema.resources)
      .set({
        amount: currentAmounts[type] - needed,
        updatedAt: now,
      })
      .where(eq(schema.resources.id, r.id));
  }

  return { ok: true };
}

export function getBuildCost(buildingType: string, level: number) {
  const def = BUILDING_MAP[buildingType];
  if (!def) return null;

  if (level === 0) {
    return {
      cost: def.baseCost,
      ticks: def.baseBuildTicks,
    };
  }

  const multiplier = Math.pow(def.costMultiplier, level);
  return {
    cost: {
      wood: Math.ceil(def.baseCost.wood * multiplier),
      stone: Math.ceil(def.baseCost.stone * multiplier),
      iron: Math.ceil(def.baseCost.iron * multiplier),
      gold: Math.ceil(def.baseCost.gold * multiplier),
    },
    ticks: Math.ceil(
      def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level)
    ),
  };
}
