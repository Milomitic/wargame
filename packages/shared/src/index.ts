export type { Player, PlayerPublic } from "./types/player.js";
export type { Fief } from "./types/fief.js";
export type { Resource, ResourceType, ResourceMap } from "./types/resource.js";
export { RESOURCE_TYPES } from "./types/resource.js";
export type { Building, BuildingType, BuildingDefinition } from "./types/building.js";
export { BUILDING_TYPES } from "./types/building.js";
export type { Troop, TroopType, TroopDefinition } from "./types/troop.js";
export { TROOP_TYPES } from "./types/troop.js";
export type {
  TroopComposition,
  BarbarianCamp,
  March,
  BattleReport,
  CombatResult,
} from "./types/combat.js";
export type { ServerToClientEvents, ClientToServerEvents } from "./types/ws-events.js";
export type { Alliance, AllianceMember, AllianceInvite, AllianceRole } from "./types/alliance.js";
export type { MapFief, MapCamp, MapData, MapTile } from "./types/map.js";

export { STARTER_RESOURCES, BASE_CAPACITY, BASE_PRODUCTION } from "./constants/resources.js";
export { BUILDINGS, BUILDING_MAP } from "./constants/buildings.js";
export { TROOPS, TROOP_MAP } from "./constants/troops.js";
export * from "./constants/config.js";
export {
  TERRAIN_TYPES,
  TERRAIN_MAP,
  getTerrain,
  isInBounds,
  parseTileId,
  toTileId,
} from "./constants/map.js";
export type { TerrainType, TerrainInfo } from "./constants/map.js";
export {
  MARCH_SPEED_TICKS_PER_TILE,
  CAMP_RESPAWN_TICKS,
  TERRAIN_DEFENSE_BONUS,
  CAMP_COUNT,
  CAMP_TROOPS,
  CAMP_LOOT,
} from "./constants/combat.js";

export { registerSchema, loginSchema } from "./validation/auth.schema.js";
export type { RegisterInput, LoginInput } from "./validation/auth.schema.js";
