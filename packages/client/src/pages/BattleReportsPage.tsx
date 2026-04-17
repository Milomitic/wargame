import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import { parseTileId, type BattleReport } from "@wargame/shared";
import { useSocket } from "../hooks/useSocket.js";
import { CoordLink } from "../components/CoordLink.js";
import BattleReportDetail from "../components/BattleReportDetail.js";

type FilterKey = "all" | "victory" | "defeat" | "camp" | "player";

const FILTER_LABELS: Record<FilterKey, { label: string; icon: string }> = {
  all:     { label: "All",      icon: "📜" },
  victory: { label: "Victories", icon: "🏆" },
  defeat:  { label: "Defeats",   icon: "💀" },
  camp:    { label: "Vs Camps",  icon: "🔥" },
  player:  { label: "Vs Players", icon: "⚔️" },
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function BattleReportsPage() {
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadReports = useCallback(async () => {
    try {
      const data = await api.get<{ reports: BattleReport[] }>("/battle-reports");
      setReports(data.reports);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    const id = setInterval(loadReports, 60_000);
    return () => clearInterval(id);
  }, [loadReports]);

  // Refresh when a new combat result arrives
  useSocket(
    "combat:result",
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const filtered = reports.filter((r) => {
    if (filter === "all") return true;
    if (filter === "victory") return r.result === "victory";
    if (filter === "defeat") return r.result === "defeat";
    if (filter === "camp") return r.defenderType === "camp";
    if (filter === "player") return r.defenderType === "player";
    return true;
  });

  const totals = {
    all: reports.length,
    victory: reports.filter((r) => r.result === "victory").length,
    defeat: reports.filter((r) => r.result === "defeat").length,
    camp: reports.filter((r) => r.defenderType === "camp").length,
    player: reports.filter((r) => r.defenderType === "player").length,
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{"📜"}</span>
          <div>
            <h1 className="font-title text-base font-bold text-[var(--color-gold)]">
              Battle Reports
            </h1>
            <p className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-widest">
              {totals.all} total · {totals.victory} won · {totals.defeat} lost
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((k) => {
            const cfg = FILTER_LABELS[k];
            const isActive = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`reports-filter${isActive ? " reports-filter--active" : ""}`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="reports-filter__count">{totals[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports list */}
      <div className="card p-4 sm:p-5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-3xl block mb-2 opacity-60">📜</span>
            <p className="text-sm text-[var(--text-muted)] italic">
              {reports.length === 0
                ? "No battles fought yet. Send your army on a march!"
                : "No reports match this filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const loc = parseTileId(r.tileId);
              const isVictory = r.result === "victory";
              const isExpanded = selectedId === r.id;
              const totalLosses = Object.values(r.attackerLosses).reduce(
                (s, q) => s + q,
                0
              );
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    isVictory
                      ? "bg-[var(--color-success)]/5 border-[var(--color-success)]/25 hover:border-[var(--color-success)]/45"
                      : "bg-[var(--color-danger)]/5 border-[var(--color-danger)]/25 hover:border-[var(--color-danger)]/45"
                  } ${isExpanded ? "ring-1 ring-[var(--color-gold)]/40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(isExpanded ? null : r.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{isVictory ? "🏆" : "💀"}</span>
                        <span
                          className="text-fluid-sm font-bold"
                          style={{
                            color: isVictory
                              ? "var(--color-success)"
                              : "var(--color-danger-light)",
                          }}
                        >
                          {isVictory ? "Victory" : "Defeat"}
                        </span>
                        <span className="text-fluid-xs text-[var(--text-muted)]">
                          vs {r.defenderType === "camp" ? "Barbarian Camp" : "Player"}
                        </span>
                        {totalLosses > 0 && (
                          <span className="text-fluid-xxs text-[var(--color-danger-light)] tabular-nums">
                            -{totalLosses} losses
                          </span>
                        )}
                      </div>
                      <div className="text-fluid-xxs text-[var(--text-muted)]">
                        (<CoordLink x={loc.x} y={loc.y} />) · {formatTimeAgo(r.createdAt)}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-[var(--border-muted)]">
                      <BattleReportDetail report={r} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
