import { useMemo } from "react";
import { BUILDINGS } from "@wargame/shared";
import BuildingSprite from "./BuildingSprite.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
  constructionStartedAt?: number | null;
}

interface VillageSceneProps {
  buildings: BuildingData[];
  selectedBuilding: string | null;
  onBuildingSelect: (buildingType: string) => void;
  onEmptySlotSelect: (buildingType: string) => void;
}

/**
 * Positions mapped to the stone-ring circle plots visible in village-bg.png
 * (1536×1024, 3:2). Coordinates measured from the screenshot overlay —
 * each building is centered on its designated circle.
 *
 * The canvas wrapper has aspect-ratio 3:2 matching the image, so these
 * percentages are stable regardless of the enclosing scene's aspect.
 */
const BUILDING_POSITIONS: Record<string, { left: number; top: number }> = {
  // ── Top row (fortification) ──
  wall:       { left: 43, top: 11 },   // top-center circle (above the river bridge)
  watchtower: { left: 64, top: 12 },   // top-right circle

  // ── Upper ring (resource producers) ──
  lumbermill: { left: 14, top: 26 },   // left circle near waterfall
  quarry:     { left: 88, top: 23 },   // far-right circle (rocky area)

  // ── Center: Keep on the large central circle ──
  keep:       { left: 51, top: 33 },   // the big central plot

  // ── Middle ring ──
  farm:       { left: 12, top: 48 },   // left-center circle (green fields)
  barracks:   { left: 57, top: 46 },   // right-of-center large circle
  mine:       { left: 87, top: 44 },   // far-right middle circle
  stable:     { left: 72, top: 56 },   // right circle

  // ── Bottom ring ──
  market:     { left: 30, top: 60 },   // center-left lower circle
  granary:    { left: 13, top: 70 },   // bottom-left circle
  workshop:   { left: 56, top: 68 },   // center-right lower circle
  warehouse:  { left: 38, top: 80 },   // bottom-center circle
};

export default function VillageScene({
  buildings,
  selectedBuilding,
  onBuildingSelect,
  onEmptySlotSelect,
}: VillageSceneProps) {
  const builtMap = new Map(buildings.map((b) => [b.buildingType, b]));

  return (
    <div className="village-scene">
      {/* Canvas wraps the background image and all sprites in a fixed 3:2
          box so the building positions (percent-of-image) always align
          with the painted plots, no matter what aspect the outer scene
          has. The scene itself paints a blurred version of the same image
          so letterbox areas blend into the painting instead of looking
          like empty borders. */}
      <div className="village-scene__canvas">
        <img
          src="/images/village-bg.png"
          alt="Village"
          className="village-bg-img"
          draggable={false}
        />

        {/* Building Sprites positioned on the circular plots */}
        {BUILDINGS.map((def) => {
          const pos = BUILDING_POSITIONS[def.type];
          if (!pos) return null;

          const built = builtMap.get(def.type);
          const isSelected = selectedBuilding === def.type;

          let totalBuildTicks: number | undefined;
          if (built?.isConstructing) {
            const level = built.level;
            totalBuildTicks = Math.ceil(
              def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level - 1)
            );
          }

          return (
            <BuildingSprite
              key={def.type}
              definition={def}
              buildingData={built || null}
              position={pos}
              isSelected={isSelected}
              totalBuildTicks={totalBuildTicks}
              onClick={() =>
                built
                  ? onBuildingSelect(def.type)
                  : onEmptySlotSelect(def.type)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
