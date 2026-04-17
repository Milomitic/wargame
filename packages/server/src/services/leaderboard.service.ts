import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type {
  LeaderboardEntry,
  LeaderboardData,
  AllianceLeaderboardEntry,
} from "@wargame/shared";

// Score is persisted on the players table and incremented on every completed
// building, troop recruitment and tech research. Kills are persisted similarly
// when combat resolves. The leaderboard reads them directly.

export async function getLeaderboard(
  requestingPlayerId: string,
  topN = 10
): Promise<LeaderboardData> {
  // Pull every active player + their fief in one go.
  const rows = await db
    .select({
      playerId: schema.players.id,
      displayName: schema.players.displayName,
      avatar: schema.players.avatar,
      isAdmin: schema.players.isAdmin,
      lastLoginAt: schema.players.lastLoginAt,
      score: schema.players.score,
      attackKills: schema.players.attackKills,
      defenseKills: schema.players.defenseKills,
      fiefId: schema.fiefs.id,
      fiefName: schema.fiefs.name,
      fiefLevel: schema.fiefs.level,
      population: schema.fiefs.population,
    })
    .from(schema.players)
    .innerJoin(schema.fiefs, eq(schema.fiefs.playerId, schema.players.id))
    .where(eq(schema.players.isActive, true));

  // Alliance tags + names per player
  const allianceLinks = await db
    .select({
      playerId: schema.allianceMembers.playerId,
      allianceId: schema.allianceMembers.allianceId,
      tag: schema.alliances.tag,
      name: schema.alliances.name,
    })
    .from(schema.allianceMembers)
    .leftJoin(
      schema.alliances,
      eq(schema.allianceMembers.allianceId, schema.alliances.id)
    );
  const allianceMap = new Map<
    string,
    { allianceId: string; tag: string; name: string }
  >();
  for (const a of allianceLinks) {
    if (a.tag && a.name) {
      allianceMap.set(a.playerId, {
        allianceId: a.allianceId,
        tag: a.tag,
        name: a.name,
      });
    }
  }

  const entries: LeaderboardEntry[] = rows.map((r) => {
    const ally = allianceMap.get(r.playerId);
    return {
      rank: 0,
      playerId: r.playerId,
      displayName: r.displayName,
      avatar: r.avatar ?? "knight",
      fiefName: r.fiefName,
      fiefLevel: r.fiefLevel,
      population: r.population,
      score: r.score ?? 0,
      attackKills: r.attackKills ?? 0,
      defenseKills: r.defenseKills ?? 0,
      lastLoginAt: r.lastLoginAt ?? null,
      allianceTag: ally?.tag ?? null,
      allianceName: ally?.name ?? null,
      isAdmin: r.isAdmin ?? false,
    };
  });

  const rankedClone = (key: keyof LeaderboardEntry): LeaderboardEntry[] => {
    const cloned = entries.map((e) => ({ ...e }));
    cloned.sort(
      (a, b) =>
        (b[key] as number) - (a[key] as number) ||
        a.displayName.localeCompare(b.displayName)
    );
    cloned.forEach((e, i) => (e.rank = i + 1));
    return cloned;
  };

  const byScore = rankedClone("score");
  const byAttackKills = rankedClone("attackKills");
  const byDefenseKills = rankedClone("defenseKills");

  // Alliance leaderboard
  const allianceAgg = new Map<
    string,
    {
      name: string;
      tag: string;
      memberCount: number;
      totalScore: number;
      totalAttackKills: number;
      totalDefenseKills: number;
    }
  >();
  for (const e of entries) {
    const ally = allianceMap.get(e.playerId);
    if (!ally) continue;
    const cur = allianceAgg.get(ally.allianceId) ?? {
      name: ally.name,
      tag: ally.tag,
      memberCount: 0,
      totalScore: 0,
      totalAttackKills: 0,
      totalDefenseKills: 0,
    };
    cur.memberCount += 1;
    cur.totalScore += e.score;
    cur.totalAttackKills += e.attackKills;
    cur.totalDefenseKills += e.defenseKills;
    allianceAgg.set(ally.allianceId, cur);
  }

  const allianceEntries: AllianceLeaderboardEntry[] = Array.from(
    allianceAgg.entries()
  )
    .map(([allianceId, v]) => ({
      rank: 0,
      allianceId,
      name: v.name,
      tag: v.tag,
      memberCount: v.memberCount,
      totalScore: v.totalScore,
      totalAttackKills: v.totalAttackKills,
      totalDefenseKills: v.totalDefenseKills,
    }))
    .sort(
      (a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name)
    );
  allianceEntries.forEach((e, i) => (e.rank = i + 1));

  const me = byScore.find((e) => e.playerId === requestingPlayerId) ?? null;
  const myAlly = allianceMap.get(requestingPlayerId);
  const myAlliance = myAlly
    ? allianceEntries.find((a) => a.allianceId === myAlly.allianceId) ?? null
    : null;

  return {
    byScore: byScore.slice(0, topN),
    byAttackKills: byAttackKills.slice(0, topN),
    byDefenseKills: byDefenseKills.slice(0, topN),
    byAlliance: allianceEntries.slice(0, topN),
    totalPlayers: entries.length,
    totalAlliances: allianceEntries.length,
    me,
    myAlliance,
  };
}
