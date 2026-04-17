import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  BUILDING_MAP,
  TROOPS,
  TROOP_MAP,
  BASE_CAPACITY,
  warehouseCapacityMultiplier,
  granaryCapacityMultiplier,
  recruitSpeedMultiplier,
  type BuildingType,
  type TroopType,
} from "@wargame/shared";
import { api } from "../../api/client.js";
import { TROOP_ICONS } from "../../util/troopIcons.js";

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
  constructionStartedAt?: number | null;
}

const MAX_PARALLEL_CONSTRUCTIONS = 2;
const TICK_MS = 60_000;

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
  onSelectBuilding?: (type: string) => void;
}

const BUILDING_ICONS: Record<string, string> = {
  keep: "🏰", lumbermill: "🪵", quarry: "⛏️",
  mine: "⚒️", farm: "🌾", market: "💰",
  barracks: "⚔️", wall: "🧱", stable: "🐎",
  workshop: "🔧", watchtower: "👁️",
  granary: "🏚️", warehouse: "📦",
};

const RES_ICONS: Record<string, string> = {
  wood: "🪵", stone: "🪨", iron: "⚒️", gold: "💰", food: "🌾",
};

const RES_COLORS: Record<string, string> = {
  wood: "var(--res-wood)", stone: "var(--res-stone)",
  iron: "var(--res-iron)", gold: "var(--res-gold)", food: "var(--res-food)",
};

const MAX_RECRUIT_QTY = 50; // server-enforced cap

/** Compute the maximum number of units of a troop type the player can afford. */
function maxAffordable(troopType: string, resources: ResourceData[]): number {
  const def = TROOP_MAP[troopType];
  if (!def) return 0;
  const now = Date.now();
  let max = MAX_RECRUIT_QTY;
  for (const [type, perUnit] of Object.entries(def.baseCost)) {
    if (perUnit <= 0) continue;
    const r = resources.find((r) => r.resourceType === type);
    if (!r) return 0;
    const elapsed = (now - r.updatedAt) / 60_000;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    max = Math.min(max, Math.floor(current / perUnit));
  }
  return Math.max(0, max);
}

