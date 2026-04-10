import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../api/client.js";
import {
  getTerrain,
  isInBounds,
  TERRAIN_MAP,
  MAP_RADIUS,
  TROOP_MAP,
  CAMP_TROOPS,
  MARCH_SPEED_TICKS_PER_TILE,
  type MapFief,
  type MapCamp,
  type MapData,
  type TerrainType,
  type TroopComposition,
} from "@wargame/shared";

/* ── Terrain palette (rich satellite/military style) ──────────── */
const TERRAIN_COLORS: Record<TerrainType, { bg: string; border: string; glow?: string; pattern?: string }> = {
  plains:    { bg: "#2d4220", border: "#3a5030", pattern: "linear-gradient(135deg, #2d4220 25%, #324825 50%, #2d4220 75%)" },
  forest:    { bg: "#1a3012", border: "#264018", pattern: "linear-gradient(135deg, #1a3012 25%, #1e3616 50%, #1a3012 75%)" },
  hills:     { bg: "#3e3822", border: "#4e4832", pattern: "linear-gradient(135deg, #3e3822 25%, #443e28 50%, #3e3822 75%)" },
  mountains: { bg: "#32323a", border: "#424248", pattern: "linear-gradient(135deg, #32323a 25%, #383840 50%, #32323a 75%)" },
  lake:      { bg: "#162e40", border: "#1e3850", glow: "rgba(56,139,253,0.1)", pattern: "linear-gradient(135deg, #162e40 25%, #1a3448 50%, #162e40 75%)" },
  swamp:     { bg: "#262e1a", border: "#343c28", pattern: "linear-gradient(135deg, #262e1a 25%, #2c341e 50%, #262e1a 75%)" },
};

const TERRAIN_ICONS: Record<TerrainType, string> = {
  plains:    "",
  forest:    "\u{1F332}",
  hills:     "\u26F0\uFE0F",
  mountains: "\u{1F3D4}\uFE0F",
  lake:      "\u{1F30A}",
  swamp:     "\u{1FAB8}",
};

const TILE_SIZE = 44;

interface TroopData {
  troopType: string;
  quantity: number;
  isRecruiting: boolean;
}

interface AttackModalState {
  tileId: string;
  x: number;
  y: number;
  marchType: "attack_camp" | "attack_player";
  // camp-specific
  campId?: string;
  difficulty?: number;
  // player-specific
  targetPlayerName?: string;
  targetLevel?: number;
}

