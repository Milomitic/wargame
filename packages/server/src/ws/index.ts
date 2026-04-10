import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { validateSession } from "../auth/session.js";
import { config } from "../config.js";

export function setupSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    // Extract session cookie from handshake
    const cookieHeader = socket.handshake.headers.cookie || "";
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    const sessionId = sessionMatch?.[1];

    if (!sessionId) {
      return next(new Error("Not authenticated"));
    }

    const playerId = await validateSession(sessionId);
    if (!playerId) {
      return next(new Error("Invalid session"));
    }

    socket.data.playerId = playerId;
    next();
  });

  io.on("connection", (socket) => {
    const playerId = socket.data.playerId;
    console.log(`Player connected: ${playerId}`);

    // Join personal room
    socket.join(`player:${playerId}`);

    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${playerId}`);
    });
  });

  return io;
}
