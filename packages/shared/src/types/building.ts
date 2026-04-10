export const BUILDING_TYPES = [
  "lumbermill",
  "quarry",
  "mine",
  "farm",
  "market",
  "barracks",
  "wall",
  "keep",
  "stable",
  "workshop",
  "watchtower",
  "granary",
  "warehouse",
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export interface Building {
  id: string;
  fiefId: string;
  buildingType: BuildingType;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: { wood: number; stone: number; iron: number; gold: number };
  costMultiplier: number;
  baseBuildTicks: number;
  buildTicksMultiplier: number;
  produces?: { resource: string; baseRate: number };
  requires?: BuildingType;
}
