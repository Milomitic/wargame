export interface Player {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: number;
  lastLoginAt: number | null;
  isActive: boolean;
  newbieShieldUntil: number | null;
  tutorialStep: number;
  isAdmin: boolean;
}

export interface PlayerPublic {
  id: string;
  username: string;
  displayName: string;
}

/** Public profile shape returned by GET /api/v1/players/:id/profile */
export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  createdAt: number;
  lastLoginAt: number | null;
  score: number;
  attackKills: number;
  defenseKills: number;
  fiefName: string | null;
  fiefLevel: number;
  fiefTileId: string | null;
  population: number;
  allianceId: string | null;
  allianceTag: string | null;
  allianceName: string | null;
  buildingsTotalLevel: number;
  techsResearched: number;
  isMe: boolean;
  isAdmin: boolean;
}

export const PLAYER_AVATARS = [
  "knight",
  "king",
  "queen",
  "wizard",
  "archer",
  "viking",
  "monk",
  "dragon",
] as const;
export type PlayerAvatarId = (typeof PLAYER_AVATARS)[number];

export const PLAYER_AVATAR_GLYPHS: Record<string, string> = {
  knight: "\u{1F9D1}\u200D\u2696\uFE0F",
  king:   "\u{1F934}",
  queen:  "\u{1F478}",
  wizard: "\u{1F9D9}",
  archer: "\u{1F3F9}",
  viking: "\u26A1",
  monk:   "\u{1F9D8}",
  dragon: "\u{1F409}",
};
