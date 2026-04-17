import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isRead: integer("is_read").notNull().default(0),
  parentId: text("parent_id"), // nullable, for replies (future)
  createdAt: integer("created_at").notNull(),
});
