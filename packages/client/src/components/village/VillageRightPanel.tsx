import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TROOP_MAP, TICK_INTERVAL_MS, type TroopComposition } from "@wargame/shared";
import { api } from "../../api/client.js";
import { useSocket } from "../../hooks/useSocket.js";
import { TROOP_ICONS } from "../../util/troopIcons.js";

interface TroopData {
  troopType: string;
  quantity: number;
  isRecruiting: boolean;
  recruitingQuantity: number;
  recruitingTicksRemaining: number;
  recruitingStartedAt?: number | null;
}

const TICK_MS = 60_000;

function formatRecruitRemaining(t: TroopData, baseTicks: number, nowMs: number): string {
  const totalTicks = baseTicks * t.recruitingQuantity;
  const totalMs = totalTicks * TICK_MS;
  let secondsLeft: number;
  if (t.recruitingStartedAt) {
    const elapsed = Math.max(0, nowMs - t.recruitingStartedAt);
    secondsLeft = Math.max(0, (totalMs - elapsed) / 1000);
  } else {
    secondsLeft = t.recruitingTicksRemaining * 60;
  }
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
  constructionTicksRemaining: number;
}

interface IncomingMarch {
  id: string;
  playerId: string;
  attackerName: string;
  originTileId: string;
  targetTileId: string;
  troops: TroopComposition;
  marchType: string;
  status: string;
  arrivesAt: number;
  ticksRemaining: number;
}

interface OutgoingMarch {
  id: string;
  targetTileId: string;
  troops: TroopComposition;
  marchType: string;
  status: string;
  arrivesAt: number;
  ticksRemaining: number;
}

interface VillageRightPanelProps {
  troops: TroopData[];
  buildings: BuildingData[];
  onSelectBuilding: (type: string) => void;
}


