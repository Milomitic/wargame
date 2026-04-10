import { useMemo } from "react";
import { BUILDINGS, BUILDING_MAP } from "@wargame/shared";
import BuildingSprite from "./BuildingSprite.js";
import VillageBackground from "./VillageBackground.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

interface VillageSceneProps {
  buildings: BuildingData[];
  selectedBuilding: string | null;
  onBuildingSelect: (buildingType: string) => void;
  onEmptySlotSelect: (buildingType: string) => void;
}

const BUILDING_POSITIONS: Record<string, { left: number; top: number }> = {
  keep:       { left: 50, top: 40 },
  market:     { left: 42, top: 60 },
  warehouse:  { left: 58, top: 60 },
  granary:    { left: 50, top: 73 },
  lumbermill: { left: 18, top: 28 },
  quarry:     { left: 82, top: 30 },
  mine:       { left: 85, top: 54 },
  farm:       { left: 15, top: 64 },
  barracks:   { left: 35, top: 41 },
  stable:     { left: 22, top: 48 },
  workshop:   { left: 78, top: 48 },
  wall:       { left: 50, top: 19 },
  watchtower: { left: 82, top: 17 },
};

export default function VillageScene({
  buildings,
  selectedBuilding,
  onBuildingSelect,
  onEmptySlotSelect,
}: VillageSceneProps) {
  const builtMap = new Map(buildings.map((b) => [b.buildingType, b]));
  const builtSet = useMemo(() => new Set(buildings.map((b) => b.buildingType)), [buildings]);

  return (
    <div className="village-scene">
      {/* SVG Background: terrain, paths, trees, plots */}
      <VillageBackground builtSet={builtSet} />

      {/* Settlement name */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-center"
        style={{ pointerEvents: "none" }}
      >
        <div className="font-title text-xs font-bold text-[var(--color-gold)] tracking-widest opacity-50 uppercase">
          Settlement View
        </div>
      </div>

      {/* Building Sprites */}
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
  );
}
