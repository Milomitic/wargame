export const TROOP_TYPES = [
  "militia",
  "spearman",
  "infantry",
  "archer",
  "scout",
  "cavalry_light",
  "cavalry_heavy",
  "catapult",
] as const;

export type TroopType = (typeof TROOP_TYPES)[number];

export interface Troop {
  id: string;
  fiefId: string;
  troopType: TroopType;
  quantity: number;
  isRecruiting: boolean;
  recruitingQuantity: number;
  recruitingTicksRemaining: number;
}

export interface TroopDefinition {
  type: TroopType;
  name: string;
  description: string;
  /** Attack power per unit. */
  attack: number;
  /** Defense power per unit. */
  defense: number;
  /** Food consumed per unit per tick. */
  upkeep: number;
  /** Base cost to recruit 1 unit. */
  baseCost: { wood: number; stone: number; iron: number; gold: number; food: number };
  /** Ticks to recruit 1 unit. */
  baseRecruitTicks: number;
  /** Building required to recruit. */
  requiresBuilding: string;
  /** Minimum level of the required building. */
  requiresBuildingLevel: number;
}
