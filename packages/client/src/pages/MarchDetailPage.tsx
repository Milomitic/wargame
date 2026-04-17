import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { TROOP_MAP, type BattleReport as SharedBattleReport } from "@wargame/shared";
import { VillageLink } from "../components/VillageLink.js";
import BattleReportDetail from "../components/BattleReportDetail.js";
import { TROOP_ICONS } from "../util/troopIcons.js";

interface MarchDetail {
  id: string;
  status: string;
  marchType: string;
  troops: Record<string, number> | "unknown";
  totalUnits: number | "unknown";
  origin: { tileId: string; coords: { x: number; y: number }; terrain: { type: string; label: string }; fiefName: string | null };
  target: { tileId: string; coords: { x: number; y: number }; terrain: { type: string; label: string }; fiefName: string | null; ownerName: string | null; campDifficulty: number | null };
  distance: number;
  departedAt: number;
  arrivesAt: number;
  createdAt: number;
  isOwner: boolean;
}

interface BattleReport {
  id: string;
  result: string;
  attackerTroops: Record<string, number>;
  defenderTroops: Record<string, number>;
  attackerLosses: Record<string, number>;
  defenderLosses: Record<string, number>;
  loot: Record<string, number> | null;
  terrainType: string;
  createdAt: number;
}


