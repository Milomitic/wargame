import {
  TROOP_MAP,
  TERRAIN_DEFENSE_BONUS,
  type TroopComposition,
  type CombatResult,
  type TerrainType,
} from "@wargame/shared";

/**
 * Deterministic combat resolution engine.
 *
 * Algorithm:
 * 1. Calculate total attack power for attacker
 * 2. Calculate total defense power for defender (with terrain bonus)
 * 3. Compute power ratio to determine winner
 * 4. Apply proportional casualties to losing side, partial to winning side
 * 5. Generate loot if attacker wins
 */
export function resolveCombat(
  attackerTroops: TroopComposition,
  defenderTroops: TroopComposition,
  terrain: TerrainType,
  lootPool: Record<string, number> | null,
  wallBonus = 0,
  offlineBonus = 0
): CombatResult {
  // Calculate total attack power
  let totalAttack = 0;
  for (const [type, qty] of Object.entries(attackerTroops)) {
    const def = TROOP_MAP[type];
    if (def) totalAttack += def.attack * qty;
  }

  // Calculate total defense power with terrain + wall + offline bonuses
  const terrainBonus = TERRAIN_DEFENSE_BONUS[terrain] || 1.0;
  const totalBonusMultiplier = terrainBonus + wallBonus + offlineBonus;
  let totalDefense = 0;
  for (const [type, qty] of Object.entries(defenderTroops)) {
    const def = TROOP_MAP[type];
    if (def) totalDefense += def.defense * qty;
  }
  totalDefense = Math.floor(totalDefense * totalBonusMultiplier);

  // Prevent division by zero
  const totalPower = totalAttack + totalDefense;
  if (totalPower === 0) {
    return {
      attackerLosses: {},
      defenderLosses: {},
      attackerSurvivors: { ...attackerTroops },
      defenderSurvivors: { ...defenderTroops },
      winner: "defender",
      loot: null,
    };
  }

  // Power ratio determines outcome
  const attackRatio = totalAttack / totalPower;
  const winner = attackRatio > 0.5 ? "attacker" : "defender";

  // Casualty calculation
  // Winner loses 10-30% of troops (based on how close the fight was)
  // Loser loses 60-90% of troops
  const dominance = Math.abs(attackRatio - 0.5) * 2; // 0 = even, 1 = total domination

  const winnerLossRate = 0.3 - dominance * 0.2; // 10%-30%
  const loserLossRate = 0.6 + dominance * 0.3; // 60%-90%

  const attackerLossRate = winner === "attacker" ? winnerLossRate : loserLossRate;
  const defenderLossRate = winner === "defender" ? winnerLossRate : loserLossRate;

  const attackerLosses: TroopComposition = {};
  const attackerSurvivors: TroopComposition = {};
  for (const [type, qty] of Object.entries(attackerTroops)) {
    const lost = Math.min(qty, Math.max(1, Math.round(qty * attackerLossRate)));
    attackerLosses[type] = lost;
    attackerSurvivors[type] = qty - lost;
  }

  const defenderLosses: TroopComposition = {};
  const defenderSurvivors: TroopComposition = {};
  for (const [type, qty] of Object.entries(defenderTroops)) {
    const lost = Math.min(qty, Math.max(1, Math.round(qty * defenderLossRate)));
    defenderLosses[type] = lost;
    defenderSurvivors[type] = qty - lost;
  }

  // Loot: attacker gets loot only on victory
  const loot = winner === "attacker" && lootPool ? { ...lootPool } : null;

  return {
    attackerLosses,
    defenderLosses,
    attackerSurvivors,
    defenderSurvivors,
    winner,
    loot,
  };
}
