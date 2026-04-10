export type AllianceRole = "leader" | "officer" | "member";

export interface Alliance {
  id: string;
  name: string;
  tag: string;
  description: string;
  leaderId: string;
  memberCount: number;
  createdAt: number;
}

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
