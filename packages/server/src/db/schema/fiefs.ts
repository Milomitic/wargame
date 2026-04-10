import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const fiefs = sqliteTable("fiefs", {
  id: text("id").primaryKey(),
  playerId: text("player_id"),
  name: text("name").notNull(),
  tileId: text("tile_id").notNull(),
  level: integer("level").notNull().default(1),
  population: integer("population").notNull().default(100),
  morale: integer("morale").notNull().default(70),
  createdAt: integer("created_at").notNull(),
  lastRaidedAt: integer("last_raided_at"),
  raidCount24h: integer("raid_count_24h").notNull().default(0),
});
