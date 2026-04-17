import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Canonical default DB location: packages/server/data/wargame.sqlite.
// Resolved from this file's own URL so it works no matter what the CWD is
// (root `npm run dev`, workspace `-w`, direct `tsx`, or prod `node dist/...`).
// Both src/config.ts and dist/config.js sit one level below packages/server,
// so `../data/wargame.sqlite` points to the same canonical file in either case.
const here = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(here, "../data/wargame.sqlite");

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-me",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3002",
  databaseUrl: process.env.DATABASE_URL || defaultDbPath,
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "mistral:7b-instruct-v0.3-q4_K_M",
  aiEnabled: process.env.AI_ENABLED === "true",
};
