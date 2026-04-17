import { useState } from "react";
import { parseTileId } from "@wargame/shared";
import { api } from "../../api/client.js";

interface VillageInfoCardProps {
  fief: {
    name: string;
    tileId?: string;
    level: number;
    population: number;
  } | null;
  onRenamed: (newName: string) => void;
}

export default function VillageInfoCard({ fief, onRenamed }: VillageInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fief) return null;

  const coords = fief.tileId ? parseTileId(fief.tileId) : null;

  function startEdit() {
    if (!fief) return;
    setDraft(fief.name);
    setError(null);
    setEditing(true);
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Name must be 2-30 characters");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.patch("/fief/rename", { name: trimmed });
      onRenamed(trimmed);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to rename");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  return (
    <div className="village-info-card">
      <div className="village-info-card__row">
        <span className="village-info-card__icon">🏰</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={draft}
                autoFocus
                disabled={saving}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancel();
                }}
                minLength={2}
                maxLength={30}
                className="village-info-card__input"
              />
              <button
                type="submit"
                disabled={saving}
                className="village-info-card__btn village-info-card__btn--save"
                title="Save"
              >
                {saving ? "..." : "✓"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="village-info-card__btn village-info-card__btn--cancel"
                title="Cancel"
              >
                ✕
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="village-info-card__name">{fief.name}</span>
              <button
                type="button"
                onClick={startEdit}
                className="village-info-card__edit"
                title="Rename village"
              >
                ✏️
              </button>
            </div>
          )}
          <div className="village-info-card__meta">
            {coords && (
              <span className="village-info-card__coords">
                [{coords.x}, {coords.y}]
              </span>
            )}
            <span className="village-info-card__sep">·</span>
            <span>👥 {fief.population}</span>
          </div>
        </div>
      </div>
      {error && <div className="village-info-card__error">{error}</div>}
    </div>
  );
}
