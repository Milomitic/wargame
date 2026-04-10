import type { TerrainType } from "../constants/map.js";
import type { BarbarianCamp } from "./combat.js";

/** A fief marker on the world map (public info only). */
export interface MapFief {
  x: number;
  y: number;
  fiefId: string;
  fiefName: string;
  level: number;
  population: number;
  playerId: string | null;
  playerName: string | null;
  hasNewbieShield: boolean;
  allianceTag: string | null;
  allianceId: string | null;
}

/** A camp marker on the world map. */
export interface MapCamp {
  x: number;
  y: number;
  campId: string;
  difficulty: number;
  isDefeated: boolean;
}

/** Response from GET /api/v1/map */
export interface MapData {
  fiefs: MapFief[];
  camps: MapCamp[];
  playerFief: { x: number; y: number } | null;
  playerAllianceId: string | null;
}

/** A computed tile for rendering (client-only). */
export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  fief?: MapFief;
  camp?: MapCamp;
}
