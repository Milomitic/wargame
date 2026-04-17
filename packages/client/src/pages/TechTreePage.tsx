import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import {
  TECH_TREE,
  TECH_MAP,
  type TechCategory,
  type TechDefinition,
  type PlayerTech,
} from "@wargame/shared";

const TICK_MS = 60_000;

function formatRemaining(secondsLeft: number): string {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function computeResearchProgress(
  status: PlayerTech | undefined,
  totalTicks: number,
  nowMs: number
): { secondsLeft: number; pct: number } {
  if (!status || status.status !== "researching") {
    return { secondsLeft: 0, pct: 0 };
  }
  const totalMs = totalTicks * TICK_MS;
  const startedAt = status.researchStartedAt;
  if (startedAt) {
    const elapsed = Math.max(0, nowMs - startedAt);
    const secondsLeft = Math.max(0, (totalMs - elapsed) / 1000);
    const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
    return { secondsLeft, pct };
  }
  // Fallback when no startedAt is recorded yet
  const ticksRemaining = status.researchTicksRemaining;
  const secondsLeft = ticksRemaining * 60;
  const pct = Math.max(0, ((totalTicks - ticksRemaining) / totalTicks) * 100);
  return { secondsLeft, pct };
}

const CATEGORY_CFG: Record<TechCategory, { label: string; icon: string; color: string }> = {
  economy:       { label: "Economy",       icon: "💰", color: "var(--color-gold)" },
  military:      { label: "Military",      icon: "⚔️", color: "var(--color-danger)" },
  fortification: { label: "Fortification", icon: "🏰", color: "var(--color-info)" },
};

const BONUS_LABELS: Record<string, string> = {
  production_all: "All Production", production_wood: "Wood", production_stone: "Stone",
  production_iron: "Iron", production_food: "Food", production_gold: "Gold",
  capacity_all: "All Capacity", attack: "Attack", defense: "Defense",
  march_speed: "March Speed", wall_bonus: "Wall Defense",
};

const RES_ICONS: Record<string, string> = {
  wood: "🪵", stone: "🪨", iron: "⚒️", gold: "💰",
};

export default function TechTreePage() {
  const [techs, setTechs] = useState<PlayerTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TechCategory>("economy");
  const [selectedTech, setSelectedTech] = useState<TechDefinition | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const anyResearching = techs.some((t) => t.status === "researching");
    if (!anyResearching) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [techs]);

  const loadTechs = useCallback(async () => {
    try {
      const data = await api.get<{ techs: PlayerTech[] }>("/techs");
      setTechs(data.techs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTechs(); }, [loadTechs]);

  const getStatus = (id: string) => techs.find((t) => t.techId === id);
  const isCompleted = (id: string) => getStatus(id)?.status === "completed";
  const isResearching = (id: string) => getStatus(id)?.status === "researching";

  const canResearch = (def: TechDefinition): boolean => {
    if (getStatus(def.id)) return false;
    if (techs.some((t) => t.status === "researching")) return false;
    return def.prerequisites.every((p) => isCompleted(p));
  };

  const handleResearch = useCallback(async (techId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.post("/techs/research", { techId });
      await loadTechs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }, [loadTechs]);

  const categoryTechs = TECH_TREE.filter((t) => t.category === activeCategory);
  const tiers = [...new Set(categoryTechs.map((t) => t.tier))].sort();
  const catCfg = CATEGORY_CFG[activeCategory];

  // Count completed per category
  const completedCount = (cat: TechCategory) =>
    TECH_TREE.filter((t) => t.category === cat && isCompleted(t.id)).length;
  const totalCount = (cat: TechCategory) =>
    TECH_TREE.filter((t) => t.category === cat).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-3">
        <div className="spinner w-8 h-8" />
        <span className="text-sm text-[var(--text-muted)]">Loading technologies...</span>
      </div>
    );
  }

  return (
    <div className="tech-page">
      {/* Header */}
      <div className="tech-page__header">
        <h1 className="tech-page__title">
          {"🔬"} Technology Research
        </h1>
        <div className="tech-page__progress">
          {(Object.keys(CATEGORY_CFG) as TechCategory[]).map((cat) => (
            <span key={cat} className="tech-page__progress-item" style={{ color: CATEGORY_CFG[cat].color }}>
              {CATEGORY_CFG[cat].icon} {completedCount(cat)}/{totalCount(cat)}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="tech-page__error">
          {"⚠️"} {error}
          <button onClick={() => setError(null)} className="ml-auto text-[var(--text-muted)]">{"✕"}</button>
        </div>
      )}

      {/* Category tabs */}
      <div className="tech-tabs">
        {(Object.keys(CATEGORY_CFG) as TechCategory[]).map((cat) => {
          const cfg = CATEGORY_CFG[cat];
          const isActive = activeCategory === cat;
          const done = completedCount(cat);
          const total = totalCount(cat);
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedTech(null); }}
              className={`tech-tab ${isActive ? "tech-tab--active" : ""}`}
              style={{ "--tab-color": cfg.color } as React.CSSProperties}
            >
              <span className="tech-tab__icon">{cfg.icon}</span>
              <span className="tech-tab__label">{cfg.label}</span>
              <span className="tech-tab__count">{done}/{total}</span>
            </button>
          );
        })}
      </div>

      <div className="tech-content">
        {/* Detail panel — now on the LEFT, anchored before the tree */}
        {selectedTech && (
          <div className="tech-detail">
            <div className="tech-detail__header">
              <span className="tech-detail__cat-icon" style={{ color: catCfg.color }}>{catCfg.icon}</span>
              <div className="tech-detail__titleblock">
                <h3 className="tech-detail__name">{selectedTech.name}</h3>
                <span className="tech-detail__cat">{catCfg.label} &middot; Tier {selectedTech.tier + 1}</span>
              </div>
              <button
                onClick={() => setSelectedTech(null)}
                className="tech-detail__close"
                title="Close"
                aria-label="Close"
              >
                {"✕"}
              </button>
            </div>

            <div className="tech-detail__body">
              <div className="tech-detail__desc-card">
                <p className="tech-detail__desc">{selectedTech.description}</p>
              </div>

              {/* Bonuses */}
              <div className="tech-detail__section">
                <div className="tech-detail__section-label">Bonuses</div>
                {selectedTech.bonuses.map((b, i) => (
                  <div key={i} className="tech-detail__bonus-row">
                    <span>{BONUS_LABELS[b.type] ?? b.type}</span>
                    <span className="tech-detail__bonus-val" style={{ color: catCfg.color }}>
                      +{Math.round(b.value * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost */}
              <div className="tech-detail__section">
                <div className="tech-detail__section-label">Research Cost</div>
                <div className="tech-detail__costs">
                  {Object.entries(selectedTech.cost).map(([type, amount]) =>
                    amount > 0 ? (
                      <span key={type} className="tech-detail__cost-item">
                        {RES_ICONS[type]} <strong>{amount}</strong>
                      </span>
                    ) : null
                  )}
                  <span className="tech-detail__cost-item">
                    {"⏱️"} <strong>{selectedTech.researchTicks}:00</strong>
                  </span>
                </div>
              </div>

              {/* Prerequisites */}
              {selectedTech.prerequisites.length > 0 && (
                <div className="tech-detail__section">
                  <div className="tech-detail__section-label">Prerequisites</div>
                  {selectedTech.prerequisites.map((p) => {
                    const done = isCompleted(p);
                    return (
                      <div key={p} className="tech-detail__prereq">
                        <span style={{ color: done ? "var(--color-success)" : "var(--color-danger)" }}>
                          {done ? "✔" : "✘"}
                        </span>
                        <span style={{ color: done ? "var(--text-secondary)" : "var(--text-muted)" }}>
                          {TECH_MAP[p]?.name ?? p}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action */}
              <div className="tech-detail__action">
                {(() => {
                  const status = getStatus(selectedTech.id);
                  if (status?.status === "completed") {
                    return <div className="alert-badge alert-badge--complete w-full text-center">{"✔"} Researched</div>;
                  }
                  if (status?.status === "researching") {
                    const p = computeResearchProgress(status, selectedTech.researchTicks, nowTs);
                    return (
                      <div className="tech-detail__researching">
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                        In Progress &mdash; {formatRemaining(p.secondsLeft)} remaining
                      </div>
                    );
                  }
                  if (canResearch(selectedTech)) {
                    return (
                      <button onClick={() => handleResearch(selectedTech.id)} disabled={actionLoading} className="btn-primary w-full py-2 text-sm">
                        {actionLoading ? <span className="spinner w-4 h-4" /> : <>{"🔬"} Start Research</>}
                      </button>
                    );
                  }
                  return <div className="tech-detail__locked">{"🔒"} Prerequisites not met</div>;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Tree visualization */}
        <div className="tech-tree">
          {tiers.map((tier, tierIdx) => {
            const tierTechs = categoryTechs.filter((t) => t.tier === tier);
            return (
              <div key={tier} className="tech-tier">
                <div className="tech-tier__label">Tier {tier + 1}</div>
                <div className="tech-tier__nodes">
                  {tierTechs.map((def) => {
                    const status = getStatus(def.id);
                    const completed = status?.status === "completed";
                    const researching = status?.status === "researching";
                    const available = canResearch(def);
                    const prereqsMet = def.prerequisites.every((p) => isCompleted(p));
                    const locked = !completed && !researching && !prereqsMet;
                    const isSelected = selectedTech?.id === def.id;

                    const progress = researching
                      ? computeResearchProgress(status, def.researchTicks, nowTs)
                      : { secondsLeft: 0, pct: completed ? 100 : 0 };
                    const pct = progress.pct;

                    return (
                      <button
                        key={def.id}
                        onClick={() => setSelectedTech(def)}
                        className={`tech-node ${
                          completed ? "tech-node--completed" :
                          researching ? "tech-node--researching" :
                          available ? "tech-node--available" :
                          locked ? "tech-node--locked" : ""
                        } ${isSelected ? "tech-node--selected" : ""}`}
                        style={{ "--node-color": catCfg.color } as React.CSSProperties}
                      >
                        {/* Status icon */}
                        <div className="tech-node__status">
                          {completed && <span className="text-[var(--color-success)]">{"✔"}</span>}
                          {researching && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                          {locked && <span className="text-[var(--text-muted)]">{"🔒"}</span>}
                          {available && <span style={{ color: catCfg.color }}>{"◉"}</span>}
                        </div>

                        <div className="tech-node__name">{def.name}</div>

                        <div className="tech-node__bonuses">
                          {def.bonuses.map((b, i) => (
                            <span key={i} className="tech-node__bonus">
                              +{Math.round(b.value * 100)}% {BONUS_LABELS[b.type]?.split(" ")[0] || ""}
                            </span>
                          ))}
                        </div>

                        {/* Progress bar with countdown overlay — only while researching.
                            Completed techs are already visually marked by the green
                            tech-node--completed style so they don't need a bar. */}
                        {researching && (
                          <div className="tech-node__progress-wrapper">
                            <div className="tech-node__progress">
                              <div
                                className="tech-node__progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="tech-node__progress-label">
                                {formatRemaining(progress.secondsLeft)}
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Connector line to next tier */}
                {tierIdx < tiers.length - 1 && (
                  <div className="tech-tier__connector">
                    <div className="tech-tier__line" />
                    <span className="tech-tier__arrow">{"▼"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