const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  marching:  { label: "Marching",  color: "var(--accent-orange)", icon: "🏴" },
  returning: { label: "Returning", color: "var(--color-info)",    icon: "↩️" },
  arrived:   { label: "Arrived",   color: "var(--color-gold)",    icon: "📍" },
  completed: { label: "Completed", color: "var(--color-success)", icon: "✅" },
};

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m ${sec}s`;
  }
  return `${m}m ${sec}s`;
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const CANCEL_WINDOW_MS = 5 * 60 * 1000; // must match server

export default function MarchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{ march: MarchDetail; battleReport: BattleReport | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{ march: MarchDetail; battleReport: BattleReport | null }>(`/marches/${id}`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!id) return;
    const ok = window.confirm(
      "Recall this army? Troops will return to garrison immediately."
    );
    if (!ok) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      await api.post(`/marches/${id}/cancel`, {});
      navigate("/army");
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!data) return;
    const isActive = data.march.status === "marching" || data.march.status === "returning";
    if (!isActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading march details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <span className="text-lg">{"⚠️"}</span>
        <p className="text-sm text-[var(--color-danger)]">{error || "March not found"}</p>
        <button onClick={() => navigate("/army")} className="btn-outline text-xs px-3 py-1">
          {"←"} Back to Army
        </button>
      </div>
    );
  }

  const { march, battleReport } = data;
  const statusCfg = STATUS_CFG[march.status] || STATUS_CFG.marching;
  const isActive = march.status === "marching" || march.status === "returning";
  const remainingMs = Math.max(0, march.arrivesAt - now);
  const totalMs = march.arrivesAt - march.departedAt;
  const progressPct = totalMs > 0 ? Math.min(100, ((totalMs - remainingMs) / totalMs) * 100) : 100;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("/army")} className="btn-ghost text-xs px-2 py-1">
          {"←"} Army
        </button>
        <h1 className="font-title text-lg font-bold text-[var(--color-gold)]">
          {statusCfg.icon} March Details
        </h1>
        <span
          className="alert-badge"
          style={{
            background: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)`,
            color: statusCfg.color,
            border: `1px solid color-mix(in srgb, ${statusCfg.color} 30%, transparent)`,
          }}
        >
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        {/* ── Route Info ── */}
        <div className="card p-4">
          <div className="section-title mb-3">{"🗺️"} Route</div>

          <div className="flex items-center gap-3 mb-3">
            {/* Origin */}
            <div className="flex-1">
              <div className="stat-label">Origin</div>
              <div className="text-sm">
                <VillageLink
                  name={march.origin.fiefName || "Your Fief"}
                  x={march.origin.coords.x}
                  y={march.origin.coords.y}
                />
              </div>
              <div className="text-xs text-[var(--text-muted)]">{march.origin.terrain.label}</div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center px-2">
              <span className="text-lg">{march.status === "returning" ? "←" : "→"}</span>
              <span className="text-[0.55rem] text-[var(--text-muted)]">{march.distance} tiles</span>
            </div>

            {/* Target: owner name on top, village [coords] below */}
            <div className="flex-1 text-right">
              <div className="stat-label">Target</div>
              {march.target.ownerName && (
                <div className="text-sm font-bold text-[var(--color-gold)]">{march.target.ownerName}</div>
              )}
              <div className="text-sm">
                {march.target.campDifficulty ? (
                  <span className="font-bold">🔥 Camp Lv.{march.target.campDifficulty}</span>
                ) : (
                  <VillageLink
                    name={march.target.fiefName || "Unknown"}
                    x={march.target.coords.x}
                    y={march.target.coords.y}
                  />
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{march.target.terrain.label}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)]">Departed {timeAgo(march.departedAt)}</span>
              {isActive ? (
                <span style={{ color: statusCfg.color }} className="font-bold font-mono">
                  ETA {formatCountdown(remainingMs)} · 🕐 {new Date(march.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  {march.status === "completed" ? "Completed" : "Arrived"} {timeAgo(march.arrivesAt)} · 🕐 {new Date(march.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="progress-track h-2">
              <div
                className={`progress-fill ${isActive ? "construction-stripes" : ""}`}
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: statusCfg.color,
                }}
              />
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            Type: {march.marchType === "attack_camp" ? "🏕️ PvE (Camp Raid)" : "⚔️ PvP (Player Attack)"}
          </div>

          {/* Cancel button — only owner, only while marching, only within 5 min */}
          {march.isOwner && march.status === "marching" && (() => {
            const elapsed = now - march.departedAt;
            const canCancel = elapsed < CANCEL_WINDOW_MS;
            const remainCancelSec = Math.max(0, Math.ceil((CANCEL_WINDOW_MS - elapsed) / 1000));
            const cancelMin = Math.floor(remainCancelSec / 60);
            const cancelSec = remainCancelSec % 60;
            if (!canCancel) return null;
            return (
              <div className="mt-3 pt-3 border-t border-[var(--border-muted)]">
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="btn-danger w-full text-xs py-2"
                >
                  {cancelLoading ? (
                    <span className="spinner w-3 h-3" />
                  ) : (
                    <>🔙 Recall Army ({cancelMin}:{cancelSec.toString().padStart(2, "0")})</>
                  )}
                </button>
                {cancelError && (
                  <div className="text-fluid-xxs text-[var(--color-danger)] mt-1 text-center">
                    ⚠️ {cancelError}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Troops ── */}
        <div className="card p-4">
          <div className="section-title mb-3">{"⚔️"} Troops</div>

          {march.troops === "unknown" ? (
            <div className="text-sm text-[var(--text-muted)] italic py-4 text-center">
              {"🔒"} Troop composition unknown (enemy march)
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {Object.entries(march.troops as Record<string, number>).map(([type, qty]) => {
                  const def = TROOP_MAP[type];
                  const icon = TROOP_ICONS[type] || "🛡️";
                  return (
                    <div key={type} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-0)]/50 border border-[var(--border-muted)]">
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{def?.name || type}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          ATK {def?.attack || "?"} &middot; DEF {def?.defense || "?"}
                        </div>
                      </div>
                      <span className="text-lg font-bold text-[var(--color-gold)]">&times;{qty}</span>
                    </div>
                  );
                })}
              </div>
              <div className="medieval-divider" />
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Total Units</span>
                <span className="font-bold">{march.totalUnits as number}</span>
              </div>
              {march.isOwner && typeof march.troops === "object" && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[var(--text-muted)]">Total ATK Power</span>
                  <span className="font-bold" style={{ color: "var(--color-danger)" }}>
                    {Object.entries(march.troops).reduce((sum, [type, qty]) => {
                      const def = TROOP_MAP[type];
                      return sum + (def?.attack || 0) * qty;
                    }, 0)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Battle Report ── */}
        {battleReport && (
          <div className="card p-4 lg:col-span-2">
            <div className="section-title mb-3">{"📜"} Battle Report</div>
            <BattleReportDetail
              report={{
                ...(battleReport as unknown as SharedBattleReport),
                tileId: march.target.tileId,
              }}
            />
          </div>
        )}

        {/* ── Timeline ── */}
        <div className="card p-4 lg:col-span-2">
          <div className="section-title mb-3">{"⏰"} Timeline</div>
          <div className="space-y-2">
            <TimelineEvent time={march.createdAt} label="March created" icon="📋" />
            <TimelineEvent time={march.departedAt} label="Army departed" icon="🏴" />
            {(march.status === "arrived" || march.status === "completed") && (
              <TimelineEvent time={march.arrivesAt} label="Army arrived at target" icon="📍" />
            )}
            {battleReport && (
              <TimelineEvent
                time={battleReport.createdAt}
                label={`Battle: ${battleReport.result === "victory" ? "Victory" : "Defeat"}`}
                icon={battleReport.result === "victory" ? "🏆" : "💀"}
                color={battleReport.result === "victory" ? "var(--color-success)" : "var(--color-danger)"}
              />
            )}
            {isActive && (
              <div className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center animate-pulse">{"🕐"}</span>
                <span className="text-[var(--text-muted)] italic">
                  {march.status === "marching" ? "En route..." : "Returning home..."} — ETA {formatCountdown(remainingMs)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ time, label, icon, color }: { time: number; label: string; icon: string; color?: string }) {
  const d = new Date(time);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-5 text-center">{icon}</span>
      <span className="text-xs text-[var(--text-muted)] font-mono min-w-[5rem]">
        {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span style={color ? { color } : undefined}>{label}</span>
    </div>
  );
}
