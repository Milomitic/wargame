import type { TerrainType } from "../constants/map.js";

/** Troop composition used in marches and combat. Maps troopType -> quantity */
export type TroopComposition = Record<string, number>;

export interface BarbarianCamp {
  id: string;
  tileId: string;
  x: number;
  y: number;
  difficulty: number;
  isDefeated: boolean;
}

export interface March {
  id: string;
  playerId: string;
  fiefId: string;
  originTileId: string;
  targetTileId: string;
  troops: TroopComposition;
  marchType: "attack_camp" | "attack_player";
  status: "marching" | "returning" | "completed";
  departedAt: number;
  arrivesAt: number;
  ticksRemaining: number;
}

export interface BattleReport {
  id: string;
  attackerId: string;
  defenderType: "camp" | "player";
  defenderId: string | null;
  tileId: string;
  attackerTroops: TroopComposition;
  defenderTroops: TroopComposition;
  attackerLosses: TroopComposition;
  defenderLosses: TroopComposition;
  loot: Record<string, number> | null;
  result: "victory" | "defeat";
  terrainType: TerrainType;
  createdAt: number;
}

export interface CombatResult {
  attackerLosses: TroopComposition;
  defenderLosses: TroopComposition;
  attackerSurvivors: TroopComposition;
  defenderSurvivors: TroopComposition;
  winner: "attacker" | "defender";
  loot: Record<string, number> | null;
}
