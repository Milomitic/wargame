import { useState } from "react";
import { TROOPS, TROOP_MAP, type TroopType } from "@wargame/shared";
import { api } from "../../api/client.js";

interface TroopData {
  troopType: string;
  quantity: number;
  isRecruiting: boolean;
  recruitingQuantity: number;
  recruitingTicksRemaining: number;
}

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
}

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

interface Props {
  troops: TroopData[];
  buildings: BuildingData[];
  resources: ResourceData[];
  onRefresh: () => void;
}

const TROOP_ICONS: Record<string, string> = {
  militia: "\u{1F9D1}\u200D\u{1F33E}",
  infantry: "\u2694\uFE0F",
  archer: "\u{1F3F9}",
  cavalry: "\u{1F40E}",
  catapult: "\u{1F4A5}",
};

const RESOURCE_ICONS: Record<string, string> = {
  wood: "\u{1FAB5}",
  stone: "\u{1FAA8}",
  iron: "\u2692\uFE0F",
  gold: "\u{1F4B0}",
  food: "\u{1F33E}",
};

const RESOURCE_COLORS: Record<string, string> = {
  wood: "var(--res-wood)",
  stone: "var(--res-stone)",
  iron: "var(--res-iron)",
  gold: "var(--res-gold)",
  food: "var(--res-food)",
};

function canAffordTroop(
  troopType: string,
  quantity: number,
  resources: ResourceData[]
): boolean {
  const def = TROOP_MAP[troopType];
  if (!def) return false;
  const now = Date.now();
  for (const [type, perUnit] of Object.entries(def.baseCost)) {
    const needed = perUnit * quantity;
    if (needed <= 0) continue;
    const r = resources.find((r) => r.resourceType === type);
    if (!r) return false;
    const elapsed = (now - r.updatedAt) / 60_000;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    if (current < needed) return false;
  }
  return true;
}

function CostRow({
  troopType,
  quantity,
  resources,
}: {
  troopType: string;
  quantity: number;
  resources: ResourceData[];
}) {
  const def = TROOP_MAP[troopType];
  if (!def) return null;
  const now = Date.now();
  const entries = Object.entries(def.baseCost).filter(([, v]) => v > 0);

  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
      {entries.map(([type, perUnit]) => {
        const needed = perUnit * quantity;
        const r = resources.find((r) => r.resourceType === type);
        const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
        const current = r
          ? Math.min(r.amount + r.productionRate * elapsed, r.capacity)
          : 0;
        const hasEnough = current >= needed;

        return (
          <span key={type} className="inline-flex items-center gap-0.5 text-[0.7rem]">
            <span className="text-[0.65rem]">{RESOURCE_ICONS[type] || ""}</span>
            <span
              className="font-semibold"
              style={{
                color: hasEnough
                  ? RESOURCE_COLORS[type] || "var(--color-parchment-dim)"
                  : "var(--color-danger-light)",
              }}
            >
              {needed}
            </span>
          </span>
        );
      })}
      <span className="inline-flex items-center gap-0.5 text-[0.7rem] text-[var(--color-parchment-faint)]">
        {"\u23F1\uFE0F"}
        <span>{def.baseRecruitTicks * quantity}m</span>
      </span>
    </div>
  );
}

