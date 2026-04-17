import { useState, useEffect, useRef } from "react";

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

const RESOURCE_CONFIG: Record<
  string,
  { icon: string; color: string; colorLight: string; label: string }
> = {
  wood:  { icon: "🪵",     color: "var(--res-wood)",  colorLight: "var(--res-wood-light)",  label: "Wood" },
  stone: { icon: "🪨",     color: "var(--res-stone)", colorLight: "var(--res-stone-light)", label: "Stone" },
  iron:  { icon: "⚒️",  color: "var(--res-iron)",  colorLight: "var(--res-iron-light)",  label: "Iron" },
  food:  { icon: "🌾",     color: "var(--res-food)",  colorLight: "var(--res-food-light)",  label: "Food" },
  gold:  { icon: "💰",     color: "var(--res-gold)",  colorLight: "var(--res-gold-light)",  label: "Gold" },
};

const RESOURCE_ORDER = ["wood", "stone", "iron", "food", "gold"];

export default function ResourceBar({ resources }: { resources: ResourceData[] }) {
  const [displayAmounts, setDisplayAmounts] = useState<Record<string, number>>({});
  const animRef = useRef<number>(0);
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const amounts: Record<string, number> = {};
      for (const r of resourcesRef.current) {
        const elapsed = (now - r.updatedAt) / 60_000;
        amounts[r.resourceType] = Math.min(r.amount + r.productionRate * elapsed, r.capacity);
      }
      setDisplayAmounts(amounts);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const sorted = [...resources].sort(
    (a, b) => RESOURCE_ORDER.indexOf(a.resourceType) - RESOURCE_ORDER.indexOf(b.resourceType)
  );

  return (
    <div className="sticky top-[45px] z-20 bg-[var(--surface-0)]/95 border-b border-[rgba(139,105,20,0.10)] px-4 sm:px-6 py-2 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex gap-1.5 sm:gap-3 justify-center flex-wrap">
        {sorted.map((r) => {
          const amount = displayAmounts[r.resourceType] ?? r.amount;
          const pct = (amount / r.capacity) * 100;
          const config = RESOURCE_CONFIG[r.resourceType];
          const isFull = pct >= 99;

          return (
            <div
              key={r.resourceType}
              className="tooltip-trigger flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-[var(--surface-1)]/70 border border-[rgba(139,105,20,0.10)] hover:border-[rgba(139,105,20,0.22)] transition-colors"
            >
              {/* Tooltip */}
              <div className="tooltip-content">
                <div className="font-semibold mb-0.5">{config?.label}</div>
                <div className="text-[var(--color-parchment-dim)]">
                  {Math.floor(amount).toLocaleString()} / {r.capacity.toLocaleString()}
                </div>
                <div className="text-[var(--color-success-light)] mt-0.5">
                  +{r.productionRate}/min
                </div>
                {isFull && (
                  <div className="text-[var(--color-construction-light)] mt-0.5">Storage full!</div>
                )}
              </div>

              <span className="text-xs sm:text-sm shrink-0">{config?.icon || "?"}</span>

              <div className="text-xs min-w-0">
                <div className="flex items-baseline gap-0.5 leading-tight">
                  <span className="font-bold" style={{ color: config?.color }}>
                    {Math.floor(amount).toLocaleString()}
                  </span>
                  <span className="text-fluid-xs text-[var(--color-parchment-faint)] hidden sm:inline">
                    /{r.capacity.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="progress-track h-[3px] w-10 sm:w-14">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: isFull ? "var(--color-danger)" : config?.color,
                      }}
                    />
                  </div>
                  <span className="text-fluid-xxs sm:text-fluid-xs text-[var(--color-success)]/80 whitespace-nowrap">
                    +{r.productionRate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
