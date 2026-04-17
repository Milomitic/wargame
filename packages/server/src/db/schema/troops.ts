import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const troops = sqliteTable(
  "troops",
  {
    id: text("id").primaryKey(),
    fiefId: text("fief_id").notNull(),
    troopType: text("troop_type").notNull(),
    quantity: integer("quantity").notNull().default(0),
    isRecruiting: integer("is_recruiting", { mode: "boolean" })
      .notNull()
      .default(false),
    recruitingQuantity: integer("recruiting_quantity").notNull().default(0),
    recruitingTicksRemaining: integer("recruiting_ticks_remaining").default(0),
    recruitingStartedAt: integer("recruiting_started_at"),
  },
  (table) => [
    uniqueIndex("troops_fief_type_idx").on(table.fiefId, table.troopType),
  ]
);
