export const RESOURCE_TYPES = [
  "wood",
  "stone",
  "iron",
  "food",
  "gold",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface Resource {
  id: string;
  fiefId: string;
  resourceType: ResourceType;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

export type ResourceMap = Record<ResourceType, number>;