export default function TroopPanel({ troops, buildings, resources, onRefresh }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const builtBuildings = new Map(
    buildings
      .filter((b) => !b.isConstructing)
      .map((b) => [b.buildingType, b.level])
  );

  async function handleRecruit(troopType: TroopType) {
    const qty = quantities[troopType] || 1;
    setLoading(troopType);
    setError(null);
    try {
      await api.post("/fief/recruit", { troopType, quantity: qty });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  // Separate existing troops from available-to-recruit
  const ownedTypes = new Set(troops.map((t) => t.troopType));

  // Compute total army stats
  const totalAttack = troops.reduce((sum, t) => {
    const def = TROOP_MAP[t.troopType];
    return sum + (def ? def.attack * t.quantity : 0);
  }, 0);
  const totalDefense = troops.reduce((sum, t) => {
    const def = TROOP_MAP[t.troopType];
    return sum + (def ? def.defense * t.quantity : 0);
  }, 0);
  const totalUnits = troops.reduce((sum, t) => sum + t.quantity, 0);

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)]">
          <span className="shrink-0 mt-px">{"\u26A0\uFE0F"}</span>
          <span>{error}</span>
        </div>
      )}

      {/* Army summary */}
      {totalUnits > 0 && (
        <div className="flex gap-4 text-xs">
          <div>
            <span className="stat-label">Total Units</span>
            <div className="font-bold text-sm">{totalUnits}</div>
          </div>
          <div>
            <span className="stat-label">Attack</span>
            <div className="font-bold text-sm text-[var(--color-danger-light)]">{totalAttack}</div>
          </div>
          <div>
            <span className="stat-label">Defense</span>
            <div className="font-bold text-sm text-[var(--color-info-light)]">{totalDefense}</div>
          </div>
        </div>
      )}

      {/* ── Your Troops ──────────────────────────── */}
      {troops.filter((t) => t.quantity > 0 || t.isRecruiting).length > 0 && (
        <div>
          <h3 className="section-title mb-2.5">Your Troops</h3>
          <div className="space-y-1.5">
            {troops
              .filter((t) => t.quantity > 0 || t.isRecruiting)
              .map((t) => {
                const def = TROOP_MAP[t.troopType];
                const icon = TROOP_ICONS[t.troopType] || "\u2694\uFE0F";

                return (
                  <div
                    key={t.troopType}
                    className={`rounded-lg p-3 border transition-all ${
                      t.isRecruiting
                        ? "bg-[var(--color-construction)]/4 border-[var(--color-construction)]/20 animate-pulse-glow"
                        : "bg-[var(--surface-0)]/50 border-[var(--border-muted)] hover:border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`stat-icon text-base ${
                          t.isRecruiting
                            ? "bg-[var(--color-construction)]/8 border-[var(--color-construction)]/18"
                            : ""
                        }`}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs">
                            {def?.name || t.troopType}
                          </span>
                          <span className="badge bg-[var(--color-wood)]/10 text-[var(--color-parchment-dim)]">
                            {t.quantity} units
                          </span>
                          {def && (
                            <span className="text-[0.6rem] text-[var(--color-parchment-faint)]">
                              ATK {def.attack} &middot; DEF {def.defense}
                            </span>
                          )}
                        </div>

                        {t.isRecruiting && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between text-[0.65rem] mb-0.5">
                              <span className="text-[var(--color-construction-light)] font-medium">
                                Recruiting +{t.recruitingQuantity}
                              </span>
                              <span className="text-[var(--color-construction)]">
                                {t.recruitingTicksRemaining}m left
                              </span>
                            </div>
                            <div className="progress-track h-1.5">
                              <div
                                className="progress-fill construction-stripes"
                                style={{
                                  width: `${Math.max(
                                    100 -
                                      (t.recruitingTicksRemaining /
                                        ((def?.baseRecruitTicks || 1) * t.recruitingQuantity)) *
                                        100,
                                    5
                                  )}%`,
                                  backgroundColor: "var(--color-construction)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Available to Recruit ─────────────────── */}
      <div>
        <h3 className="section-title mb-2.5">Recruit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TROOPS.map((def) => {
            const icon = TROOP_ICONS[def.type] || "\u2694\uFE0F";
            const buildingLevel = builtBuildings.get(def.requiresBuilding) ?? 0;
            const hasPrereq = buildingLevel >= def.requiresBuildingLevel;
            const qty = quantities[def.type] || 1;
            const affordable = canAffordTroop(def.type, qty, resources);
            const isRecruiting = troops.find(
              (t) => t.troopType === def.type
            )?.isRecruiting;
            const canRecruit = hasPrereq && affordable && !isRecruiting && !loading;

            return (
              <div
                key={def.type}
                className={`rounded-lg p-3 border transition-all ${
                  hasPrereq
                    ? "bg-[var(--surface-0)]/50 border-[var(--border-muted)] hover:border-[var(--color-gold)]/30"
                    : "bg-[var(--surface-0)]/25 border-[var(--border-muted)] opacity-50"
                }`}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="stat-icon text-base">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs">{def.name}</span>
                      <span className="text-[0.6rem] text-[var(--color-parchment-faint)]">
                        ATK {def.attack} &middot; DEF {def.defense}
                      </span>
                    </div>
                    <div className="text-[0.65rem] text-[var(--color-parchment-faint)] mt-0.5 leading-relaxed">
                      {def.description}
                    </div>
                  </div>
                </div>

                {/* Cost for current quantity */}
                <div className="mb-2">
                  <CostRow
                    troopType={def.type}
                    quantity={qty}
                    resources={resources}
                  />
                </div>

                {!hasPrereq && (
                  <div className="text-[0.65rem] text-[var(--color-danger-light)] mb-2 flex items-center gap-1">
                    <span>{"\u{1F512}"}</span>
                    Requires {def.requiresBuilding} Lv.{def.requiresBuildingLevel}
                  </div>
                )}

                {isRecruiting && (
                  <div className="text-[0.65rem] text-[var(--color-construction-light)] mb-2">
                    Already recruiting...
                  </div>
                )}

                {/* Quantity selector + recruit button */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-[var(--border-default)] rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [def.type]: Math.max(1, (q[def.type] || 1) - 1),
                        }))
                      }
                      disabled={!hasPrereq || qty <= 1}
                      className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-7 text-center bg-[var(--surface-0)]/50">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [def.type]: Math.min(50, (q[def.type] || 1) + 1),
                        }))
                      }
                      disabled={!hasPrereq || qty >= 50}
                      className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRecruit(def.type)}
                    disabled={!canRecruit}
                    className="btn-primary text-[0.65rem] px-3 py-1.5 flex-1"
                  >
                    {loading === def.type ? (
                      <>
                        <span className="spinner w-3 h-3" />
                        Recruiting...
                      </>
                    ) : (
                      "Recruit"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
