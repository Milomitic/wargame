/** Format a player's display name with an admin crown prefix when applicable. */
export function formatPlayerName(name: string, isAdmin?: boolean | null): string {
  if (isAdmin) return `👑 ${name}`;
  return name;
}

/** The admin tag prefix as a constant — useful for places that build label strings. */
export const ADMIN_TAG = "👑";
