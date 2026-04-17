import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const playerTechnologies = sqliteTable("player_technologies", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  techId: text("tech_id").notNull(),
  status: text("status").notNull().default("researching"), // "researching" | "completed"
  researchTicksRemaining: integer("research_ticks_remaining").notNull().default(0),
  researchStartedAt: integer("research_started_at"),
  researchedAt: integer("researched_at"),
  createdAt: integer("created_at").notNull(),
});
