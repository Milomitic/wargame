// ── Per-level building bonus formulas ──────────────────────────────
// Keep these pure functions so both server and client compute identical
// values for display and enforcement.

/**
 * Multiplier applied to the base non-food storage capacity for every level
 * of Warehouse. Level 0 (not built) = 1.0 (no bonus). Level 1 = 1.25.
 * Each subsequent level adds +25% of the base capacity.
 */
export function warehouseCapacityMultiplier(warehouseLevel: number): number {
  if (warehouseLevel <= 0) return 1;
  return 1 + 0.25 * warehouseLevel;
}

/**
 * Multiplier applied to the base food capacity for every level of Granary.
 * Level 0 = 1.0. Level 1 = 1.3. Each level adds +30% of the base capacity.
 */
export function granaryCapacityMultiplier(granaryLevel: number): number {
  if (granaryLevel <= 0) return 1;
  return 1 + 0.3 * granaryLevel;
}

/**
 * Training-speed multiplier for a troop-producing building (barracks, stable,
 * workshop). Applied to the base recruit ticks. Level 1 = 1.0 (no bonus),
 * Level 2 = 0.93, each further level shaves 7% off the previous total.
 * Minimum multiplier is 0.35 so the late-game ceiling isn't absurd.
 */
export function recruitSpeedMultiplier(buildingLevel: number): number {
  if (buildingLevel <= 1) return 1;
  const m = Math.pow(0.93, buildingLevel - 1);
  return Math.max(0.35, m);
}

/**
 * Resource-production buildings multiply their baseRate by their level.
 * Exposed as a helper so the UI can show "now vs next level" without
 * hand-coding the formula in two places.
 */
export function productionAtLevel(baseRate: number, level: number): number {
  return baseRate * Math.max(0, level);
}
