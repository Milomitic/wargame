import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/server/src/db/schema.ts",
  out: "./packages/server/src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: `file:${process.env.DATABASE_URL || "./data/wargame.sqlite"}`,
  },
});
