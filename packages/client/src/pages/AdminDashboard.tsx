import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import { TROOP_ICONS } from "../util/troopIcons.js";
import { useAuthStore } from "../stores/authStore.js";

interface Stats {
  overview: { players: number; fiefs: number; buildings: number; alliances: number };
  troops: { totalAlive: number; currentlyRecruiting: number; byType: Record<string, number> };
  resources: {
    global: Record<string, { totalStored: number; totalCapacity: number; totalProductionPerMin: number }>;
    totalLooted: Record<string, number>;
  };
  buildings: { total: number; byType: Record<string, { count: number; avgLevel: number; maxLevel: number; constructing: number }> };
  combat: {
    totalBattles: number; victories: number; defeats: number; winRate: number;
    pveBattles: number; pvpBattles: number;
    troopLosses: {
      totalAttackerLosses: number; totalDefenderLosses: number; totalLosses: number;
      byTroopType: Record<string, { attack: number; defense: number }>;
    };
    recentBattles: Array<{ id: string; attackerId: string; defenderType: string; result: string; tileId: string; createdAt: number }>;
  };
  marches: { total: number; active: number; completed: number };
  barbarianCamps: { total: number; defeated: number; alive: number };
  technology: { completed: number; researching: number };
  playerStats: { totalScore: number; avgScore: number; maxScore: number; totalAttackKills: number; totalDefenseKills: number };
  topPlayers: Array<{ username: string; displayName: string; score: number; attackKills: number; defenseKills: number }>;
}

interface PlayerRow {
  id: string; username: string; displayName: string; email: string;
  score: number; attackKills: number; defenseKills: number;
  createdAt: number; lastLoginAt: number | null; isActive: boolean;
}

