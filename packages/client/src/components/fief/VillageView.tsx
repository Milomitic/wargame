import { BUILDINGS, BUILDING_MAP } from "@wargame/shared";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

interface VillageViewProps {
  buildings: BuildingData[];
  onBuildingClick: (buildingType: string) => void;
  onEmptySlotClick: () => void;
}

const BUILDING_ICONS: Record<string, string> = {
  keep: "\u{1F3F0}", lumbermill: "\u{1FAB5}", quarry: "\u26CF\uFE0F",
  mine: "\u2692\uFE0F", iron_mine: "\u2692\uFE0F", farm: "\u{1F33E}",
  market: "\u{1F4B0}", barracks: "\u2694\uFE0F", wall: "\u{1F9F1}",
  stable: "\u{1F40E}", workshop: "\u{1F527}", watchtower: "\u{1F441}\uFE0F",
  granary: "\u{1F3DA}\uFE0F", warehouse: "\u{1F4E6}",
};

export default function VillageView({ buildings, onBuildingClick, onEmptySlotClick }: VillageViewProps) {
  const builtMap = new Map(buildings.map((b) => [b.buildingType, b]));

  return (
    <div className="village-grid">
      {BUILDINGS.map((def) => {
        const built = builtMap.get(def.type);
        const icon = BUILDING_ICONS[def.type] || "\u{1F3E0}";

        if (built) {
          const isConstructing = built.isConstructing;
          const totalTicks = BUILDING_MAP[def.type]
            ? Math.ceil(def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, built.level - 1))
            : built.constructionTicksRemaining;
          const pct = isConstructing
            ? Math.max(100 - (built.constructionTicksRemaining / Math.max(totalTicks, 1)) * 100, 5)
            : 100;

          return (
            <div
              key={def.type}
              className={`village-slot ${isConstructing ? "village-slot--constructing" : "village-slot--built"}`}
              onClick={() => onBuildingClick(def.type)}
              title={`${def.name} Lv.${built.level}${isConstructing ? ` (${built.constructionTicksRemaining}m left)` : ""}`}
            >
              <span className="village-slot__icon">{icon}</span>
              <span className="village-slot__name">{def.name}</span>
              <span className="village-slot__level">Lv.{built.level}</span>
              {isConstructing && (
                <div className="village-slot__progress">
                  <div
                    className="progress-fill construction-stripes"
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      backgroundColor: "var(--color-construction)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        }

        // Empty slot (not built)
        return (
          <div
            key={def.type}
            className="village-slot village-slot--empty"
            onClick={onEmptySlotClick}
            title={`Build ${def.name}`}
          >
            <span className="village-slot__icon" style={{ opacity: 0.3, filter: "grayscale(0.5)" }}>
              {icon}
            </span>
            <span className="village-slot__name" style={{ opacity: 0.5 }}>
              {def.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