function formatEta(arrivesAt: number): string {
  const ms = Math.max(0, arrivesAt - Date.now());
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export default function VillageRightPanel({
  troops,
  buildings,
  onSelectBuilding,
}: VillageRightPanelProps) {
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<IncomingMarch[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingMarch[]>([]);
  const [, forceTick] = useState(0);

  const loadMarches = useCallback(async () => {
    try {
      const [inc, mine] = await Promise.all([
        api.get<{ incoming: IncomingMarch[] }>("/marches/incoming"),
        api.get<{ marches: OutgoingMarch[] }>("/marches"),
      ]);
      setIncoming(inc.incoming || []);
      setOutgoing(
        (mine.marches || []).filter(
          (m) => m.status === "marching" || m.status === "returning"
        )
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadMarches();
    const id = setInterval(loadMarches, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadMarches]);

  // Tick the ETA labels every second
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Refresh on relevant socket events
  useSocket("march:arrived", useCallback(() => loadMarches(), [loadMarches]));
  useSocket("combat:result", useCallback(() => loadMarches(), [loadMarches]));
  useSocket(
    "combat:raid_incoming",
    useCallback(() => loadMarches(), [loadMarches])
  );

  const totalTroops = troops.reduce((sum, t) => sum + t.quantity, 0);
  const presentTroops = troops.filter((t) => t.quantity > 0);
  const recruitingTroops = troops.filter((t) => t.isRecruiting);

  const hasBarracks = buildings.some((b) => b.buildingType === "barracks");
  const hasStable = buildings.some((b) => b.buildingType === "stable");

  function goToBarracks() {
    if (hasBarracks) {
      onSelectBuilding("barracks");
    } else {
      onSelectBuilding("barracks"); // detail will show "Build" path
    }
  }

  return (
    <aside className="village-right-panel">
      {/* ── Garrison ───────────────────────────────────── */}
      <section className="vrp__section">
        <header className="vrp__header">
          <span className="vrp__header-title">
            <span>{"⚔️"}</span> Garrison
          </span>
          <span className="vrp__header-count">{totalTroops}</span>
        </header>

        {presentTroops.length === 0 ? (
          <div className="vrp__empty">
            <p className="vrp__empty-text">No troops stationed.</p>
            {hasBarracks ? (
              <button
                type="button"
                onClick={goToBarracks}
                className="btn-primary btn-sm w-full"
              >
                {"⚔️"} Recruit in Barracks
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectBuilding("barracks")}
                className="btn-secondary btn-sm w-full"
              >
                {"🔒"} Build Barracks
              </button>
            )}
          </div>
        ) : (
          <ul className="vrp__list">
            {presentTroops.map((t) => {
              const def = TROOP_MAP[t.troopType];
              return (
                <li key={t.troopType} className="vrp__troop-row">
                  <span className="vrp__troop-icon">
                    {TROOP_ICONS[t.troopType] || "🛡️"}
                  </span>
                  <span className="vrp__troop-name">{def?.name ?? t.troopType}</span>
                  <span className="vrp__troop-qty">{t.quantity}</span>
                </li>
              );
            })}
          </ul>
        )}

        {recruitingTroops.length > 0 && (
          <div className="vrp__recruiting">
            <div className="vrp__sub-title">Recruiting</div>
            {recruitingTroops.map((t) => {
              const def = TROOP_MAP[t.troopType];
              return (
                <div key={`r-${t.troopType}`} className="vrp__troop-row vrp__troop-row--recruiting">
                  <span className="vrp__troop-icon">{TROOP_ICONS[t.troopType] || "⚔️"}</span>
                  <span className="vrp__troop-name">{def?.name ?? t.troopType}</span>
                  <span
                    className="vrp__troop-eta"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    +{t.recruitingQuantity} · {formatRecruitRemaining(t, def?.baseRecruitTicks ?? 1, Date.now())}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {presentTroops.length > 0 && (
          <button
            type="button"
            onClick={goToBarracks}
            className="btn-primary btn-sm w-full mt-2"
          >
            {hasBarracks ? "⚔️ Recruit More" : "🔒 Build Barracks"}
          </button>
        )}
        {!hasStable && presentTroops.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectBuilding("stable")}
            className="btn-secondary btn-sm w-full mt-1.5"
          >
            🐎 Build Stable
          </button>
        )}
      </section>

      {/* ── Incoming attacks ──────────────────────────── */}
      <section className="vrp__section">
        <header className="vrp__header">
          <span className="vrp__header-title">
            <span>{"🔥"}</span> Incoming
          </span>
          {incoming.length > 0 && (
            <span className="vrp__header-count vrp__header-count--danger">
              {incoming.length}
            </span>
          )}
        </header>

        {incoming.length === 0 ? (
          <p className="vrp__empty-text">No threats detected.</p>
        ) : (
          <ul className="vrp__list">
            {incoming.map((m) => {
              const totalAttackers = Object.values(m.troops).reduce(
                (s, q) => s + (q as number),
                0
              );
              return (
                <li key={m.id} className="vrp__march vrp__march--incoming cursor-pointer" onClick={() => navigate(`/march/${m.id}`)}>
                  <div className="vrp__march-head">
                    <span className="vrp__march-icon">{"☠️"}</span>
                    <span className="vrp__march-name" title={m.attackerName}>
                      {m.attackerName} ({m.originTileId})
                    </span>
                  </div>
                  <div className="vrp__march-meta">
                    {totalAttackers} units · ETA {formatEta(m.arrivesAt)} · 🕐 {new Date(m.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Outgoing marches ─────────────────────────── */}
      <section className="vrp__section">
        <header className="vrp__header">
          <span className="vrp__header-title">
            <span>{"🏴"}</span> Marches
          </span>
          {outgoing.length > 0 && <span className="vrp__header-count">{outgoing.length}</span>}
        </header>

        {outgoing.length === 0 ? (
          <div className="vrp__empty">
            <p className="vrp__empty-text">No active marches.</p>
            <button
              type="button"
              onClick={() => navigate("/map")}
              className="btn-secondary btn-sm w-full"
            >
              {"🗺️"} Open World Map
            </button>
          </div>
        ) : (
          <ul className="vrp__list">
            {outgoing.map((m) => {
              const total = Object.values(m.troops).reduce(
                (s, q) => s + (q as number),
                0
              );
              const isReturning = m.status === "returning";
              return (
                <li key={m.id} className="vrp__march cursor-pointer" onClick={() => navigate(`/march/${m.id}`)}>
                  <div className="vrp__march-head">
                    <span className="vrp__march-icon">
                      {isReturning ? "↩️" : "🏴"}
                    </span>
                    <span className="vrp__march-name">
                      {isReturning ? "Returning" : m.marchType === "attack_camp" ? "Raid camp" : "Attack"} → {m.targetTileId}
                    </span>
                  </div>
                  <div className="vrp__march-meta">
                    {total} units · ETA {formatEta(m.arrivesAt)} · 🕐 {new Date(m.arrivesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
