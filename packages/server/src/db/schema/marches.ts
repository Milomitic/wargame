import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const marches = sqliteTable("marches", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  fiefId: text("fief_id").notNull(),
  originTileId: text("origin_tile_id").notNull(),
  targetTileId: text("target_tile_id").notNull(),
  troopsJson: text("troops_json").notNull(), // JSON: { troopType: quantity }
  marchType: text("march_type").notNull(), // "attack_camp" | "attack_player" (future)
  status: text("status").notNull().default("marching"), // "marching" | "returning" | "arrived" | "completed"
  departedAt: integer("departed_at").notNull(),
  arrivesAt: integer("arrives_at").notNull(),
  ticksRemaining: integer("ticks_remaining").notNull(),
  createdAt: integer("created_at").notNull(),
});
