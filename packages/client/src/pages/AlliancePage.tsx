import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import {
  ALLIANCE_TAG_MIN,
  ALLIANCE_TAG_MAX,
  type Alliance,
  type AllianceMember,
  type AllianceInvite,
  type AllianceRole,
} from "@wargame/shared";

type View = "overview" | "create";

export default function AlliancePage() {
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [myRole, setMyRole] = useState<AllianceRole | null>(null);
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("overview");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [createName, setCreateName] = useState("");
  const [createTag, setCreateTag] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  // Invite form
  const [inviteUsername, setInviteUsername] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [allianceData, inviteData] = await Promise.all([
        api.get<{ alliance: Alliance | null; members: AllianceMember[]; role: AllianceRole | null }>("/alliance"),
        api.get<{ invites: AllianceInvite[] }>("/alliance/invites"),
      ]);
      setAlliance(allianceData.alliance);
      setMembers(allianceData.members);
      setMyRole(allianceData.role);
      setInvites(inviteData.invites);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post("/alliance", { name: createName, tag: createTag, description: createDesc });
      setView("overview");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [createName, createTag, createDesc, loadData]);

  const handleInvite = useCallback(async () => {
    if (!inviteUsername.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.post("/alliance/invite", { username: inviteUsername.trim() });
      setInviteUsername("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [inviteUsername]);

  const handleRespondInvite = useCallback(async (inviteId: string, accept: boolean) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post("/alliance/invite/respond", { inviteId, accept });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const handleLeave = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post("/alliance/leave");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const handleDisband = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.delete("/alliance");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const handleRole = useCallback(async (playerId: string, role: "officer" | "member") => {
    setError(null);
    try {
      await api.post("/alliance/role", { playerId, role });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadData]);

  const handleTransfer = useCallback(async (playerId: string) => {
    setError(null);
    try {
      await api.post("/alliance/transfer", { playerId });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadData]);

  const handleKick = useCallback(async (playerId: string) => {
    setError(null);
    try {
      await api.post("/alliance/kick", { playerId });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }, [loadData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading diplomacy...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="font-title text-xl font-bold text-[var(--color-gold)] mb-4">
        {"\u{1F91D}"} Diplomacy
      </h1>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)] mb-4">
          <span>{"\u26A0\uFE0F"}</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[var(--text-muted)]">{"\u2715"}</button>
        </div>
      )}

      {/* ── Pending invites ── */}
      {!alliance && invites.length > 0 && (
        <div className="card p-4 mb-4">
          <h2 className="section-title mb-3">Pending Invitations</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-0)]/50 border border-[var(--border-muted)]"
              >
                <div>
                  <div className="text-sm font-semibold">
                    [{inv.allianceTag}] {inv.allianceName}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Invited by {inv.inviterName}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, true)}
                    disabled={actionLoading}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, false)}
                    disabled={actionLoading}
                    className="btn-outline text-xs px-3 py-1"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No alliance ── */}
      {!alliance && view === "overview" && (
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">{"\u{1F3F3}\uFE0F"}</div>
          <h2 className="font-title text-lg font-bold mb-2">No Alliance</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Create an alliance or wait for an invitation to join one.
            Allied players cannot raid each other and share map visibility.
          </p>
          <button
            onClick={() => setView("create")}
            className="btn-primary text-sm px-6 py-2"
          >
            {"\u2694\uFE0F"} Found Alliance
          </button>
        </div>
      )}

      {/* ── Create form ── */}
      {!alliance && view === "create" && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Found New Alliance</h2>
          <div className="space-y-3">
            <div>
              <label className="stat-label">Alliance Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Knights of the Round Table"
                maxLength={30}
                className="input w-full"
              />
            </div>
            <div>
              <label className="stat-label">
                Tag ({ALLIANCE_TAG_MIN}-{ALLIANCE_TAG_MAX} characters, letters/numbers)
              </label>
              <input
                type="text"
                value={createTag}
                onChange={(e) => setCreateTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="KRT"
                maxLength={ALLIANCE_TAG_MAX}
                className="input w-32"
              />
            </div>
            <div>
              <label className="stat-label">Description (optional)</label>
              <textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="A noble alliance..."
                maxLength={200}
                rows={2}
                className="input w-full resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setView("overview")} className="btn-outline flex-1 text-xs py-2">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  actionLoading ||
                  createName.trim().length < 3 ||
                  createTag.length < ALLIANCE_TAG_MIN
                }
                className="btn-primary flex-1 text-xs py-2"
              >
                {actionLoading ? <span className="spinner w-3 h-3" /> : "Create Alliance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alliance overview ── */}
      {alliance && (
        <>
          {/* Header */}
          <div className="card p-5 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                    [{alliance.tag}]
                  </span>
                  <h2 className="font-title text-lg font-bold">{alliance.name}</h2>
                </div>
                {alliance.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{alliance.description}</p>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {alliance.memberCount} member{alliance.memberCount !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Your role:{" "}
              <span className="font-bold text-[var(--text-primary)]">
                {myRole === "leader" ? "Leader" : myRole === "officer" ? "Officer" : "Member"}
              </span>
            </div>
          </div>

          {/* Invite player (leader/officer only) */}
          {(myRole === "leader" || myRole === "officer") && (
            <div className="card p-4 mb-4">
              <h3 className="section-title mb-2">Invite Player</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Username..."
                  className="input flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <button
                  onClick={handleInvite}
                  disabled={actionLoading || !inviteUsername.trim()}
                  className="btn-primary text-xs px-4"
                >
                  Invite
                </button>
              </div>
            </div>
          )}

          {/* Member list */}
          <div className="card p-4 mb-4">
            <h3 className="section-title mb-3">
              Members ({members.length})
            </h3>
            <div className="space-y-1">
              {members
                .sort((a, b) => {
                  const roleOrder = { leader: 0, officer: 1, member: 2 };
                  return roleOrder[a.role] - roleOrder[b.role];
                })
                .map((m) => (
                  <div
                    key={m.playerId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-0)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {m.role === "leader"
                          ? "\u{1F451}"
                          : m.role === "officer"
                            ? "\u{1F6E1}\uFE0F"
                            : "\u{1F464}"}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{m.displayName}</div>
                        <div className="text-[0.6rem] text-[var(--text-muted)]">
                          Fief Lv.{m.fiefLevel} | {m.role}
                        </div>
                      </div>
                    </div>

                    {/* Role management (leader only, not on self) */}
                    {myRole === "leader" && m.role !== "leader" && (
                      <div className="flex gap-1">
                        {m.role === "member" ? (
                          <button
                            onClick={() => handleRole(m.playerId, "officer")}
                            className="btn-ghost text-[0.6rem] px-2 py-0.5"
                            title="Promote to Officer"
                          >
                            {"\u2B06\uFE0F"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRole(m.playerId, "member")}
                            className="btn-ghost text-[0.6rem] px-2 py-0.5"
                            title="Demote to Member"
                          >
                            {"\u2B07\uFE0F"}
                          </button>
                        )}
                        <button
                          onClick={() => handleTransfer(m.playerId)}
                          className="btn-ghost text-[0.6rem] px-2 py-0.5"
                          title="Transfer Leadership"
                        >
                          {"\u{1F451}"}
                        </button>
                        <button
                          onClick={() => handleKick(m.playerId)}
                          className="btn-ghost text-[0.6rem] px-2 py-0.5 text-[var(--color-danger-light)]"
                          title="Kick"
                        >
                          {"\u274C"}
                        </button>
                      </div>
                    )}

                    {/* Officers can kick members */}
                    {myRole === "officer" && m.role === "member" && (
                      <button
                        onClick={() => handleKick(m.playerId)}
                        className="btn-ghost text-[0.6rem] px-2 py-0.5 text-[var(--color-danger-light)]"
                        title="Kick"
                      >
                        {"\u274C"}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="card p-4">
            {myRole === "leader" ? (
              <button
                onClick={handleDisband}
                disabled={actionLoading}
                className="btn-outline text-xs py-2 w-full border-[var(--color-danger)]/40 text-[var(--color-danger-light)] hover:bg-[var(--color-danger)]/10"
              >
                Disband Alliance
              </button>
            ) : (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="btn-outline text-xs py-2 w-full border-[var(--color-danger)]/40 text-[var(--color-danger-light)] hover:bg-[var(--color-danger)]/10"
              >
                Leave Alliance
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
