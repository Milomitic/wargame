import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const battleReports = sqliteTable("battle_reports", {
  id: text("id").primaryKey(),
  attackerId: text("attacker_id").notNull(), // playerId
  defenderType: text("defender_type").notNull(), // "camp" | "player"
  defenderId: text("defender_id"), // playerId or null for camps
  tileId: text("tile_id").notNull(),
  attackerTroopsJson: text("attacker_troops_json").notNull(),
  defenderTroopsJson: text("defender_troops_json").notNull(),
  attackerLossesJson: text("attacker_losses_json").notNull(),
  defenderLossesJson: text("defender_losses_json").notNull(),
  lootJson: text("loot_json"), // JSON: { resourceType: amount } or null
  result: text("result").notNull(), // "victory" | "defeat"
  terrainType: text("terrain_type").notNull(),
  createdAt: integer("created_at").notNull(),
});
