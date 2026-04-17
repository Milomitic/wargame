import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { parseTileId, TROOP_MAP, type TroopComposition } from "@wargame/shared";
import { useSocket } from "../hooks/useSocket.js";
import { CoordLink } from "../components/CoordLink.js";
import { PlayerLink } from "../components/PlayerLink.js";
import { VillageLink } from "../components/VillageLink.js";
import { TROOP_ICONS } from "../util/troopIcons.js";

function formatRemaining(secondsLeft: number): string {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

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
  targetFiefName: string | null;
  targetPlayerName: string | null;
  targetPlayerId: string | null;
}

interface IncomingMarch {
  id: string;
  playerId: string;
  attackerName: string;
  attackerFiefName: string | null;
  originTileId: string;
  targetTileId: string;
  arrivesAt: number;
}

interface FiefSummary {
  population: number;
  morale: number;
  level: number;
}

interface PlayerStats {
  score: number;
  attackKills: number;
  defenseKills: number;
}

interface TroopRow {
  troopType: string;
  quantity: number;
}

const STATUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  marching:  { label: "Marching",  icon: "⚔️", color: "var(--color-construction-light)" },
  returning: { label: "Returning", icon: "↩️", color: "var(--color-info-light)" },
  completed: { label: "Completed", icon: "✔️", color: "var(--color-success)" },
};

