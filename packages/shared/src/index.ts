export type {
  Player,
  PlayerPublic,
  PlayerProfile,
  PlayerAvatarId,
} from "./types/player.js";
export { PLAYER_AVATARS, PLAYER_AVATAR_GLYPHS } from "./types/player.js";
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
export type {
  Alliance,
  AllianceMember,
  AllianceInvite,
  AllianceRole,
  AllianceProfile,
  AllianceAvatarId,
} from "./types/alliance.js";
export { ALLIANCE_AVATARS, ALLIANCE_AVATAR_GLYPHS } from "./types/alliance.js";
export type { TechCategory, TechBonus, TechDefinition, PlayerTech } from "./types/tech.js";
export { TECH_TREE, TECH_MAP } from "./constants/tech.js";
export type { MapFief, MapCamp, MapData, MapTile } from "./types/map.js";
export type {
  LeaderboardEntry,
  AllianceLeaderboardEntry,
  LeaderboardData,
  LeaderboardSort,
} from "./types/leaderboard.js";

export { STARTER_RESOURCES, BASE_CAPACITY, BASE_PRODUCTION } from "./constants/resources.js";
export { BUILDINGS, BUILDING_MAP } from "./constants/buildings.js";
export {
  warehouseCapacityMultiplier,
  granaryCapacityMultiplier,
  recruitSpeedMultiplier,
  productionAtLevel,
} from "./constants/bonuses.js";
export { TROOPS, TROOP_MAP } from "./constants/troops.js";
export {
  SCORE_BUILDING_BASE,
  SCORE_BUILDING_PER_LEVEL,
  SCORE_TROOP_POINTS,
  SCORE_TECH_PER_RESEARCH,
  buildingLevelScore,
  troopRecruitmentScore,
  techResearchScore,
} from "./constants/scoring.js";
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
