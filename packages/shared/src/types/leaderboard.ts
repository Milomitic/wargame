export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatar: string;
  fiefName: string;
  fiefLevel: number;
  population: number;
  score: number;
  /** Enemy troops killed while attacking */
  attackKills: number;
  /** Enemy troops killed while defending */
  defenseKills: number;
  /** Last login timestamp (ms) — null if never logged */
  lastLoginAt: number | null;
  allianceTag: string | null;
  allianceName: string | null;
  isAdmin: boolean;
}

export interface AllianceLeaderboardEntry {
  rank: number;
  allianceId: string;
  name: string;
  tag: string;
  memberCount: number;
  totalScore: number;
  totalAttackKills: number;
  totalDefenseKills: number;
}

export type LeaderboardSort = "score" | "attackKills" | "defenseKills" | "alliance";

export interface LeaderboardData {
  byScore: LeaderboardEntry[];
  byAttackKills: LeaderboardEntry[];
  byDefenseKills: LeaderboardEntry[];
  byAlliance: AllianceLeaderboardEntry[];
  totalPlayers: number;
  totalAlliances: number;
  me: LeaderboardEntry | null;
  myAlliance: AllianceLeaderboardEntry | null;
}
