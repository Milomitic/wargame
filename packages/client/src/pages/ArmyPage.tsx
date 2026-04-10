import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import { TROOP_MAP, parseTileId, type BattleReport, type TroopComposition } from "@wargame/shared";
import { useSocket } from "../hooks/useSocket.js";

interface MarchData {
  id: string;
  targetTileId: string;
  originTileId: string;
  troopsJson: string;
  troops: TroopComposition;
  marchType: string;
  status: string;
  ticksRemaining: number;
  departedAt: number;
  arrivesAt: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  marching: { label: "Marching", color: "var(--color-construction-light)" },
  returning: { label: "Returning", color: "var(--color-info-light)" },
  completed: { label: "Completed", color: "var(--color-success)" },
};

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

export default function ArmyPage() {
  const [marches, setMarches] = useState<MarchData[]>([]);
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BattleReport | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [marchRes, reportRes] = await Promise.all([
        api.get<{ marches: MarchData[] }>("/marches"),
        api.get<{ reports: BattleReport[] }>("/battle-reports"),
      ]);
      setMarches(marchRes.marches);
      setReports(reportRes.reports);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Listen for march and combat events
  useSocket(
    "march:progress",
    useCallback(
      (data: { marchId: string; ticksRemaining: number; status: string }) => {
        setMarches((prev) =>
          prev.map((m) =>
            m.id === data.marchId
              ? { ...m, ticksRemaining: data.ticksRemaining, status: data.status }
              : m
          )
        );
      },
      []
    )
  );

  useSocket(
    "combat:result",
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading...</span>
      </div>
    );
  }

  const activeMarches = marches.filter((m) => m.status !== "completed");

  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
      {/* Active Marches */}
      <div className="card p-4 sm:p-5">
        <h2 className="font-title text-base font-bold text-[var(--color-gold)] flex items-center gap-2 mb-4">
          <span>{"\u{1F6E1}\uFE0F"}</span> Active Marches
          {activeMarches.length > 0 && (
            <span className="alert-badge alert-badge--building">
              {activeMarches.length} active
            </span>
          )}
        </h2>

        {activeMarches.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No active marches. Attack a barbarian camp from the map to send your army.
          </p>
        ) : (
          <div className="space-y-2">
            {activeMarches.map((m) => {
              const target = parseTileId(m.targetTileId);
              const statusInfo = STATUS_LABELS[m.status] || {
                label: m.status,
                color: "var(--text-muted)",
              };

              return (
                <div
                  key={m.id}
                  className="rounded-lg p-3 border bg-[var(--surface-0)]/50 border-[var(--border-muted)] animate-pulse-glow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color: statusInfo.color }} className="text-xs font-semibold">
                        {statusInfo.label}
                      </span>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">
                        {m.marchType === "attack_camp" ? "Attacking Camp" : "March"}
                      </span>
                    </div>
                    <span className="text-[0.65rem] font-mono text-[var(--text-muted)]">
                      ({target.x}, {target.y})
                    </span>
                  </div>

                  {/* Troops in march */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Object.entries(m.troops).map(([type, qty]) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 text-[0.65rem] bg-[var(--surface-1)] px-1.5 py-0.5 rounded border border-[var(--border-muted)]"
                      >
                        <span>{TROOP_ICONS[type] || "\u2694\uFE0F"}</span>
                        <span className="font-semibold">{qty}</span>
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-[0.6rem] mb-1">
                    <span className="text-[var(--text-muted)]">
                      {m.status === "returning" ? "Returning home" : "En route"}
                    </span>
                    <span style={{ color: statusInfo.color }}>
                      {m.ticksRemaining}m remaining
                    </span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div
                      className="progress-fill construction-stripes"
                      style={{
                        width: `${Math.max(5, 100 - (m.ticksRemaining / Math.max(1, m.ticksRemaining + 1)) * 100)}%`,
                        backgroundColor: statusInfo.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Battle Reports */}
      <div className="card p-4 sm:p-5">
        <h2 className="font-title text-base font-bold text-[var(--color-gold)] flex items-center gap-2 mb-4">
          <span>{"\u{1F4DC}"}</span> Battle Reports
        </h2>

        {reports.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No battles fought yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {reports.map((r) => {
              const loc = parseTileId(r.tileId);
              const isVictory = r.result === "victory";
              const totalLosses = Object.values(r.attackerLosses).reduce(
                (s, q) => s + q,
                0
              );
              const timeAgo = formatTimeAgo(r.createdAt);

              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                  className={`w-full text-left rounded-lg p-3 border transition-all ${
                    isVictory
                      ? "bg-[var(--color-success)]/5 border-[var(--color-success)]/20 hover:border-[var(--color-success)]/40"
                      : "bg-[var(--color-danger)]/5 border-[var(--color-danger)]/20 hover:border-[var(--color-danger)]/40"
                  } ${selectedReport?.id === r.id ? "ring-1 ring-[var(--color-gold)]/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {isVictory ? "\u{1F3C6}" : "\u{1F480}"}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: isVictory
                            ? "var(--color-success)"
                            : "var(--color-danger-light)",
                        }}
                      >
                        {isVictory ? "Victory" : "Defeat"}
                      </span>
                      <span className="text-[0.65rem] text-[var(--text-muted)]">
                        vs {r.defenderType === "camp" ? "Barbarian Camp" : "Player"}
                      </span>
                    </div>
                    <div className="text-[0.6rem] text-[var(--text-muted)]">
                      ({loc.x},{loc.y}) &middot; {timeAgo}
                    </div>
                  </div>

                  {totalLosses > 0 && (
                    <div className="text-[0.6rem] text-[var(--color-danger-light)] mt-1">
                      -{totalLosses} casualties
                    </div>
                  )}

                  {/* Expanded detail */}
                  {selectedReport?.id === r.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-muted)] space-y-3">
                      {/* Attacker forces */}
                      <div>
                        <div className="stat-label mb-1">Your Forces</div>
                        <div className="space-y-0.5">
                          {Object.entries(r.attackerTroops).map(([type, qty]) => {
                            const lost = r.attackerLosses[type] || 0;
                            return (
                              <div key={type} className="flex items-center justify-between text-[0.65rem]">
                                <span className="flex items-center gap-1">
                                  <span>{TROOP_ICONS[type] || "\u2694\uFE0F"}</span>
                                  {TROOP_MAP[type]?.name || type}
                                </span>
                                <span>
                                  <span className="text-[var(--text-secondary)]">{qty}</span>
                                  {lost > 0 && (
                                    <span className="text-[var(--color-danger-light)] ml-1">
                                      (-{lost})
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Defender forces */}
                      <div>
                        <div className="stat-label mb-1">Enemy Forces</div>
                        <div className="space-y-0.5">
                          {Object.entries(r.defenderTroops).map(([type, qty]) => {
                            const lost = r.defenderLosses[type] || 0;
                            return (
                              <div key={type} className="flex items-center justify-between text-[0.65rem]">
                                <span className="flex items-center gap-1">
                                  <span>{TROOP_ICONS[type] || "\u2694\uFE0F"}</span>
                                  {TROOP_MAP[type]?.name || type}
                                </span>
                                <span>
                                  <span className="text-[var(--text-secondary)]">{qty}</span>
                                  {lost > 0 && (
                                    <span className="text-[var(--color-danger-light)] ml-1">
                                      (-{lost})
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Loot */}
                      {r.loot && Object.keys(r.loot).length > 0 && (
                        <div>
                          <div className="stat-label mb-1">Loot Gained</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(r.loot).map(([type, amount]) => (
                              <span
                                key={type}
                                className="inline-flex items-center gap-0.5 text-[0.65rem] text-[var(--color-success)]"
                              >
                                <span>{RESOURCE_ICONS[type] || ""}</span>
                                +{amount}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[0.55rem] text-[var(--text-muted)]">
                        Terrain: {r.terrainType}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
