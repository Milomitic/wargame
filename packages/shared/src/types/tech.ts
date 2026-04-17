export type TechCategory = "economy" | "military" | "fortification";

export interface TechBonus {
  /** e.g. "production_wood", "production_all", "attack", "defense", "capacity_all", "march_speed", "wall_bonus" */
  type: string;
  /** Multiplicative bonus, e.g. 0.1 = +10% */
  value: number;
}

export interface TechDefinition {
  id: string;
  name: string;
  description: string;
  category: TechCategory;
  /** Tech IDs that must be researched first */
  prerequisites: string[];
  cost: { wood: number; stone: number; iron: number; gold: number };
  researchTicks: number;
  bonuses: TechBonus[];
  /** Row position in the tree (0 = top/root) */
  tier: number;
}

export interface PlayerTech {
  techId: string;
  status: "researching" | "completed";
  researchTicksRemaining: number;
  researchedAt: number | null;
  /** Wall-clock ms timestamp when research began (for second-precision countdown) */
  researchStartedAt: number | null;
}
