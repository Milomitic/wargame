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
}

export interface PlayerPublic {
  id: string;
  username: string;
  displayName: string;
}
