import { MAP_RADIUS } from "./config.js";

export const TERRAIN_TYPES = ["plains", "forest", "mountains", "hills", "lake", "swamp"] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];

export interface TerrainInfo {
  label: string;
  habitable: boolean;
}

export const TERRAIN_MAP: Record<TerrainType, TerrainInfo> = {
  plains:    { label: "Plains",    habitable: true },
  forest:    { label: "Forest",    habitable: true },
  hills:     { label: "Hills",     habitable: true },
  mountains: { label: "Mountains", habitable: false },
  lake:      { label: "Lake",      habitable: false },
  swamp:     { label: "Swamp",     habitable: false },
};

/**
 * Deterministic terrain from coordinates.
 * Uses an integer hash so both client and server produce identical results.
 */
export function getTerrain(x: number, y: number): TerrainType {
  // Simple integer hash producing 0..1
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x1b873593);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  h = h ^ (h >>> 16);
  const v = (h >>> 0) / 0xffffffff;

  if (v < 0.04) return "lake";
  if (v < 0.12) return "mountains";
  if (v < 0.20) return "swamp";
  if (v < 0.38) return "forest";
  if (v < 0.48) return "hills";
  return "plains"; // ~52% — most common
}

/** Check if coordinate is within the world bounds. */
export function isInBounds(x: number, y: number): boolean {
  return Math.abs(x) <= MAP_RADIUS && Math.abs(y) <= MAP_RADIUS;
}

/** Parse a tileId string "x,y" into numeric coordinates. */
export function parseTileId(tileId: string): { x: number; y: number } {
  const [x, y] = tileId.split(",").map(Number);
  return { x, y };
}

/** Create a tileId string from coordinates. */
export function toTileId(x: number, y: number): string {
  return `${x},${y}`;
}