export default function WorldMapPage() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [attackModal, setAttackModal] = useState<AttackModalState | null>(null);
  const [troops, setTroops] = useState<TroopData[]>([]);
  const [selectedTroops, setSelectedTroops] = useState<Record<string, number>>({});
  const [attackLoading, setAttackLoading] = useState(false);
  const [attackError, setAttackError] = useState<string | null>(null);

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    cx: number;
    cy: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<MapData>("/map");
        setMapData(data);
        if (data.playerFief) setCenter(data.playerFief);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadMap = useCallback(async () => {
    try {
      const data = await api.get<MapData>("/map");
      setMapData(data);
    } catch {}
  }, []);

  const fiefMap = useMemo(() => {
    if (!mapData) return new Map<string, MapFief>();
    const m = new Map<string, MapFief>();
    for (const f of mapData.fiefs) m.set(`${f.x},${f.y}`, f);
    return m;
  }, [mapData]);

  const campMap = useMemo(() => {
    if (!mapData) return new Map<string, MapCamp>();
    const m = new Map<string, MapCamp>();
    for (const c of mapData.camps) m.set(`${c.x},${c.y}`, c);
    return m;
  }, [mapData]);

  const [viewport, setViewport] = useState({ cols: 15, rows: 11 });

  const tileSize = Math.round(TILE_SIZE * zoom);

  useEffect(() => {
    function calcViewport() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setViewport({
        cols: (Math.floor(clientWidth / tileSize) | 1) + 2,
        rows: (Math.floor(clientHeight / tileSize) | 1) + 2,
      });
    }
    calcViewport();
    window.addEventListener("resize", calcViewport);
    return () => window.removeEventListener("resize", calcViewport);
  }, [tileSize]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const step = e.shiftKey ? 5 : 1;
      switch (e.key) {
        case "ArrowUp": case "w": case "W":
          e.preventDefault(); setCenter((c) => ({ ...c, y: Math.max(c.y - step, -MAP_RADIUS) })); break;
        case "ArrowDown": case "s": case "S":
          e.preventDefault(); setCenter((c) => ({ ...c, y: Math.min(c.y + step, MAP_RADIUS) })); break;
        case "ArrowLeft": case "a": case "A":
          e.preventDefault(); setCenter((c) => ({ ...c, x: Math.max(c.x - step, -MAP_RADIUS) })); break;
        case "ArrowRight": case "d": case "D":
          e.preventDefault(); setCenter((c) => ({ ...c, x: Math.min(c.x + step, MAP_RADIUS) })); break;
        case "Escape": setSelected(null); break;
        case "+": case "=": setZoom((z) => Math.min(z + 0.15, 1.8)); break;
        case "-": setZoom((z) => Math.max(z - 0.15, 0.5)); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragRef.current = { active: false, startX: e.clientX, startY: e.clientY, cx: center.x, cy: center.y };
    },
    [center]
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active && Math.abs(dx) + Math.abs(dy) > 4) drag.active = true;
    if (!drag.active) return;
    setCenter({
      x: Math.max(-MAP_RADIUS, Math.min(MAP_RADIUS, drag.cx - Math.round(dx / tileSize))),
      y: Math.max(-MAP_RADIUS, Math.min(MAP_RADIUS, drag.cy - Math.round(dy / tileSize))),
    });
  }, [tileSize]);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(1.8, z - e.deltaY * 0.001)));
  }, []);

  const onTileClick = useCallback((x: number, y: number) => {
    if (dragRef.current?.active) return;
    setSelected((prev) => (prev?.x === x && prev?.y === y ? null : { x, y }));
  }, []);

  const goHome = useCallback(() => {
    if (mapData?.playerFief) setCenter(mapData.playerFief);
  }, [mapData]);

  const openAttackModal = useCallback(async (modal: AttackModalState) => {
    setAttackModal(modal);
    setAttackError(null);
    setSelectedTroops({});
    // Load current troops
    try {
      const data = await api.get<{ fief: any; troops: TroopData[] }>("/fief");
      setTroops(data.troops.filter((t) => t.quantity > 0 && !t.isRecruiting));
    } catch {}
  }, []);

  const handleAttack = useCallback(async () => {
    if (!attackModal) return;
    const troopsToSend: Record<string, number> = {};
    let total = 0;
    for (const [type, qty] of Object.entries(selectedTroops)) {
      if (qty > 0) {
        troopsToSend[type] = qty;
        total += qty;
      }
    }
    if (total === 0) {
      setAttackError("Select at least one troop");
      return;
    }
    setAttackLoading(true);
    setAttackError(null);
    try {
      await api.post("/march", {
        targetTileId: attackModal.tileId,
        troops: troopsToSend,
        marchType: attackModal.marchType,
      });
      setAttackModal(null);
      reloadMap();
    } catch (err: any) {
      setAttackError(err.message);
    } finally {
      setAttackLoading(false);
    }
  }, [attackModal, selectedTroops, reloadMap]);

  // Build tile array
  const halfCols = Math.floor(viewport.cols / 2);
  const halfRows = Math.floor(viewport.rows / 2);

  const tiles = useMemo(() => {
    const myAllianceId = mapData?.playerAllianceId ?? null;
    const arr: Array<{
      x: number; y: number; terrain: TerrainType;
      fief: MapFief | undefined; camp: MapCamp | undefined;
      isPlayerFief: boolean; isAlly: boolean; isSelected: boolean; oob: boolean;
    }> = [];
    for (let dy = -halfRows; dy <= halfRows; dy++) {
      for (let dx = -halfCols; dx <= halfCols; dx++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const oob = !isInBounds(x, y);
        const fief = fiefMap.get(`${x},${y}`);
        const isPlayerFief = mapData?.playerFief?.x === x && mapData?.playerFief?.y === y;
        const isAlly = !isPlayerFief && !!myAllianceId && !!fief?.allianceId && fief.allianceId === myAllianceId;
        arr.push({
          x, y,
          terrain: oob ? "plains" : getTerrain(x, y),
          fief,
          camp: campMap.get(`${x},${y}`),
          isPlayerFief,
          isAlly,
          isSelected: selected?.x === x && selected?.y === y,
          oob,
        });
      }
    }
    return arr;
  }, [center, halfCols, halfRows, fiefMap, campMap, mapData, selected]);

  const selectedFief = selected ? fiefMap.get(`${selected.x},${selected.y}`) : undefined;
  const selectedCamp = selected ? campMap.get(`${selected.x},${selected.y}`) : undefined;
  const selectedTerrain = selected
    ? isInBounds(selected.x, selected.y) ? getTerrain(selected.x, selected.y) : null
    : null;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="spinner w-10 h-10" />
        <p className="text-sm text-[var(--text-muted)]">Loading SAT-COM feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden relative bg-[#0a0e14]">
      {/* ── Floating controls (top-right) ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-2)]/90 backdrop-blur-sm px-2.5 py-1 rounded border border-[var(--border-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" />
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Live SAT-COM
          </span>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-2)]/90 backdrop-blur-sm px-2 py-1 rounded border border-[var(--border-muted)]">
          {center.x},{center.y}
        </span>
        <button onClick={goHome} className="btn-outline text-xs px-2.5 py-1">
          {"\u{1F3F0}"} My Fief
        </button>
      </div>

      {/* ── Zoom controls (top-left) ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
          className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)]/90 backdrop-blur-sm border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors text-sm font-bold"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
          className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)]/90 backdrop-blur-sm border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors text-sm font-bold"
        >
          -
        </button>
      </div>

      {/* ── Map grid ── */}
      <div className="flex flex-1 min-h-0">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none relative"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${viewport.cols}, ${tileSize}px)`,
              gridTemplateRows: `repeat(${viewport.rows}, ${tileSize}px)`,
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            {tiles.map((t) => {
              const tc = TERRAIN_COLORS[t.terrain];
              const hasFief = !!t.fief;
              const hasCamp = !!t.camp && !t.camp.isDefeated;

              return (
                <div
                  key={`${t.x},${t.y}`}
                  className={`relative flex items-center justify-center transition-all duration-75 ${
                    t.oob
                      ? "opacity-10"
                      : t.isSelected
                        ? "z-10 ring-1 ring-[var(--color-gold)] shadow-[0_0_12px_rgba(212,160,32,0.3)]"
                        : t.isPlayerFief
                          ? "z-5 ring-1 ring-[var(--color-success)]/60 shadow-[0_0_8px_rgba(63,185,80,0.2)]"
                        : t.isAlly
                          ? "z-5 ring-1 ring-[var(--color-info)]/40 shadow-[0_0_6px_rgba(56,139,253,0.15)]"
                          : hasCamp
                            ? "z-5 ring-1 ring-[var(--color-danger)]/40 shadow-[0_0_6px_rgba(200,50,50,0.15)]"
                            : "hover:brightness-125 hover:z-5"
                  }`}
                  style={{
                    width: tileSize,
                    height: tileSize,
                    background: t.oob ? "#060a10" : (tc.pattern || tc.bg),
                    borderRight: `1px solid ${t.oob ? "#0a0e14" : tc.border}`,
                    borderBottom: `1px solid ${t.oob ? "#0a0e14" : tc.border}`,
                    boxShadow: tc.glow && !t.oob ? `inset 0 0 14px ${tc.glow}` : !t.oob ? "inset 0 1px 0 rgba(255,255,255,0.03)" : undefined,
                    cursor: t.oob ? "default" : "pointer",
                  }}
                  onClick={() => !t.oob && onTileClick(t.x, t.y)}
                >
                  {/* Coordinate grid every 5 tiles */}
                  {!t.oob && (t.x % 5 === 0 || t.y % 5 === 0) && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        borderLeft: t.x % 5 === 0 ? "1px solid rgba(212,160,32,0.06)" : undefined,
                        borderTop: t.y % 5 === 0 ? "1px solid rgba(212,160,32,0.06)" : undefined,
                      }}
                    />
                  )}

                  {/* Coordinate label every 10 tiles */}
                  {!t.oob && t.x % 10 === 0 && t.y % 10 === 0 && !hasFief && (
                    <span className="absolute top-0.5 left-0.5 text-[0.4rem] font-mono text-[var(--color-gold)]/20 pointer-events-none leading-none">
                      {t.x},{t.y}
                    </span>
                  )}

                  {/* Terrain icon */}
                  {!t.oob && !hasFief && !hasCamp && TERRAIN_ICONS[t.terrain] && (
                    <span
                      className="pointer-events-none select-none"
                      style={{
                        fontSize: `${Math.max(tileSize * 0.38, 10)}px`,
                        opacity: 0.35,
                        filter: "saturate(0.6)",
                      }}
                    >
                      {TERRAIN_ICONS[t.terrain]}
                    </span>
                  )}

                  {/* Fief marker */}
                  {hasFief && (
                    <div className="flex flex-col items-center pointer-events-none" style={{ animation: t.isPlayerFief ? "float-gentle 4s ease-in-out infinite" : undefined }}>
                      {/* Glow ring for player/allied fief */}
                      {(t.isPlayerFief || t.isAlly) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="rounded-full animate-pulse" style={{
                            width: `${tileSize * 0.8}px`,
                            height: `${tileSize * 0.8}px`,
                            background: t.isPlayerFief
                              ? "radial-gradient(circle, rgba(212,160,32,0.2) 0%, transparent 70%)"
                              : "radial-gradient(circle, rgba(56,139,253,0.2) 0%, transparent 70%)",
                          }} />
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-center rounded-lg ${
                          t.isPlayerFief
                            ? "bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/30"
                            : t.isAlly
                              ? "bg-[var(--color-info)]/15 border border-[var(--color-info)]/30"
                              : "bg-[var(--surface-2)]/70 border border-[var(--border-muted)]"
                        }`}
                        style={{
                          width: `${Math.max(tileSize * 0.6, 18)}px`,
                          height: `${Math.max(tileSize * 0.6, 18)}px`,
                          boxShadow: t.isPlayerFief
                            ? "0 0 12px rgba(212,160,32,0.35), 0 2px 4px rgba(0,0,0,0.3)"
                            : t.isAlly
                              ? "0 0 10px rgba(56,139,253,0.25), 0 2px 4px rgba(0,0,0,0.3)"
                              : "0 2px 6px rgba(0,0,0,0.3)",
                        }}
                      >
                        <span
                          style={{ fontSize: `${Math.max(tileSize * 0.34, 10)}px`, lineHeight: 1 }}
                          className={t.isPlayerFief ? "drop-shadow-[0_0_4px_rgba(212,160,32,0.6)]" : t.isAlly ? "drop-shadow-[0_0_4px_rgba(56,139,253,0.5)]" : ""}
                        >
                          {"\u{1F3F0}"}
                        </span>
                      </div>
                      {tileSize >= 36 && (
                        <span
                          className="text-[0.42rem] font-bold leading-none mt-0.5 truncate max-w-[48px] px-0.5 rounded"
                          style={{
                            color: t.isPlayerFief ? "var(--color-gold)" : t.isAlly ? "var(--color-info-light)" : "var(--text-secondary)",
                            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)",
                            background: "rgba(0,0,0,0.4)",
                          }}
                        >
                          {t.fief!.allianceTag ? `[${t.fief!.allianceTag}] ` : ""}{t.fief!.playerName ?? "???"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Camp marker */}
                  {hasCamp && (
                    <div className="flex flex-col items-center pointer-events-none">
                      {/* Danger pulse ring */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="rounded-full" style={{
                          width: `${tileSize * 0.7}px`,
                          height: `${tileSize * 0.7}px`,
                          background: "radial-gradient(circle, rgba(248,81,73,0.15) 0%, transparent 70%)",
                          animation: "campfire 3s ease-in-out infinite",
                        }} />
                      </div>
                      <div
                        className="flex items-center justify-center rounded-lg bg-[var(--color-danger)]/12 border border-[var(--color-danger)]/25"
                        style={{
                          width: `${Math.max(tileSize * 0.6, 18)}px`,
                          height: `${Math.max(tileSize * 0.6, 18)}px`,
                          boxShadow: "0 0 8px rgba(248,81,73,0.25), 0 2px 4px rgba(0,0,0,0.3)",
                        }}
                      >
                        <span
                          style={{ fontSize: `${Math.max(tileSize * 0.32, 10)}px`, lineHeight: 1 }}
                          className="drop-shadow-[0_0_3px_rgba(200,50,50,0.5)]"
                        >
                          {"\u{1F525}"}
                        </span>
                      </div>
                      {tileSize >= 36 && (
                        <span
                          className="text-[0.42rem] font-bold leading-none mt-0.5 px-0.5 rounded"
                          style={{
                            color: "var(--color-danger-light)",
                            textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                            background: "rgba(0,0,0,0.4)",
                          }}
                        >
                          Lv.{t.camp!.difficulty}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-3 left-3 text-[0.55rem] text-[var(--text-muted)] opacity-40 pointer-events-none flex items-center gap-3">
            <span>Drag to pan</span>
            <span className="opacity-30">|</span>
            <span>WASD / Arrows</span>
            <span className="opacity-30">|</span>
            <span>Scroll to zoom</span>
            <span className="opacity-30">|</span>
            <span>Click to inspect</span>
          </div>
        </div>

        {/* ── Tile info panel ── */}
        {selected && selectedTerrain && (
          <div className="w-64 border-l border-[var(--border-muted)] bg-[var(--surface-1)] p-4 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Tile Intel</h2>
              <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-1.5 py-0.5">
                {"\u2715"}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="stat-label">Coordinates</div>
                <div className="font-mono text-sm">{selected.x}, {selected.y}</div>
              </div>

              <div>
                <div className="stat-label">Terrain</div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm border border-[var(--border-muted)]"
                    style={{ backgroundColor: TERRAIN_COLORS[selectedTerrain].bg }}
                  />
                  <span className="text-sm">{TERRAIN_MAP[selectedTerrain].label}</span>
                  {TERRAIN_ICONS[selectedTerrain] && (
                    <span className="text-xs opacity-50">{TERRAIN_ICONS[selectedTerrain]}</span>
                  )}
                  {!TERRAIN_MAP[selectedTerrain].habitable && (
                    <span className="alert-badge alert-badge--alert">Impassable</span>
                  )}
                </div>
              </div>

              {selectedFief ? (
                <>
                  <div className="medieval-divider" />
                  <div>
                    <div className="stat-label">Settlement</div>
                    <div className="font-title font-bold text-[var(--color-gold)] text-sm">
                      {selectedFief.fiefName}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Ruler</div>
                    <div className="text-sm flex items-center gap-1.5">
                      {selectedFief.allianceTag && (
                        <span className="text-[0.6rem] font-bold px-1 py-0.5 rounded bg-[var(--color-info)]/15 text-[var(--color-info-light)] border border-[var(--color-info)]/30">
                          [{selectedFief.allianceTag}]
                        </span>
                      )}
                      {selectedFief.playerName ?? "Unclaimed"}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <div className="stat-label">Level</div>
                      <div className="stat-value text-sm">{selectedFief.level}</div>
                    </div>
                    <div>
                      <div className="stat-label">Population</div>
                      <div className="stat-value text-sm">{selectedFief.population.toLocaleString()}</div>
                    </div>
                  </div>
                  {selectedFief.hasNewbieShield && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-info-light)]">
                      <span>{"\u{1F6E1}\uFE0F"}</span> Shield Active
                    </div>
                  )}
                  {mapData?.playerFief &&
                    selected.x === mapData.playerFief.x &&
                    selected.y === mapData.playerFief.y ? (
                      <div className="alert-badge alert-badge--complete w-fit">
                        {"\u2714"} Your Territory
                      </div>
                    ) : mapData?.playerAllianceId &&
                      selectedFief.allianceId === mapData.playerAllianceId ? (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-info-light)]">
                        <span>{"\u{1F91D}"}</span> Allied
                      </div>
                    ) : !selectedFief.hasNewbieShield && mapData?.playerFief ? (
                      <>
                        <div>
                          <div className="stat-label">March Distance</div>
                          <div className="text-xs">
                            {Math.abs(selected.x - mapData.playerFief.x) +
                              Math.abs(selected.y - mapData.playerFief.y)}{" "}
                            tiles ({(Math.abs(selected.x - mapData.playerFief.x) +
                              Math.abs(selected.y - mapData.playerFief.y)) *
                              MARCH_SPEED_TICKS_PER_TILE}m travel)
                          </div>
                        </div>
                        <button
                          onClick={() => openAttackModal({
                            tileId: `${selectedFief.x},${selectedFief.y}`,
                            x: selectedFief.x,
                            y: selectedFief.y,
                            marchType: "attack_player",
                            targetPlayerName: selectedFief.playerName ?? "Unknown",
                            targetLevel: selectedFief.level,
                          })}
                          className="btn-primary w-full text-xs py-2 mt-1"
                          style={{ background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                        >
                          {"\u2694\uFE0F"} Raid Fief
                        </button>
                      </>
                    ) : null}
                </>
              ) : selectedCamp ? (
                <>
                  <div className="medieval-divider" />
                  <div>
                    <div className="stat-label">Barbarian Camp</div>
                    <div className="font-title font-bold text-[var(--color-danger-light)] text-sm">
                      {"\u{1F3D5}\uFE0F"} Difficulty {selectedCamp.difficulty}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Enemy Forces</div>
                    <div className="space-y-0.5 text-xs">
                      {Object.entries(CAMP_TROOPS[selectedCamp.difficulty] || {}).map(
                        ([type, qty]) => (
                          <div key={type} className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">
                              {TROOP_MAP[type]?.name || type}
                            </span>
                            <span className="font-bold text-[var(--color-danger-light)]">{qty}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  {mapData?.playerFief && (
                    <div>
                      <div className="stat-label">March Distance</div>
                      <div className="text-xs">
                        {Math.abs(selected.x - mapData.playerFief.x) +
                          Math.abs(selected.y - mapData.playerFief.y)}{" "}
                        tiles ({(Math.abs(selected.x - mapData.playerFief.x) +
                          Math.abs(selected.y - mapData.playerFief.y)) *
                          MARCH_SPEED_TICKS_PER_TILE}m travel)
                      </div>
                    </div>
                  )}
                  {selectedCamp.isDefeated ? (
                    <div className="text-xs text-[var(--text-muted)] italic">
                      Defeated — respawning...
                    </div>
                  ) : (
                    <button
                      onClick={() => openAttackModal({
                        tileId: `${selectedCamp.x},${selectedCamp.y}`,
                        x: selectedCamp.x,
                        y: selectedCamp.y,
                        marchType: "attack_camp",
                        campId: selectedCamp.campId,
                        difficulty: selectedCamp.difficulty,
                      })}
                      className="btn-primary w-full text-xs py-2 mt-1"
                    >
                      {"\u2694\uFE0F"} Attack Camp
                    </button>
                  )}
                </>
              ) : (
                TERRAIN_MAP[selectedTerrain].habitable && (
                  <>
                    <div className="medieval-divider" />
                    <div className="text-xs text-[var(--text-muted)] italic">
                      Unclaimed territory
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>
      {/* ── Attack Modal ── */}
      {attackModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-5 w-[360px] max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title text-base font-bold text-[var(--color-gold)]">
                {"\u2694\uFE0F"}{" "}
                {attackModal.marchType === "attack_camp"
                  ? `Attack Camp Lv.${attackModal.difficulty}`
                  : `Raid ${attackModal.targetPlayerName}`}
              </h2>
              <button
                onClick={() => setAttackModal(null)}
                className="btn-ghost text-xs px-1.5 py-0.5"
              >
                {"\u2715"}
              </button>
            </div>

            <div className="text-xs text-[var(--text-muted)] mb-3">
              Target: ({attackModal.x}, {attackModal.y})
              {mapData?.playerFief && (
                <span className="ml-2">
                  — {(Math.abs(attackModal.x - mapData.playerFief.x) +
                    Math.abs(attackModal.y - mapData.playerFief.y)) *
                    MARCH_SPEED_TICKS_PER_TILE}m travel
                </span>
              )}
            </div>

            {attackError && (
              <div className="flex items-start gap-2 p-2 rounded-lg text-xs bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-[var(--color-danger-light)] mb-3">
                <span className="shrink-0">{"\u26A0\uFE0F"}</span>
                <span>{attackError}</span>
              </div>
            )}

            <h3 className="section-title mb-2">Select Troops</h3>
            {troops.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] italic mb-3">
                No troops available. Recruit troops first.
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {troops.map((t) => {
                  const def = TROOP_MAP[t.troopType];
                  const qty = selectedTroops[t.troopType] || 0;
                  return (
                    <div
                      key={t.troopType}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-0)]/50 border border-[var(--border-muted)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">
                          {def?.name || t.troopType}
                        </div>
                        <div className="text-[0.6rem] text-[var(--text-muted)]">
                          Available: {t.quantity} | ATK {def?.attack} DEF {def?.defense}
                        </div>
                      </div>
                      <div className="flex items-center border border-[var(--border-default)] rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTroops((s) => ({
                              ...s,
                              [t.troopType]: Math.max(0, (s[t.troopType] || 0) - 1),
                            }))
                          }
                          disabled={qty <= 0}
                          className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-8 text-center bg-[var(--surface-0)]/50">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTroops((s) => ({
                              ...s,
                              [t.troopType]: Math.min(
                                t.quantity,
                                (s[t.troopType] || 0) + 1
                              ),
                            }))
                          }
                          disabled={qty >= t.quantity}
                          className="btn-ghost text-xs px-1.5 py-0.5 rounded-none"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTroops((s) => ({
                            ...s,
                            [t.troopType]: t.quantity,
                          }))
                        }
                        className="btn-ghost text-[0.6rem] px-1.5 py-0.5"
                      >
                        All
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {Object.values(selectedTroops).some((q) => q > 0) && (
              <div className="text-xs mb-3 p-2 rounded bg-[var(--surface-0)]/50 border border-[var(--border-muted)]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Total Attack</span>
                  <span className="font-bold text-[var(--color-danger-light)]">
                    {Object.entries(selectedTroops).reduce(
                      (sum, [type, qty]) =>
                        sum + (TROOP_MAP[type]?.attack || 0) * qty,
                      0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Total Units</span>
                  <span className="font-bold">
                    {Object.values(selectedTroops).reduce((s, q) => s + q, 0)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setAttackModal(null)}
                className="btn-outline flex-1 text-xs py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAttack}
                disabled={
                  attackLoading ||
                  Object.values(selectedTroops).every((q) => !q)
                }
                className="btn-primary flex-1 text-xs py-2"
              >
                {attackLoading ? (
                  <>
                    <span className="spinner w-3 h-3" /> Marching...
                  </>
                ) : (
                  "Send Army"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
