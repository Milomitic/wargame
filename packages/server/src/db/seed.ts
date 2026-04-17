import { createClient } from "@libsql/client";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

// Resolve the DB path from this file's location, not the CWD, so the seed
// script always writes to packages/server/data/wargame.sqlite regardless of
// where it is invoked from.
const here = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(here, "../../data/wargame.sqlite");
const dbPath = process.env.DATABASE_URL
  ? resolve(process.env.DATABASE_URL)
  : defaultDbPath;
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const client = createClient({ url: `file:${dbPath}` });

async function seed() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      newbie_shield_until INTEGER,
      tutorial_step INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      attack_kills INTEGER NOT NULL DEFAULT 0,
      defense_kills INTEGER NOT NULL DEFAULT 0,
      avatar TEXT NOT NULL DEFAULT 'knight',
      bio TEXT NOT NULL DEFAULT ''
    )
  `);

  // Idempotent migration for existing DBs
  for (const col of [
    "ALTER TABLE players ADD COLUMN avatar TEXT NOT NULL DEFAULT 'knight'",
    "ALTER TABLE players ADD COLUMN bio TEXT NOT NULL DEFAULT ''",
  ]) {
    try {
      await client.execute(col);
    } catch {
      // column already exists — ignore
    }
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS fiefs (
      id TEXT PRIMARY KEY,
      player_id TEXT,
      name TEXT NOT NULL,
      tile_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      population INTEGER NOT NULL DEFAULT 100,
      morale INTEGER NOT NULL DEFAULT 70,
      created_at INTEGER NOT NULL,
      last_raided_at INTEGER,
      raid_count_24h INTEGER NOT NULL DEFAULT 0
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      fief_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      capacity REAL NOT NULL DEFAULT 1000,
      production_rate REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      UNIQUE(fief_id, resource_type)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      fief_id TEXT NOT NULL,
      building_type TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      is_constructing INTEGER NOT NULL DEFAULT 0,
      construction_started_at INTEGER,
      construction_ticks_remaining INTEGER DEFAULT 0,
      UNIQUE(fief_id, building_type)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS troops (
      id TEXT PRIMARY KEY,
      fief_id TEXT NOT NULL,
      troop_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      is_recruiting INTEGER NOT NULL DEFAULT 0,
      recruiting_quantity INTEGER NOT NULL DEFAULT 0,
      recruiting_ticks_remaining INTEGER DEFAULT 0,
      recruiting_started_at INTEGER,
      UNIQUE(fief_id, troop_type)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS barbarian_camps (
      id TEXT PRIMARY KEY,
      tile_id TEXT NOT NULL UNIQUE,
      difficulty INTEGER NOT NULL DEFAULT 1,
      troops_json TEXT NOT NULL,
      loot_json TEXT NOT NULL,
      is_defeated INTEGER NOT NULL DEFAULT 0,
      respawn_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS marches (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      fief_id TEXT NOT NULL,
      origin_tile_id TEXT NOT NULL,
      target_tile_id TEXT NOT NULL,
      troops_json TEXT NOT NULL,
      march_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'marching',
      departed_at INTEGER NOT NULL,
      arrives_at INTEGER NOT NULL,
      ticks_remaining INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS battle_reports (
      id TEXT PRIMARY KEY,
      attacker_id TEXT NOT NULL,
      defender_type TEXT NOT NULL,
      defender_id TEXT,
      tile_id TEXT NOT NULL,
      attacker_troops_json TEXT NOT NULL,
      defender_troops_json TEXT NOT NULL,
      attacker_losses_json TEXT NOT NULL,
      defender_losses_json TEXT NOT NULL,
      loot_json TEXT,
      result TEXT NOT NULL,
      terrain_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS alliances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      leader_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS alliance_members (
      id TEXT PRIMARY KEY,
      alliance_id TEXT NOT NULL,
      player_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS alliance_invites (
      id TEXT PRIMARY KEY,
      alliance_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS player_technologies (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      tech_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'researching',
      research_ticks_remaining INTEGER NOT NULL DEFAULT 0,
      research_started_at INTEGER,
      researched_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      related_id TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Idempotent migrations: add new columns to pre-existing tables.
  // Must run AFTER all CREATE TABLE statements.
  const alters = [
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
  for (const sql of alters) {
    try { await client.execute(sql); }
    catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("duplicate column") || msg.includes("no such table")) continue;
      throw e;
    }
  }

  // Grant admin role to Milomitic (idempotent — no-op if user doesn't exist)
  try {
    await client.execute(`UPDATE players SET is_admin = 1 WHERE username = 'Milomitic'`);
  } catch {}

  // Migrate generic 'cavalry' troops to 'cavalry_light' (the new split unit)
  try {
    await client.execute(`UPDATE troops SET troop_type = 'cavalry_light' WHERE troop_type = 'cavalry'`);
  } catch {}

  console.log("Database seeded successfully at", dbPath);
  client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
