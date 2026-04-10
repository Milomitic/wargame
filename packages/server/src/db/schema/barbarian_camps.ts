import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const barbarianCamps = sqliteTable("barbarian_camps", {
  id: text("id").primaryKey(),
  tileId: text("tile_id").notNull().unique(),
  difficulty: integer("difficulty").notNull().default(1), // 1-5
  troopsJson: text("troops_json").notNull(), // JSON: { troopType: quantity }
  lootJson: text("loot_json").notNull(), // JSON: { resourceType: amount }
  isDefeated: integer("is_defeated", { mode: "boolean" }).notNull().default(false),
  respawnAt: integer("respawn_at"), // timestamp when camp respawns
  createdAt: integer("created_at").notNull(),
});
