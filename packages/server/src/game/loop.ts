import { TICK_INTERVAL_MS } from "@wargame/shared";
import { processBuildingTick } from "./tick/building.tick.js";
import { processTroopTick } from "./tick/troop.tick.js";
import { processMarchTick } from "./tick/march.tick.js";
import { processCampRespawns } from "../services/camp.service.js";
import type { Server as SocketIOServer } from "socket.io";

let tickCount = 0;
let io: SocketIOServer | null = null;

export function setSocketIO(server: SocketIOServer) {
  io = server;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function getTickCount(): number {
  return tickCount;
}

async function tick() {
  tickCount++;
  const start = Date.now();

  try {
    // M2: Building construction progress
    await processBuildingTick(io);

    // M4: Troop recruitment progress
    await processTroopTick(io);

    // M4: March movement + combat resolution
    await processMarchTick(io);

    // M4: Barbarian camp respawns
    await processCampRespawns();

    // Resources use delta-time calculation on read, no per-tick DB writes needed

    const elapsed = Date.now() - start;
    if (elapsed > 5000) {
      console.warn(`Tick ${tickCount} took ${elapsed}ms (slow)`);
    }
  } catch (err) {
    console.error(`Tick ${tickCount} failed:`, err);
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startGameLoop() {
  if (intervalHandle) return;
  console.log(`Game loop starting (interval: ${TICK_INTERVAL_MS}ms)`);
  intervalHandle = setInterval(tick, TICK_INTERVAL_MS);
}

export function stopGameLoop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("Game loop stopped");
  }
}
