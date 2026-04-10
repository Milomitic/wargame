import { eq, and, gt } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import type { Server as SocketIOServer } from "socket.io";

export async function processTroopTick(io: SocketIOServer | null) {
  const recruiting = await db
    .select()
    .from(schema.troops)
    .where(
      and(
        eq(schema.troops.isRecruiting, true),
        gt(schema.troops.recruitingTicksRemaining, 0)
      )
    );

  for (const troop of recruiting) {
    const remaining = troop.recruitingTicksRemaining! - 1;

    if (remaining <= 0) {
      // Recruitment complete — add recruited quantity to total
      const newQuantity = troop.quantity + troop.recruitingQuantity;
      await db
        .update(schema.troops)
        .set({
          quantity: newQuantity,
          isRecruiting: false,
          recruitingQuantity: 0,
          recruitingTicksRemaining: 0,
        })
        .where(eq(schema.troops.id, troop.id));

      if (io) {
        const fiefRows = await db
          .select({ playerId: schema.fiefs.playerId })
          .from(schema.fiefs)
          .where(eq(schema.fiefs.id, troop.fiefId));

        const playerId = fiefRows[0]?.playerId;
        if (playerId) {
          io.to(`player:${playerId}`).emit("troop:recruited", {
            fiefId: troop.fiefId,
            troopType: troop.troopType,
            quantity: troop.recruitingQuantity,
            totalQuantity: newQuantity,
          });
        }
      }
    } else {
      // Decrement timer
      await db
        .update(schema.troops)
        .set({ recruitingTicksRemaining: remaining })
        .where(eq(schema.troops.id, troop.id));

      if (io) {
        const fiefRows = await db
          .select({ playerId: schema.fiefs.playerId })
          .from(schema.fiefs)
          .where(eq(schema.fiefs.id, troop.fiefId));

        const playerId = fiefRows[0]?.playerId;
        if (playerId) {
          io.to(`player:${playerId}`).emit("troop:progress", {
            fiefId: troop.fiefId,
            troopType: troop.troopType,
            ticksRemaining: remaining,
            recruitingQuantity: troop.recruitingQuantity,
          });
        }
      }
    }
  }
}
