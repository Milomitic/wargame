import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  type: text("type").notNull(), // combat_victory, combat_defeat, raid_incoming, march_arrived, building_complete, troop_recruited, tech_complete, alliance_invite, troops_returned
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon").notNull(),
  isRead: integer("is_read").notNull().default(0),
  relatedId: text("related_id"), // marchId, reportId, techId, etc.
  createdAt: integer("created_at").notNull(),
});