function canAffordTroop(troopType: string, qty: number, resources: ResourceData[]) {
  const def = TROOP_MAP[troopType];
  if (!def) return false;
  const now = Date.now();
  for (const [type, perUnit] of Object.entries(def.baseCost)) {
    const needed = perUnit * qty;
    if (needed <= 0) continue;
    const r = resources.find((r) => r.resourceType === type);
    if (!r) return false;
    const elapsed = (now - r.updatedAt) / 60_000;
    const current = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
    if (current < needed) return false;
  }
  return true;
}

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
  onSelectBuilding,
}: BuildingDetailProps) {
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [recruitLoading, setRecruitLoading] = useState<string | null>(null);
  const [recruitQty, setRecruitQty] = useState<Record<string, number>>({});
  const [recruitCapped, setRecruitCapped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const def = BUILDING_MAP[buildingType];
  if (!def) return null;

  const icon = BUILDING_ICONS[buildingType] || "🏠";
  const isBuilt = !!buildingData;
  const isConstructing = buildingData?.isConstructing ?? false;
  const level = buildingData?.level ?? 0;
  const atMax = isBuilt && level >= def.maxLevel;

  const cost = isBuilt ? getCost(buildingType, level) : getCost(buildingType, 0);
  const affordable = cost ? canAfford(cost, resources) : false;
  const constructionCount = buildings.filter((b) => b.isConstructing).length;
  const isAnythingConstructing = constructionCount >= MAX_PARALLEL_CONSTRUCTIONS;

  // Prerequisite check for unbuilt buildings
  const builtTypes = new Set(buildings.map((b) => b.buildingType));
  const hasPrereq = def.requires ? builtTypes.has(def.requires) : true;

  // Construction progress (second-precision)
  const totalTicks = isConstructing
    ? Math.ceil(def.baseBuildTicks * Math.pow(def.buildTicksMultiplier, level - 1))
    : 0;
  const totalDurationMs = totalTicks * TICK_MS;
  // Prefer constructionStartedAt for seconds-accurate countdown; fall back to ticks-only.
  const startedAt = buildingData?.constructionStartedAt ?? null;
  const endsAt = isConstructing && startedAt ? startedAt + totalDurationMs : null;
  const remainingMs = isConstructing
    ? endsAt
      ? Math.max(0, endsAt - nowTs)
      : (buildingData?.constructionTicksRemaining ?? 0) * TICK_MS
    : 0;
  const remainingSec = remainingMs / 1000;
  const pct = isConstructing
    ? Math.min(100, Math.max(5, 100 - (remainingMs / Math.max(totalDurationMs, 1)) * 100))
    : 0;

  // Tick every second to keep the countdown fresh during construction AND
  // to re-evaluate affordability (canAfford uses Date.now() to project how
  // much a resource has accrued since its last `updatedAt`). Without the
  // always-on tick the Upgrade button stays disabled even after resources
  // naturally accumulate past the required threshold.
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Draggable popup state ─────────────────────────────────────────
  const popupRef = useRef<HTMLDivElement>(null);
  const dashRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Initial position: just right of the building list, near the top.
  // Computed once on mount via DOM measurement.
  useLayoutEffect(() => {
    const dash = document.querySelector(".village-dashboard") as HTMLElement | null;
    dashRef.current = dash;
    const list = document.querySelector(".building-list") as HTMLElement | null;
    if (dash && list) {
      const dashRect = dash.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      setPos({
        x: Math.max(8, listRect.right - dashRect.left + 12),
        y: 16,
      });
    } else {
      setPos({ x: 220, y: 16 });
    }
  }, []);

  // Window-level mouse listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      let nx = start.px + (e.clientX - start.mx);
      let ny = start.py + (e.clientY - start.my);
      const dash = dashRef.current;
      const popup = popupRef.current;
      if (dash && popup) {
        const dRect = dash.getBoundingClientRect();
        const pRect = popup.getBoundingClientRect();
        nx = Math.max(0, Math.min(dRect.width - pRect.width, nx));
        ny = Math.max(0, Math.min(dRect.height - 60, ny));
      }
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start a drag if the user is clicking the close button
    if ((e.target as HTMLElement).closest("button")) return;
    if (!pos) return;
    e.preventDefault();
    dragStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pos.x,
      py: pos.y,
    };
    setDragging(true);
  };

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

  async function handleCancel() {
    const action = level <= 1 ? "construction" : "upgrade";
    const ok = window.confirm(
      `Cancel ${def.name} ${action}?\n\nYou will be refunded 50% of the resources spent.`
    );
    if (!ok) return;
    setCancelLoading(true);
    setError(null);
    try {
      await api.post("/fief/cancel", { buildingType });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleRecruit(troopType: TroopType) {
    const qty = recruitQty[troopType] || 1;
    setRecruitLoading(troopType);
    setError(null);
    try {
      await api.post("/fief/recruit", { troopType, quantity: qty });
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRecruitLoading(null);
    }
  }

  // Troops this building unlocks (e.g. barracks → militia/infantry/archer)
  const unlockedTroops = TROOPS.filter((t) => t.requiresBuilding === buildingType);

  return (
    <div
      ref={popupRef}
      className="building-detail building-detail--popup"
      style={{
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {/* Header (drag handle) */}
      <div
        className="building-detail__header building-detail__header--drag"
        onMouseDown={onHeaderMouseDown}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
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
                <span className="alert-badge alert-badge--building text-fluid-xxs">Building</span>
              )}
              {atMax && (
                <span className="alert-badge alert-badge--complete text-fluid-xxs">Max</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Not Built</span>
          )}
        </div>

        {/* Inline action: upgrade (built) or build (not built) */}
        {isBuilt && !isConstructing && !atMax && cost && (
          <button
            onClick={handleUpgrade}
            disabled={loading || isAnythingConstructing || !affordable}
            className="btn-primary text-fluid-xs px-3 py-1 whitespace-nowrap"
            title={
              !affordable
                ? "Not enough resources"
                : isAnythingConstructing
                  ? "Another construction in progress"
                  : `Upgrade to Lv.${level + 1}`
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            {loading ? <span className="spinner w-3 h-3" /> : `▲ Lv.${level + 1}`}
          </button>
        )}
        {!isBuilt && cost && hasPrereq && (
          <button
            onClick={handleBuild}
            disabled={loading || isAnythingConstructing || !affordable}
            className="btn-primary text-fluid-xs px-3 py-1 whitespace-nowrap"
            title={!affordable ? "Not enough resources" : `Build ${def.name}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {loading ? <span className="spinner w-3 h-3" /> : `⚒ Build`}
          </button>
        )}

        <button
          onClick={onClose}
          className="btn-ghost px-2 py-1 text-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {"✕"}
        </button>
      </div>

      {/* Body */}
      <div className="building-detail__body">
        {/* Error */}
        {error && (
          <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 rounded p-2">
            {"⚠️"} {error}
          </div>
        )}

        {/* ── Next Level Cost (hoisted to top, secondary/muted card) ── */}
        {isBuilt && !isConstructing && !atMax && cost && (() => {
          // Compute the "what this upgrade unlocks" string per building type.
          let bonusDelta: string | null = null;
          if (def.produces) {
            const delta = def.produces.baseRate;
            bonusDelta = `+${delta} ${def.produces.resource}/min`;
          } else if (buildingType === "warehouse") {
            const diff = warehouseCapacityMultiplier(level + 1) - warehouseCapacityMultiplier(level);
            bonusDelta = `+${Math.round(diff * 100)}% storage`;
          } else if (buildingType === "granary") {
            const diff = granaryCapacityMultiplier(level + 1) - granaryCapacityMultiplier(level);
            bonusDelta = `+${Math.round(diff * 100)}% food storage`;
          } else if (
            buildingType === "barracks" ||
            buildingType === "stable" ||
            buildingType === "workshop"
          ) {
            const nowPct = Math.round((1 - recruitSpeedMultiplier(level)) * 100);
            const nextPct = Math.round((1 - recruitSpeedMultiplier(level + 1)) * 100);
            const diff = Math.max(0, nextPct - nowPct);
            if (diff > 0) bonusDelta = `−${diff}% training time`;
          }

          return (
            <div className="building-detail__upgrade-box">
              <div className="building-detail__upgrade-label">
                ▲ Upgrade to Lv.{level + 1}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {Object.entries(cost)
                  .filter(([k, v]) => k !== "ticks" && v > 0)
                  .map(([type, needed]) => {
                    const r = resources.find((r) => r.resourceType === type);
                    const now = Date.now();
                    const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
                    const current = r ? Math.min(r.amount + r.productionRate * elapsed, r.capacity) : 0;
                    const enough = current >= needed;
                    return (
                      <span key={type} className="flex items-center gap-0.5 text-xs">
                        <span className="text-[0.7rem]">{RES_ICONS[type]}</span>
                        <span
                          className="font-bold"
                          style={{ color: enough ? "var(--text-secondary)" : "var(--color-danger)" }}
                        >
                          {needed}
                        </span>
                      </span>
                    );
                  })}
                <span className="flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                  {"⏱️"} {cost.ticks}:00
                </span>
              </div>
              {bonusDelta && (
                <div className="building-detail__upgrade-bonus">
                  <span className="building-detail__upgrade-arrow">▸</span>
                  <span>{bonusDelta}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Build Cost (not built — hoisted to top) ───────────────── */}
        {!isBuilt && cost && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Build Cost</div>

            {!hasPrereq && (
              <div className="mb-2">
                <div className="text-xs text-[var(--color-danger)] flex items-center gap-1">
                  {"🔒"} Requires {BUILDING_MAP[def.requires!]?.name || def.requires}
                </div>
                {onSelectBuilding && (
                  <button
                    type="button"
                    onClick={() => onSelectBuilding(def.requires!)}
                    className="btn-secondary text-fluid-sm px-2 py-1 mt-1 w-full"
                  >
                    {"→"} Go to {BUILDING_MAP[def.requires!]?.name || def.requires}
                  </button>
                )}
              </div>
            )}

            {def.produces && (
              <div className="text-xs text-[var(--color-success)] mb-2">
                Produces: +{def.produces.baseRate} {def.produces.resource}/min at Lv.1
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-1">
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
                {"⏱️"} {cost.ticks}:00
              </span>
            </div>
          </div>
        )}

        {/* ── Level progress (hoisted below cost) ────────────────────── */}
        {isBuilt && !isConstructing && (
          <div>
            <div className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-wide mb-1">
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
            <div className="text-fluid-xxs text-[var(--text-muted)] mt-0.5 text-right">
              {level} / {def.maxLevel}
            </div>
          </div>
        )}

        {/* Description (moved below cost & progress) */}
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {def.description}
        </div>

        {/* ── Effect boxes (no wrapping section title) ─────────────── */}
        {isBuilt && (() => {
          const blocks: React.ReactNode[] = [];

          // Resource producers (lumbermill, quarry, mine, farm, market)
          if (def.produces) {
            const nowRate = def.produces.baseRate * level;
            blocks.push(
              <div key="prod" className="level-effect">
                <div className="level-effect__row">
                  <span className="level-effect__icon">{RES_ICONS[def.produces.resource]}</span>
                  <span className="level-effect__label">Production</span>
                  <span className="level-effect__now">+{nowRate}/min</span>
                  <span className="level-effect__sub">+{nowRate * 60}/h</span>
                </div>
              </div>
            );
          }

          // Warehouse — non-food storage
          if (buildingType === "warehouse") {
            const nowMult = warehouseCapacityMultiplier(level);
            const resList: Array<"wood" | "stone" | "iron" | "gold"> = ["wood", "stone", "iron", "gold"];
            blocks.push(
              <div key="warehouse" className="level-effect">
                <div className="level-effect__row">
                  <span className="level-effect__icon">📦</span>
                  <span className="level-effect__label">Storage bonus</span>
                  <span className="level-effect__now">+{Math.round((nowMult - 1) * 100)}%</span>
                </div>
                <div className="level-effect__grid">
                  {resList.map((t) => (
                    <div key={t} className="level-effect__cap">
                      <span className="text-[0.7rem]">{RES_ICONS[t]}</span>
                      <span>{Math.round(BASE_CAPACITY[t] * nowMult).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Granary — food storage
          if (buildingType === "granary") {
            const nowMult = granaryCapacityMultiplier(level);
            blocks.push(
              <div key="granary" className="level-effect">
                <div className="level-effect__row">
                  <span className="level-effect__icon">🌾</span>
                  <span className="level-effect__label">Food storage</span>
                  <span className="level-effect__now">+{Math.round((nowMult - 1) * 100)}%</span>
                  <span className="level-effect__sub">
                    {Math.round(BASE_CAPACITY.food * nowMult).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          }

          // Barracks / Stable / Workshop — training speed
          if (buildingType === "barracks" || buildingType === "stable" || buildingType === "workshop") {
            const nowMult = recruitSpeedMultiplier(level);
            const nowPct = Math.round((1 - nowMult) * 100);
            blocks.push(
              <div key="train" className="level-effect">
                <div className="level-effect__row">
                  <span className="level-effect__icon">⏱️</span>
                  <span className="level-effect__label">Training speed</span>
                  <span className="level-effect__now">
                    {nowPct > 0 ? `−${nowPct}%` : "base"}
                  </span>
                </div>
                {unlockedTroops.length > 0 && (
                  <div className="level-effect__grid level-effect__grid--troops">
                    {unlockedTroops.slice(0, 4).map((t) => {
                      const baseTicks = t.baseRecruitTicks;
                      const realTicks = Math.max(1, Math.ceil(baseTicks * nowMult));
                      return (
                        <div key={t.type} className="level-effect__cap">
                          <span className="text-[0.65rem]">{TROOP_ICONS[t.type] || "⚔️"}</span>
                          <span>{realTicks}m</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (blocks.length === 0) return null;
          return (
            <div className="flex flex-col gap-2">{blocks}</div>
          );
        })()}

        {/* Recruit section (barracks/stable/workshop only) */}
        {isBuilt && !isConstructing && unlockedTroops.length > 0 && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Recruit Troops</div>
            <div className="flex flex-col gap-2">
              {unlockedTroops.map((tdef) => {
                const tIcon = TROOP_ICONS[tdef.type] || "⚔️";
                const qty = recruitQty[tdef.type] || 1;
                const meetsLevel = level >= tdef.requiresBuildingLevel;
                const tInfo = troops.find((t) => t.troopType === tdef.type);
                const isRecruitingThis = !!tInfo?.isRecruiting;
                const affordable = canAffordTroop(tdef.type, qty, resources);
                const canRecruit = meetsLevel && affordable && !isRecruitingThis && !recruitLoading;
                const now = Date.now();

                return (
                  <div
                    key={tdef.type}
                    className={`rounded border p-2 transition-all ${
                      meetsLevel
                        ? "bg-[var(--surface-0)]/50 border-[var(--border-muted)]"
                        : "bg-[var(--surface-0)]/25 border-[var(--border-muted)] opacity-55"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="text-base">{tIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs">{tdef.name}</span>
                          <span className="text-fluid-xxs text-[var(--text-muted)]">
                            ATK {tdef.attack} · DEF {tdef.defense}
                          </span>
                        </div>
                        {!meetsLevel && (
                          <div className="text-fluid-xxs text-[var(--color-danger-light)] flex items-center gap-1">
                            {"🔒"} Requires Lv.{tdef.requiresBuildingLevel}
                          </div>
                        )}
                        {isRecruitingThis && tInfo && (
                          <div className="text-fluid-xxs text-[var(--color-construction-light)]">
                            Recruiting +{tInfo.recruitingQuantity} · {tInfo.recruitingTicksRemaining}m
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost preview */}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                      {Object.entries(tdef.baseCost)
                        .filter(([, v]) => v > 0)
                        .map(([type, perUnit]) => {
                          const needed = perUnit * qty;
                          const r = resources.find((r) => r.resourceType === type);
                          const elapsed = r ? (now - r.updatedAt) / 60_000 : 0;
                          const current = r
                            ? Math.min(r.amount + r.productionRate * elapsed, r.capacity)
                            : 0;
                          const enough = current >= needed;
                          return (
                            <span key={type} className="inline-flex items-center gap-0.5 text-fluid-xxs">
                              <span>{RES_ICONS[type] || ""}</span>
                              <span
                                className="font-bold"
                                style={{
                                  color: enough ? RES_COLORS[type] : "var(--color-danger-light)",
                                }}
                              >
                                {needed}
                              </span>
                            </span>
                          );
                        })}
                      <span className="inline-flex items-center gap-0.5 text-fluid-xxs text-[var(--text-muted)]">
                        {"⏱️"} {tdef.baseRecruitTicks * qty}m
                      </span>
                    </div>

                    {/* Quantity: stepper + editable input + Max + recruit */}
                    {(() => {
                      const maxQty = maxAffordable(tdef.type, resources);
                      const wasCapped = recruitCapped === tdef.type;

                      function setQty(raw: number) {
                        let v = Math.max(0, Math.round(raw));
                        let capped = false;
                        if (v > MAX_RECRUIT_QTY) { v = MAX_RECRUIT_QTY; capped = true; }
                        if (v > maxQty) { v = maxQty; capped = true; }
                        setRecruitQty((q) => ({ ...q, [tdef.type]: Math.max(1, v) }));
                        if (capped) {
                          setRecruitCapped(tdef.type);
                          setTimeout(() => setRecruitCapped((c) => c === tdef.type ? null : c), 2500);
                        } else {
                          setRecruitCapped((c) => c === tdef.type ? null : c);
                        }
                      }

                      return (
                        <>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-[var(--border-default)] rounded overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setQty(qty - 1)}
                                disabled={!meetsLevel || qty <= 1}
                                className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={MAX_RECRUIT_QTY}
                                value={qty}
                                onChange={(e) => setQty(Number(e.target.value))}
                                onBlur={() => { if (qty < 1) setQty(1); }}
                                disabled={!meetsLevel}
                                className="text-xs font-bold w-10 text-center bg-[var(--surface-0)]/50 border-none outline-none tabular-nums"
                                style={{ MozAppearance: "textfield", WebkitAppearance: "none" } as React.CSSProperties}
                              />
                              <button
                                type="button"
                                onClick={() => setQty(qty + 1)}
                                disabled={!meetsLevel || qty >= MAX_RECRUIT_QTY}
                                className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQty(maxQty)}
                              disabled={!meetsLevel || maxQty <= 0}
                              className="btn-ghost text-fluid-xxs px-1.5 py-0.5"
                              title={`Max affordable: ${maxQty}`}
                            >
                              Max
                            </button>
                            <button
                              onClick={() => handleRecruit(tdef.type as TroopType)}
                              disabled={!canRecruit}
                              className="btn-primary text-xs px-3 py-1 flex-1"
                            >
                              {recruitLoading === tdef.type ? (
                                <span className="spinner w-3 h-3" />
                              ) : (
                                "Recruit"
                              )}
                            </button>
                          </div>
                          {wasCapped && (
                            <div className="text-fluid-xxs text-[var(--color-construction-light)] mt-1 animate-fade-in">
                              ⚠️ Capped to max affordable ({maxQty})
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Construction progress */}
        {isConstructing && (
          <div className="building-detail__section">
            <div className="building-detail__section-title">Under Construction</div>
            <div className="progress-enhanced progress-enhanced--with-cancel mt-1">
              <div className="progress-enhanced__fill" style={{ width: `${pct}%` }} />
              <div className="progress-enhanced__label">
                {Math.round(pct)}% — {formatRemaining(remainingSec)} left
              </div>
              <button
                type="button"
                className="progress-enhanced__cancel"
                onClick={handleCancel}
                disabled={cancelLoading}
                title="Cancel construction (50% refund)"
                aria-label="Cancel construction"
              >
                {cancelLoading ? "…" : "✕"}
              </button>
            </div>
          </div>
        )}

        {/* At max level */}
        {atMax && !isConstructing && (
          <div className="building-detail__section text-center">
            <span className="text-lg">{"🏆"}</span>
            <div className="text-xs text-[var(--color-success)] font-bold mt-1">
              Maximum Level Reached
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
