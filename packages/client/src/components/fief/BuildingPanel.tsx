import { useState } from "react";
import { BUILDINGS, BUILDING_MAP, type BuildingType } from "@wargame/shared";
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

interface Props {
  buildings: BuildingData[];
  resources: ResourceData[];
  onRefresh: () => void;
}

const BUILDING_ICONS: Record<string, string> = {
  lumbermill: "\u{1FAB5}",
  quarry: "\u26CF\uFE0F",
  iron_mine: "\u2692\uFE0F",
  farm: "\u{1F33E}",
  market: "\u{1F4B0}",
  barracks: "\u2694\uFE0F",
  wall: "\u{1F9F1}",
  stable: "\u{1F40E}",
  workshop: "\u{1F527}",
  keep: "\u{1F3F0}",
  watchtower: "\u{1F441}\uFE0F",
  granary: "\u{1F3DA}\uFE0F",
  warehouse: "\u{1F4E6}",
};

const RESOURCE_ICONS: Record<string, string> = {
  wood: "\u{1FAB5}",
  stone: "\u{1FAA8}",
  iron: "\u2692\uFE0F",
  gold: "\u{1F4B0}",
};

const RESOURCE_COLORS: Record<string, string> = {
  wood: "var(--res-wood)",
  stone: "var(--res-stone)",
  iron: "var(--res-iron)",
  gold: "var(--res-gold)",
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

function canAfford(
  cost: { wood: number; stone: number; iron: number; gold: number },
  resources: ResourceData[]
) {
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

function CostDisplay({
  cost,
  resources,
}: {
  cost: { wood: number; stone: number; iron: number; gold: number; ticks: number };
  resources: ResourceData[];
}) {
  const now = Date.now();
  const entries = Object.entries(cost).filter(([k, v]) => k !== "ticks" && v > 0);

  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
      {entries.map(([type, needed]) => {
        const r = resources.find((r) => r.resourceType === type);
        const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
        const current = r ? Math.min(r.amount + r.productionRate * elapsed, r.capacity) : 0;
        const hasEnough = current >= needed;

        return (
          <span key={type} className="inline-flex items-center gap-0.5 text-[0.7rem]">
            <span className="text-[0.65rem]">{RESOURCE_ICONS[type] || ""}</span>
            <span
              className="font-semibold"
              style={{ color: hasEnough ? RESOURCE_COLORS[type] : "var(--color-danger-light)" }}
            >
              {needed}
            </span>
          </span>
        );
      })}
      <span className="inline-flex items-center gap-0.5 text-[0.7rem] text-[var(--color-parchment-faint)]">
        {"\u23F1\uFE0F"}
        <span>{cost.ticks}m</span>
      </span>
    </div>
  );
}

export default function BuildingPanel({ buildings, resources, onRefresh }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAnythingConstructing = buildings.some((b) => b.isConstructing);
  const builtTypes = new Set(buildings.map((b) => b.buildingType));

  async function handleBuild(buildingType: BuildingType) {
    setLoading(buildingType);
    setError(null);
    try {
      await api.post("/fief/build", { buildingType });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleUpgrade(buildingType: BuildingType) {
    setLoading(buildingType);
    setError(null);
    try {
      await api.post("/fief/upgrade", { buildingType });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)]">
          <span className="shrink-0 mt-px">{"\u26A0\uFE0F"}</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Your Buildings ───────────────────────── */}
      {buildings.length > 0 && (
        <div>
          <h3 className="section-title mb-2.5">Your Buildings</h3>
          <div className="space-y-1.5">
            {buildings.map((b) => {
              const def = BUILDING_MAP[b.buildingType];
              const nextCost = getCost(b.buildingType, b.level);
              const atMax = def && b.level >= def.maxLevel;
              const affordable = nextCost ? canAfford(nextCost, resources) : false;
              const icon = BUILDING_ICONS[b.buildingType] || "\u{1F3E0}";

              return (
                <div
                  key={b.buildingType}
                  id={`building-${b.buildingType}`}
                  className={`p-3 transition-all ${
                    b.isConstructing
                      ? "building-card--constructing animate-pulse-glow"
                      : "building-card--built"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Icon */}
                    <div
                      className={`stat-icon text-base ${
                        b.isConstructing ? "bg-[var(--color-construction)]/8 border-[var(--color-construction)]/18" : ""
                      }`}
                    >
                      {icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-[var(--color-parchment)]">
                          {def?.name || b.buildingType}
                        </span>
                        <span className="badge bg-[var(--color-wood)]/10 text-[var(--color-parchment-dim)]">
                          Lv.{b.level}{def && `/${def.maxLevel}`}
                        </span>
                        {def?.produces && (
                          <span className="text-[0.65rem] text-[var(--color-success)]">
                            +{def.produces.baseRate * b.level} {def.produces.resource}/min
                          </span>
                        )}
                      </div>

                      {/* Construction progress */}
                      {b.isConstructing && (() => {
                        const total = nextCost?.ticks || b.constructionTicksRemaining;
                        const pct = Math.max(100 - (b.constructionTicksRemaining / total) * 100, 5);
                        return (
                          <div className="mt-2">
                            <div className="progress-enhanced">
                              <div
                                className="progress-enhanced__fill"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="progress-enhanced__label">
                                {Math.round(pct)}% &mdash; {b.constructionTicksRemaining}m left
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Upgrade cost */}
                      {!b.isConstructing && !atMax && nextCost && (
                        <div className="mt-1.5">
                          <CostDisplay cost={nextCost} resources={resources} />
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex items-center">
                      {b.isConstructing ? (
                        <div className="spinner w-4 h-4 !border-[var(--color-construction)]/25 !border-t-[var(--color-construction-light)]" />
                      ) : atMax ? (
                        <span className="badge bg-[var(--color-success)]/12 text-[var(--color-success-light)] border border-[var(--color-success)]/20">
                          MAX
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(b.buildingType as BuildingType)}
                          disabled={loading !== null || isAnythingConstructing || !affordable}
                          className="btn-primary text-[0.65rem] px-2.5 py-1"
                        >
                          {loading === b.buildingType ? (
                            <span className="spinner w-3 h-3" />
                          ) : (
                            "Upgrade"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Available to Build ───────────────────── */}
      {BUILDINGS.filter((b) => !builtTypes.has(b.type)).length > 0 && (
        <div>
          <hr className="medieval-divider" />
          <h3 className="section-title mb-2.5">Available to Build</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUILDINGS.filter((b) => !builtTypes.has(b.type)).map((def) => {
              const cost = getCost(def.type, 0)!;
              const affordable = canAfford(cost, resources);
              const hasPrereq = def.requires ? builtTypes.has(def.requires) : true;
              const icon = BUILDING_ICONS[def.type] || "\u{1F3E0}";
              const canBuild = !loading && !isAnythingConstructing && affordable && hasPrereq;
              const isLocked = !hasPrereq;

              return (
                <div
                  key={def.type}
                  id={`building-${def.type}`}
                  className={`building-card--blueprint p-3 transition-all ${
                    isLocked ? "building-card--locked" : ""
                  } ${canBuild ? "hover:border-[var(--color-gold)]/30" : ""}`}
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="stat-icon text-base">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs">{def.name}</div>
                      <div className="text-[0.65rem] text-[var(--color-parchment-faint)] mt-0.5 leading-relaxed">
                        {def.description}
                      </div>
                    </div>
                  </div>

                  {def.produces && (
                    <div className="text-[0.65rem] text-[var(--color-success)] mb-1.5">
                      +{def.produces.baseRate} {def.produces.resource}/min
                    </div>
                  )}

                  <CostDisplay cost={cost} resources={resources} />

                  {!hasPrereq && (
                    <div className="text-[0.65rem] text-[var(--color-danger-light)] mt-1.5 flex items-center gap-1">
                      <span>{"\u{1F512}"}</span>
                      Requires {BUILDING_MAP[def.requires!]?.name}
                    </div>
                  )}

                  <button
                    onClick={() => handleBuild(def.type)}
                    disabled={!canBuild}
                    className="btn-primary text-[0.65rem] px-3 py-1.5 w-full mt-2.5"
                  >
                    {loading === def.type ? (
                      <>
                        <span className="spinner w-3 h-3" />
                        Building...
                      </>
                    ) : (
                      "Build"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
