import { buildApp } from "./app.js";
import { config } from "./config.js";
import { setupSocketIO } from "./ws/index.js";
import { setSocketIO, startGameLoop, stopGameLoop } from "./game/loop.js";
import { seedBarbarianCamps } from "./services/camp.service.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });

    // Seed barbarian camps if none exist
    await seedBarbarianCamps();

    // Get the underlying HTTP server from Fastify
    const httpServer = app.server;

    // Set up Socket.io
    const io = setupSocketIO(httpServer);
    setSocketIO(io);

    // Start the game loop
    startGameLoop();

    console.log(`Server running on http://localhost:${config.port}`);
    console.log("Socket.io ready, game loop started");

    // Graceful shutdown
    const shutdown = () => {
      console.log("Shutting down...");
      stopGameLoop();
      io.close();
      app.close();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
