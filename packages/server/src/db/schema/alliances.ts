import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const alliances = sqliteTable("alliances", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull().unique(), // 2-5 char short code
  description: text("description").notNull().default(""),
  leaderId: text("leader_id").notNull(),
  createdAt: integer("created_at").notNull(),
  /** Avatar/banner identifier (one of a fixed set of presets) */
  avatar: text("avatar").notNull().default("banner_red"),
  /** Long-form manifesto shown on the alliance profile page */
  manifesto: text("manifesto").notNull().default(""),
});

export const allianceMembers = sqliteTable("alliance_members", {
  id: text("id").primaryKey(),
  allianceId: text("alliance_id").notNull(),
  playerId: text("player_id").notNull().unique(), // a player can only be in one alliance
  role: text("role").notNull().default("member"), // "leader" | "officer" | "member"
  joinedAt: integer("joined_at").notNull(),
});

export const allianceInvites = sqliteTable("alliance_invites", {
  id: text("id").primaryKey(),
  allianceId: text("alliance_id").notNull(),
  inviterId: text("inviter_id").notNull(),
  inviteeId: text("invitee_id").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  createdAt: integer("created_at").notNull(),
});
