/** Game loop fires every 5 seconds. All completion checks are wall-clock
 *  based (comparing `arrivesAt` / `constructionStartedAt + duration` to
 *  Date.now()), so events resolve within ≤5 s of their real deadline. */
export const TICK_INTERVAL_MS = 5_000;
export const TICKS_PER_SEASON = 720;
export const NEWBIE_SHIELD_HOURS = 72;
export const MAX_RAIDS_PER_24H = 3;
export const RAID_LOOT_CAP = 0.3;
export const OFFLINE_DEFENSE_BONUS = 0.3;
export const RAID_COST_ESCALATION = 0.5;
export const MAP_RADIUS = 30;
export const ALLIANCE_MAX_MEMBERS = 20;
export const ALLIANCE_TAG_MIN = 2;
export const ALLIANCE_TAG_MAX = 5;
