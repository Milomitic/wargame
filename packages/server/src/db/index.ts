import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { config } from "../config.js";
import * as schema from "./schema.js";

const dbPath = resolve(config.databaseUrl);
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const client = createClient({
  url: `file:${dbPath}`,
});

// Lightweight idempotent migrations applied at boot. Each ALTER is wrapped
// because SQLite has no `ADD COLUMN IF NOT EXISTS`.
async function applyMigrations() {
  const migrations: string[] = [
    `ALTER TABLE players ADD COLUMN score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE players ADD COLUMN attack_kills INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE players ADD COLUMN defense_kills INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE players ADD COLUMN bio TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE players ADD COLUMN avatar TEXT NOT NULL DEFAULT 'knight'`,
    `ALTER TABLE players ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE troops ADD COLUMN recruiting_started_at INTEGER`,
    `ALTER TABLE player_technologies ADD COLUMN research_started_at INTEGER`,
    `ALTER TABLE alliances ADD COLUMN avatar TEXT NOT NULL DEFAULT 'banner_red'`,
    `ALTER TABLE alliances ADD COLUMN manifesto TEXT NOT NULL DEFAULT ''`,
  ];
  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("duplicate column") || msg.includes("no such table")) continue;
      throw e;
    }
  }

  // One-time data migrations / grants (idempotent).
  try {
    await client.execute(`UPDATE players SET is_admin = 1 WHERE username = 'Milomitic'`);
  } catch {}
  try {
    await client.execute(`UPDATE troops SET troop_type = 'cavalry_light' WHERE troop_type = 'cavalry'`);
  } catch {}
  // Sync fief.level = keep building level for all existing fiefs (idempotent).
  try {
    await client.execute(`
      UPDATE fiefs SET level = (
        SELECT COALESCE(MAX(b.level), 1)
        FROM buildings b
        WHERE b.fief_id = fiefs.id AND b.building_type = 'keep'
      )
    `);
  } catch {}
}
// Fire-and-forget; the seed script and CREATE TABLE handle the cold-start case.
void applyMigrations();

export const db = drizzle(client, { schema });
export { schema };
