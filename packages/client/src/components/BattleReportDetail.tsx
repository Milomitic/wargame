import { TROOP_MAP, parseTileId, type BattleReport } from "@wargame/shared";
import { CoordLink } from "./CoordLink.js";
import { TROOP_ICONS } from "../util/troopIcons.js";

// Mapping troop type → accurate icon for reuse in the mini troop rows.

interface Props {
  report: BattleReport;
  compact?: boolean;
}

const RESOURCE_ICONS: Record<string, string> = {
  wood: "🪵",
  stone: "🪨",
  iron: "⚒️",
  gold: "💰",
  food: "🌾",
};

function sum(obj: Record<string, number>): number {
  return Object.values(obj).reduce((s, q) => s + q, 0);
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ForcesColumnProps {
  label: string;
  icon: string;
  troops: Record<string, number>;
  losses: Record<string, number>;
  isWinner: boolean;
  side: "attacker" | "defender";
}

function ForcesColumn({
  label,
  icon,
  troops,
  losses,
  isWinner,
  side,
}: ForcesColumnProps) {
  const totalLosses = sum(losses);
  const total = sum(troops);

  return (
    <div
      className={`br-forces br-forces--${side} ${isWinner ? "br-forces--winner" : "br-forces--loser"}`}
    >
      <div className="br-forces__header">
        <span className="br-forces__icon">{icon}</span>
        <span className="br-forces__label">{label}</span>
        {isWinner ? (
          <span className="br-forces__badge br-forces__badge--winner">
            🏆 Winner
          </span>
        ) : (
          <span className="br-forces__badge br-forces__badge--loser">
            Defeated
          </span>
        )}
      </div>

      <div className="br-forces__list">
        {Object.entries(troops).map(([type, qty]) => {
          const lost = losses[type] || 0;
          const remaining = Math.max(0, qty - lost);
          const ratio = qty > 0 ? remaining / qty : 0;
          const wipedOut = remaining === 0;
          return (
            <div key={type} className="br-troop-row">
              <span className="br-troop-row__icon">{TROOP_ICONS[type] || "⚔️"}</span>
              <span className="br-troop-row__name">{TROOP_MAP[type]?.name || type}</span>
              <div className="br-troop-row__bar">
                <div
                  className="br-troop-row__bar-fill"
                  style={{
                    width: `${ratio * 100}%`,
                    background: wipedOut
                      ? "var(--color-danger)"
                      : lost === 0
                      ? "var(--color-success)"
                      : "var(--color-danger-light)",
                  }}
                />
              </div>
              <span className="br-troop-row__count">
                <strong>{remaining}</strong>/{qty}
              </span>
              {lost > 0 && (
                <span className="br-troop-row__loss">−{lost}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="br-forces__footer">
        <span className="br-forces__footer-label">Total losses</span>
        <span className={`br-forces__footer-val ${totalLosses > 0 ? "br-forces__footer-val--danger" : ""}`}>
          {totalLosses > 0 ? `−${totalLosses}` : "0"}
          <span className="br-forces__footer-total">/ {total}</span>
        </span>
      </div>
    </div>
  );
}

export default function BattleReportDetail({ report }: Props) {
  const isVictory = report.result === "victory";
  const loc = parseTileId(report.tileId);
  const hasLoot =
    report.loot && Object.values(report.loot).some((v) => v > 0);

  return (
    <div className={`br-detail br-detail--${isVictory ? "victory" : "defeat"}`}>
      {/* ── Banner header ── */}
      <div className="br-banner">
        <div className="br-banner__icon">{isVictory ? "🏆" : "💀"}</div>
        <div className="br-banner__text">
          <div className="br-banner__title">
            {isVictory ? "Victory" : "Defeat"}
          </div>
          <div className="br-banner__subtitle">
            vs {report.defenderType === "camp" ? "Barbarian Camp" : "Enemy Lord"}
          </div>
        </div>
        <div className="br-banner__meta">
          <span className="br-banner__coord">
            <CoordLink x={loc.x} y={loc.y} />
          </span>
          <span className="br-banner__terrain">{report.terrainType}</span>
          <span className="br-banner__time">{formatTimeAgo(report.createdAt)}</span>
        </div>
      </div>

      {/* ── Two-column forces ── */}
      <div className="br-forces-grid">
        <ForcesColumn
          label="Attacker"
          icon="⚔️"
          troops={report.attackerTroops}
          losses={report.attackerLosses}
          isWinner={isVictory}
          side="attacker"
        />
        <ForcesColumn
          label="Defender"
          icon="🛡️"
          troops={report.defenderTroops}
          losses={report.defenderLosses}
          isWinner={!isVictory}
          side="defender"
        />
      </div>

      {/* ── Loot captured banner (gold sheen) ── */}
      {hasLoot && (
        <div className="br-loot">
          <div className="br-loot__header">
            <span className="br-loot__icon">💰</span>
            <span className="br-loot__title">Loot Captured</span>
          </div>
          <div className="br-loot__items">
            {Object.entries(report.loot!)
              .filter(([, v]) => v > 0)
              .map(([type, amount]) => (
                <span key={type} className="br-loot__item">
                  <span className="br-loot__item-icon">{RESOURCE_ICONS[type] || ""}</span>
                  <span className="br-loot__item-val">+{amount.toLocaleString()}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
