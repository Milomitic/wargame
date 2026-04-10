import { createClient } from "@libsql/client";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import "dotenv/config";

const dbPath = resolve(process.env.DATABASE_URL || "./data/wargame.sqlite");
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
      tutorial_step INTEGER NOT NULL DEFAULT 0
    )
  `);

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

  console.log("Database seeded successfully at", dbPath);
  client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
