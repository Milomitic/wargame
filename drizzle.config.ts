import { defineConfig } from "drizzle-kit";

// Canonical DB location: packages/server/data/wargame.sqlite.
// Drizzle-kit is always invoked from the repo root, so this relative
// path is unambiguous.
export default defineConfig({
  schema: "./packages/server/src/db/schema.ts",
  out: "./packages/server/src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: `file:${process.env.DATABASE_URL || "./packages/server/data/wargame.sqlite"}`,
  },
});
