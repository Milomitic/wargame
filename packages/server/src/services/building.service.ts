import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { BUILDING_MAP, type BuildingType } from "@wargame/shared";
import { deductResources } from "./resource.helper.js";

export const MAX_PARALLEL_CONSTRUCTIONS = 2;
const CANCEL_REFUND_RATIO = 0.5;

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

  // Up to MAX_PARALLEL_CONSTRUCTIONS may be in progress simultaneously
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.isConstructing, true)
      )
    );
  if (constructing.length >= MAX_PARALLEL_CONSTRUCTIONS) {
    return { ok: false, error: `Already ${MAX_PARALLEL_CONSTRUCTIONS} buildings under construction` };
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

  // Up to MAX_PARALLEL_CONSTRUCTIONS may be in progress simultaneously
  const constructing = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.isConstructing, true)
      )
    );
  if (constructing.length >= MAX_PARALLEL_CONSTRUCTIONS) {
    return { ok: false, error: `Already ${MAX_PARALLEL_CONSTRUCTIONS} buildings under construction` };
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

// deductResources is now imported from resource.helper.ts — a single shared
// implementation that applies tech bonuses + building capacity bonuses so the
// server's affordability check matches the client's display.

export async function cancelConstruction(
  fiefId: string,
  buildingType: BuildingType
): Promise<{ ok: boolean; error?: string; deleted?: boolean }> {
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

  const building = existing[0];
  if (!building) {
    return { ok: false, error: "Building does not exist" };
  }
  if (!building.isConstructing) {
    return { ok: false, error: "Building is not under construction" };
  }

  // The level the building had BEFORE this in-progress action started.
  // For a fresh build, the row was inserted at level 1, so previous level was 0.
  const previousLevel = building.level - 1;

  // Recompute the cost that was paid when this action started, so we can refund.
  let paidCost: { wood: number; stone: number; iron: number; gold: number };
  if (previousLevel === 0) {
    paidCost = {
      wood: def.baseCost.wood,
      stone: def.baseCost.stone,
      iron: def.baseCost.iron,
      gold: def.baseCost.gold,
    };
  } else {
    const m = Math.pow(def.costMultiplier, previousLevel);
    paidCost = {
      wood: Math.ceil(def.baseCost.wood * m),
      stone: Math.ceil(def.baseCost.stone * m),
      iron: Math.ceil(def.baseCost.iron * m),
      gold: Math.ceil(def.baseCost.gold * m),
    };
  }

  await refundResources(fiefId, paidCost, CANCEL_REFUND_RATIO);

  if (previousLevel === 0) {
    await db.delete(schema.buildings).where(eq(schema.buildings.id, building.id));
    return { ok: true, deleted: true };
  }

  await db
    .update(schema.buildings)
    .set({
      level: previousLevel,
      isConstructing: false,
      constructionStartedAt: null,
      constructionTicksRemaining: 0,
    })
    .where(eq(schema.buildings.id, building.id));

  return { ok: true, deleted: false };
}

async function refundResources(
  fiefId: string,
  cost: { wood: number; stone: number; iron: number; gold: number },
  ratio: number
) {
  const resources = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.fiefId, fiefId));

  const now = Date.now();
  for (const r of resources) {
    const refund = Math.floor((cost[r.resourceType as keyof typeof cost] || 0) * ratio);
    if (refund <= 0) continue;
    const elapsed = (now - r.updatedAt) / 60_000;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    const next = Math.min(current + refund, r.capacity);
    await db
      .update(schema.resources)
      .set({ amount: next, updatedAt: now })
      .where(eq(schema.resources.id, r.id));
  }
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
