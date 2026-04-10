import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const resources = sqliteTable(
  "resources",
  {
    id: text("id").primaryKey(),
    fiefId: text("fief_id").notNull(),
    resourceType: text("resource_type").notNull(),
    amount: real("amount").notNull().default(0),
    capacity: real("capacity").notNull().default(1000),
    productionRate: real("production_rate").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("resources_fief_type_idx").on(table.fiefId, table.resourceType),
  ]
);
