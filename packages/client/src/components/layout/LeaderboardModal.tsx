import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLAYER_AVATAR_GLYPHS } from "@wargame/shared";
import { formatPlayerName } from "../../util/displayName.js";
import type {
  LeaderboardData,
  LeaderboardEntry,
  AllianceLeaderboardEntry,
} from "@wargame/shared";

interface LeaderboardModalProps {
  data: LeaderboardData | null;
  loading: boolean;
  onClose: () => void;
  currentPlayerId: string | undefined;
}

type TabKey = "score" | "attackKills" | "defenseKills" | "alliance";

const TAB_LABELS: Record<TabKey, { label: string; icon: string }> = {
  score:        { label: "Score",       icon: "🏆" },
  attackKills:  { label: "Attack",      icon: "⚔️" },
  defenseKills: { label: "Defense",     icon: "🛡️" },
  alliance:     { label: "Alliances",   icon: "🤝" },
};

function formatLastSeen(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function rankColor(rank: number): string {
  if (rank === 1) return "#f0c850";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return "var(--text-muted)";
}

function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function getMetricValue(e: LeaderboardEntry, key: TabKey): number {
  switch (key) {
    case "score":        return e.score;
    case "attackKills":  return e.attackKills;
    case "defenseKills": return e.defenseKills;
    default:             return 0;
  }
}

export default function LeaderboardModal({
  data,
  loading,
  onClose,
  currentPlayerId,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<TabKey>("score");
  const navigate = useNavigate();

  const goToPlayer = (playerId: string) => {
    onClose();
    navigate(`/player/${playerId}`);
  };
  const goToAlliance = (allianceId: string) => {
    onClose();
    navigate(`/alliance/${allianceId}`);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const playerList: LeaderboardEntry[] =
    !data
      ? []
      : tab === "score"
        ? data.byScore
        : tab === "attackKills"
          ? data.byAttackKills
          : tab === "defenseKills"
            ? data.byDefenseKills
            : [];

  const allianceList: AllianceLeaderboardEntry[] =
    data && tab === "alliance" ? data.byAlliance : [];

  const totalLine =
    data &&
    (tab === "alliance"
      ? `${data.totalAlliances} alliance${data.totalAlliances !== 1 ? "s" : ""} ranked`
      : `${data.totalPlayers} realms competing`);

  return (
    <div className="leaderboard-modal-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="leaderboard-modal__header">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{"🏆"}</span>
            <div>
              <h2 className="font-title text-base font-bold text-[var(--color-gold)]">
                Leaderboard
              </h2>
              {totalLine && (
                <div className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-widest">
                  {totalLine}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm px-2 py-1">
            {"✕"}
          </button>
        </div>

        {/* Tabs */}
        <div className="leaderboard-modal__tabs">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`leaderboard-modal__tab ${
                tab === k ? "leaderboard-modal__tab--active" : ""
              }`}
            >
              <span>{TAB_LABELS[k].icon}</span>
              <span>{TAB_LABELS[k].label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="leaderboard-modal__body">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="spinner w-5 h-5" />
              <span className="text-fluid-xs text-[var(--text-muted)]">
                Loading rankings...
              </span>
            </div>
          ) : tab === "alliance" ? (
            allianceList.length === 0 ? (
              <p className="text-fluid-xs text-[var(--text-muted)] italic text-center py-8">
                No alliances ranked yet.
              </p>
            ) : (
              <ol className="leaderboard-list">
                {allianceList.map((a) => {
                  const isMine = data?.myAlliance?.allianceId === a.allianceId;
                  return (
                    <li
                      key={a.allianceId}
                      onClick={() => goToAlliance(a.allianceId)}
                      className={`leaderboard-row leaderboard-row--clickable ${
                        isMine ? "leaderboard-row--me" : ""
                      } ${a.rank <= 3 ? `leaderboard-row--top${a.rank}` : ""}`}
                    >
                      <div
                        className="leaderboard-row__rank"
                        style={{ color: rankColor(a.rank) }}
                      >
                        {a.rank <= 3 ? (
                          <span className="text-lg leading-none">{rankBadge(a.rank)}</span>
                        ) : (
                          <span className="text-fluid-sm font-bold">#{a.rank}</span>
                        )}
                      </div>

                      <div className="leaderboard-row__identity">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="leaderboard-row__tag">[{a.tag}]</span>
                          <span className="leaderboard-row__name">{a.name}</span>
                          {isMine && (
                            <span className="leaderboard-row__you-pill">yours</span>
                          )}
                        </div>
                        <div className="leaderboard-row__sub">
                          <span title="Members">
                            {"👥"} {a.memberCount}
                          </span>
                        </div>
                      </div>

                      <div className="leaderboard-row__stats">
                        <div className="leaderboard-row__metric leaderboard-row__metric--primary">
                          <span className="leaderboard-row__metric-icon">
                            {"🏆"}
                          </span>
                          <span className="leaderboard-row__metric-value">
                            {a.totalScore.toLocaleString()}
                          </span>
                        </div>
                        <div className="leaderboard-row__minis">
                          <span title="Total attack kills">
                            {"⚔️"} {a.totalAttackKills.toLocaleString()}
                          </span>
                          <span title="Total defense kills">
                            {"🛡️"} {a.totalDefenseKills.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )
          ) : playerList.length === 0 ? (
            <p className="text-fluid-xs text-[var(--text-muted)] italic text-center py-8">
              No players ranked yet.
            </p>
          ) : (
            <ol className="leaderboard-list">
              {playerList.map((e) => {
                const isMe = e.playerId === currentPlayerId;
                return (
                  <li
                    key={e.playerId}
                    onClick={() => goToPlayer(e.playerId)}
                    className={`leaderboard-row leaderboard-row--clickable ${
                      isMe ? "leaderboard-row--me" : ""
                    } ${e.rank <= 3 ? `leaderboard-row--top${e.rank}` : ""}`}
                  >
                    <div
                      className="leaderboard-row__rank"
                      style={{ color: rankColor(e.rank) }}
                    >
                      {e.rank <= 3 ? (
                        <span className="text-lg leading-none">
                          {rankBadge(e.rank)}
                        </span>
                      ) : (
                        <span className="text-fluid-sm font-bold">#{e.rank}</span>
                      )}
                    </div>

                    <div className="leaderboard-row__identity">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {e.allianceTag && (
                          <span
                            className="leaderboard-row__tag"
                            title={e.allianceName ?? ""}
                          >
                            [{e.allianceTag}]
                          </span>
                        )}
                        <span className="leaderboard-avatar" title={e.avatar}>
                          {PLAYER_AVATAR_GLYPHS[e.avatar as keyof typeof PLAYER_AVATAR_GLYPHS] ?? "🧑"}
                        </span>
                        <span
                          className={`leaderboard-row__name ${
                            isMe ? "leaderboard-row__name--me" : ""
                          }`}
                        >
                          {formatPlayerName(e.displayName, e.isAdmin)}
                        </span>
                        {isMe && (
                          <span className="leaderboard-row__you-pill">you</span>
                        )}
                      </div>
                      <div className="leaderboard-row__sub">
                        <span title="Fief">
                          {"🏰"} {e.fiefName}
                        </span>
                        <span title="Population">
                          {"👥"} {e.population.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="leaderboard-row__stats">
                      <div
                        className="leaderboard-row__metric leaderboard-row__metric--primary"
                        title={`${TAB_LABELS[tab].label} (sorted)`}
                      >
                        <span className="leaderboard-row__metric-icon">
                          {TAB_LABELS[tab].icon}
                        </span>
                        <span className="leaderboard-row__metric-value">
                          {getMetricValue(e, tab).toLocaleString()}
                        </span>
                      </div>
                      <div className="leaderboard-row__minis">
                        <span title="Score">
                          {"🏆"} {e.score.toLocaleString()}
                        </span>
                        <span title="Attack kills">
                          {"⚔️"} {e.attackKills.toLocaleString()}
                        </span>
                        <span title="Defense kills">
                          {"🛡️"} {e.defenseKills.toLocaleString()}
                        </span>
                        <span title="Last seen">
                          {"⏱️"} {formatLastSeen(e.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Player rank if outside top (only for player tabs) */}
          {tab !== "alliance" &&
            data?.me &&
            data.me.rank > playerList.length && (
              <>
                <div className="medieval-divider" />
                <div className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  Your Position
                </div>
                <div className="leaderboard-row leaderboard-row--me">
                  <div
                    className="leaderboard-row__rank"
                    style={{ color: "var(--color-gold)" }}
                  >
                    <span className="text-fluid-sm font-bold">#{data.me.rank}</span>
                  </div>
                  <div className="leaderboard-row__identity">
                    <div className="flex items-center gap-1.5">
                      {data.me.allianceTag && (
                        <span className="leaderboard-row__tag">
                          [{data.me.allianceTag}]
                        </span>
                      )}
                      <span className="leaderboard-row__name leaderboard-row__name--me">
                        {data.me.displayName}
                      </span>
                    </div>
                    <div className="leaderboard-row__sub">
                      <span>
                        {"🏰"} {data.me.fiefName}
                      </span>
                    </div>
                  </div>
                  <div className="leaderboard-row__stats">
                    <div className="leaderboard-row__metric leaderboard-row__metric--primary">
                      <span>{TAB_LABELS[tab].icon}</span>
                      <span className="leaderboard-row__metric-value">
                        {getMetricValue(data.me, tab).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
