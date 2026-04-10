import type { BuildingDefinition } from "@wargame/shared";
import { BUILDING_ART } from "./BuildingArt.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
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

  const stateClass = isConstructing
    ? "building-sprite--constructing"
    : !isBuilt
      ? "building-sprite--empty"
      : "";

  const selectedClass = isSelected ? "building-sprite--selected" : "";

  const pct =
    isConstructing && totalBuildTicks
      ? Math.max(
          100 - ((buildingData!.constructionTicksRemaining / totalBuildTicks) * 100),
          5
        )
      : 0;

  const ArtComponent = BUILDING_ART[definition.type];

  return (
    <div
      className={`building-sprite ${stateClass} ${selectedClass}`}
      style={{ left: `${position.left}%`, top: `${position.top}%` }}
      onClick={onClick}
      title={
        isBuilt
          ? `${definition.name} Lv.${buildingData!.level}${isConstructing ? ` (${buildingData!.constructionTicksRemaining}m left)` : ""}`
          : `Build ${definition.name}`
      }
    >
      {/* Shadow beneath */}
      <div className="building-sprite__shadow" />

      {/* Platform with SVG art */}
      <div className="building-sprite__platform">
        {/* Construction overlay */}
        {isConstructing && (
          <div className="building-sprite__construction-overlay" />
        )}

        {/* SVG Building Art */}
        <div className="building-sprite__art">
          {ArtComponent ? <ArtComponent /> : (
            <span className="building-sprite__icon-fallback">
              {"\u{1F3E0}"}
            </span>
          )}
        </div>

        {/* Name label */}
        <span className="building-sprite__name">{definition.name}</span>

        {/* Level badge */}
        {isBuilt && (
          <span className="building-sprite__level">
            {isConstructing ? "\u{1F528}" : `Lv.${buildingData!.level}`}
          </span>
        )}

        {/* Construction progress bar */}
        {isConstructing && (
          <div className="building-sprite__progress">
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
    </div>
  );
}
