// Score values awarded by the server when a player completes an action.
// Each value is the points granted on completion of ONE event (one level
// finished, one troop trained, one tech researched).

export const SCORE_BUILDING_BASE = 25;       // base points for level 1 build
export const SCORE_BUILDING_PER_LEVEL = 15;  // additional points per extra level

// Per-troop point values. Roughly proportional to (attack + defense) so
// stronger units are worth more on the leaderboard than peasant levies.
export const SCORE_TROOP_POINTS: Record<string, number> = {
  militia: 1,
  infantry: 4,
  archer: 4,
  cavalry: 9,
  catapult: 14,
};

// Each tech researched grants the same flat bonus regardless of tier — the
// research time itself is the gating factor.
export const SCORE_TECH_PER_RESEARCH = 75;

/** Points granted when a building reaches a given level (1 = freshly built). */
export function buildingLevelScore(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return SCORE_BUILDING_BASE;
  return SCORE_BUILDING_BASE + (level - 1) * SCORE_BUILDING_PER_LEVEL;
}

/** Points granted for recruiting `quantity` units of a given troop type. */
export function troopRecruitmentScore(troopType: string, quantity: number): number {
  const per = SCORE_TROOP_POINTS[troopType] ?? 0;
  return per * Math.max(0, quantity);
}

export function techResearchScore(): number {
  return SCORE_TECH_PER_RESEARCH;
}
