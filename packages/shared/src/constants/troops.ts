import type { TroopDefinition } from "../types/troop.js";

export const TROOPS: TroopDefinition[] = [
  {
    type: "militia",
    name: "Militia",
    description: "Cheap peasant levies. Weak but fast to recruit.",
    attack: 2,
    defense: 3,
    upkeep: 1,
    baseCost: { wood: 10, stone: 0, iron: 5, gold: 5, food: 20 },
    baseRecruitTicks: 1,
    requiresBuilding: "barracks",
    requiresBuildingLevel: 1,
  },
  {
    type: "infantry",
    name: "Infantry",
    description: "Well-trained foot soldiers. Balanced fighters.",
    attack: 5,
    defense: 6,
    upkeep: 2,
    baseCost: { wood: 15, stone: 0, iron: 20, gold: 10, food: 30 },
    baseRecruitTicks: 2,
    requiresBuilding: "barracks",
    requiresBuildingLevel: 3,
  },
  {
    type: "archer",
    name: "Archer",
    description: "Ranged units. Strong attack, weaker in melee.",
    attack: 7,
    defense: 3,
    upkeep: 2,
    baseCost: { wood: 25, stone: 0, iron: 10, gold: 15, food: 25 },
    baseRecruitTicks: 2,
    requiresBuilding: "barracks",
    requiresBuildingLevel: 5,
  },
  {
    type: "cavalry",
    name: "Cavalry",
    description: "Mounted knights. Powerful but expensive.",
    attack: 12,
    defense: 8,
    upkeep: 4,
    baseCost: { wood: 20, stone: 0, iron: 30, gold: 40, food: 50 },
    baseRecruitTicks: 4,
    requiresBuilding: "stable",
    requiresBuildingLevel: 1,
  },
  {
    type: "catapult",
    name: "Catapult",
    description: "Siege engine. Devastating against fortifications.",
    attack: 20,
    defense: 2,
    upkeep: 6,
    baseCost: { wood: 80, stone: 40, iron: 50, gold: 60, food: 30 },
    baseRecruitTicks: 6,
    requiresBuilding: "workshop",
    requiresBuildingLevel: 1,
  },
];

export const TROOP_MAP = Object.fromEntries(
  TROOPS.map((t) => [t.type, t])
) as Record<string, TroopDefinition>;
