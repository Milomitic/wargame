export type AllianceRole = "leader" | "officer" | "member";

export interface Alliance {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  memberCount: number;
  createdAt: number;
  avatar: string;
  manifesto: string;
}

/** Public alliance profile returned by GET /api/v1/alliances/:id/profile */
export interface AllianceProfile {
  id: string;
  name: string;
  tag: string;
  description: string;
  manifesto: string;
  avatar: string;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  totalScore: number;
  totalAttackKills: number;
  totalDefenseKills: number;
  createdAt: number;
  members: AllianceMember[];
  isMyAlliance: boolean;
  myRole: AllianceRole | null;
}

export const ALLIANCE_AVATARS = [
  "banner_red",
  "banner_blue",
  "banner_green",
  "banner_gold",
  "banner_purple",
  "banner_black",
  "lion",
  "eagle",
  "wolf",
  "dragon",
] as const;
export type AllianceAvatarId = (typeof ALLIANCE_AVATARS)[number];

export const ALLIANCE_AVATAR_GLYPHS: Record<string, string> = {
  banner_red:    "\u{1F3F4}",
  banner_blue:   "\u{1F3F3}\uFE0F",
  banner_green:  "\u{1F3DE}\uFE0F",
  banner_gold:   "\u{1F451}",
  banner_purple: "\u{1F52E}",
  banner_black:  "\u{1F3F4}\u200D\u2620\uFE0F",
  lion:          "\u{1F981}",
  eagle:         "\u{1F985}",
  wolf:          "\u{1F43A}",
  dragon:        "\u{1F409}",
};

export interface AllianceMember {
  playerId: string;
  displayName: string;
  role: AllianceRole;
  fiefLevel: number;
  joinedAt: number;
}

export interface AllianceInvite {
  id: string;
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  inviterName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}
