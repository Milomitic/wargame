import type { ResourceType } from "../types/resource.js";

export const STARTER_RESOURCES: Record<ResourceType, number> = {
  wood: 500,
  stone: 300,
  iron: 100,
  food: 800,
  gold: 200,
};

export const BASE_CAPACITY: Record<ResourceType, number> = {
  wood: 2000,
  stone: 2000,
  iron: 1000,
  food: 3000,
  gold: 1500,
};

export const BASE_PRODUCTION: Record<ResourceType, number> = {
  wood: 5,
  stone: 3,
  iron: 1,
  food: 8,
  gold: 2,
};
