import type { TerrainType } from "./map.js";
import type { TroopComposition } from "../types/combat.js";

/** Ticks per tile of distance for a march. */
export const MARCH_SPEED_TICKS_PER_TILE = 2;

/** Minutes before a defeated camp respawns. */
export const CAMP_RESPAWN_TICKS = 60;

/** Terrain defense multipliers for the defender. */
export const TERRAIN_DEFENSE_BONUS: Record<TerrainType, number> = {
  plains: 1.0,
  forest: 1.2,
  hills: 1.3,
  mountains: 1.5,
  lake: 1.0,
  swamp: 0.9,
};

/** Number of barbarian camps to generate on the map. */
export const CAMP_COUNT = 25;

/** Difficulty-based troop compositions for barbarian camps. */
export const CAMP_TROOPS: Record<number, TroopComposition> = {
  1: { militia: 10 },
  2: { militia: 15, infantry: 5 },
  3: { militia: 10, infantry: 10, archer: 5 },
  4: { infantry: 15, archer: 10, cavalry: 3 },
  5: { infantry: 20, archer: 15, cavalry: 5, catapult: 2 },
};

/** Difficulty-based loot for barbarian camps. */
export const CAMP_LOOT: Record<number, Record<string, number>> = {
  1: { wood: 50, food: 50, gold: 20 },
  2: { wood: 100, stone: 50, food: 80, gold: 40 },
  3: { wood: 150, stone: 100, iron: 50, food: 120, gold: 80 },
  4: { wood: 200, stone: 150, iron: 100, food: 150, gold: 150 },
  5: { wood: 300, stone: 200, iron: 150, food: 200, gold: 250 },
};