const RES_ICONS: Record<string, string> = { wood: "🪵", stone: "🪨", iron: "⚒️", food: "🌾", gold: "💰" };

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "players" | "combat" | "economy" | "actions">("overview");
  const [forbidden, setForbidden] = useState(false);
  const player = useAuthStore((s) => s.player);
  const isAdmin = player?.isAdmin === true;

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const [s, p] = await Promise.all([
        api.get<Stats>("/admin/stats"),
        api.get<{ players: PlayerRow[] }>("/admin/players"),
      ]);
      setStats(s);
      setPlayers(p.players);
      setForbidden(false);
    } catch (e: any) {
      if (e?.message?.includes("Admin")) setForbidden(true);
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-5">
        <div className="card p-6 text-center">
          <span className="text-4xl block mb-2">🚫</span>
          <h2 className="font-title text-base font-bold text-[var(--color-danger-light)] mb-1">
            Admins Only
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            This area is restricted to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading admin dashboard...</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-4 sm:p-5">
        <div className="card p-6 text-center">
          <span className="text-4xl block mb-2">🚫</span>
          <p className="text-sm text-[var(--text-muted)]">Access denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dash">
      {/* Header */}
      <div className="admin-dash__header">
        <h1 className="admin-dash__title">{"📊"} Admin Dashboard</h1>
        <button onClick={load} className="btn-outline text-xs px-3 py-1">{"🔄"} Refresh</button>
      </div>

      {/* Tabs */}
      <div className="admin-dash__tabs">
        {([
          { id: "overview" as const, icon: "🏠", label: "Overview" },
          { id: "players" as const, icon: "👥", label: "Players" },
          { id: "combat" as const, icon: "⚔️", label: "Combat" },
          { id: "economy" as const, icon: "💰", label: "Economy" },
          { id: "actions" as const, icon: "⚡", label: "Admin Actions" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`admin-tab ${tab === t.id ? "admin-tab--active" : ""}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="admin-dash__body">
        {/* ── OVERVIEW ──────────────────────────────── */}
        {tab === "overview" && (
          <div className="admin-grid">
            {/* KPI cards */}
            <StatCard icon="👥" label="Players" value={stats.overview.players} />
            <StatCard icon="🏰" label="Villages" value={stats.overview.fiefs} />
            <StatCard icon="🏗️" label="Buildings" value={stats.overview.buildings} />
            <StatCard icon="⚔️" label="Total Troops" value={stats.troops.totalAlive} />
            <StatCard icon="💥" label="Battles" value={stats.combat.totalBattles} />
            <StatCard icon="🤝" label="Alliances" value={stats.overview.alliances} />
            <StatCard icon="🏴" label="Marches" value={`${stats.marches.active} active`} sub={`${stats.marches.total} total`} />
            <StatCard icon="🔬" label="Technologies" value={`${stats.technology.completed} done`} sub={`${stats.technology.researching} in progress`} />
            <StatCard icon="🏕️" label="Camps" value={`${stats.barbarianCamps.alive} alive`} sub={`${stats.barbarianCamps.defeated} defeated`} />

            {/* Top players */}
            <div className="admin-card admin-card--wide">
              <div className="admin-card__title">{"🏆"} Top Players</div>
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Score</th><th>ATK Kills</th><th>DEF Kills</th></tr>
                </thead>
                <tbody>
                  {stats.topPlayers.map((p, i) => (
                    <tr key={p.username}>
                      <td className="admin-table__rank">{i + 1}</td>
                      <td>{p.displayName}</td>
                      <td className="admin-table__num">{fmt(p.score)}</td>
                      <td className="admin-table__num">{p.attackKills}</td>
                      <td className="admin-table__num">{p.defenseKills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Troops by type */}
            <div className="admin-card">
              <div className="admin-card__title">{"🛡️"} Troops by Type</div>
              <div className="admin-bars">
                {Object.entries(stats.troops.byType).map(([type, qty]) => (
                  <div key={type} className="admin-bar-row">
                    <span className="admin-bar-row__label">{TROOP_ICONS[type] || ""} {type}</span>
                    <div className="admin-bar-row__bar">
                      <div className="admin-bar-row__fill" style={{ width: `${Math.min(100, (qty / Math.max(stats.troops.totalAlive, 1)) * 100)}%` }} />
                    </div>
                    <span className="admin-bar-row__val">{fmt(qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYERS ──────────────────────────────── */}
        {tab === "players" && (
          <div className="admin-card admin-card--full">
            <div className="admin-card__title">{"👥"} All Players ({players.length})</div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Username</th><th>Display Name</th><th>Email</th><th>Score</th><th>ATK</th><th>DEF</th><th>Registered</th><th>Last Login</th></tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td className="font-bold">{p.username}</td>
                      <td>{p.displayName}</td>
                      <td className="admin-table__muted">{p.email}</td>
                      <td className="admin-table__num">{fmt(p.score)}</td>
                      <td className="admin-table__num">{p.attackKills}</td>
                      <td className="admin-table__num">{p.defenseKills}</td>
                      <td className="admin-table__muted">{timeAgo(p.createdAt)}</td>
                      <td className="admin-table__muted">{p.lastLoginAt ? timeAgo(p.lastLoginAt) : "never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COMBAT ──────────────────────────────── */}
        {tab === "combat" && (
          <div className="admin-grid">
            <StatCard icon="💥" label="Total Battles" value={stats.combat.totalBattles} />
            <StatCard icon="✅" label="Victories" value={stats.combat.victories} color="var(--color-success)" />
            <StatCard icon="❌" label="Defeats" value={stats.combat.defeats} color="var(--color-danger)" />
            <StatCard icon="🎯" label="Win Rate" value={`${stats.combat.winRate}%`} />
            <StatCard icon="🏕️" label="PvE Battles" value={stats.combat.pveBattles} />
            <StatCard icon="⚔️" label="PvP Battles" value={stats.combat.pvpBattles} />

            {/* Troop losses */}
            <div className="admin-card admin-card--wide">
              <div className="admin-card__title">{"💀"} Troop Losses</div>
              <div className="admin-kpi-row">
                <div className="admin-kpi">
                  <span className="admin-kpi__val" style={{ color: "var(--color-danger)" }}>{fmt(stats.combat.troopLosses.totalAttackerLosses)}</span>
                  <span className="admin-kpi__label">Lost in Attack</span>
                </div>
                <div className="admin-kpi">
                  <span className="admin-kpi__val" style={{ color: "var(--accent-orange)" }}>{fmt(stats.combat.troopLosses.totalDefenderLosses)}</span>
                  <span className="admin-kpi__label">Lost in Defense</span>
                </div>
                <div className="admin-kpi">
                  <span className="admin-kpi__val">{fmt(stats.combat.troopLosses.totalLosses)}</span>
                  <span className="admin-kpi__label">Total Losses</span>
                </div>
              </div>
              {Object.keys(stats.combat.troopLosses.byTroopType).length > 0 && (
                <table className="admin-table" style={{ marginTop: "0.5rem" }}>
                  <thead><tr><th>Troop</th><th>Lost in ATK</th><th>Lost in DEF</th><th>Total</th></tr></thead>
                  <tbody>
                    {Object.entries(stats.combat.troopLosses.byTroopType).map(([type, l]) => (
                      <tr key={type}>
                        <td>{TROOP_ICONS[type] || ""} {type}</td>
                        <td className="admin-table__num" style={{ color: "var(--color-danger)" }}>{l.attack}</td>
                        <td className="admin-table__num" style={{ color: "var(--accent-orange)" }}>{l.defense}</td>
                        <td className="admin-table__num">{l.attack + l.defense}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent battles */}
            {stats.combat.recentBattles.length > 0 && (
              <div className="admin-card admin-card--wide">
                <div className="admin-card__title">{"📜"} Recent Battles</div>
                <table className="admin-table">
                  <thead><tr><th>Time</th><th>Type</th><th>Result</th><th>Tile</th></tr></thead>
                  <tbody>
                    {stats.combat.recentBattles.map((b) => (
                      <tr key={b.id}>
                        <td className="admin-table__muted">{timeAgo(b.createdAt)}</td>
                        <td>{b.defenderType === "camp" ? "🏕️ PvE" : "⚔️ PvP"}</td>
                        <td style={{ color: b.result === "victory" ? "var(--color-success)" : "var(--color-danger)" }}>
                          {b.result === "victory" ? "✔ Victory" : "✘ Defeat"}
                        </td>
                        <td className="admin-table__muted">{b.tileId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ECONOMY ──────────────────────────────── */}
        {tab === "economy" && (
          <div className="admin-grid">
            {/* Resource cards */}
            {Object.entries(stats.resources.global).map(([type, r]) => (
              <div key={type} className="admin-card">
                <div className="admin-card__title">{RES_ICONS[type]} {type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div className="admin-kpi-row">
                  <div className="admin-kpi">
                    <span className="admin-kpi__val">{fmt(r.totalStored)}</span>
                    <span className="admin-kpi__label">Stored</span>
                  </div>
                  <div className="admin-kpi">
                    <span className="admin-kpi__val">{fmt(r.totalCapacity)}</span>
                    <span className="admin-kpi__label">Capacity</span>
                  </div>
                  <div className="admin-kpi">
                    <span className="admin-kpi__val" style={{ color: "var(--color-success)" }}>+{r.totalProductionPerMin}</span>
                    <span className="admin-kpi__label">/min global</span>
                  </div>
                </div>
                {stats.resources.totalLooted[type] ? (
                  <div className="admin-kpi" style={{ marginTop: "0.3rem" }}>
                    <span className="admin-kpi__val" style={{ color: "var(--accent-orange)" }}>{fmt(stats.resources.totalLooted[type])}</span>
                    <span className="admin-kpi__label">Total Looted</span>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Buildings breakdown */}
            <div className="admin-card admin-card--wide">
              <div className="admin-card__title">{"🏗️"} Buildings Breakdown</div>
              <table className="admin-table">
                <thead><tr><th>Building</th><th>Count</th><th>Avg Lv.</th><th>Max Lv.</th><th>Constructing</th></tr></thead>
                <tbody>
                  {Object.entries(stats.buildings.byType).map(([type, b]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td className="admin-table__num">{b.count}</td>
                      <td className="admin-table__num">{b.avgLevel}</td>
                      <td className="admin-table__num">{b.maxLevel}</td>
                      <td className="admin-table__num">{b.constructing > 0 ? <span style={{ color: "var(--accent-orange)" }}>{b.constructing}</span> : "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Score stats */}
            <div className="admin-card">
              <div className="admin-card__title">{"🏆"} Score Distribution</div>
              <div className="admin-kpi-row">
                <div className="admin-kpi">
                  <span className="admin-kpi__val">{fmt(stats.playerStats.totalScore)}</span>
                  <span className="admin-kpi__label">Total</span>
                </div>
                <div className="admin-kpi">
                  <span className="admin-kpi__val">{fmt(stats.playerStats.avgScore)}</span>
                  <span className="admin-kpi__label">Average</span>
                </div>
                <div className="admin-kpi">
                  <span className="admin-kpi__val" style={{ color: "var(--color-gold)" }}>{fmt(stats.playerStats.maxScore)}</span>
                  <span className="admin-kpi__label">Highest</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "actions" && <AdminActionsPanel />}
      </div>
    </div>
  );
}

function AdminActionsPanel() {
  const [marches, setMarches] = useState<Array<{ id: string; targetTileId: string; status: string; arrivesAt: number }>>([]);
  const [shieldUsername, setShieldUsername] = useState("");
  const [shieldMsg, setShieldMsg] = useState<string | null>(null);
  const [busyMarch, setBusyMarch] = useState<string | null>(null);

  const loadMarches = useCallback(async () => {
    try {
      const data = await api.get<{ marches: Array<{ id: string; targetTileId: string; status: string; arrivesAt: number }> }>("/marches");
      setMarches(data.marches.filter((m) => m.status === "marching"));
    } catch {}
  }, []);

  useEffect(() => {
    loadMarches();
    const id = setInterval(loadMarches, 15_000);
    return () => clearInterval(id);
  }, [loadMarches]);

  async function arriveNow(marchId: string) {
    setBusyMarch(marchId);
    try {
      await api.post(`/admin/marches/${marchId}/arrive-now`);
      await loadMarches();
    } catch (e: any) {
      alert("Failed: " + (e?.message || "unknown"));
    } finally {
      setBusyMarch(null);
    }
  }

  async function removeShield(e: React.FormEvent) {
    e.preventDefault();
    setShieldMsg(null);
    const u = shieldUsername.trim();
    if (!u) return;
    try {
      await api.delete(`/admin/players/${encodeURIComponent(u)}/shield`);
      setShieldMsg(`✓ Shield removed from ${u}`);
      setShieldUsername("");
    } catch (e: any) {
      setShieldMsg("✗ " + (e?.message || "Failed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="admin-card admin-card--wide">
        <div className="admin-card__title">{"⚡"} Force March Arrival</div>
        <div className="admin-card__subtitle">
          Make any of your active marches arrive instantly (the next tick will resolve combat).
        </div>
        {marches.length === 0 ? (
          <p className="text-fluid-xs text-[var(--text-muted)] italic mt-2">
            No active outgoing marches.
          </p>
        ) : (
          <table className="admin-table mt-2">
            <thead>
              <tr><th>March</th><th>Target</th><th>Action</th></tr>
            </thead>
            <tbody>
              {marches.map((m) => (
                <tr key={m.id}>
                  <td className="admin-table__num">{m.id.slice(0, 8)}…</td>
                  <td>{m.targetTileId}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => arriveNow(m.id)}
                      disabled={busyMarch === m.id}
                      className="btn-primary"
                    >
                      {busyMarch === m.id ? "..." : "⚡ Arrive Now"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card admin-card--wide">
        <div className="admin-card__title">{"🛡️"} Remove Newbie Shield</div>
        <div className="admin-card__subtitle">
          Strip a player's protection so they can be raided again.
        </div>
        <form onSubmit={removeShield} className="flex items-end gap-2 mt-2 max-w-md">
          <div className="flex-1">
            <label className="profile-edit__label">Username</label>
            <input
              type="text"
              value={shieldUsername}
              onChange={(e) => setShieldUsername(e.target.value)}
              required
              minLength={1}
              maxLength={40}
              placeholder="username"
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary">
            Remove Shield
          </button>
        </form>
        {shieldMsg && (
          <div
            className={`text-fluid-xs mt-2 ${shieldMsg.startsWith("✓") ? "text-[var(--color-success)]" : "text-[var(--color-danger-light)]"}`}
          >
            {shieldMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="admin-card admin-card--stat">
      <span className="admin-card__icon">{icon}</span>
      <div>
        <div className="admin-card__stat-val" style={color ? { color } : undefined}>{typeof value === "number" ? fmt(value) : value}</div>
        <div className="admin-card__stat-label">{label}</div>
        {sub && <div className="admin-card__stat-sub">{sub}</div>}
      </div>
    </div>
  );
}
