import { BUILDING_MAP } from "@wargame/shared";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

interface RightPanelProps {
  fief: { name: string; level: number; population: number; morale: number } | null;
  buildings: BuildingData[];
}

const BUILDING_ICONS: Record<string, string> = {
  lumbermill: "\u{1FAB5}", quarry: "\u26CF\uFE0F", mine: "\u2692\uFE0F",
  farm: "\u{1F33E}", market: "\u{1F4B0}", barracks: "\u2694\uFE0F",
  wall: "\u{1F9F1}", stable: "\u{1F40E}", workshop: "\u{1F527}",
  keep: "\u{1F3F0}", watchtower: "\u{1F441}\uFE0F", granary: "\u{1F3DA}\uFE0F",
  warehouse: "\u{1F4E6}",
};

export default function RightPanel({ fief, buildings }: RightPanelProps) {
  const constructing = buildings.filter((b) => b.isConstructing);

  const moraleColor = fief
    ? fief.morale >= 70
      ? "var(--color-success)"
      : fief.morale >= 40
        ? "var(--accent-orange)"
        : "var(--color-danger)"
    : "var(--text-muted)";

  return (
    <div className="right-panel">
      {/* Kingdom Overview */}
      {fief && (
        <div className="rp-card">
          <div className="rp-card__title">Kingdom Overview</div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="stat-icon"><span>{"\u{1F465}"}</span></div>
              <div>
                <div className="stat-label">Population</div>
                <div className="stat-value text-sm">{fief.population.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="stat-icon">
                <span>{fief.morale >= 70 ? "\u{1F60A}" : fief.morale >= 40 ? "\u{1F610}" : "\u{1F61E}"}</span>
              </div>
              <div className="flex-1">
                <div className="stat-label">Morale</div>
                <div className="stat-value text-sm" style={{ color: moraleColor }}>
                  {fief.morale}%
                </div>
                <div className="progress-track h-1 mt-0.5">
                  <div
                    className="progress-fill"
                    style={{ width: `${fief.morale}%`, backgroundColor: moraleColor }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="stat-icon"><span>{"\u2B50"}</span></div>
              <div>
                <div className="stat-label">Fief Level</div>
                <div className="stat-value text-sm">{fief.level}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Missions */}
      <div className="rp-card">
        <div className="rp-card__title">Active Missions</div>
        {constructing.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No active missions</p>
        ) : (
          constructing.map((b) => {
            const def = BUILDING_MAP[b.buildingType];
            const icon = BUILDING_ICONS[b.buildingType] || "\u{1F3E0}";
            return (
              <div key={b.buildingType} className="mission-item">
                <div className="mission-item__icon">{icon}</div>
                <div className="mission-item__body">
                  <div className="mission-item__name">
                    {def?.name || b.buildingType}
                  </div>
                  <div className="mission-item__timer">
                    {b.constructionTicksRemaining}m remaining
                  </div>
                </div>
                <span className="alert-badge alert-badge--building">Building</span>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions placeholder */}
      <div className="rp-card">
        <div className="rp-card__title">Quick Actions</div>
        <p className="text-xs text-[var(--text-muted)]">Coming soon</p>
      </div>
    </div>
  );
}
