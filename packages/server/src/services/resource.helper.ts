/**
 * Shared helper that computes the current effective resource amounts for a
 * fief, including tech bonuses (production_all, production_wood, …) and
 * building-level capacity bonuses (warehouse, granary).
 *
 * Both `getPlayerFief` and `deductResources` must agree on how much a
 * player actually has — this function is the single source of truth.
 */
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  warehouseCapacityMultiplier,
  granaryCapacityMultiplier,
} from "@wargame/shared";
import { getPlayerBonuses } from "./tech.service.js";

interface EffectiveResource {
  id: string;
  resourceType: string;
  /** Effective current amount (with production projected forward + bonus rate + bonus cap) */
  amount: number;
  /** Effective capacity */
  capacity: number;
  /** Effective production rate per minute */
  productionRate: number;
  /** The raw DB row for updates */
  _raw: {
    id: string;
    amount: number;
    productionRate: number;
    capacity: number;
    updatedAt: number;
  };
}

/**
 * Load all resources for a fief and project their current amounts using
 * effective rates (with tech + building bonuses applied).
 */
export async function getEffectiveResources(fiefId: string): Promise<EffectiveResource[]> {
  // 1. Load raw resource rows from DB.
  const resources = await db
    .select()
    .from(schema.resources)
    .where(eq(schema.resources.fiefId, fiefId));

  // 2. Determine the owning player (for tech bonuses).
  const fiefRows = await db
    .select({ playerId: schema.fiefs.playerId })
    .from(schema.fiefs)
    .where(eq(schema.fiefs.id, fiefId))
    .limit(1);
  const playerId = fiefRows[0]?.playerId;

  // 3. Load tech bonuses.
  const bonuses = playerId ? await getPlayerBonuses(playerId) : {};
  const prodAllBonus = 1 + (bonuses["production_all"] || 0);
  const capAllBonus = 1 + (bonuses["capacity_all"] || 0);

  // 4. Load warehouse + granary levels for capacity bonuses.
  const buildings = await db
    .select({
      buildingType: schema.buildings.buildingType,
      level: schema.buildings.level,
      isConstructing: schema.buildings.isConstructing,
    })
    .from(schema.buildings)
    .where(eq(schema.buildings.fiefId, fiefId));

  const warehouseLevel =
    buildings.find((b) => b.buildingType === "warehouse" && !b.isConstructing)?.level ?? 0;
  const granaryLevel =
    buildings.find((b) => b.buildingType === "granary" && !b.isConstructing)?.level ?? 0;
  const warehouseMult = warehouseCapacityMultiplier(warehouseLevel);
  const granaryMult = granaryCapacityMultiplier(granaryLevel);

  // 5. Compute effective amounts.
  const now = Date.now();
  return resources.map((r) => {
    const resBonus = bonuses[`production_${r.resourceType}`] || 0;
    const effectiveRate = r.productionRate * prodAllBonus * (1 + resBonus);
    const storageMult = r.resourceType === "food" ? granaryMult : warehouseMult;
    const effectiveCapacity = r.capacity * capAllBonus * storageMult;
    const elapsed = (now - r.updatedAt) / 60_000;
    const amount = Math.min(r.amount + effectiveRate * elapsed, effectiveCapacity);

    return {
      id: r.id,
      resourceType: r.resourceType,
      amount: Math.floor(amount * 100) / 100,
      capacity: Math.round(effectiveCapacity),
      productionRate: Math.round(effectiveRate * 100) / 100,
      _raw: {
        id: r.id,
        amount: r.amount,
        productionRate: r.productionRate,
        capacity: r.capacity,
        updatedAt: r.updatedAt,
      },
    };
  });
}

/**
 * Check affordability and deduct resources from a fief, using effective
 * amounts (with all bonuses applied) so the result matches what the
 * client displays.
 */
export async function deductResources(
  fiefId: string,
  cost: Record<string, number>
): Promise<{ ok: boolean; error?: string }> {
  const effective = await getEffectiveResources(fiefId);

  const now = Date.now();
  const resMap = new Map(effective.map((r) => [r.resourceType, r]));

  // Check sufficiency against effective amounts.
  for (const [type, needed] of Object.entries(cost)) {
    if (needed <= 0) continue;
    const r = resMap.get(type);
    const available = r?.amount ?? 0;
    if (available < needed) {
      return {
        ok: false,
        error: `Not enough ${type}: need ${needed}, have ${Math.floor(available)}`,
      };
    }
  }

  // Deduct: we write back the *materialized* effective amount minus cost.
  // The updatedAt is set to now so the next projection starts from a fresh
  // baseline.
  for (const [type, needed] of Object.entries(cost)) {
    if (needed <= 0) continue;
    const r = resMap.get(type);
    if (!r) continue;
    await db
      .update(schema.resources)
      .set({
        amount: r.amount - needed,
        updatedAt: now,
      })
      .where(eq(schema.resources.id, r.id));
  }

  return { ok: true };
}
