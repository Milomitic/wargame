import type { BuildingDefinition } from "@wargame/shared";
import { BUILDING_ART } from "./BuildingArt.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
  constructionStartedAt?: number | null;
}

interface BuildingSpriteProps {
  definition: BuildingDefinition;
  buildingData: BuildingData | null;
  position: { left: number; top: number };
  isSelected: boolean;
  onClick: () => void;
  totalBuildTicks?: number;
}

export default function BuildingSprite({
  definition,
  buildingData,
  position,
  isSelected,
  onClick,
  totalBuildTicks,
}: BuildingSpriteProps) {
  const isBuilt = !!buildingData;
  const isConstructing = buildingData?.isConstructing ?? false;
  const level = buildingData?.level ?? 0;

  const stateClass = isConstructing
    ? "building-sprite--constructing"
    : !isBuilt
      ? "building-sprite--empty"
      : "building-sprite--built";

  const selectedClass = isSelected ? "building-sprite--selected" : "";

  const pct =
    isConstructing && totalBuildTicks
      ? Math.max(100 - ((buildingData!.constructionTicksRemaining / totalBuildTicks) * 100), 5)
      : 0;

  const ArtComponent = BUILDING_ART[definition.type];

  // Scale art size based on level (bigger buildings at higher levels)
  const levelScale = isBuilt ? 0.85 + (level / definition.maxLevel) * 0.35 : 0.7;

  return (
    <div
      className={`building-sprite ${stateClass} ${selectedClass}`}
      style={{ left: `${position.left}%`, top: `${position.top}%` }}
      onClick={onClick}
      title={
        isBuilt
          ? `${definition.name} Lv.${level}${isConstructing ? ` (${buildingData!.constructionTicksRemaining}m left)` : ""}`
          : `Build ${definition.name}`
      }
    >
      {/* For built/constructing buildings: show the full art */}
      {isBuilt && (
        <>
          {/* Shadow */}
          <div className="building-sprite__shadow" />

          <div className="building-sprite__platform" style={{ transform: `scale(${levelScale})` }}>
            {/* Construction overlay stripes */}
            {isConstructing && <div className="building-sprite__construction-overlay" />}

            {/* SVG Art */}
            <div className="building-sprite__art">
              {ArtComponent ? <ArtComponent /> : <span className="building-sprite__icon-fallback">{"🏠"}</span>}
            </div>

            {/* Level badge */}
            <span className="building-sprite__level">
              {isConstructing ? "🔨" : level}
            </span>
          </div>

          {/* Construction progress bar — sits between art and name label */}
          {isConstructing && (
            <div className="building-sprite__progress-bar">
              <div className="building-sprite__progress-track">
                <div
                  className="building-sprite__progress-fill"
                  style={{ width: `${pct}%` }}
                />
                <div className="building-sprite__progress-stripes" />
              </div>
              <span className="building-sprite__progress-label">
                {Math.round(pct)}%
              </span>
            </div>
          )}

          {/* Name label below */}
          <span className="building-sprite__name">{definition.name}</span>
        </>
      )}

      {/* For empty plots: just a subtle clickable area with label on hover */}
      {!isBuilt && (
        <div className="building-sprite__empty-plot">
          <span className="building-sprite__empty-label">{definition.name}</span>
        </div>
      )}
    </div>
  );
}
