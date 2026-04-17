import type { TroopComposition } from "./combat.js";

export interface ServerToClientEvents {
  "resource:update": (data: {
    fiefId: string;
    resources: Record<string, number>;
  }) => void;
  "building:complete": (data: {
    fiefId: string;
    buildingType: string;
    level: number;
  }) => void;
  "building:progress": (data: {
    fiefId: string;
    buildingType: string;
    ticksRemaining: number;
  }) => void;
  "troop:recruited": (data: {
    fiefId: string;
    troopType: string;
    quantity: number;
    totalQuantity: number;
  }) => void;
  "troop:progress": (data: {
    fiefId: string;
    troopType: string;
    ticksRemaining: number;
    recruitingQuantity: number;
  }) => void;
  "march:started": (data: {
    marchId: string;
    targetTileId: string;
    troops: TroopComposition;
    ticksRemaining: number;
  }) => void;
  "march:progress": (data: {
    marchId: string;
    ticksRemaining: number;
    status: string;
  }) => void;
  "march:arrived": (data: {
    marchId: string;
    targetTileId: string;
  }) => void;
  "combat:result": (data: {
    reportId: string;
    result: "victory" | "defeat";
    loot: Record<string, number> | null;
    attackerLosses: TroopComposition;
    defenderType: "camp" | "player";
  }) => void;
  "combat:raid_incoming": (data: {
    reportId: string;
    attackerName: string;
    result: "victory" | "defeat";
    lootLost: Record<string, number> | null;
    defenderLosses: TroopComposition;
  }) => void;
  "tech:completed": (data: {
    techId: string;
    techName: string;
  }) => void;
  "tech:progress": (data: {
    techId: string;
    ticksRemaining: number;
  }) => void;
  "alliance:invite_received": (data: {
    inviteId: string;
    allianceName: string;
    allianceTag: string;
    inviterName: string;
  }) => void;
  "alliance:member_joined": (data: {
    playerName: string;
  }) => void;
  "alliance:member_left": (data: {
    playerName: string;
  }) => void;
  "notification:generic": (data: {
    title: string;
    body: string;
    type: string;
  }) => void;
  "notification:new": (data: {
    id: string;
    type: string;
    title: string;
    body: string;
    icon: string;
    relatedId: string | null;
    createdAt: number;
  }) => void;
  "message:new": (data: {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    subject: string;
    body: string;
    createdAt: number;
  }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
}
