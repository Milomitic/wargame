import { useState, useEffect } from "react";
import { BUILDING_MAP, type BuildingType } from "@wargame/shared";
import { api } from "../../api/client.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

interface TroopData {
  troopType: string;
  quantity: number;
  isRecruiting: boolean;
  recruitingQuantity: number;
  recruitingTicksRemaining: number;
}

interface BuildingDetailProps {
  buildingType: string;
  buildingData: BuildingData | null;
  buildings: BuildingData[];
  resources: ResourceData[];
  troops: TroopData[];
  onRefresh: () => void;
  onClose: () => void;
}

const BUILDING_ICONS: Record<string, string> = {
  keep: "\u{1F3F0}", lumbermill: "\u{1FAB5}", quarry: "\u26CF\uFE0F",
  mine: "\u2692\uFE0F", farm: "\u{1F33E}", market: "\u{1F4B0}",
  barracks: "\u2694\uFE0F", wall: "\u{1F9F1}", stable: "\u{1F40E}",
  workshop: "\u{1F527}", watchtower: "\u{1F441}\uFE0F",
  granary: "\u{1F3DA}\uFE0F", warehouse: "\u{1F4E6}",
};

const RES_ICONS: Record<string, string> = {
  wood: "\u{1FAB5}", stone: "\u{1FAA8}", iron: "\u2692\uFE0F", gold: "\u{1F4B0}",
};

const RES_COLORS: Record<string, string> = {
  wood: "var(--res-wood)", stone: "var(--res-stone)",
  iron: "var(--res-iron)", gold: "var(--res-gold)",
};

function getCost(buildingType: string, level: number) {
  const def = BUILDING_MAP[buildingType];
  if (!def) return null;
  if (level === 0) return { ...def.baseCost, ticks: def.baseBuildTicks };
  const m = Math.pow(def.costMultiplier, level);
  return {
    wood: Math.ceil(def.baseCost.wood * m),
    stone: Math.ceil(def.baseCost.stone * m),
    iron: Math.ceil(def.baseCost.iron * m),
    gold: Math.ceil(def.baseCost.gold * m),
    ticks: Math.ceil(def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level)),
  };
}

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

