import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PLAYER_AVATAR_GLYPHS,
  BUILDINGS,
  type LeaderboardData,
} from "@wargame/shared";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { formatPlayerName } from "../../util/displayName.js";

interface ResourceData {
  resourceType: string;
  amount: number;
  capacity: number;
  productionRate: number;
  updatedAt: number;
}

interface BuildingData {
  buildingType: string;
  level: number;
  isConstructing: boolean;
}

interface TopBarProps {
  resources: ResourceData[];
  buildings?: BuildingData[];
  playerName: string;
  playerAvatar?: string;
  playerIsAdmin?: boolean;
  leaderboard: LeaderboardData | null;
  onOpenLeaderboard: () => void;
  reportUnreadCount?: number;
  messageUnreadCount?: number;
  notificationUnreadCount?: number;
  onOpenProfile: () => void;
  onEditProfile: () => void;
}

const RES_CONFIG: Record<string, { icon: string; color: string }> = {
  wood:  { icon: "🪵",    color: "var(--res-wood)" },
  stone: { icon: "🪨",    color: "var(--res-stone)" },
  iron:  { icon: "⚒️", color: "var(--res-iron)" },
  food:  { icon: "🌾",    color: "var(--res-food)" },
  gold:  { icon: "💰",    color: "var(--res-gold)" },
};

const RES_ORDER = ["wood", "stone", "iron", "food", "gold"];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toLocaleString();
}

// Lookup "which building produces resource X". Static — computed once from BUILDINGS.
const PRODUCER_FOR_RESOURCE: Record<string, { type: string; name: string; baseRate: number }> = (() => {
  const out: Record<string, { type: string; name: string; baseRate: number }> = {};
  for (const b of BUILDINGS) {
    if (b.produces) {
      out[b.produces.resource] = { type: b.type, name: b.name, baseRate: b.produces.baseRate };
    }
  }
  return out;
})();

