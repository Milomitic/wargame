import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth.routes.js";
import { fiefRoutes } from "./routes/fief.routes.js";
import { mapRoutes } from "./routes/map.routes.js";
import { troopRoutes } from "./routes/troop.routes.js";
import { marchRoutes } from "./routes/march.routes.js";
import { allianceRoutes } from "./routes/alliance.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "development" ? "info" : "warn",
    },
  });

  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.sessionSecret,
  });

  await app.register(authRoutes);
  await app.register(fiefRoutes);
  await app.register(mapRoutes);
  await app.register(troopRoutes);
  await app.register(marchRoutes);
  await app.register(allianceRoutes);

  app.get("/api/health", async () => ({ status: "ok", timestamp: Date.now() }));

  return app;
}
