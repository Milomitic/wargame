import type { FastifyInstance } from "fastify";
import { sql, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { requireAdmin } from "../auth/admin.middleware.js";
import { processMarchTick } from "../game/tick/march.tick.js";
import { getSocketIO } from "../game/loop.js";

export async function adminRoutes(app: FastifyInstance) {

  // ── Force a march to arrive immediately ─────────────────────
  app.post(
    "/api/v1/admin/marches/:id/arrive-now",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const rows = await db
        .select()
        .from(schema.marches)
        .where(eq(schema.marches.id, id))
        .limit(1);
      const march = rows[0];
      if (!march) return reply.status(404).send({ error: "March not found" });
      if (march.status !== "marching") {
        return reply.status(400).send({ error: "March is not in 'marching' state" });
      }

      // Force arrival time to now and zero remaining ticks
      await db
        .update(schema.marches)
        .set({
          arrivesAt: Date.now() - 1000,
          ticksRemaining: 0,
        })
        .where(eq(schema.marches.id, id));

      // Process the tick immediately so the user sees the result
      const io = getSocketIO();
      await processMarchTick(io);

      return { ok: true };
    }
  );

  // ── Remove a player's newbie shield ─────────────────────────
  app.delete(
    "/api/v1/admin/players/:username/shield",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { username } = request.params as { username: string };
      const result = await db
        .update(schema.players)
        .set({ newbieShieldUntil: null })
        .where(eq(schema.players.username, username));
      // Drizzle returns metadata; we re-check existence
      const verifyRows = await db
        .select({ id: schema.players.id })
        .from(schema.players)
        .where(eq(schema.players.username, username))
        .limit(1);
      if (!verifyRows[0]) return reply.status(404).send({ error: "Player not found" });
      return { ok: true };
    }
  );

  // ── All players ──────────────────────────────────────────────
  app.get("/api/v1/admin/players", { preHandler: requireAdmin }, async () => {
    const players = await db
      .select({
        id: schema.players.id,
        username: schema.players.username,
        displayName: schema.players.displayName,
        email: schema.players.email,
        score: schema.players.score,
        attackKills: schema.players.attackKills,
        defenseKills: schema.players.defenseKills,
        avatar: schema.players.avatar,
        createdAt: schema.players.createdAt,
        lastLoginAt: schema.players.lastLoginAt,
        isActive: schema.players.isActive,
        newbieShieldUntil: schema.players.newbieShieldUntil,
      })
      .from(schema.players)
      .orderBy(sql`${schema.players.score} DESC`);

    return { count: players.length, players };
  });

  // ── All fiefs (villages) with owner info ─────────────────────
  app.get("/api/v1/admin/fiefs", { preHandler: requireAdmin }, async () => {
    const fiefs = await db
      .select({
        id: schema.fiefs.id,
        name: schema.fiefs.name,
        tileId: schema.fiefs.tileId,
        level: schema.fiefs.level,
        population: schema.fiefs.population,
        morale: schema.fiefs.morale,
        createdAt: schema.fiefs.createdAt,
        playerId: schema.fiefs.playerId,
      })
      .from(schema.fiefs)
      .orderBy(sql`${schema.fiefs.level} DESC`);

    const enriched = await Promise.all(
      fiefs.map(async (fief) => {
        const owner = fief.playerId
          ? (await db.select({ username: schema.players.username, displayName: schema.players.displayName })
              .from(schema.players).where(sql`${schema.players.id} = ${fief.playerId}`).limit(1))[0] ?? null
          : null;

        const resources = await db.select({
          resourceType: schema.resources.resourceType, amount: schema.resources.amount,
          capacity: schema.resources.capacity, productionRate: schema.resources.productionRate,
        }).from(schema.resources).where(sql`${schema.resources.fiefId} = ${fief.id}`);

        const buildings = await db.select({
          buildingType: schema.buildings.buildingType, level: schema.buildings.level, isConstructing: schema.buildings.isConstructing,
        }).from(schema.buildings).where(sql`${schema.buildings.fiefId} = ${fief.id}`);

        const troops = await db.select({
          troopType: schema.troops.troopType, quantity: schema.troops.quantity,
        }).from(schema.troops).where(sql`${schema.troops.fiefId} = ${fief.id}`);

        return {
          ...fief, owner,
          resources: Object.fromEntries(resources.map((r) => [r.resourceType, { amount: Math.floor(r.amount), capacity: r.capacity, rate: r.productionRate }])),
          buildings: buildings.map((b) => ({ type: b.buildingType, level: b.level, constructing: b.isConstructing })),
          troops: troops.filter((t) => t.quantity > 0).map((t) => ({ type: t.troopType, qty: t.quantity })),
        };
      })
    );

    return { count: enriched.length, fiefs: enriched };
  });

  // ── Comprehensive game statistics ────────────────────────────
  app.get("/api/v1/admin/stats", { preHandler: requireAdmin }, async () => {
    // Basic counts
    const q = async (table: any, where?: any) => {
      const [r] = where
        ? await db.select({ c: sql<number>`COUNT(*)` }).from(table).where(where)
        : await db.select({ c: sql<number>`COUNT(*)` }).from(table);
      return r.c;
    };

    const playerCount = await q(schema.players);
    const fiefCount = await q(schema.fiefs);
    const buildingCount = await q(schema.buildings);
    const allianceCount = await q(schema.alliances);

    // Troops
    const [troopAgg] = await db.select({
      total: sql<number>`COALESCE(SUM(${schema.troops.quantity}), 0)`,
      recruiting: sql<number>`COALESCE(SUM(CASE WHEN ${schema.troops.isRecruiting} = 1 THEN ${schema.troops.recruitingQuantity} ELSE 0 END), 0)`,
    }).from(schema.troops);

    // Troops by type
    const troopsByType = await db.select({
      troopType: schema.troops.troopType,
      total: sql<number>`COALESCE(SUM(${schema.troops.quantity}), 0)`,
    }).from(schema.troops).groupBy(schema.troops.troopType);

    // Resources global
    const resourceAgg = await db.select({
      resourceType: schema.resources.resourceType,
      totalAmount: sql<number>`COALESCE(SUM(${schema.resources.amount}), 0)`,
      totalCapacity: sql<number>`COALESCE(SUM(${schema.resources.capacity}), 0)`,
      totalRate: sql<number>`COALESCE(SUM(${schema.resources.productionRate}), 0)`,
    }).from(schema.resources).groupBy(schema.resources.resourceType);

    // Buildings by type
    const buildingsByType = await db.select({
      buildingType: schema.buildings.buildingType,
      count: sql<number>`COUNT(*)`,
      avgLevel: sql<number>`ROUND(AVG(${schema.buildings.level}), 1)`,
      maxLevel: sql<number>`MAX(${schema.buildings.level})`,
      constructing: sql<number>`SUM(CASE WHEN ${schema.buildings.isConstructing} = 1 THEN 1 ELSE 0 END)`,
    }).from(schema.buildings).groupBy(schema.buildings.buildingType);

    // Battle stats
    const battleCount = await q(schema.battleReports);
    const [battleAgg] = await db.select({
      victories: sql<number>`COALESCE(SUM(CASE WHEN ${schema.battleReports.result} = 'victory' THEN 1 ELSE 0 END), 0)`,
      defeats: sql<number>`COALESCE(SUM(CASE WHEN ${schema.battleReports.result} = 'defeat' THEN 1 ELSE 0 END), 0)`,
      pveBattles: sql<number>`COALESCE(SUM(CASE WHEN ${schema.battleReports.defenderType} = 'camp' THEN 1 ELSE 0 END), 0)`,
      pvpBattles: sql<number>`COALESCE(SUM(CASE WHEN ${schema.battleReports.defenderType} = 'player' THEN 1 ELSE 0 END), 0)`,
    }).from(schema.battleReports);

    // Troop losses from battle reports
    const allReports = await db.select({
      attackerLossesJson: schema.battleReports.attackerLossesJson,
      defenderLossesJson: schema.battleReports.defenderLossesJson,
      lootJson: schema.battleReports.lootJson,
      defenderType: schema.battleReports.defenderType,
    }).from(schema.battleReports);

    let totalAttackerLosses = 0;
    let totalDefenderLosses = 0;
    const totalLoot: Record<string, number> = {};
    const lossesPerTroopType: Record<string, { attack: number; defense: number }> = {};

    for (const r of allReports) {
      try {
        const aLosses = JSON.parse(r.attackerLossesJson || "{}");
        const dLosses = JSON.parse(r.defenderLossesJson || "{}");
        for (const [type, qty] of Object.entries(aLosses)) {
          totalAttackerLosses += qty as number;
          if (!lossesPerTroopType[type]) lossesPerTroopType[type] = { attack: 0, defense: 0 };
          lossesPerTroopType[type].attack += qty as number;
        }
        for (const [type, qty] of Object.entries(dLosses)) {
          totalDefenderLosses += qty as number;
          if (!lossesPerTroopType[type]) lossesPerTroopType[type] = { attack: 0, defense: 0 };
          lossesPerTroopType[type].defense += qty as number;
        }
        if (r.lootJson) {
          const loot = JSON.parse(r.lootJson);
          for (const [res, amt] of Object.entries(loot)) {
            totalLoot[res] = (totalLoot[res] || 0) + (amt as number);
          }
        }
      } catch { /* skip malformed */ }
    }

    // Marches
    const marchTotal = await q(schema.marches);
    const marchActive = await q(schema.marches, sql`${schema.marches.status} IN ('marching', 'returning')`);
    const marchCompleted = await q(schema.marches, sql`${schema.marches.status} = 'completed'`);

    // Camps
    const campTotal = await q(schema.barbarianCamps);
    const campDefeated = await q(schema.barbarianCamps, sql`${schema.barbarianCamps.isDefeated} = 1`);

    // Tech
    const techCompleted = await q(schema.playerTechnologies, sql`${schema.playerTechnologies.status} = 'completed'`);
    const techResearching = await q(schema.playerTechnologies, sql`${schema.playerTechnologies.status} = 'researching'`);

    // Player kills aggregates
    const [killAgg] = await db.select({
      totalAttackKills: sql<number>`COALESCE(SUM(${schema.players.attackKills}), 0)`,
      totalDefenseKills: sql<number>`COALESCE(SUM(${schema.players.defenseKills}), 0)`,
      totalScore: sql<number>`COALESCE(SUM(${schema.players.score}), 0)`,
      avgScore: sql<number>`ROUND(AVG(${schema.players.score}), 0)`,
      maxScore: sql<number>`MAX(${schema.players.score})`,
    }).from(schema.players);

    // Top 10 players
    const topPlayers = await db.select({
      username: schema.players.username,
      displayName: schema.players.displayName,
      score: schema.players.score,
      attackKills: schema.players.attackKills,
      defenseKills: schema.players.defenseKills,
    }).from(schema.players).orderBy(sql`${schema.players.score} DESC`).limit(10);

    // Recent battles (last 10)
    const recentBattles = await db.select({
      id: schema.battleReports.id,
      attackerId: schema.battleReports.attackerId,
      defenderType: schema.battleReports.defenderType,
      result: schema.battleReports.result,
      tileId: schema.battleReports.tileId,
      createdAt: schema.battleReports.createdAt,
    }).from(schema.battleReports).orderBy(sql`${schema.battleReports.createdAt} DESC`).limit(10);

    return {
      overview: {
        players: playerCount,
        fiefs: fiefCount,
        buildings: buildingCount,
        alliances: allianceCount,
      },
      troops: {
        totalAlive: troopAgg.total,
        currentlyRecruiting: troopAgg.recruiting,
        byType: Object.fromEntries(troopsByType.map((t) => [t.troopType, t.total])),
      },
      resources: {
        global: Object.fromEntries(resourceAgg.map((r) => [r.resourceType, {
          totalStored: Math.floor(r.totalAmount),
          totalCapacity: Math.floor(r.totalCapacity),
          totalProductionPerMin: Math.round(r.totalRate * 100) / 100,
        }])),
        totalLooted: totalLoot,
      },
      buildings: {
        total: buildingCount,
        byType: Object.fromEntries(buildingsByType.map((b) => [b.buildingType, {
          count: b.count,
          avgLevel: b.avgLevel,
          maxLevel: b.maxLevel,
          constructing: b.constructing,
        }])),
      },
      combat: {
        totalBattles: battleCount,
        victories: battleAgg.victories,
        defeats: battleAgg.defeats,
        winRate: battleCount > 0 ? Math.round((battleAgg.victories / battleCount) * 100) : 0,
        pveBattles: battleAgg.pveBattles,
        pvpBattles: battleAgg.pvpBattles,
        troopLosses: {
          totalAttackerLosses,
          totalDefenderLosses,
          totalLosses: totalAttackerLosses + totalDefenderLosses,
          byTroopType: lossesPerTroopType,
        },
        recentBattles,
      },
      marches: {
        total: marchTotal,
        active: marchActive,
        completed: marchCompleted,
      },
      barbarianCamps: {
        total: campTotal,
        defeated: campDefeated,
        alive: campTotal - campDefeated,
      },
      technology: {
        completed: techCompleted,
        researching: techResearching,
      },
      playerStats: {
        totalScore: killAgg.totalScore,
        avgScore: killAgg.avgScore,
        maxScore: killAgg.maxScore,
        totalAttackKills: killAgg.totalAttackKills,
        totalDefenseKills: killAgg.totalDefenseKills,
      },
      topPlayers,
    };
  });
}
