import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { TROOP_MAP, recruitSpeedMultiplier, type TroopType } from "@wargame/shared";
import { deductResources } from "./resource.helper.js";

interface RecruitResult {
  ok: boolean;
  error?: string;
  troop?: any;
}

export async function startRecruiting(
  fiefId: string,
  troopType: TroopType,
  quantity: number
): Promise<RecruitResult> {
  const def = TROOP_MAP[troopType];
  if (!def) {
    return { ok: false, error: "Unknown troop type" };
  }

  if (quantity < 1 || quantity > 50) {
    return { ok: false, error: "Quantity must be between 1 and 50" };
  }

  // Check required building exists at required level
  const buildingRows = await db
    .select()
    .from(schema.buildings)
    .where(
      and(
        eq(schema.buildings.fiefId, fiefId),
        eq(schema.buildings.buildingType, def.requiresBuilding),
        eq(schema.buildings.isConstructing, false)
      )
    );

  const building = buildingRows[0];
  if (!building) {
    return {
      ok: false,
      error: `Requires ${def.requiresBuilding} to be built first`,
    };
  }
  if (building.level < def.requiresBuildingLevel) {
    return {
      ok: false,
      error: `Requires ${def.requiresBuilding} level ${def.requiresBuildingLevel} (current: ${building.level})`,
    };
  }

  // Check if already recruiting this troop type
  const existing = await db
    .select()
    .from(schema.troops)
    .where(
      and(
        eq(schema.troops.fiefId, fiefId),
        eq(schema.troops.troopType, troopType)
      )
    );

  if (existing[0]?.isRecruiting) {
    return { ok: false, error: "Already recruiting this troop type" };
  }

  // Calculate total cost (per unit * quantity)
  const totalCost = {
    wood: def.baseCost.wood * quantity,
    stone: def.baseCost.stone * quantity,
    iron: def.baseCost.iron * quantity,
    gold: def.baseCost.gold * quantity,
  };

  // Check and deduct resources
  const deductResult = await deductResources(fiefId, totalCost);
  if (!deductResult.ok) {
    return { ok: false, error: deductResult.error };
  }

  // Also deduct food directly
  const foodCost = def.baseCost.food * quantity;
  if (foodCost > 0) {
    const foodResult = await deductResources(fiefId, {
      wood: 0,
      stone: 0,
      iron: 0,
      gold: 0,
      food: foodCost,
    });
    if (!foodResult.ok) {
      return { ok: false, error: foodResult.error };
    }
  }

  // Training speed scales with the host building's level (barracks / stable
  // / workshop). Minimum 1 tick so nothing completes instantly.
  const speedMult = recruitSpeedMultiplier(building.level);
  const ticks = Math.max(
    1,
    Math.ceil(def.baseRecruitTicks * quantity * speedMult)
  );
  const startedAt = Date.now();

  if (existing[0]) {
    // Update existing troop row
    await db
      .update(schema.troops)
      .set({
        isRecruiting: true,
        recruitingQuantity: quantity,
        recruitingTicksRemaining: ticks,
        recruitingStartedAt: startedAt,
      })
      .where(eq(schema.troops.id, existing[0].id));

    const updated = await db
      .select()
      .from(schema.troops)
      .where(eq(schema.troops.id, existing[0].id));
    return { ok: true, troop: updated[0] };
  } else {
    // Insert new troop row
    const troopId = nanoid();
    await db.insert(schema.troops).values({
      id: troopId,
      fiefId,
      troopType,
      quantity: 0,
      isRecruiting: true,
      recruitingQuantity: quantity,
      recruitingTicksRemaining: ticks,
      recruitingStartedAt: startedAt,
    });

    const created = await db
      .select()
      .from(schema.troops)
      .where(eq(schema.troops.id, troopId));
    return { ok: true, troop: created[0] };
  }
}

// deductResources is now imported from resource.helper.ts — shared with
// building.service.ts so both apply the same tech + capacity bonuses.
