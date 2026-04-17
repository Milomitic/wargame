import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { VillageLink } from "../components/VillageLink.js";
import {
  PLAYER_AVATARS,
  PLAYER_AVATAR_GLYPHS,
  type PlayerProfile,
} from "@wargame/shared";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString();
}

function formatLastSeen(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "online now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PlayerProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ profile: PlayerProfile }>(
        `/players/${id}/profile`
      );
      setProfile(data.profile);
      setEditBio(data.profile.bio);
      setEditAvatar(data.profile.avatar);
      setEditName(data.profile.displayName);
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
    setSaving(true);
    setError(null);
    try {
      await api.patch("/players/me/profile", {
        bio: editBio,
        avatar: editAvatar,
        displayName: editName,
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
        <span className="text-sm text-[var(--text-muted)]">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--color-danger-light)]">
          {error ?? "Profile not found"}
        </p>
        <button onClick={() => navigate(-1)} className="btn-outline text-xs px-4 py-2">
          {"←"} Back
        </button>
      </div>
    );
  }

  const avatarGlyph = PLAYER_AVATAR_GLYPHS[profile.avatar] ?? "🧑";

  return (
    <div className="profile-page">
      <div className="profile-page__back-row">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs px-2 py-1">
          {"←"} Back
        </button>
        {profile.isMe && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary text-xs px-3 py-1"
          >
            {"✎"} Edit Profile
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

      {/* ── Identity card ──────────────────────────────────── */}
      <div className="profile-card">
        <div className="profile-card__header">
          <div className="profile-card__avatar">{avatarGlyph}</div>
          <div className="profile-card__identity">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="input text-lg font-bold"
              />
            ) : (
              <h1 className="profile-card__name">{profile.displayName}</h1>
            )}
            <div className="profile-card__sub">
              <span className="profile-card__username">@{profile.username}</span>
              {profile.allianceTag && profile.allianceId && (
                <button
                  onClick={() => navigate(`/alliance/${profile.allianceId}`)}
                  className="profile-card__alliance-link"
                  title={profile.allianceName ?? ""}
                >
                  [{profile.allianceTag}] {profile.allianceName}
                </button>
              )}
            </div>
            <div className="profile-card__meta">
              <span title="Member since">
                {"📅"} Joined {formatDate(profile.createdAt)}
              </span>
              <span title="Last seen">
                {"⏱️"} {formatLastSeen(profile.lastLoginAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Bio / edit form */}
        {editing ? (
          <div className="profile-card__edit">
            <div>
              <label className="stat-label">Avatar</label>
              <div className="profile-avatar-grid">
                {PLAYER_AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setEditAvatar(a)}
                    className={`profile-avatar-option ${
                      editAvatar === a ? "profile-avatar-option--active" : ""
                    }`}
                    title={a}
                  >
                    {PLAYER_AVATAR_GLYPHS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="stat-label">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell other players about yourself..."
                maxLength={500}
                rows={4}
                className="input w-full resize-none"
              />
              <div className="text-fluid-xxs text-[var(--text-muted)] text-right mt-0.5">
                {editBio.length}/500
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setEditBio(profile.bio);
                  setEditAvatar(profile.avatar);
                  setEditName(profile.displayName);
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
        ) : profile.bio ? (
          <div className="profile-card__bio">{profile.bio}</div>
        ) : (
          <div className="profile-card__bio profile-card__bio--empty">
            {profile.isMe
              ? "You haven't written a bio yet. Click Edit Profile to add one."
              : "This player hasn't written a bio yet."}
          </div>
        )}
      </div>

      {/* ── Stats grid ──────────────────────────────────────── */}
      <div className="profile-stats-grid">
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🏆"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.score.toLocaleString()}</div>
            <div className="profile-stat__label">Total Score</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"⚔️"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.attackKills.toLocaleString()}</div>
            <div className="profile-stat__label">Attack Kills</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🛡️"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.defenseKills.toLocaleString()}</div>
            <div className="profile-stat__label">Defense Kills</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🔬"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.techsResearched}</div>
            <div className="profile-stat__label">Techs Researched</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"🧱"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.buildingsTotalLevel}</div>
            <div className="profile-stat__label">Building Levels</div>
          </div>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">{"👥"}</span>
          <div className="profile-stat__body">
            <div className="profile-stat__value">{profile.population.toLocaleString()}</div>
            <div className="profile-stat__label">Population</div>
          </div>
        </div>
      </div>

      {/* ── Fief card ───────────────────────────────────────── */}
      {profile.fiefName && (
        <div className="profile-card">
          <h2 className="section-title mb-2">Realm</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold">
                {"🏰"}{" "}
                {profile.fiefTileId ? (
                  <VillageLink
                    name={profile.fiefName!}
                    x={Number(profile.fiefTileId.split(",")[0])}
                    y={Number(profile.fiefTileId.split(",")[1])}
                  />
                ) : (
                  profile.fiefName
                )}
              </div>
            </div>
            {profile.fiefTileId && (
              <button
                onClick={() => {
                  const [x, y] = profile.fiefTileId!.split(",").map(Number);
                  navigate(`/map?x=${x}&y=${y}`);
                }}
                className="btn-secondary text-xs px-3 py-1"
              >
                {"🗺️"} View on Map
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
