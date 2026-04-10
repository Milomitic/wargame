import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-me",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5174",
  databaseUrl: process.env.DATABASE_URL || "./data/wargame.sqlite",
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "mistral:7b-instruct-v0.3-q4_K_M",
  aiEnabled: process.env.AI_ENABLED === "true",
};