export default function TopBar({
  resources,
  buildings = [],
  playerName,
  playerAvatar,
  playerIsAdmin,
  leaderboard,
  onOpenLeaderboard,
  reportUnreadCount = 0,
  messageUnreadCount = 0,
  notificationUnreadCount = 0,
  onOpenProfile,
  onEditProfile,
}: TopBarProps) {
  const navigate = useNavigate();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [flashing, setFlashing] = useState<Record<string, number>>({});
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [bellRinging, setBellRinging] = useState(false);
  const animRef = useRef(0);
  const resRef = useRef(resources);
  resRef.current = resources;
  const playerMenuRef = useRef<HTMLDivElement>(null);
  const playerBtnRef = useRef<HTMLButtonElement>(null);

  const ringTick = useNotificationStore((s) => s.ringTick);
  const logout = useAuthStore((s) => s.logout);

  // Trigger bell ring animation when ringTick changes
  useEffect(() => {
    if (ringTick === 0) return;
    setBellRinging(true);
    const t = setTimeout(() => setBellRinging(false), 700);
    return () => clearTimeout(t);
  }, [ringTick]);

  // Flash a resource when its server-side `updatedAt` changes (e.g. loot, recruit)
  const lastUpdatedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    let dirty = false;
    const next = { ...flashing };
    for (const r of resources) {
      const prev = lastUpdatedRef.current[r.resourceType];
      if (prev !== undefined && prev !== r.updatedAt) {
        next[r.resourceType] = Date.now();
        dirty = true;
      }
      lastUpdatedRef.current[r.resourceType] = r.updatedAt;
    }
    if (dirty) {
      setFlashing(next);
      const t = setTimeout(() => setFlashing({}), 700);
      return () => clearTimeout(t);
    }
  }, [resources]);

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

  // Close player menu on outside click / esc
  useEffect(() => {
    if (!playerMenuOpen) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        playerMenuRef.current &&
        !playerMenuRef.current.contains(t) &&
        playerBtnRef.current &&
        !playerBtnRef.current.contains(t)
      ) {
        setPlayerMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlayerMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [playerMenuOpen]);

  const sorted = [...resources].sort(
    (a, b) => RES_ORDER.indexOf(a.resourceType) - RES_ORDER.indexOf(b.resourceType)
  );

  const avatarGlyph =
    playerAvatar && PLAYER_AVATAR_GLYPHS[playerAvatar]
      ? PLAYER_AVATAR_GLYPHS[playerAvatar]
      : "🧑";

  const myRank = leaderboard?.me?.rank ?? null;
  const myScore = leaderboard?.me?.score ?? null;
  const totalPlayers = leaderboard?.totalPlayers ?? null;

  const displayName = formatPlayerName(playerName, playerIsAdmin);

  return (
    <div className="topbar">
      {/* Resources */}
      <div className="topbar__resources">
        {sorted.map((r) => {
          const val = amounts[r.resourceType] ?? r.amount;
          const cfg = RES_CONFIG[r.resourceType];
          const isFlashing = flashing[r.resourceType];

          // Production breakdown: base (from producer building level) + bonus (tech / other)
          const producer = PRODUCER_FOR_RESOURCE[r.resourceType];
          const producerBuilding = producer
            ? buildings.find((b) => b.buildingType === producer.type && !b.isConstructing)
            : undefined;
          const baseRate = producer && producerBuilding
            ? producer.baseRate * producerBuilding.level
            : 0;
          const effectiveRate = r.productionRate;
          const bonus = Math.max(0, effectiveRate - baseRate);
          const bonusPct = baseRate > 0 ? Math.round((bonus / baseRate) * 100) : 0;

          const fillPct = r.capacity > 0 ? Math.min(100, (val / r.capacity) * 100) : 0;
          const isFull = fillPct >= 99.5;

          return (
            <div key={r.resourceType} className="topbar__res topbar__res--hoverable">
              <span className="topbar__res-icon">{cfg?.icon}</span>
              <span
                key={isFlashing ?? "static"}
                className={`topbar__res-val ${isFlashing ? "topbar__res-value--flash" : ""}`}
                style={{ color: cfg?.color }}
              >
                {formatNum(val)}
              </span>
              <span className="topbar__res-rate">+{effectiveRate.toFixed(1)}</span>

              {/* Storage fill bar: shows how full the store is; turns red at 100% */}
              <div
                className={`topbar__res-bar ${isFull ? "topbar__res-bar--full" : ""}`}
                aria-hidden="true"
              >
                <div
                  className="topbar__res-bar__fill"
                  style={{
                    width: `${fillPct}%`,
                    background: isFull ? undefined : cfg?.color,
                  }}
                />
              </div>

              {/* Production breakdown tooltip (CSS-only hover) */}
              <div className="res-tooltip" role="tooltip">
                <div className="res-tooltip__header">
                  <span className="res-tooltip__icon">{cfg?.icon}</span>
                  <span className="res-tooltip__title">
                    {r.resourceType.charAt(0).toUpperCase() + r.resourceType.slice(1)} production
                  </span>
                </div>
                <div className="res-tooltip__body">
                  {producer && producerBuilding ? (
                    <>
                      <div className="res-tooltip__row">
                        <span className="res-tooltip__label">
                          <span>🏭</span>
                          <span>{producer.name} Lv.{producerBuilding.level}</span>
                        </span>
                        <span className="res-tooltip__val">+{baseRate.toFixed(1)}/min</span>
                      </div>
                      {bonus > 0 && (
                        <div className="res-tooltip__row">
                          <span className="res-tooltip__label">
                            <span>🔬</span>
                            <span>Tech bonus</span>
                          </span>
                          <span className="res-tooltip__val res-tooltip__val--bonus">
                            +{bonus.toFixed(1)}/min
                            <span className="res-tooltip__sub">(+{bonusPct}%)</span>
                          </span>
                        </div>
                      )}
                      <div className="res-tooltip__sep" />
                      <div className="res-tooltip__row res-tooltip__row--total">
                        <span className="res-tooltip__label">Total</span>
                        <span className="res-tooltip__val">
                          <strong>+{effectiveRate.toFixed(1)}/min</strong>
                          <span className="res-tooltip__sub">+{(effectiveRate * 60).toFixed(0)}/h</span>
                        </span>
                      </div>
                    </>
                  ) : producer ? (
                    <div className="res-tooltip__row">
                      <span className="res-tooltip__label res-tooltip__empty">
                        🔒 Build a {producer.name} to produce {r.resourceType}.
                      </span>
                    </div>
                  ) : (
                    <div className="res-tooltip__row res-tooltip__row--total">
                      <span className="res-tooltip__label">Total</span>
                      <span className="res-tooltip__val">
                        <strong>+{effectiveRate.toFixed(1)}/min</strong>
                      </span>
                    </div>
                  )}
                  <div className="res-tooltip__cap">
                    Storage: {formatNum(val)} / {formatNum(r.capacity)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="topbar__sep" />

      {/* Rank + Score (clickable opens leaderboard) */}
      <button
        type="button"
        onClick={onOpenLeaderboard}
        className="topbar__rank"
        title={
          myRank
            ? `Rank #${myRank} of ${totalPlayers} — score ${myScore}`
            : "View leaderboard"
        }
      >
        <span className="topbar__rank-icon">🏆</span>
        <span className="topbar__rank-val">
          {myRank ? `#${myRank}` : "—"}
          {totalPlayers && (
            <span className="topbar__rank-total">/{totalPlayers}</span>
          )}
        </span>
        {myScore !== null && (
          <>
            <span className="topbar__rank-sep">·</span>
            <span className="topbar__rank-score">{formatNum(myScore)} pts</span>
          </>
        )}
      </button>

      {/* Spacer pushes right cluster to the edge */}
      <div className="topbar__spacer" />

      {/* Right cluster: 3 icon buttons + player */}
      <div className="topbar__right">
        {/* Reports */}
        <TopBarIconButton
          icon="📜"
          label="Reports"
          count={reportUnreadCount}
          onClick={() => navigate("/inbox?tab=reports")}
        />

        {/* Messages */}
        <TopBarIconButton
          icon="📬"
          label="Inbox"
          count={messageUnreadCount}
          onClick={() => navigate("/inbox?tab=messages")}
        />

        {/* Notifications (bell) */}
        <TopBarIconButton
          icon="🔔"
          label="Notifications"
          count={notificationUnreadCount}
          ringing={bellRinging}
          onClick={() => navigate("/inbox?tab=notifications")}
        />

        {/* Player avatar + name (clickable for menu) */}
        <div className="topbar__player-wrap">
          <button
            ref={playerBtnRef}
            type="button"
            onClick={() => setPlayerMenuOpen((o) => !o)}
            className="topbar__player-btn"
            title={`${displayName} — click for menu`}
          >
            <span className="topbar__avatar topbar__avatar--round">
              {avatarGlyph}
            </span>
            <span className="topbar__player">{displayName}</span>
            <span className="topbar__player-caret">▾</span>
          </button>

          {playerMenuOpen && (
            <div ref={playerMenuRef} className="topbar__player-menu">
              <button
                type="button"
                className="topbar__player-menu-item"
                onClick={() => {
                  setPlayerMenuOpen(false);
                  onOpenProfile();
                }}
              >
                <span>{"👤"}</span> View Profile
              </button>
              <button
                type="button"
                className="topbar__player-menu-item"
                onClick={() => {
                  setPlayerMenuOpen(false);
                  onEditProfile();
                }}
              >
                <span>{"✏️"}</span> Edit Profile
              </button>
              <div className="topbar__player-menu-sep" />
              <button
                type="button"
                className="topbar__player-menu-item topbar__player-menu-item--danger"
                onClick={() => {
                  setPlayerMenuOpen(false);
                  logout();
                }}
              >
                <span>{"🚪"}</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TopBarIconButtonProps {
  icon: string;
  label: string;
  count: number;
  ringing?: boolean;
  onClick: () => void;
}

function TopBarIconButton({ icon, label, count, ringing, onClick }: TopBarIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "topbar__bell",
        count > 0 ? "topbar__bell--alert" : "",
        ringing ? "topbar__bell--ringing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={count > 0 ? `${label} — ${count} unread` : label}
    >
      <span className="topbar__bell-icon">{icon}</span>
      {count > 0 && (
        <span className="topbar__bell-count">{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}