export default function BuildingDetail({
  buildingType,
  buildingData,
  buildings,
  resources,
  troops,
  onRefresh,
  onClose,
}: BuildingDetailProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = BUILDING_MAP[buildingType];
  if (!def) return null;

  const icon = BUILDING_ICONS[buildingType] || "\u{1F3E0}";
  const isBuilt = !!buildingData;
  const isConstructing = buildingData?.isConstructing ?? false;
  const level = buildingData?.level ?? 0;
  const atMax = isBuilt && level >= def.maxLevel;

  const cost = isBuilt ? getCost(buildingType, level) : getCost(buildingType, 0);
  const affordable = cost ? canAfford(cost, resources) : false;
  const isAnythingConstructing = buildings.some((b) => b.isConstructing);

  // Prerequisite check for unbuilt buildings
  const builtTypes = new Set(buildings.map((b) => b.buildingType));
  const hasPrereq = def.requires ? builtTypes.has(def.requires) : true;

  // Construction progress
  const totalTicks = isConstructing
    ? Math.ceil(def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level - 1))
    : 0;
  const pct = isConstructing
    ? Math.max(100 - (buildingData!.constructionTicksRemaining / Math.max(totalTicks, 1)) * 100, 5)
    : 0;

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleBuild() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/fief/build", { buildingType });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/fief/upgrade", { buildingType });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="building-detail">
      {/* Header */}
      <div className="building-detail__header">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-title font-bold text-sm text-[var(--color-gold)]">
            {def.name}
          </div>
          {isBuilt ? (
            <div className="flex items-center gap-1.5">
              <span className="badge bg-[var(--surface-3)] text-[var(--text-secondary)]">
                Lv.{level}/{def.maxLevel}
              </span>
              {isConstructing && (
                <span className="alert-badge alert-badge--building text-[0.5rem]">Building</span>
              )}
              {atMax && (
                <span className="alert-badge alert-badge--complete text-[0.5rem]">Max</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Not Built</span>
          )}
        </div>
        <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
          {"\u2715"}
        </button>
      </div>

      {/* Body */}
      <div className="building-detail__body">
        {/* Error */}
        {error && (
          <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 rounded p-2">
            {"\u26A0\uFE0F"} {error}
          </div>
        )}

        {/* Description */}
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {def.description}
        </div>

        {/* Production info */}
        {isBuilt && def.produces && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Production</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{RES_ICONS[def.produces.resource] || ""}</span>
              <div>
                <div className="text-sm font-bold text-[var(--color-success)]">
                  +{def.produces.baseRate * level} {def.produces.resource}/min
                </div>
                <div className="text-[0.6rem] text-[var(--text-muted)]">
                  Base: +{def.produces.baseRate} × Lv.{level}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Construction progress */}
        {isConstructing && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Under Construction</div>
            <div className="progress-enhanced mt-1">
              <div className="progress-enhanced__fill" style={{ width: `${pct}%` }} />
              <div className="progress-enhanced__label">
                {Math.round(pct)}% — {buildingData!.constructionTicksRemaining}m left
              </div>
            </div>
          </div>
        )}

        {/* Upgrade section (built, not constructing, not max) */}
        {isBuilt && !isConstructing && !atMax && cost && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">
              Upgrade to Lv.{level + 1}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {Object.entries(cost)
                .filter(([k, v]) => k !== "ticks" && v > 0)
                .map(([type, needed]) => {
                  const r = resources.find((r) => r.resourceType === type);
                  const now = Date.now();
                  const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
                  const current = r ? Math.min(r.amount + r.productionRate * elapsed, r.capacity) : 0;
                  const enough = current >= needed;
                  return (
                    <span key={type} className="flex items-center gap-1 text-xs">
                      <span className="text-[0.7rem]">{RES_ICONS[type]}</span>
                      <span className="font-bold" style={{ color: enough ? RES_COLORS[type] : "var(--color-danger)" }}>
                        {needed}
                      </span>
                    </span>
                  );
                })}
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {"\u23F1\uFE0F"} {cost.ticks}m
              </span>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={loading || isAnythingConstructing || !affordable}
              className="btn-primary text-xs px-4 py-1.5 w-full"
            >
              {loading ? (
                <span className="spinner w-3 h-3" />
              ) : (
                `Upgrade to Lv.${level + 1}`
              )}
            </button>
          </div>
        )}

        {/* Build section (not built) */}
        {!isBuilt && cost && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Build Cost</div>

            {!hasPrereq && (
              <div className="text-xs text-[var(--color-danger)] mb-2 flex items-center gap-1">
                {"\u{1F512}"} Requires {BUILDING_MAP[def.requires!]?.name || def.requires}
              </div>
            )}

            {def.produces && (
              <div className="text-xs text-[var(--color-success)] mb-2">
                Produces: +{def.produces.baseRate} {def.produces.resource}/min
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {Object.entries(cost)
                .filter(([k, v]) => k !== "ticks" && v > 0)
                .map(([type, needed]) => {
                  const r = resources.find((r) => r.resourceType === type);
                  const now = Date.now();
                  const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
                  const current = r ? Math.min(r.amount + r.productionRate * elapsed, r.capacity) : 0;
                  const enough = current >= needed;
                  return (
                    <span key={type} className="flex items-center gap-1 text-xs">
                      <span className="text-[0.7rem]">{RES_ICONS[type]}</span>
                      <span className="font-bold" style={{ color: enough ? RES_COLORS[type] : "var(--color-danger)" }}>
                        {needed}
                      </span>
                    </span>
                  );
                })}
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {"\u23F1\uFE0F"} {cost.ticks}m
              </span>
            </div>
            <button
              onClick={handleBuild}
              disabled={loading || isAnythingConstructing || !affordable || !hasPrereq}
              className="btn-primary text-xs px-4 py-1.5 w-full"
            >
              {loading ? (
                <span className="spinner w-3 h-3" />
              ) : (
                `Build ${def.name}`
              )}
            </button>
          </div>
        )}

        {/* At max level */}
        {atMax && !isConstructing && (
          <div className="building-detail__section text-center">
            <span className="text-lg">{"\u{1F3C6}"}</span>
            <div className="text-xs text-[var(--color-success)] font-bold mt-1">
              Maximum Level Reached
            </div>
          </div>
        )}

        {/* Level progress */}
        {isBuilt && !isConstructing && (
          <div>
            <div className="text-[0.55rem] text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Level Progress
            </div>
            <div className="progress-track h-1.5">
              <div
                className="progress-fill"
                style={{
                  width: `${(level / def.maxLevel) * 100}%`,
                  backgroundColor: "var(--color-gold)",
                }}
              />
            </div>
            <div className="text-[0.5rem] text-[var(--text-muted)] mt-0.5 text-right">
              {level} / {def.maxLevel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
