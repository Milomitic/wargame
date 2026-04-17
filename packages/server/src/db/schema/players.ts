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
  score: integer("score").notNull().default(0),
  attackKills: integer("attack_kills").notNull().default(0),
  defenseKills: integer("defense_kills").notNull().default(0),
  /** Free-form bio shown on profile page */
  bio: text("bio").notNull().default(""),
  /** Avatar identifier (one of a fixed set of presets) */
  avatar: text("avatar").notNull().default("knight"),
  /** Admin flag — grants special privileges (instant arrivals, shield removal). */
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
});
