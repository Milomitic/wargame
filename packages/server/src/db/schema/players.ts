import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  newbieShieldUntil: integer("newbie_shield_until"),
  tutorialStep: integer("tutorial_step").notNull().default(0),
});
