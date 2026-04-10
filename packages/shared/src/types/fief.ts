export interface Fief {
  id: string;
  playerId: string | null;
  name: string;
  tileId: string;
  level: number;
  population: number;
  morale: number;
  createdAt: number;
}
