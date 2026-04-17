import { eq, and } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { createNotification } from "../../services/notification.service.js";
import type { Server as SocketIOServer } from "socket.io";
import { troopRecruitmentScore, TROOP_MAP, recruitSpeedMultiplier } from "@wargame/shared";
import { awardScore, playerIdForFief } from "../../services/score.service.js";

export async function processTroopTick(io: SocketIOServer | null) {
  const recruiting = await db
    .select()
    .from(schema.troops)
    .where(eq(schema.troops.isRecruiting, true));

  const now = Date.now();

  for (const troop of recruiting) {
    try {
    // Pure wall-clock: compute total recruit duration and compare to real time.
    const def = TROOP_MAP[troop.troopType];
    let speedMult = 1;
    if (def?.requiresBuilding) {
      const bRows = await db
        .select({ level: schema.buildings.level })
        .from(schema.buildings)
        .where(
          and(
            eq(schema.buildings.fiefId, troop.fiefId),
            eq(schema.buildings.buildingType, def.requiresBuilding)
          )
        )
        .limit(1);
      if (bRows[0]) speedMult = recruitSpeedMultiplier(bRows[0].level);
    }
    const totalTicks = Math.max(
      1,
      Math.ceil((def?.baseRecruitTicks ?? 1) * troop.recruitingQuantity * speedMult)
    );
    const totalDurationMs = totalTicks * 60_000;
    const elapsed = troop.recruitingStartedAt
      ? now - troop.recruitingStartedAt
      : Infinity;

    if (elapsed >= totalDurationMs) {
      // Recruitment complete — add recruited quantity to total
      const newQuantity = troop.quantity + troop.recruitingQuantity;
      const recruitedCount = troop.recruitingQuantity;
      await db
        .update(schema.troops)
        .set({
          quantity: newQuantity,
          isRecruiting: false,
          recruitingQuantity: 0,
          recruitingTicksRemaining: 0,
          recruitingStartedAt: null,
        })
        .where(eq(schema.troops.id, troop.id));

      const playerId = await playerIdForFief(troop.fiefId);
      if (playerId) {
        await awardScore(playerId, troopRecruitmentScore(troop.troopType, recruitedCount));
      }

      if (playerId) {
        await createNotification({
          playerId,
          type: "troop_recruited",
          title: "Recruitment Complete",
          body: `${recruitedCount}x ${troop.troopType} recruited (${newQuantity} total).`,
          icon: "\u2694\uFE0F",
        });
      }

      if (io && playerId) {
        io.to(`player:${playerId}`).emit("troop:recruited", {
          fiefId: troop.fiefId,
          troopType: troop.troopType,
          quantity: recruitedCount,
          totalQuantity: newQuantity,
        });
      }
    }
    // No else/decrement — client shows progress from recruitingStartedAt.
    } catch (err) {
      console.error(`Troop tick error for ${troop.id}:`, err);
    }
  }
}
