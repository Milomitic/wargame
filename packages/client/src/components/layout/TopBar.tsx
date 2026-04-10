import { useState, useEffect, useRef } from "react";

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

interface TopBarProps {
  resources: ResourceData[];
  playerName: string;
  fief: {
    name: string;
    level: number;
    population: number;
    morale: number;
  } | null;
  buildings: Array<{
    buildingType: string;
    level: number;
    isConstructing: boolean;
    constructionTicksRemaining: number;
  }>;
}

const RES_CONFIG: Record<string, { icon: string; color: string }> = {
  wood:  { icon: "\u{1FAB5}",    color: "var(--res-wood)" },
  stone: { icon: "\u{1FAA8}",    color: "var(--res-stone)" },
  iron:  { icon: "\u2692\uFE0F", color: "var(--res-iron)" },
  food:  { icon: "\u{1F33E}",    color: "var(--res-food)" },
  gold:  { icon: "\u{1F4B0}",    color: "var(--res-gold)" },
};

const RES_ORDER = ["wood", "stone", "iron", "food", "gold"];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toLocaleString();
}

export default function TopBar({ resources, playerName, fief, buildings }: TopBarProps) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const animRef = useRef(0);
  const resRef = useRef(resources);
  resRef.current = resources;

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const a: Record<string, number> = {};
      for (const r of resRef.current) {
        const elapsed = (now - r.updatedAt) / 60_000;
        a[r.resourceType] = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
      }
      setAmounts(a);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const sorted = [...resources].sort(
    (a, b) => RES_ORDER.indexOf(a.resourceType) - RES_ORDER.indexOf(b.resourceType)
  );

  const constructing = buildings.filter((b) => b.isConstructing);

  const moraleColor = fief
    ? fief.morale >= 70 ? "var(--color-success)"
    : fief.morale >= 40 ? "var(--accent-orange)"
    : "var(--color-danger)"
    : "var(--text-muted)";

  return (
    <div className="topbar">
      {/* Row 1: Resources */}
      <div className="topbar__row">
        <span className="topbar__title">Medieval Wargame</span>

        <div className="topbar__resources">
          {sorted.map((r) => {
            const val = amounts[r.resourceType] ?? r.amount;
            const cfg = RES_CONFIG[r.resourceType];
            return (
              <div key={r.resourceType} className="topbar__res">
                <span className="topbar__res-icon">{cfg?.icon}</span>
                <span className="topbar__res-val" style={{ color: cfg?.color }}>
                  {formatNum(val)}
                </span>
                <span className="topbar__res-rate">+{r.productionRate}</span>
              </div>
            );
          })}
        </div>

        <div className="topbar__right">
          <span className="topbar__player">{playerName}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", cursor: "pointer" }}>
            {"\u{1F514}"}
          </span>
        </div>
      </div>

      {/* Row 2: Kingdom Stats */}
      {fief && (
        <div className="topbar__row topbar__row--secondary">
          <div className="topbar__stats">
            <div className="topbar__stat">
              <span className="topbar__stat-icon">{"\u{1F465}"}</span>
              <span className="topbar__stat-label">Pop</span>
              <span className="topbar__stat-val">{fief.population.toLocaleString()}</span>
            </div>

            <div className="topbar__stat">
              <span className="topbar__stat-icon">
                {fief.morale >= 70 ? "\u{1F60A}" : fief.morale >= 40 ? "\u{1F610}" : "\u{1F61E}"}
              </span>
              <span className="topbar__stat-label">Morale</span>
              <span className="topbar__stat-val" style={{ color: moraleColor }}>
                {fief.morale}%
              </span>
              <span className="topbar__morale-bar">
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${fief.morale}%`,
                    backgroundColor: moraleColor,
                    borderRadius: "999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </span>
            </div>

            <div className="topbar__stat">
              <span className="topbar__stat-icon">{"\u2B50"}</span>
              <span className="topbar__stat-label">Fief</span>
              <span className="topbar__stat-val">Lv.{fief.level}</span>
            </div>

            {constructing.length > 0 && (
              <div className="topbar__construction">
                <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} />
                {constructing.length} building
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
