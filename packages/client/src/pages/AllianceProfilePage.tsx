import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import {
  ALLIANCE_AVATARS,
  ALLIANCE_AVATAR_GLYPHS,
  type AllianceProfile,
} from "@wargame/shared";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export default function AllianceProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<AllianceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editManifesto, setEditManifesto] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ profile: AllianceProfile }>(
        `/alliances/${id}/profile`
      );
      setProfile(data.profile);
      setEditDesc(data.profile.description);
      setEditManifesto(data.profile.manifesto);
      setEditAvatar(data.profile.avatar);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/alliances/${id}/profile`, {
        description: editDesc,
        manifesto: editManifesto,
        avatar: editAvatar,
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading alliance...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--color-danger-light)]">
          {error ?? "Alliance not found"}
        </p>
        <button onClick={() => navigate(-1)} className="btn-outline text-xs px-4 py-2">
          {"←"} Back
        </button>
      </div>
    );
  }

  const canEdit = profile.myRole === "leader" || profile.myRole === "officer";
  const banner = ALLIANCE_AVATAR_GLYPHS[profile.avatar] ?? "🏴";

  return (
    <div className="profile-page">
      <div className="profile-page__back-row">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs px-2 py-1">
          {"←"} Back
        </button>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary text-xs px-3 py-1"
          >
            {"✎"} Edit Alliance
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)] mb-3">
          <span>{"⚠️"}</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">{"✕"}</button>
        </div>
      )}

      {/* ── Banner card ──────────────────────────────────── */}
      <div className="profile-card">
        <div className="profile-card__header">
          <div className="profile-card__avatar profile-card__avatar--banner">
            {banner}
          </div>
          <div className="profile-card__identity">
            <h1 className="profile-card__name">
              <span className="profile-card__alliance-tag">[{profile.tag}]</span>{" "}
              {profile.name}
            </h1>
            {!editing && profile.description && (
              <p className="profile-card__sub">{profile.description}</p>
            )}
            <div className="profile-card__meta">
              <span title="Founded">
                {"📅"} Founded {formatDate(profile.createdAt)}
              </span>
              <span title="Members">
                {"👥"} {profile.memberCount} member
                {profile.memberCount !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => navigate(`/player/${profile.leaderId}`)}
                className="profile-card__alliance-link"
                title="Leader"
              >
                {"👑"} {profile.leaderName}
              </button>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="profile-card__edit">
            <div>
              <label className="stat-label">Banner</label>
              <div className="profile-avatar-grid">
                {ALLIANCE_AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setEditAvatar(a)}
                    className={`profile-avatar-option ${
                      editAvatar === a ? "profile-avatar-option--active" : ""
                    }`}
                    title={a}
                  >
                    {ALLIANCE_AVATAR_GLYPHS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="stat-label">Short Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="A brief tagline..."
                maxLength={200}
                className="input w-full"
              />
              <div className="text-fluid-xxs text-[var(--text-muted)] text-right mt-0.5">
                {editDesc.length}/200
              </div>
            </div>
            <div>
              <label className="stat-label">Manifesto</label>
              <textarea
                value={editManifesto}
                onChange={(e) => setEditManifesto(e.target.value)}
                placeholder="Lay out the principles, goals, and history of your alliance..."
                maxLength={1500}
                rows={6}
                className="input w-full resize-none"
              />
              <div className="text-fluid-xxs text-[var(--text-muted)] text-right mt-0.5">
                {editManifesto.length}/1500
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setEditDesc(profile.description);
                  setEditManifesto(profile.manifesto);
                  setEditAvatar(profile.avatar);
                }}
                className="btn-outline flex-1 text-xs py-2"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex-1 text-xs py-2"
                disabled={saving}
              >
                {saving ? <span className="spinner w-3 h-3" /> : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          profile.manifesto && (
            <div className="profile-card__bio profile-card__bio--manifesto">
              {profile.manifesto}
            </div>
          )
        )}
      </div>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="profile-stats-grid">
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🏆"}</span>
          <div>
            <div className="profile-stat__value">{profile.totalScore.toLocaleString()}</div>
            <div className="profile-stat__label">Total Score</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"⚔️"}</span>
          <div>
            <div className="profile-stat__value">
              {profile.totalAttackKills.toLocaleString()}
            </div>
            <div className="profile-stat__label">Attack Kills</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🛡️"}</span>
          <div>
            <div className="profile-stat__value">
              {profile.totalDefenseKills.toLocaleString()}
            </div>
            <div className="profile-stat__label">Defense Kills</div>
          </div>
        </div>
      </div>

      {/* ── Members list ─────────────────────────────── */}
      <div className="profile-card">
        <h2 className="section-title mb-2">Members ({profile.memberCount})</h2>
        <ul className="space-y-1">
          {profile.members
            .slice()
            .sort((a, b) => {
              const order = { leader: 0, officer: 1, member: 2 };
              return order[a.role] - order[b.role];
            })
            .map((m) => (
              <li
                key={m.playerId}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-0)]/50 transition-colors"
              >
                <button
                  onClick={() => navigate(`/player/${m.playerId}`)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  <span className="text-base">
                    {m.role === "leader"
                      ? "👑"
                      : m.role === "officer"
                        ? "🛡️"
                        : "👤"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold hover:text-[var(--color-gold)]">
                      {m.displayName}
                    </div>
                    <div className="text-fluid-xs text-[var(--text-muted)]">
                      {m.role}
                    </div>
                  </div>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