export default function ArmyPage() {
  const navigate = useNavigate();
  const [marches, setMarches] = useState<MarchData[]>([]);
  const [incoming, setIncoming] = useState<IncomingMarch[]>([]);
  const [troops, setTroops] = useState<TroopRow[]>([]);
  const [fief, setFief] = useState<FiefSummary | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const CANCEL_WINDOW_MS = 5 * 60 * 1000;

  useEffect(() => {
    const anyActive = marches.some((m) => m.status !== "completed");
    if (!anyActive && incoming.length === 0) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [marches, incoming]);

  const loadData = useCallback(async () => {
    try {
      const [marchRes, incomingRes, fiefRes] = await Promise.all([
        api.get<{ marches: MarchData[] }>("/marches"),
        api
          .get<{ incoming: IncomingMarch[] }>("/marches/incoming")
          .catch(() => ({ incoming: [] as IncomingMarch[] })),
        api.get<{ fief: FiefSummary; troops: TroopRow[] }>("/fief"),
      ]);
      setMarches(marchRes.marches);
      setIncoming(incomingRes.incoming || []);
      setTroops(fiefRes.troops || []);
      setFief(fiefRes.fief);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const me = await api.get<{ player: { id: string } }>("/auth/me");
      const profile = await api.get<{
        profile: { score: number; attackKills: number; defenseKills: number };
      }>(`/players/${me.player.id}/profile`);
      setStats({
        score: profile.profile.score,
        attackKills: profile.profile.attackKills,
        defenseKills: profile.profile.defenseKills,
      });
    } catch {
      // silent
    }
  }, []);

  const handleCancelMarch = useCallback(async (marchId: string) => {
    const ok = window.confirm("Recall this army? Troops will return to garrison immediately.");
    if (!ok) return;
    setCancellingId(marchId);
    try {
      await api.post(`/marches/${marchId}/cancel`, {});
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel march");
    } finally {
      setCancellingId(null);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
    loadStats();
    const interval = setInterval(loadData, 30_000);
    const statsInt = setInterval(loadStats, 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(statsInt);
    };
  }, [loadData, loadStats]);

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
      loadStats();
    }, [loadData, loadStats])
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading army...</span>
      </div>
    );
  }

  const activeMarches = marches.filter((m) => m.status !== "completed");
  const totalTroops = troops.reduce((s, t) => s + t.quantity, 0);
  const totalAtk = troops.reduce(
    (s, t) => s + (TROOP_MAP[t.troopType]?.attack ?? 0) * t.quantity,
    0
  );
  const totalDef = troops.reduce(
    (s, t) => s + (TROOP_MAP[t.troopType]?.defense ?? 0) * t.quantity,
    0
  );

  return (
    <div className="army-page">
      {/* ── Incoming attacks banner (full width, only when under attack) ── */}
      {incoming.length > 0 && (
        <div className="army-incoming">
          <div className="army-incoming__header">
            <span className="army-incoming__icon">🚨</span>
            <span className="army-incoming__title">Incoming Attacks</span>
            <span className="army-incoming__count">{incoming.length}</span>
          </div>
          <div className="army-incoming__list">
            {incoming.map((m) => {
              const target = parseTileId(m.targetTileId);
              const secondsLeft = Math.max(0, (m.arrivesAt - nowTs) / 1000);
              const arrivalTime = new Date(m.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={m.id} className="army-incoming__row">
                  <div className="army-incoming__who">
                    <div className="army-incoming__player-row">
                      {"☠️"}{" "}
                      <PlayerLink playerId={m.playerId} name={m.attackerName} className="text-[var(--color-danger-light)]" />
                    </div>
                    {m.attackerFiefName && (
                      <div className="army-incoming__village-row">
                        <VillageLink
                          name={m.attackerFiefName}
                          x={Number(m.originTileId.split(",")[0])}
                          y={Number(m.originTileId.split(",")[1])}
                        />
                      </div>
                    )}
                  </div>
                  <div className="army-incoming__when">
                    <span className="army-incoming__eta">{formatRemaining(secondsLeft)}</span>
                    <span className="army-incoming__arrival-time">· 🕐 {arrivalTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top row: Garrison (left) + Active Marches (right) ── */}
      <div className="army-top">
        {/* Garrison column */}
        <div className="army-card army-card--garrison">
          <div className="army-card__header">
            <span className="army-card__header-icon">🏰</span>
            <span className="army-card__header-title">Garrison</span>
            <span className="army-card__header-badge">{totalTroops}</span>
            {fief && (
              <span className="army-card__header-sub ml-auto">
                👥 {fief.population} · ❤️ {fief.morale}%
              </span>
            )}
          </div>
          <div className="army-card__body">
            {totalTroops === 0 ? (
              <div className="army-empty">
                <span className="army-empty__icon">🛡️</span>
                <p className="army-empty__text">
                  No troops stationed. Recruit in the Barracks.
                </p>
                <button
                  onClick={() => navigate("/dashboard?b=barracks")}
                  className="btn-primary btn-sm"
                >
                  ⚔️ Recruit Troops
                </button>
              </div>
            ) : (
              <div className="army-troop-grid">
                {troops
                  .filter((t) => t.quantity > 0)
                  .map((t) => {
                    const def = TROOP_MAP[t.troopType];
                    return (
                      <div key={t.troopType} className="army-troop">
                        <span className="army-troop__icon">
                          {TROOP_ICONS[t.troopType] || "⚔️"}
                        </span>
                        <div className="army-troop__info">
                          <span className="army-troop__name">
                            {def?.name || t.troopType}
                          </span>
                          <span className="army-troop__stats">
                            ATK {def?.attack ?? 0} · DEF {def?.defense ?? 0}
                          </span>
                        </div>
                        <span className="army-troop__qty">
                          ×{t.quantity}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Active Marches column */}
        <div className="army-card army-card--marches">
          <div className="army-card__header">
            <span className="army-card__header-icon">🗺️</span>
            <span className="army-card__header-title">Active Marches</span>
            {activeMarches.length > 0 && (
              <span className="army-card__header-badge army-card__header-badge--march">
                {activeMarches.length}
              </span>
            )}
          </div>
          <div className="army-card__body">
            {activeMarches.length === 0 ? (
              <div className="army-empty">
                <span className="army-empty__icon">🗺️</span>
                <p className="army-empty__text">
                  No active marches. Attack from the world map.
                </p>
                <button
                  onClick={() => navigate("/map")}
                  className="btn-primary btn-sm"
                >
                  🗺️ Open Map
                </button>
              </div>
            ) : (
              <div className="army-march-list">
                {activeMarches.map((m) => {
                  const origin = parseTileId(m.originTileId);
                  const target = parseTileId(m.targetTileId);
                  const distance = Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y);
                  const statusInfo = STATUS_LABELS[m.status] || {
                    label: m.status,
                    icon: "📍",
                    color: "var(--text-muted)",
                  };
                  const totalMs = Math.max(1, m.arrivesAt - m.departedAt);
                  const elapsed = Math.max(0, nowTs - m.departedAt);
                  const secondsLeft = Math.max(0, (m.arrivesAt - nowTs) / 1000);
                  const pct = Math.min(100, Math.max(2, (elapsed / totalMs) * 100));
                  const marchUnits = Object.values(m.troops).reduce((s, q) => s + q, 0);
                  const marchAtk = Object.entries(m.troops).reduce(
                    (s, [t, q]) => s + (TROOP_MAP[t]?.attack ?? 0) * q, 0
                  );
                  const marchDef = Object.entries(m.troops).reduce(
                    (s, [t, q]) => s + (TROOP_MAP[t]?.defense ?? 0) * q, 0
                  );
                  const canCancel = m.status === "marching" && (nowTs - m.departedAt) < CANCEL_WINDOW_MS;
                  const cancelRemainSec = canCancel
                    ? Math.max(0, Math.ceil((CANCEL_WINDOW_MS - (nowTs - m.departedAt)) / 1000))
                    : 0;

                  return (
                    <div key={m.id} className="army-march" onClick={() => navigate(`/march/${m.id}`)}>
                      {/* Header row: status + type */}
                      <div className="army-march__top">
                        <span
                          className="army-march__status"
                          style={{ color: statusInfo.color }}
                        >
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span className="army-march__type">
                          {m.marchType === "attack_camp"
                            ? "🏕️ Camp Raid"
                            : m.marchType === "attack_player"
                            ? "⚔️ Player Attack"
                            : "March"}
                        </span>
                      </div>

                      {/* Target identity: Player (top) → Village [coords] (below) */}
                      <div className="army-march__identity">
                        {m.targetPlayerName && m.targetPlayerId && (
                          <div className="army-march__player-row">
                            <span>→</span>
                            <PlayerLink playerId={m.targetPlayerId} name={m.targetPlayerName} />
                          </div>
                        )}
                        <div className="army-march__village-row">
                          {m.targetFiefName ? (
                            <VillageLink name={m.targetFiefName} x={target.x} y={target.y} />
                          ) : (
                            <span className="text-fluid-xs text-[var(--text-muted)]">[{target.x}, {target.y}]</span>
                          )}
                          <span className="army-march__distance">· {distance} tiles</span>
                        </div>
                      </div>

                      {/* Timing: ETA + arrival clock */}
                      <div className="army-march__timing-row">
                        <span className="army-march__eta-inline">
                          ETA {formatRemaining(secondsLeft)}
                        </span>
                        <span className="army-march__arrival-time">
                          · 🕐 {new Date(m.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Troops */}
                      <div className="army-march__troops">
                        {Object.entries(m.troops).map(([type, qty]) => {
                          const def = TROOP_MAP[type];
                          return (
                            <span key={type} className="army-march__troop-pill" title={def?.name || type}>
                              {TROOP_ICONS[type] || "⚔️"} {qty}
                            </span>
                          );
                        })}
                      </div>

                      {/* Progress bar with time inside */}
                      <div className="army-march__bar-row">
                        <div className="army-march__bar army-march__bar--labeled">
                          <div
                            className="army-march__bar-fill"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: statusInfo.color,
                            }}
                          />
                          <span className="army-march__bar-text">
                            {formatRemaining(secondsLeft)} — {Math.round(pct)}%
                          </span>
                        </div>
                      </div>

                      {/* Recall link (subtle, only within 5 min window) */}
                      {canCancel && (
                        <div className="army-march__cancel-row">
                          <button
                            className="army-march__cancel-link"
                            disabled={cancellingId === m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelMarch(m.id);
                            }}
                          >
                            {cancellingId === m.id ? (
                              <span className="spinner w-3 h-3" />
                            ) : (
                              <>↩ Recall ({Math.floor(cancelRemainSec / 60)}:{(cancelRemainSec % 60).toString().padStart(2, "0")})</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row (below) ── */}
      <div className="army-stats">
        <div className="army-stat">
          <span className="army-stat__icon">⚔️</span>
          <div className="army-stat__body">
            <span className="army-stat__val" style={{ color: "var(--color-danger)" }}>
              {totalAtk.toLocaleString()}
            </span>
            <span className="army-stat__label">Total ATK</span>
          </div>
        </div>
        <div className="army-stat">
          <span className="army-stat__icon">🛡️</span>
          <div className="army-stat__body">
            <span className="army-stat__val" style={{ color: "var(--color-info)" }}>
              {totalDef.toLocaleString()}
            </span>
            <span className="army-stat__label">Total DEF</span>
          </div>
        </div>
        <div className="army-stat">
          <span className="army-stat__icon">🏆</span>
          <div className="army-stat__body">
            <span className="army-stat__val" style={{ color: "var(--color-gold)" }}>
              {(stats?.score ?? 0).toLocaleString()}
            </span>
            <span className="army-stat__label">Score</span>
          </div>
        </div>
        <div className="army-stat">
          <span className="army-stat__icon">💥</span>
          <div className="army-stat__body">
            <span className="army-stat__val" style={{ color: "var(--color-danger-light)" }}>
              {(stats?.attackKills ?? 0).toLocaleString()}
            </span>
            <span className="army-stat__label">Attack Kills</span>
          </div>
        </div>
        <div className="army-stat">
          <span className="army-stat__icon">🛡️</span>
          <div className="army-stat__body">
            <span className="army-stat__val" style={{ color: "var(--color-info-light)" }}>
              {(stats?.defenseKills ?? 0).toLocaleString()}
            </span>
            <span className="army-stat__label">Defense Kills</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="army-footer">
        📜{" "}
        <button
          onClick={() => navigate("/inbox?tab=reports")}
          className="army-footer__link"
        >
          Battle Reports
        </button>
      </div>
    </div>
  );
}
