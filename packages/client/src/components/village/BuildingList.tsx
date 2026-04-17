import { useEffect, useState } from "react";
import { BUILDINGS, BUILDING_MAP, type BuildingType } from "@wargame/shared";
import VillageInfoCard from "./VillageInfoCard.js";

const TICK_MS = 60_000;

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
  constructionStartedAt?: number | null;
}

interface FiefSummary {
  name: string;
  tileId?: string;
  level: number;
  population: number;
}

function formatRemaining(secondsLeft: number): string {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

interface BuildingListProps {
  buildings: BuildingData[];
  resources: ResourceData[];
  selectedBuilding: string | null;
  onSelect: (type: string) => void;
  fief?: FiefSummary | null;
  onFiefRenamed?: (newName: string) => void;
}

const ICONS: Record<string, string> = {
  keep: "🏰", lumbermill: "🪵", quarry: "⛏️",
  mine: "⚒️", farm: "🌾", market: "💰",
  barracks: "⚔️", wall: "🧱", stable: "🐎",
  workshop: "🔧", watchtower: "👁️",
  granary: "🏚️", warehouse: "📦",
};

function canAfford(cost: Record<string, number>, resources: ResourceData[]) {
  const now = Date.now();
  for (const [type, needed] of Object.entries(cost)) {
    if (type === "ticks" || needed <= 0) continue;
    const r = resources.find((r) => r.resourceType === type);
    if (!r) return false;
    const elapsed = (now - r.updatedAt) / 60_000;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    if (current < needed) return false;
  }
  return true;
}

export default function BuildingList({
  buildings,
  resources,
  selectedBuilding,
  onSelect,
  fief,
  onFiefRenamed,
}: BuildingListProps) {
  const builtMap = new Map(buildings.map((b) => [b.buildingType, b]));
  const builtTypes = new Set(buildings.map((b) => b.buildingType));
  const [nowTs, setNowTs] = useState(() => Date.now());

  // Always tick: drives both construction timers AND live affordability of
  // upgrade costs as resources accumulate between server refreshes.
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const builtList = BUILDINGS.filter((d) => builtTypes.has(d.type));
  const availableList = BUILDINGS.filter((d) => !builtTypes.has(d.type));

  return (
    <div className="building-list">
      {/* Village info card with rename */}
      {fief && (
        <VillageInfoCard fief={fief} onRenamed={(n) => onFiefRenamed?.(n)} />
      )}

      {/* Built buildings */}
      {builtList.length > 0 && (
        <div className="building-list__section">
          <div className="building-list__header">Your Buildings</div>
          {builtList.map((def) => {
            const b = builtMap.get(def.type)!;
            const icon = ICONS[def.type] || "🏠";
            const isSelected = selectedBuilding === def.type;

            return (
              <button
                key={def.type}
                className={`building-list__item ${isSelected ? "building-list__item--selected" : ""} ${b.isConstructing ? "building-list__item--constructing" : ""}`}
                onClick={() => onSelect(def.type)}
              >
                <span className="building-list__icon">{icon}</span>
                <div className="building-list__info">
                  <span className="building-list__name">{def.name}</span>
                  {b.isConstructing && (() => {
                    const totalTicks = Math.ceil(
                      def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, b.level - 1)
                    );
                    const remainingMs = b.constructionStartedAt
                      ? Math.max(0, b.constructionStartedAt + totalTicks * TICK_MS - nowTs)
                      : b.constructionTicksRemaining * TICK_MS;
                    return (
                      <span className="building-list__timer">
                        🔨 {formatRemaining(remainingMs / 1000)}
                      </span>
                    );
                  })()}
                </div>
                <span className="building-list__level">Lv.{b.level}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Available to build */}
      {availableList.length > 0 && (
        <div className="building-list__section">
          <div className="building-list__header">Available</div>
          {availableList.map((def) => {
            const icon = ICONS[def.type] || "🏠";
            const isSelected = selectedBuilding === def.type;
            const hasPrereq = def.requires ? builtTypes.has(def.requires) : true;
            const cost = def.baseCost;
            const affordable = canAfford(cost, resources);

            return (
              <button
                key={def.type}
                className={`building-list__item building-list__item--available ${isSelected ? "building-list__item--selected" : ""} ${!hasPrereq ? "building-list__item--locked" : ""}`}
                onClick={() => onSelect(def.type)}
              >
                <span className="building-list__icon">{icon}</span>
                <div className="building-list__info">
                  <span className="building-list__name">{def.name}</span>
                  {!hasPrereq && (
                    <span className="building-list__req">{"🔒"} {BUILDING_MAP[def.requires!]?.name}</span>
                  )}
                  {hasPrereq && (
                    <span className={`building-list__cost ${affordable ? "" : "building-list__cost--red"}`}>
                      {def.baseCost.wood > 0 && `${def.baseCost.wood}W `}
                      {def.baseCost.stone > 0 && `${def.baseCost.stone}S `}
                      {def.baseCost.gold > 0 && `${def.baseCost.gold}G`}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
