import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const buildings = sqliteTable(
  "buildings",
  {
    id: text("id").primaryKey(),
    fiefId: text("fief_id").notNull(),
    buildingType: text("building_type").notNull(),
    level: integer("level").notNull().default(1),
    isConstructing: integer("is_constructing", { mode: "boolean" }).notNull().default(false),
    constructionStartedAt: integer("construction_started_at"),
    constructionTicksRemaining: integer("construction_ticks_remaining").default(0),
  },
  (table) => [
    uniqueIndex("buildings_fief_type_idx").on(table.fiefId, table.buildingType),
  ]
);
