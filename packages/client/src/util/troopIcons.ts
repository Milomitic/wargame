/** Icons for each troop type — kept in one place so updates flow everywhere. */
export const TROOP_ICONS: Record<string, string> = {
  militia: "🧑‍🌾",
  spearman: "🛡️",
  infantry: "⚔️",
  archer: "🏹",
  scout: "🏃",
  cavalry_light: "🐴",
  cavalry_heavy: "🐎",
  // Legacy fallback for any leftover rows
  cavalry: "🐎",
  catapult: "💥",
};

export function troopIcon(type: string): string {
  return TROOP_ICONS[type] || "⚔️";
}
