import { useEffect, useState } from "react";
import { PLAYER_AVATARS, PLAYER_AVATAR_GLYPHS } from "@wargame/shared";
import { api } from "../../api/client.js";
import { useAuthStore } from "../../stores/authStore.js";

interface Props {
  onClose: () => void;
}

export default function ProfileEditModal({ onClose }: Props) {
  const player = useAuthStore((s) => s.player);
  const updatePlayer = useAuthStore((s) => s.updatePlayer);

  const [displayName, setDisplayName] = useState(player?.displayName ?? "");
  const [avatar, setAvatar] = useState<string>(player?.avatar ?? "knight");
  const [bio, setBio] = useState(player?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch("/players/me/profile", {
        displayName: displayName.trim(),
        avatar,
        bio: bio.trim(),
      });
      updatePlayer({ displayName: displayName.trim(), avatar, bio: bio.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--profile-edit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="flex items-center gap-2">
            <span className="text-xl">{"✏️"}</span>
            <h2 className="font-title text-base font-bold text-[var(--color-gold)]">
              Edit Profile
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm px-2 py-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="modal__body space-y-4">
          {/* Avatar grid */}
          <div>
            <label className="profile-edit__label">Avatar</label>
            <div className="profile-edit__avatar-grid">
              {PLAYER_AVATARS.map((a) => {
                const selected = avatar === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`profile-edit__avatar-option${selected ? " profile-edit__avatar-option--selected" : ""}`}
                    title={a}
                  >
                    <span className="profile-edit__avatar-glyph">
                      {PLAYER_AVATAR_GLYPHS[a]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="profile-edit__label">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={2}
              maxLength={30}
              required
              className="input-field"
              placeholder="Your display name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="profile-edit__label">
              Bio <span className="text-fluid-xxs text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="input-field"
              placeholder="Tell other players about yourself..."
            />
            <div className="text-fluid-xxs text-[var(--text-muted)] text-right mt-0.5">
              {bio.length}/500
            </div>
          </div>

          {error && (
            <div className="text-fluid-xs text-[var(--color-danger-light)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <span className="spinner w-3 h-3 inline-block mr-1" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
