import type React from "react";
import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { TROOP_ICONS } from "../util/troopIcons.js";
import {
  getTerrain,
  isInBounds,
  TERRAIN_MAP,
  MAP_RADIUS,
  TROOP_MAP,
  CAMP_TROOPS,
  MARCH_SPEED_TICKS_PER_TILE,
  parseTileId,
  type MapFief,
  type MapCamp,
  type MapData,
  type TerrainType,
  type TroopComposition,
} from "@wargame/shared";

/* ── Terrain palette (rich satellite/military style) ──────────── */
const TERRAIN_COLORS: Record<TerrainType, { bg: string; border: string; glow?: string; pattern?: string }> = {
  plains:    { bg: "#c8b878", border: "#a89860", pattern: "linear-gradient(135deg, #cdba78 25%, #c5b272 50%, #cdba78 75%)" },
  forest:    { bg: "#7a8c4a", border: "#5e6e35", pattern: "linear-gradient(135deg, #7d8f4d 25%, #748448 50%, #7d8f4d 75%)" },
  hills:     { bg: "#b89858", border: "#947838", pattern: "linear-gradient(135deg, #bc9c5c 25%, #b29354 50%, #bc9c5c 75%)" },
  mountains: { bg: "#9a8a78", border: "#7a6a58", pattern: "linear-gradient(135deg, #9d8d7b 25%, #948476 50%, #9d8d7b 75%)" },
  lake:      { bg: "#6e94a8", border: "#4c6e7f", glow: "rgba(110,148,168,0.18)", pattern: "linear-gradient(135deg, #75a0b2 25%, #6890a4 50%, #75a0b2 75%)" },
  swamp:     { bg: "#7e8458", border: "#5e6438", pattern: "linear-gradient(135deg, #82885c 25%, #7a8054 50%, #82885c 75%)" },
};

const TERRAIN_ICONS: Record<TerrainType, string> = {
  plains:    "",
  forest:    "🌲",
  hills:     "⛰️",
  mountains: "🏔️",
  lake:      "🌊",
  swamp:     "🪸",
};

/* ── Cluster-based landscape art ──
   Forest / lake / swamp / hills / mountain tiles are grouped into
   connected clusters and rendered as a single SVG covering the
   cluster's bounding box, so landscape features feel continuous
   instead of grid-locked. The tile click grid stays per-coordinate. */
const CLUSTER_TERRAINS = new Set<TerrainType>([
  "forest",
  "lake",
  "swamp",
  "hills",
  "mountains",
]);

interface Cluster {
  terrain: TerrainType;
  minDx: number; maxDx: number;
  minDy: number; maxDy: number;
  cells: Array<[number, number]>;
}

function makeRng(seed: number) {
  return (n: number) => {
    let s = (seed ^ (n * 2654435761)) >>> 0;
    s = ((s ^ (s >>> 13)) * 0x85ebca6b) >>> 0;
    s = ((s ^ (s >>> 16)) * 0xc2b2ae35) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) % 1000 / 1000;
  };
}

/** Choose a castle glyph based on the village's keep level (expansion tier). */
/** Tiered castle SVG that grows with keep level — from a thatched hut to
 *  a grand fortress. Renders a 32×32 viewBox scaled to `size` px. */
function CastleSvg({ level, size }: { level: number; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 36 36",
    xmlns: "http://www.w3.org/2000/svg",
    style: { display: "block" as const, overflow: "visible" as const, filter: "drop-shadow(0 1px 3px rgba(20,12,4,0.7))" },
  };

  // Tier 1 (level 0-2): small thatched hut
  if (level <= 2) {
    return (
      <svg {...common}>
        {/* Ground */}
        <ellipse cx="18" cy="33" rx="12" ry="2" fill="rgba(40,28,12,0.3)"/>
        {/* Walls — warm wood */}
        <rect x="9" y="18" width="18" height="15" rx="1" fill="#9a7a4a" stroke="#6a4a20" strokeWidth="0.8"/>
        {/* Thatched roof */}
        <polygon points="6,18 18,6 30,18" fill="#b8863a" stroke="#8a5a1a" strokeWidth="0.7"/>
        <polygon points="8,18 18,8 28,18" fill="#c89848" stroke="#8a5a1a" strokeWidth="0.3" opacity="0.5"/>
        {/* Door */}
        <rect x="14" y="24" width="8" height="9" rx="1" fill="#4a2810"/>
        {/* Window */}
        <rect x="11" y="21" width="3" height="3" rx="0.4" fill="#d8e8f0" stroke="#6a4a20" strokeWidth="0.4"/>
        {/* Smoke from roof */}
        <circle cx="22" cy="8" r="1.5" fill="#999" opacity="0.25"/>
        <circle cx="24" cy="5" r="2" fill="#999" opacity="0.15"/>
      </svg>
    );
  }

  // Tier 2 (level 3-4): stone manor house
  if (level <= 4) {
    return (
      <svg {...common}>
        <ellipse cx="18" cy="34" rx="14" ry="2" fill="rgba(40,28,12,0.25)"/>
        {/* Stone walls */}
        <rect x="6" y="16" width="24" height="17" rx="1" fill="#a09888" stroke="#6a6058" strokeWidth="0.8"/>
        {/* Stone texture */}
        {[20,24,28].map(y => <line key={y} x1="6" y1={y} x2="30" y2={y} stroke="#8a8278" strokeWidth="0.3" opacity="0.5"/>)}
        {/* Steep roof */}
        <polygon points="4,16 18,4 32,16" fill="#7a3828" stroke="#5a2818" strokeWidth="0.6"/>
        {/* Chimney */}
        <rect x="26" y="6" width="3" height="10" fill="#6a5a48" stroke="#4a3a28" strokeWidth="0.4"/>
        <circle cx="27.5" cy="4" r="1.5" fill="#888" opacity="0.2"/>
        {/* Door with arch */}
        <path d="M14,33 L14,24 Q18,20 22,24 L22,33 Z" fill="#2a1508"/>
        {/* Windows with warm glow */}
        {[8,25].map(x => (
          <g key={x}>
            <rect x={x} y="19" width="4" height="5" rx="0.4" fill="#1a1a2a"/>
            <rect x={x+0.3} y="19.3" width="3.4" height="4.4" rx="0.3" fill="#f0c040" opacity="0.2"/>
          </g>
        ))}
        {/* Small flag */}
        <line x1="18" y1="4" x2="18" y2="0" stroke="#5a3a20" strokeWidth="0.5"/>
        <polygon points="18,0 23,1.5 18,3" fill="#d4a020" opacity="0.85"/>
      </svg>
    );
  }

  // Tier 3 (level 5-7): proper castle with tower + battlements
  if (level <= 7) {
    return (
      <svg {...common}>
        <ellipse cx="18" cy="34" rx="16" ry="2.5" fill="rgba(40,28,12,0.25)"/>
        {/* Main wall */}
        <rect x="8" y="16" width="22" height="17" rx="0.5" fill="#8a8898" stroke="#4a4858" strokeWidth="0.8"/>
        {/* Wall highlight */}
        <rect x="8" y="16" width="5" height="17" rx="0.5" fill="rgba(255,255,255,0.06)"/>
        {/* Left tower (tall) */}
        <rect x="1" y="8" width="11" height="25" rx="0.5" fill="#9a9aaa" stroke="#4a4a5a" strokeWidth="0.8"/>
        <polygon points="1,8 6.5,1 12,8" fill="#8a2828" stroke="#5a1818" strokeWidth="0.5"/>
        {/* Tower highlight */}
        <rect x="1" y="8" width="3" height="25" rx="0.3" fill="rgba(255,255,255,0.08)"/>
        {/* Battlements left tower */}
        {[1,4,7,10].map(x => <rect key={`bt${x}`} x={x} y="6" width="2" height="3" fill="#9a9aaa" stroke="#4a4a5a" strokeWidth="0.2"/>)}
        {/* Battlements main wall */}
        {[13,16,19,22,25,28].map(x => <rect key={`bm${x}`} x={x} y="13.5" width="2" height="3.5" fill="#8a8898" stroke="#4a4858" strokeWidth="0.2"/>)}
        {/* Gate */}
        <path d="M16,33 L16,24 Q20.5,19 25,24 L25,33 Z" fill="#1a0f05"/>
        {/* Right mini-tower */}
        <rect x="28" y="12" width="7" height="21" rx="0.5" fill="#8a8a9a" stroke="#4a4a5a" strokeWidth="0.6"/>
        {[28,31].map(x => <rect key={`br${x}`} x={x} y="10" width="2" height="3" fill="#8a8a9a" stroke="#4a4a5a" strokeWidth="0.2"/>)}
        {/* Flag */}
        <line x1="6.5" y1="1" x2="6.5" y2="-3" stroke="#4a3020" strokeWidth="0.6"/>
        <polygon points="6.5,-3 12,-1 6.5,0.5" fill="#d4a020"/>
        {/* Windows */}
        <rect x="3" y="16" width="2.5" height="4" rx="0.3" fill="#1a1a2a"/>
        <rect x="3.2" y="16.2" width="2.1" height="3.6" rx="0.2" fill="#f0c040" opacity="0.15"/>
        <rect x="8.5" y="16" width="2.5" height="4" rx="0.3" fill="#1a1a2a"/>
        {/* Torch glow */}
        <ellipse cx="15" cy="24" rx="1.5" ry="2" fill="#f0a020" opacity="0.4"/>
        <ellipse cx="26" cy="24" rx="1.5" ry="2" fill="#f0a020" opacity="0.4"/>
      </svg>
    );
  }

  // Tier 4 (level 8-10): grand fortress with 3 towers + flags
  return (
    <svg {...common}>
      <ellipse cx="18" cy="35" rx="17" ry="3" fill="rgba(40,28,12,0.25)"/>
      {/* Outer wall */}
      <rect x="4" y="16" width="28" height="17" rx="0.5" fill="#7a7888" stroke="#3a384a" strokeWidth="0.8"/>
      {/* Left tower */}
      <rect x="-1" y="6" width="10" height="27" rx="0.5" fill="#9a9aaa" stroke="#3a3a4a" strokeWidth="0.8"/>
      <polygon points="-1,6 4,-1 9,6" fill="#9a2828" stroke="#6a1818" strokeWidth="0.5"/>
      <rect x="-1" y="6" width="3" height="27" rx="0.3" fill="rgba(255,255,255,0.1)"/>
      {/* Right tower */}
      <rect x="27" y="6" width="10" height="27" rx="0.5" fill="#9a9aaa" stroke="#3a3a4a" strokeWidth="0.8"/>
      <polygon points="27,6 32,-1 37,6" fill="#9a2828" stroke="#6a1818" strokeWidth="0.5"/>
      <rect x="27" y="6" width="3" height="27" rx="0.3" fill="rgba(255,255,255,0.1)"/>
      {/* Center tower (tallest) */}
      <rect x="12" y="2" width="12" height="31" rx="0.5" fill="#aaaabc" stroke="#3a3a4a" strokeWidth="0.8"/>
      <polygon points="12,2 18,-5 24,2" fill="#9a2828" stroke="#6a1818" strokeWidth="0.5"/>
      <rect x="12" y="2" width="3" height="31" rx="0.3" fill="rgba(255,255,255,0.1)"/>
      {/* Battlements everywhere */}
      {[-1,2,5,8,12,15,18,21,27,30,33].map(x => (
        <rect key={`b${x}`} x={x} y={x >= 12 && x <= 21 ? 0 : 4} width="2" height="2.5" fill="#9a9aaa" stroke="#3a3a4a" strokeWidth="0.2"/>
      ))}
      {/* Gate with iron portcullis */}
      <path d="M14,33 L14,22 Q18,17 22,22 L22,33 Z" fill="#0f0805"/>
      {[15.5,18,20.5].map(x => <line key={`g${x}`} x1={x} y1="22" x2={x} y2="33" stroke="#555" strokeWidth="0.5"/>)}
      {/* 3 Flags */}
      <line x1="4" y1="-1" x2="4" y2="-6" stroke="#3a2a1a" strokeWidth="0.5"/>
      <polygon points="4,-6 10,-4 4,-2" fill="#d4a020"/>
      <line x1="18" y1="-5" x2="18" y2="-10" stroke="#3a2a1a" strokeWidth="0.5"/>
      <polygon points="18,-10 24,-8 18,-6" fill="#e0b830"/>
      <line x1="32" y1="-1" x2="32" y2="-6" stroke="#3a2a1a" strokeWidth="0.5"/>
      <polygon points="32,-6 26,-4 32,-2" fill="#d4a020"/>
      {/* Windows with warm glow */}
      {[1,14,29].map(x => (
        <g key={`w${x}`}>
          <rect x={x+1} y="14" width="2.5" height="4" rx="0.3" fill="#1a1a2a"/>
          <rect x={x+1.2} y="14.2" width="2.1" height="3.6" rx="0.2" fill="#f0c040" opacity="0.2"/>
        </g>
      ))}
      {/* Torch glow at gate */}
      <ellipse cx="13" cy="22" rx="2" ry="2.5" fill="#f0a020" opacity="0.45"/>
      <ellipse cx="23" cy="22" rx="2" ry="2.5" fill="#f0a020" opacity="0.45"/>
    </svg>
  );
}

function ClusterArt({ cluster }: { cluster: Cluster }) {
  const cols = cluster.maxDx - cluster.minDx + 1;
  const rows = cluster.maxDy - cluster.minDy + 1;
  const w = cols * 32;
  const h = rows * 32;
  const t = cluster.terrain;

  if (t === "lake") {
    // One lake per tile: always centered in the 32×32 cell, size seeded
    // per coordinate so each cell has a different pond. Max radius is
    // capped at ~13 so lakes never clip the tile edges.
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {cluster.cells.flatMap(([dx, dy]) => {
          const cx = (dx - cluster.minDx) * 32 + 16;
          const cy = (dy - cluster.minDy) * 32 + 16;
          const rng = makeRng(((dx + 11) * 73856093) ^ ((dy + 11) * 19349663));
          // Variable lake size: rx 8-13, ry 6-11 — always inside 14px half-cell
          const sizeRoll = rng(0);
          const rxR = 8 + sizeRoll * 5; // 8-13
          const ryR = 6 + rng(1) * 5;   // 6-11
          // Slight rotation so not all lakes are axis-aligned ovals
          const rot = (rng(2) - 0.5) * 40;
          return [
            <g key={`lake-${dx},${dy}`} transform={`rotate(${rot} ${cx} ${cy})`}>
              {/* Dark water shore/outline */}
              <ellipse cx={cx} cy={cy + 0.9} rx={rxR + 1.2} ry={ryR + 0.9} fill="#3f5d72" opacity="0.9" />
              {/* Main water */}
              <ellipse cx={cx} cy={cy} rx={rxR} ry={ryR} fill="#5e87a0" />
              {/* Mid highlight */}
              <ellipse cx={cx} cy={cy - 0.6} rx={rxR * 0.76} ry={ryR * 0.7} fill="#7ca6bf" />
              {/* Bright glint near top-left — subtle reflection */}
              <ellipse
                cx={cx - rxR * 0.28}
                cy={cy - ryR * 0.35}
                rx={rxR * 0.35}
                ry={ryR * 0.26}
                fill="#a9c9dd"
                opacity="0.78"
              />
            </g>,
          ];
        })}
      </svg>
    );
  }

  if (t === "forest") {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {cluster.cells.flatMap(([dx, dy]) => {
          const ox = (dx - cluster.minDx) * 32;
          const oy = (dy - cluster.minDy) * 32;
          const rng = makeRng((dx * 73856093) ^ (dy * 19349663));
          const trees: React.ReactElement[] = [];
          // 2-3 trees per cell with heavy size variation biased small
          const count = 2 + Math.floor(rng(0) * 2);
          for (let i = 0; i < count; i++) {
            // Keep interior padding so trees don't clip tile edges
            const tx = ox + 8 + rng(i * 2 + 1) * 16;
            const ty = oy + 10 + rng(i * 2 + 2) * 14;
            // Smaller-biased: 0.55 - 1.05 (squared for more small ones)
            const r = rng(i * 2 + 3);
            const size = 0.55 + r * r * 0.5;
            const tilt = (rng(i * 2 + 4) - 0.5) * 0.3;
            trees.push(
              <g
                key={`f-${dx},${dy},${i}`}
                transform={`translate(${tx},${ty}) scale(${size}) rotate(${tilt * 18})`}
              >
                <polygon points="0,-6 -4,5 4,5" fill="#5d6e2f" />
                <polygon points="0,-2 -3.5,5.5 3.5,5.5" fill="#6f8338" />
                <rect x="-0.6" y="5.5" width="1.2" height="2" fill="#6b4a2f" />
              </g>
            );
          }
          return trees;
        })}
      </svg>
    );
  }

  if (t === "swamp") {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {cluster.cells.map(([dx, dy]) => {
          const cx = (dx - cluster.minDx) * 32 + 16;
          const cy = (dy - cluster.minDy) * 32 + 18;
          const rng = makeRng(((dx + 3) * 73856093) ^ ((dy + 3) * 19349663));
          // Randomize pond size — contained within cell bounds
          const rx = 8 + rng(0) * 5; // 8-13
          const ry = 4 + rng(1) * 3; // 4-7
          return (
            <ellipse
              key={`s1-${dx},${dy}`}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="#646a3a"
            />
          );
        })}
        {cluster.cells.flatMap(([dx, dy]) => {
          const ox = (dx - cluster.minDx) * 32;
          const oy = (dy - cluster.minDy) * 32;
          const rng = makeRng(((dx + 7) * 73856093) ^ ((dy + 7) * 19349663));
          const els: React.ReactElement[] = [];
          const reeds = 1 + Math.floor(rng(5) * 3);
          for (let i = 0; i < reeds; i++) {
            const rx = ox + 10 + rng(i * 2) * 12;
            const ry = oy + 13 + rng(i * 2 + 1) * 6;
            const len = 3 + rng(i * 2 + 7) * 4;
            els.push(
              <line
                key={`sr-${dx},${dy},${i}`}
                x1={rx}
                y1={ry}
                x2={rx}
                y2={ry + len}
                stroke="#a09848"
                strokeWidth="0.7"
              />
            );
          }
          return els;
        })}
      </svg>
    );
  }

  if (t === "hills") {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {cluster.cells.flatMap(([dx, dy]) => {
          const ox = (dx - cluster.minDx) * 32;
          const oy = (dy - cluster.minDy) * 32;
          const rng = makeRng(((dx + 17) * 73856093) ^ ((dy + 17) * 19349663));
          // 1-3 small dunes well inside the cell to avoid clipping
          const count = 1 + Math.floor(rng(0) * 3);
          const els: React.ReactElement[] = [];
          for (let i = 0; i < count; i++) {
            // Heavily inset — center at 8-24 px within each 32 px cell
            const cx = ox + 10 + rng(i * 2 + 1) * 12;
            const cy = oy + 18 + rng(i * 2 + 2) * 6;
            // Small-biased radius
            const r = rng(i * 2 + 3);
            const rxR = 4 + r * r * 5;  // 4-9
            const ryR = 2 + r * 2;      // 2-4
            els.push(
              <g key={`h-${dx},${dy},${i}`}>
                <ellipse cx={cx} cy={cy + 1} rx={rxR + 0.8} ry={ryR + 0.5} fill="#8a5e24" opacity="0.55" />
                <ellipse cx={cx} cy={cy} rx={rxR} ry={ryR} fill="#b8823a" />
                <ellipse cx={cx - rxR * 0.3} cy={cy - ryR * 0.4} rx={rxR * 0.6} ry={ryR * 0.55} fill="#d0a04a" opacity="0.75" />
              </g>
            );
          }
          return els;
        })}
      </svg>
    );
  }

  if (t === "mountains") {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        {cluster.cells.map(([dx, dy]) => {
          const ox = (dx - cluster.minDx) * 32;
          const oy = (dy - cluster.minDy) * 32;
          const rng = makeRng(((dx + 13) * 73856093) ^ ((dy + 13) * 19349663));
          // Mountains stay the largest terrain feature — full-cell peak
          const peakJitterX = rng(0) * 6;
          const peakJitterY = rng(1) * 3;
          const peakx = ox + 13 + peakJitterX;
          const peaky = oy + 4 + peakJitterY;
          // Randomize overall peak size — slightly larger variance
          const s = 0.9 + rng(2) * 0.3; // 0.9 - 1.2
          const baseL = ox + 2;
          const baseR = ox + 28;
          const baseY = oy + 29;
          return (
            <g key={`m-${dx},${dy}`} transform={`translate(${ox + 16} ${oy + 16}) scale(${s}) translate(${-(ox + 16)} ${-(oy + 16)})`}>
              {/* main face */}
              <polygon points={`${baseL},${baseY} ${peakx},${peaky} ${baseR},${baseY}`} fill="#7a6a58" />
              {/* shadow face */}
              <polygon points={`${peakx},${peaky} ${peakx + 2},${peaky + 4} ${baseR},${baseY} ${peakx},${baseY}`} fill="#6a5a48" />
              {/* highlight */}
              <polygon points={`${peakx - 4},${peaky + 6} ${peakx},${peaky + 2} ${peakx + 1},${peaky + 7}`} fill="#9a8a78" opacity="0.6" />
              {/* snow cap */}
              <polygon points={`${peakx},${peaky} ${peakx - 2},${peaky + 4} ${peakx + 3},${peaky + 4}`} fill="#fff5d8" opacity="0.85" />
            </g>
          );
        })}
      </svg>
    );
  }

  return null;
}

/** Compact minimap of the full world — shows fiefs/camps as dots, viewport as a rect. */
function Minimap({
  mapData,
  center,
  onJump,
}: {
  mapData: import("@wargame/shared").MapData | null;
  center: { x: number; y: number };
  onJump: (x: number, y: number) => void;
}) {
  const size = 170;
  const world = 60; // ±30 tiles from origin
  const scale = size / world;
  const toPx = (coord: number) => (coord + world / 2) * scale;

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.round(px / scale - world / 2);
    const y = Math.round(py / scale - world / 2);
    onJump(x, y);
  }

  const viewportHalf = 6;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onClick={onClick}
      className="minimap-svg"
    >
      {/* Background */}
      <rect width={size} height={size} fill="#c8b878" />
      {/* Grid lines */}
      {[-20, -10, 0, 10, 20].map((g) => (
        <g key={`g${g}`}>
          <line x1={toPx(g)} y1={0} x2={toPx(g)} y2={size} stroke="rgba(107,74,47,0.3)" strokeWidth={g === 0 ? 1.2 : 0.5} />
          <line x1={0} y1={toPx(g)} x2={size} y2={toPx(g)} stroke="rgba(107,74,47,0.3)" strokeWidth={g === 0 ? 1.2 : 0.5} />
        </g>
      ))}
      {/* Camps */}
      {mapData?.camps?.filter((c) => !c.isDefeated).map((c) => (
        <circle key={c.campId} cx={toPx(c.x)} cy={toPx(c.y)} r={1.6} fill="#b63a2d" />
      ))}
      {/* Fiefs */}
      {mapData?.fiefs?.map((f) => {
        const isMine = mapData.playerFief && f.x === mapData.playerFief.x && f.y === mapData.playerFief.y;
        const isAlly = !isMine && mapData.playerAllianceId && f.allianceId === mapData.playerAllianceId;
        return (
          <circle
            key={f.fiefId}
            cx={toPx(f.x)}
            cy={toPx(f.y)}
            r={isMine ? 3 : 2}
            fill={isMine ? "#c28a2e" : isAlly ? "#4c6e7f" : "#6b4a2f"}
            stroke={isMine ? "#fff5d8" : "none"}
            strokeWidth={isMine ? 1 : 0}
          />
        );
      })}
      {/* Viewport indicator */}
      <rect
        x={toPx(center.x - viewportHalf)}
        y={toPx(center.y - viewportHalf)}
        width={viewportHalf * 2 * scale}
        height={viewportHalf * 2 * scale}
        fill="rgba(194,138,46,0.2)"
        stroke="var(--color-gold)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

// Base tile size — responsive, but stable so zoom only multiplies it.
const BASE_TILE_SIZE = typeof window !== "undefined"
  ? Math.max(36, Math.min(64, Math.round(window.innerWidth * 0.032)))
  : 44;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.15;

interface TroopData {
  troopType: string;
  quantity: number;
  isRecruiting: boolean;
}

interface BuildingSummary {
  buildingType: string;
  level: number;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [attackModal, setAttackModal] = useState<AttackModalState | null>(null);
  const [troops, setTroops] = useState<TroopData[]>([]);
  const [playerBuildings, setPlayerBuildings] = useState<BuildingSummary[]>([]);
  const [selectedTroops, setSelectedTroops] = useState<Record<string, number>>({});
  const [attackLoading, setAttackLoading] = useState(false);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [hoveredMarch, setHoveredMarch] = useState<{ id: string; px: number; py: number } | null>(null);

  // Active marches for map animation
  interface ActiveMarch { id: string; originTileId: string; targetTileId: string; status: string; departedAt: number; arrivesAt: number; marchType: string; troops: Record<string, number> }
  const [activeMarches, setActiveMarches] = useState<ActiveMarch[]>([]);
  const [marchNow, setMarchNow] = useState(Date.now());

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    cx: number;
    cy: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Latest zoom/center mirrored into refs so the wheel listener
  // (registered once via addEventListener) always sees fresh values.
  const zoomRef = useRef(1);
  const centerRef = useRef({ x: 0, y: 0 });
  useEffect(() => { zoomRef.current = zoom; });
  useEffect(() => { centerRef.current = center; });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<MapData>("/map");
        setMapData(data);

        // Query params take priority over default player fief center
        const px = searchParams.get("x");
        const py = searchParams.get("y");
        const focus = searchParams.get("focus");
        if (px != null && py != null) {
          const x = Number(px);
          const y = Number(py);
          if (!isNaN(x) && !isNaN(y) && isInBounds(x, y)) {
            setCenter({ x, y });
          }
          setSearchParams({}, { replace: true });
        } else if (focus) {
          const parsed = parseTileId(focus);
          if (isInBounds(parsed.x, parsed.y)) {
            setCenter(parsed);
          }
          setSearchParams({}, { replace: true });
        } else if (data.playerFief) {
          setCenter(data.playerFief);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadMap = useCallback(async () => {
    try {
      const data = await api.get<MapData>("/map");
      setMapData(data);
    } catch {}
  }, []);

  // Fetch active marches for map animation.
  // Hoisted out of the useEffect so handleAttack can force an immediate reload
  // right after creating a new march — otherwise the player waits up to 15s
  // for the next poll before seeing their marching unit animate.
  const loadMarches = useCallback(async () => {
    try {
      const res = await api.get<{ marches: ActiveMarch[] }>("/marches");
      setActiveMarches(
        (res.marches || []).filter(
          (m) => m.status === "marching" || m.status === "returning"
        )
      );
    } catch {}
  }, []);

  useEffect(() => {
    loadMarches();
    const id = setInterval(loadMarches, 15_000);
    return () => clearInterval(id);
  }, [loadMarches]);

  // Tick march animation positions every 100ms
  useEffect(() => {
    if (activeMarches.length === 0) return;
    const id = setInterval(() => setMarchNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [activeMarches.length]);

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
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const tileSize = Math.round(BASE_TILE_SIZE * zoom);

  // Synchronous measurement before paint so the cluster art layer renders
  // on the very first frame.  Re-runs when tileSize changes (zoom) AND when
  // loading finishes (so the container ref is mounted for the first time).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function calcViewport() {
      if (!el) return;
      const { clientWidth, clientHeight } = el;
      // Use fallback dimensions if element hasn't been laid out yet
      const w = clientWidth || window.innerWidth - 200;
      const h = clientHeight || window.innerHeight - 100;
      setContainerSize({ w, h });
      setViewport({
        cols: (Math.floor(w / tileSize) | 1) + 2,
        rows: (Math.floor(h / tileSize) | 1) + 2,
      });
    }
    calcViewport();
    // Re-measure after a frame in case the container wasn't laid out yet
    requestAnimationFrame(calcViewport);
    const ro = new ResizeObserver(calcViewport);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tileSize, loading]);

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
        case "+": case "=": setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM)); break;
        case "-": setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM)); break;
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

  // Wheel zoom — attached as a NON-passive native listener so preventDefault
  // actually blocks the browser's default page-scroll/zoom behavior. React's
  // synthetic onWheel is registered as passive in React 17+, which is why
  // e.preventDefault() in JSX onWheel handlers is silently ignored.
  // Zoom is anchored to the cursor: the tile under the mouse stays under the
  // mouse after the zoom step, so the visible coordinate frame is preserved.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      if (!el) return;
      const oldZoom = zoomRef.current;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, oldZoom - e.deltaY * 0.0015)
      );
      if (newZoom === oldZoom) return;

      const oldT = Math.round(BASE_TILE_SIZE * oldZoom);
      const newT = Math.round(BASE_TILE_SIZE * newZoom);

      const rect = el.getBoundingClientRect();
      const dxPx = e.clientX - rect.left - rect.width / 2;
      const dyPx = e.clientY - rect.top - rect.height / 2;

      // Tile offset from center where the cursor is, before/after the zoom.
      const adjustX = Math.round(dxPx / oldT - dxPx / newT);
      const adjustY = Math.round(dyPx / oldT - dyPx / newT);

      setZoom(newZoom);
      if (adjustX !== 0 || adjustY !== 0) {
        const c = centerRef.current;
        setCenter({
          x: Math.max(-MAP_RADIUS, Math.min(MAP_RADIUS, c.x + adjustX)),
          y: Math.max(-MAP_RADIUS, Math.min(MAP_RADIUS, c.y + adjustY)),
        });
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
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
    // Load current troops + buildings (for contextual links)
    try {
      const data = await api.get<{
        fief: any;
        troops: TroopData[];
        buildings: BuildingSummary[];
      }>("/fief");
      setTroops(data.troops.filter((t) => t.quantity > 0 && !t.isRecruiting));
      setPlayerBuildings(data.buildings || []);
    } catch {}
  }, []);

  const goToBuilding = useCallback(
    (buildingType: string) => {
      setAttackModal(null);
      navigate(`/dashboard?b=${encodeURIComponent(buildingType)}`);
    },
    [navigate]
  );

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
      const res = await api.post<{ march: ActiveMarch }>("/march", {
        targetTileId: attackModal.tileId,
        troops: troopsToSend,
        marchType: attackModal.marchType,
      });
      setAttackModal(null);
      setSelectedTroops({});
      // Optimistically inject the new march so the animation starts
      // immediately — no 15s poll wait, no full page reload.
      if (res?.march) {
        setActiveMarches((cur) => {
          const without = cur.filter((m) => m.id !== res.march.id);
          return [...without, res.march];
        });
      }
      // Still refresh map (so troop counts at origin update) and marches
      // authoritatively in the background.
      reloadMap();
      loadMarches();
    } catch (err: any) {
      setAttackError(err.message);
    } finally {
      setAttackLoading(false);
    }
  }, [attackModal, selectedTroops, reloadMap, loadMarches]);

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

  // Group landscape tiles into connected clusters within the viewport
  // so each landscape feature renders as a single SVG spanning the cluster.
  const clusters = useMemo<Cluster[]>(() => {
    const visited = new Set<string>();
    const result: Cluster[] = [];
    for (let dy = -halfRows; dy <= halfRows; dy++) {
      for (let dx = -halfCols; dx <= halfCols; dx++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (!isInBounds(x, y)) continue;
        const terrain = getTerrain(x, y);
        if (!CLUSTER_TERRAINS.has(terrain)) continue;
        visited.add(key);
        const cells: Array<[number, number]> = [];
        const queue: Array<[number, number]> = [[dx, dy]];
        let minDx = dx, maxDx = dx, minDy = dy, maxDy = dy;
        while (queue.length) {
          const [cdx, cdy] = queue.shift()!;
          cells.push([cdx, cdy]);
          if (cdx < minDx) minDx = cdx;
          if (cdx > maxDx) maxDx = cdx;
          if (cdy < minDy) minDy = cdy;
          if (cdy > maxDy) maxDy = cdy;
          const neighbors: Array<[number, number]> = [
            [cdx - 1, cdy], [cdx + 1, cdy], [cdx, cdy - 1], [cdx, cdy + 1],
          ];
          for (const [ndx, ndy] of neighbors) {
            if (ndx < -halfCols || ndx > halfCols || ndy < -halfRows || ndy > halfRows) continue;
            const nx = center.x + ndx;
            const ny = center.y + ndy;
            const nk = `${nx},${ny}`;
            if (visited.has(nk)) continue;
            if (!isInBounds(nx, ny)) continue;
            if (getTerrain(nx, ny) !== terrain) continue;
            visited.add(nk);
            queue.push([ndx, ndy]);
          }
        }
        result.push({ terrain, minDx, maxDx, minDy, maxDy, cells });
      }
    }
    return result;
  }, [center, halfCols, halfRows]);

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
    // `relative` is critical: the .map-tile-slideout child uses
    // `position: absolute; left: 36px` which must anchor to this root
    // (the page area right of the sidebar), not some outer GameShell wrapper.
    <div className="h-full flex overflow-hidden bg-[#a89868] relative">
      {/* ── Map grid ── */}
      <div className="flex flex-1 min-h-0 min-w-0 relative">
        {/* (Coord input + "My Fief" moved to right panel) */}

        {/* ── Zoom controls (top-left) ── */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-center">
          <button
            onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))}
            disabled={zoom >= MAX_ZOOM - 0.001}
            className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)]/90 backdrop-blur-sm border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-7 h-5 flex items-center justify-center rounded bg-[var(--surface-2)]/90 backdrop-blur-sm border border-[var(--border-muted)] text-[var(--text-muted)] hover:text-[var(--color-gold)] hover:border-[var(--border-default)] transition-colors text-fluid-xxs font-mono"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM))}
            disabled={zoom <= MIN_ZOOM + 0.001}
            className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)]/90 backdrop-blur-sm border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold"
            title="Zoom out"
          >
            -
          </button>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none relative"
          style={{ minWidth: 0, minHeight: 0, contain: "layout paint" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* ── Cluster art layer (painted behind the click grid) ── */}
          {containerSize.w > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {clusters.map((c, i) => {
                const left = containerSize.w / 2 + (c.minDx - 0.5) * tileSize;
                const top = containerSize.h / 2 + (c.minDy - 0.5) * tileSize;
                const width = (c.maxDx - c.minDx + 1) * tileSize;
                const height = (c.maxDy - c.minDy + 1) * tileSize;
                return (
                  <div
                    key={`cluster-${i}-${c.terrain}-${c.minDx},${c.minDy}`}
                    className="absolute"
                    style={{
                      left,
                      top,
                      width,
                      height,
                      // Less prominent than fiefs/camps so cities stay the focus
                      opacity: c.terrain === "lake" ? 0.55 : 0.42,
                    }}
                  >
                    <ClusterArt cluster={c} />
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="grid"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              gridTemplateColumns: `repeat(${viewport.cols}, ${tileSize}px)`,
              gridTemplateRows: `repeat(${viewport.rows}, ${tileSize}px)`,
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            {tiles.map((t) => {
              const hasFief = !!t.fief;
              const hasCamp = !!t.camp && !t.camp.isDefeated;
              const isInteractive = !t.oob && (hasFief || hasCamp);

              return (
                <div
                  key={`${t.x},${t.y}`}
                  className={`relative flex items-center justify-center transition-all duration-75 ${
                    t.oob
                      ? "opacity-30"
                      : t.isSelected
                        ? "z-10 ring-1 ring-[var(--color-gold)] shadow-[0_0_12px_rgba(212,160,32,0.3)]"
                        : t.isPlayerFief
                          ? "z-5 ring-1 ring-[var(--color-success)]/60 shadow-[0_0_8px_rgba(63,185,80,0.2)]"
                        : t.isAlly
                          ? "z-5 ring-1 ring-[var(--color-info)]/40 shadow-[0_0_6px_rgba(56,139,253,0.15)]"
                          : hasCamp
                            ? "z-5 ring-1 ring-[var(--color-danger)]/40 shadow-[0_0_6px_rgba(200,50,50,0.15)]"
                            : isInteractive
                              ? "hover:bg-white/5 hover:z-5"
                              : ""
                  }`}
                  style={{
                    width: tileSize,
                    height: tileSize,
                    background: t.oob ? "#5e4530" : "transparent",
                    cursor: isInteractive ? "pointer" : "default",
                  }}
                  onClick={isInteractive ? () => onTileClick(t.x, t.y) : undefined}
                >
                  {/* Subtle coordinate gridlines every 5 tiles */}
                  {!t.oob && (t.x % 5 === 0 || t.y % 5 === 0) && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        borderLeft: t.x % 5 === 0 ? "1px solid rgba(212,160,32,0.05)" : undefined,
                        borderTop:  t.y % 5 === 0 ? "1px solid rgba(212,160,32,0.05)" : undefined,
                      }}
                    />
                  )}

                  {/* Coordinate label every 10 tiles */}
                  {!t.oob && t.x % 10 === 0 && t.y % 10 === 0 && !hasFief && (
                    <span
                      className="absolute top-0.5 left-0.5 font-mono pointer-events-none leading-none"
                      style={{ fontSize: `${Math.max(tileSize * 0.2, 7)}px`, color: "rgba(218,165,32,0.22)" }}
                    >
                      {t.x},{t.y}
                    </span>
                  )}

                  {/* Fief marker */}
                  {hasFief && (
                    <div className="flex flex-col items-center pointer-events-none">
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
                          width: `${Math.max(tileSize * 0.92, 24)}px`,
                          height: `${Math.max(tileSize * 0.92, 24)}px`,
                          boxShadow: t.isPlayerFief
                            ? "0 0 14px rgba(212,160,32,0.45), 0 2px 6px rgba(0,0,0,0.4)"
                            : t.isAlly
                              ? "0 0 12px rgba(56,139,253,0.35), 0 2px 6px rgba(0,0,0,0.4)"
                              : "0 2px 8px rgba(0,0,0,0.4)",
                        }}
                      >
                        <CastleSvg
                          level={t.fief!.keepLevel || t.fief!.level}
                          size={Math.max(tileSize * 0.65, 18)}
                        />
                      </div>
                      {tileSize >= 30 && (
                        <>
                          <span
                            className="font-bold leading-none mt-0.5 truncate px-1 rounded"
                            style={{
                              fontSize: `${Math.max(tileSize * 0.22, 9)}px`,
                              maxWidth: `${tileSize + 12}px`,
                              color: t.isPlayerFief
                                ? "#fff5d8"
                                : t.isAlly
                                  ? "#dceaf5"
                                  : "#fff5d8",
                              textShadow: "0 1px 2px rgba(50,30,10,0.95), 0 0 3px rgba(50,30,10,0.8)",
                              background: t.isPlayerFief
                                ? "rgba(194,138,46,0.85)"
                                : t.isAlly
                                  ? "rgba(76,110,127,0.85)"
                                  : "rgba(76,62,59,0.78)",
                              border: `1px solid ${t.isPlayerFief ? "#d9a447" : t.isAlly ? "#6e94a8" : "#8a6a3f"}`,
                            }}
                            title={t.fief!.fiefName}
                          >
                            {t.fief!.allianceTag ? `[${t.fief!.allianceTag}] ` : ""}{t.fief!.fiefName}
                          </span>
                          {t.fief!.score > 0 && (
                            <span
                              className="leading-none mt-0.5 px-1 rounded tabular-nums font-bold"
                              style={{
                                fontSize: `${Math.max(tileSize * 0.2, 8)}px`,
                                color: "#fff5d8",
                                background: "rgba(194,138,46,0.85)",
                                border: "1px solid #d9a447",
                                textShadow: "0 1px 2px rgba(50,30,10,0.9)",
                              }}
                              title={`Village score: ${t.fief!.score}`}
                            >
                              ⭐ {t.fief!.score}
                            </span>
                          )}
                        </>
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
                          width: `${Math.max(tileSize * 0.92, 24)}px`,
                          height: `${Math.max(tileSize * 0.92, 24)}px`,
                          boxShadow: "0 0 12px rgba(248,81,73,0.35), 0 2px 6px rgba(0,0,0,0.4)",
                        }}
                      >
                        <span
                          style={{ fontSize: `${Math.max(tileSize * 0.7, 18)}px`, lineHeight: 1 }}
                          className="drop-shadow-[0_0_4px_rgba(200,50,50,0.6)]"
                        >
                          {"🔥"}
                        </span>
                      </div>
                      {tileSize >= 30 && (
                        <span
                          className="font-bold leading-none mt-0.5 px-0.5 rounded"
                          style={{
                            fontSize: `${Math.max(tileSize * 0.2, 7)}px`,
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

          {/* March animation overlay */}
          {activeMarches.length > 0 && containerSize.w > 0 && (() => {
            // The CSS grid is centered in the container — compute the offset
            const gridW = viewport.cols * tileSize;
            const gridH = viewport.rows * tileSize;
            const offsetX = (containerSize.w - gridW) / 2;
            const offsetY = (containerSize.h - gridH) / 2;

            // Helper: tile world coords → pixel position in container
            function tileToPixel(tx: number, ty: number) {
              return {
                px: offsetX + (tx - center.x + halfCols) * tileSize + tileSize / 2,
                py: offsetY + (ty - center.y + halfRows) * tileSize + tileSize / 2,
              };
            }

            // Offset (in px) by which the rendered march line shrinks away
            // from each endpoint tile center — keeps the line, dots, and
            // labels from colliding with village icons/nameplates.
            const endOffset = Math.max(20, tileSize * 0.55);
            return (<>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 8, overflow: "visible" }}>
                <defs>
                  {/* Drop-shadow used by text labels for legibility on any terrain */}
                  <filter id="march-text-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.85" />
                  </filter>
                </defs>
                {activeMarches.map((m) => {
                  const originCoord = parseTileId(m.originTileId);
                  const targetCoord = parseTileId(m.targetTileId);
                  const isReturning = m.status === "returning";

                  const oRaw = tileToPixel(originCoord.x, originCoord.y);
                  const tRaw = tileToPixel(targetCoord.x, targetCoord.y);

                  // Shrink both ends by endOffset along the line direction.
                  const dxLine = tRaw.px - oRaw.px;
                  const dyLine = tRaw.py - oRaw.py;
                  const lineLen = Math.max(1, Math.hypot(dxLine, dyLine));
                  const ux = dxLine / lineLen;
                  const uy = dyLine / lineLen;
                  // Don't eat more than 40% of the line length from either end
                  const eff = Math.min(endOffset, lineLen * 0.4);
                  const o = { px: oRaw.px + ux * eff, py: oRaw.py + uy * eff };
                  const t2 = { px: tRaw.px - ux * eff, py: tRaw.py - uy * eff };

                  // Progress interpolation based on wall-clock time
                  const totalMs = m.arrivesAt - m.departedAt;
                  const elapsed = marchNow - m.departedAt;
                  const progress = Math.max(0, Math.min(1, elapsed / Math.max(totalMs, 1)));
                  const remainMs = Math.max(0, m.arrivesAt - marchNow);
                  const remainMin = Math.floor(remainMs / 60_000);
                  const remainSec = Math.floor((remainMs % 60_000) / 1000);
                  const timeLabel = remainMs <= 0 ? "Arrived" : remainMin > 0 ? `${remainMin}m${remainSec.toString().padStart(2, "0")}s` : `${remainSec}s`;

                  const fromX = isReturning ? t2.px : o.px;
                  const fromY = isReturning ? t2.py : o.py;
                  const toX = isReturning ? o.px : t2.px;
                  const toY = isReturning ? o.py : t2.py;
                  const curX = fromX + (toX - fromX) * progress;
                  const curY = fromY + (toY - fromY) * progress;

                  const color = m.marchType === "attack_camp" ? "#d4a020" : "#f85149";
                  const darkColor = m.marchType === "attack_camp" ? "#8a5a10" : "#8a1f17";
                  const dotR = Math.max(6, tileSize * 0.16);

                  // Time-label position: place perpendicular to the march
                  // direction AND pushed well past the moving dot + glow so
                  // the text never overlaps with the unit marker.
                  const perpX = -uy;
                  const perpY = ux;
                  const labelOffset = dotR * 3.4 + 14;
                  const labelX = curX + perpX * labelOffset;
                  const labelY = curY + perpY * labelOffset;
                  const labelW = 62;
                  const labelH = 17;

                  return (
                    <g key={m.id}>
                      {/* Path line: dark outline for contrast + colored core */}
                      <line x1={o.px} y1={o.py} x2={t2.px} y2={t2.py}
                        stroke="rgba(20,12,4,0.75)" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray="8,5" opacity="0.55" />
                      <line x1={o.px} y1={o.py} x2={t2.px} y2={t2.py}
                        stroke={color} strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray="8,5" opacity="0.9" />

                      {/* Origin marker (ring) */}
                      <circle cx={o.px} cy={o.py} r={5} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
                      <circle cx={o.px} cy={o.py} r={2} fill={color} />
                      {/* Target marker (ring) */}
                      <circle cx={t2.px} cy={t2.py} r={5} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
                      <circle cx={t2.px} cy={t2.py} r={2} fill={color} />

                      {/* Glow around moving unit */}
                      <circle cx={curX} cy={curY} r={dotR * 2.8} fill={color} opacity="0.12" />
                      <circle cx={curX} cy={curY} r={dotR * 1.6} fill={color} opacity="0.18" />

                      {/* Moving unit dot */}
                      <circle cx={curX} cy={curY} r={dotR + 1.5} fill="rgba(20,12,4,0.85)" />
                      <circle cx={curX} cy={curY} r={dotR} fill={color} stroke={darkColor} strokeWidth="1.5" />

                      {/* Invisible hover + click hit area */}
                      <circle cx={curX} cy={curY} r={Math.max(20, dotR * 3)} fill="transparent"
                        style={{ pointerEvents: "all", cursor: "pointer" }}
                        onMouseEnter={() => setHoveredMarch({ id: m.id, px: curX, py: curY })}
                        onMouseLeave={() => setHoveredMarch((h) => h?.id === m.id ? null : h)}
                        onClick={(e) => { e.stopPropagation(); navigate(`/march/${m.id}`); }}
                      />

                      {/* Flag icon inside the dot */}
                      <text x={curX} y={curY + dotR * 0.35}
                        textAnchor="middle"
                        fontSize={dotR * 1.3}
                        style={{ pointerEvents: "none" }}>
                        {isReturning ? "↩" : "⚔"}
                      </text>

                      {/* Time label pill — dark background for legibility */}
                      <g style={{ pointerEvents: "none" }}>
                        <rect
                          x={labelX - labelW / 2}
                          y={labelY - labelH / 2}
                          width={labelW}
                          height={labelH}
                          rx={4}
                          fill="rgba(20,12,4,0.88)"
                          stroke={color}
                          strokeWidth="1.2"
                        />
                        <text
                          x={labelX}
                          y={labelY + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={11}
                          fill="#fff5d8"
                          fontFamily="'Cinzel', Georgia, serif"
                          fontWeight="700"
                          filter="url(#march-text-shadow)"
                        >
                          {timeLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Troop tooltip for hovered march */}
              {hoveredMarch && (() => {
                const m = activeMarches.find((a) => a.id === hoveredMarch.id);
                if (!m || !m.troops) return null;
                const entries = Object.entries(m.troops).filter(([, q]) => q > 0);
                if (entries.length === 0) return null;
                const isReturning = m.status === "returning";
                const isCamp = m.marchType === "attack_camp";
                const totalUnits = entries.reduce((s, [, q]) => s + q, 0);
                const totalAtk = entries.reduce(
                  (s, [type, q]) => s + (TROOP_MAP[type]?.attack ?? 0) * q,
                  0
                );
                const totalDef = entries.reduce(
                  (s, [type, q]) => s + (TROOP_MAP[type]?.defense ?? 0) * q,
                  0
                );
                return (
                  <div
                    className="march-popup"
                    style={{
                      left: hoveredMarch.px + 24,
                      top: hoveredMarch.py - 12,
                      transform: "translateY(-100%)",
                    }}
                  >
                    <div
                      className={`march-popup__header ${
                        isReturning
                          ? "march-popup__header--returning"
                          : isCamp
                          ? "march-popup__header--camp"
                          : "march-popup__header--pvp"
                      }`}
                    >
                      <span className="march-popup__header-icon">
                        {isReturning ? "↩" : "⚔"}
                      </span>
                      <span className="march-popup__header-title">
                        {isReturning
                          ? "Returning"
                          : isCamp
                          ? "Raiding Camp"
                          : "Attacking"}
                      </span>
                    </div>
                    <div className="march-popup__body">
                      <div className="march-popup__troops">
                        {entries.map(([type, qty]) => {
                          const def = TROOP_MAP[type];
                          return (
                            <div key={type} className="march-popup__troop-row">
                              <span className="march-popup__troop-icon">
                                {TROOP_ICONS[type] || "⚔️"}
                              </span>
                              <span className="march-popup__troop-name">
                                {def?.name || type}
                              </span>
                              <span className="march-popup__troop-qty">{qty}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="march-popup__summary">
                        <div className="march-popup__stat">
                          <span className="march-popup__stat-icon">🎯</span>
                          <span className="march-popup__stat-val">{totalUnits}</span>
                          <span className="march-popup__stat-label">Units</span>
                        </div>
                        <div className="march-popup__stat">
                          <span className="march-popup__stat-icon">⚔️</span>
                          <span
                            className="march-popup__stat-val"
                            style={{ color: "var(--color-danger)" }}
                          >
                            {totalAtk}
                          </span>
                          <span className="march-popup__stat-label">ATK</span>
                        </div>
                        <div className="march-popup__stat">
                          <span className="march-popup__stat-icon">🛡️</span>
                          <span
                            className="march-popup__stat-val"
                            style={{ color: "var(--color-info)" }}
                          >
                            {totalDef}
                          </span>
                          <span className="march-popup__stat-label">DEF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>);
          })()}

          {/* Controls hint */}
          <div
            className="absolute bottom-3 right-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold"
            style={{
              background: "linear-gradient(180deg, rgba(239,225,191,0.92) 0%, rgba(215,184,146,0.88) 100%)",
              border: "1.5px solid #4c3e3b",
              color: "#2f241d",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(50,30,10,0.35)",
            }}
          >
            <span>🖱️ Drag</span>
            <span className="opacity-40">·</span>
            <span>⌨️ WASD</span>
            <span className="opacity-40">·</span>
            <span>🔍 Scroll</span>
          </div>

          {/* ── X-axis (bottom) coordinate ruler ── */}
          {containerSize.w > 0 && (
            <div
              className="absolute pointer-events-none flex items-end justify-center"
              style={{
                left: 0,
                right: 0,
                bottom: 0,
                height: 22,
                background:
                  // Rich medieval gradient: deep leather base, subtle gold hairline at top, soft fade at horizontal edges
                  "linear-gradient(0deg, rgba(42,34,24,0.92) 0%, rgba(76,62,59,0.75) 55%, rgba(76,62,59,0) 100%)",
                borderTop: "1px solid rgba(194,138,46,0.35)",
                boxShadow:
                  "inset 0 1px 0 rgba(217,164,71,0.25), 0 -2px 6px rgba(20,12,4,0.25)",
                zIndex: 5,
                maskImage:
                  "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  position: "absolute",
                  left: containerSize.w / 2,
                  bottom: 2,
                  transform: "translateX(-50%)",
                  fontFamily: "Cinzel, Georgia, serif",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#fff5d8",
                  textShadow: "0 1px 2px rgba(20,12,4,0.9)",
                  display: "flex",
                  gap: tileSize,
                }}
              >
                {Array.from({ length: 7 }, (_, i) => i - 3).map((offset) => {
                  const x = center.x + offset;
                  if (!isInBounds(x, center.y)) return <span key={offset} style={{ width: 18, opacity: 0 }} />;
                  return (
                    <span
                      key={offset}
                      style={{
                        width: 18,
                        textAlign: "center",
                        opacity: offset === 0 ? 1 : 0.7,
                        color: offset === 0 ? "var(--color-gold-light)" : "#fff5d8",
                      }}
                    >
                      {x}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Y-axis (left) coordinate ruler ── */}
          {containerSize.h > 0 && (
            <div
              className="absolute pointer-events-none flex flex-col items-center justify-center"
              style={{
                left: 0,
                top: 0,
                bottom: 0,
                width: 30,
                background:
                  "linear-gradient(90deg, rgba(42,34,24,0.92) 0%, rgba(76,62,59,0.75) 55%, rgba(76,62,59,0) 100%)",
                borderRight: "1px solid rgba(194,138,46,0.35)",
                boxShadow:
                  "inset -1px 0 0 rgba(217,164,71,0.25), 2px 0 6px rgba(20,12,4,0.25)",
                zIndex: 5,
                maskImage:
                  "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
              }}
            >
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  position: "absolute",
                  top: containerSize.h / 2,
                  left: 4,
                  transform: "translateY(-50%)",
                  fontFamily: "Cinzel, Georgia, serif",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#fff5d8",
                  textShadow: "0 1px 2px rgba(20,12,4,0.9)",
                  gap: tileSize - 14,
                }}
              >
                {Array.from({ length: 7 }, (_, i) => i - 3).map((offset) => {
                  const y = center.y + offset;
                  if (!isInBounds(center.x, y)) return <span key={offset} style={{ height: 14, opacity: 0 }} />;
                  return (
                    <span
                      key={offset}
                      style={{
                        height: 14,
                        lineHeight: "14px",
                        textAlign: "center",
                        opacity: offset === 0 ? 1 : 0.7,
                        color: offset === 0 ? "var(--color-gold-light)" : "#fff5d8",
                      }}
                    >
                      {y}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right nav panel: Minimap + Coord nav (always visible) ── */}
      <div className="map-tile-panel">
        <div className="map-nav-panel">
          {/* Minimap */}
          <div className="map-nav-panel__section">
            <div className="map-nav-panel__title">🗺️ Minimap</div>
            <Minimap
              mapData={mapData}
              center={center}
              onJump={(x, y) => setCenter({ x, y })}
            />
          </div>

          {/* Coord navigator */}
          <div className="map-nav-panel__section">
            <div className="map-nav-panel__title">📍 Go to coordinates</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const xVal = Number((e.currentTarget.elements.namedItem("cx") as HTMLInputElement).value);
                const yVal = Number((e.currentTarget.elements.namedItem("cy") as HTMLInputElement).value);
                if (!isNaN(xVal) && !isNaN(yVal) && isInBounds(xVal, yVal)) {
                  setCenter({ x: xVal, y: yVal });
                }
                (document.activeElement as HTMLElement)?.blur();
              }}
              className="map-nav-panel__coord-form"
            >
              <label className="map-nav-panel__coord-label">
                X
                <input
                  name="cx"
                  key={`x-${center.x}`}
                  defaultValue={center.x}
                  className="map-nav-panel__coord-input"
                  onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <label className="map-nav-panel__coord-label">
                Y
                <input
                  name="cy"
                  key={`y-${center.y}`}
                  defaultValue={center.y}
                  className="map-nav-panel__coord-input"
                  onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <button type="submit" className="btn-primary btn-sm" title="Go to coordinates">→</button>
            </form>
            <button onClick={goHome} className="btn-secondary btn-sm w-full mt-2">
              🏰 My Fief
            </button>
          </div>

          {/* Legend */}
          <div className="map-nav-panel__section">
            <div className="map-nav-panel__title">Legend</div>
            <div className="map-nav-panel__legend">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold)]" />
                <span>Your fief</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-info)]" />
                <span>Allied fief</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)]" />
                <span>Barbarian camp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tile Intel slide-out (left panel, overlays map) ── */}
      {selected && selectedTerrain && (
        <div className="map-tile-slideout">
          <div className="p-4 overflow-y-auto h-full animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Tile Intel</h2>
              <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-1.5 py-0.5">
                {"✕"}
              </button>
            </div>

            <div className="space-y-3">
              {/* Terrain + coords inline */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-[var(--border-muted)] flex-shrink-0"
                  style={{ backgroundColor: TERRAIN_COLORS[selectedTerrain].bg }}
                />
                <span className="text-sm">{TERRAIN_MAP[selectedTerrain].label}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">[{selected.x}, {selected.y}]</span>
                {!TERRAIN_MAP[selectedTerrain].habitable && (
                  <span className="alert-badge alert-badge--alert">Impassable</span>
                )}
              </div>

              {selectedFief ? (
                <>
                  <div className="medieval-divider" />
                  {/* Settlement name [coords] */}
                  <div>
                    <div className="stat-label">Settlement</div>
                    <div className="font-title font-bold text-[var(--color-gold)] text-sm">
                      {selectedFief.fiefName}
                      <span className="font-mono font-normal text-xs text-[var(--text-muted)] ml-1.5">[{selected.x}, {selected.y}]</span>
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Ruler</div>
                    <div className="text-sm flex items-center gap-1.5">
                      {selectedFief.allianceTag && selectedFief.allianceId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/alliance/${selectedFief.allianceId}`)}
                          className="text-fluid-xs font-bold px-1 py-0.5 rounded bg-[var(--color-info)]/15 text-[var(--color-info-light)] border border-[var(--color-info)]/30 hover:bg-[var(--color-info)]/25 transition-colors"
                          title={selectedFief.allianceTag}
                        >
                          [{selectedFief.allianceTag}]
                        </button>
                      )}
                      {selectedFief.playerId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/player/${selectedFief.playerId}`)}
                          className="hover:text-[var(--color-gold-light)] transition-colors underline-offset-2 hover:underline"
                        >
                          {selectedFief.playerName ?? "Unknown"}
                        </button>
                      ) : (
                        <span>Unclaimed</span>
                      )}
                    </div>
                  </div>
                  {selectedFief.hasNewbieShield && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-info-light)]">
                      <span>{"🛡️"}</span> Shield Active
                    </div>
                  )}
                  {mapData?.playerFief &&
                    selected.x === mapData.playerFief.x &&
                    selected.y === mapData.playerFief.y ? (
                      <div className="alert-badge alert-badge--complete w-fit">
                        {"✔"} Your Territory
                      </div>
                    ) : mapData?.playerAllianceId &&
                      selectedFief.allianceId === mapData.playerAllianceId ? (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-info-light)]">
                        <span>{"🤝"}</span> Allied
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
                          {"⚔️"} Raid Fief
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
                      {"🏕️"} Difficulty {selectedCamp.difficulty}
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
                      {"⚔️"} Attack Camp
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
        </div>
      )}
      {/* ── Attack Modal ── */}
      {attackModal && (() => {
        const totalAttack = Object.entries(selectedTroops).reduce(
          (sum, [type, qty]) => sum + (TROOP_MAP[type]?.attack || 0) * qty,
          0
        );
        const totalDefense = Object.entries(selectedTroops).reduce(
          (sum, [type, qty]) => sum + (TROOP_MAP[type]?.defense || 0) * qty,
          0
        );
        const totalUnits = Object.values(selectedTroops).reduce((s, q) => s + q, 0);
        const distance = mapData?.playerFief
          ? Math.abs(attackModal.x - mapData.playerFief.x) +
            Math.abs(attackModal.y - mapData.playerFief.y)
          : 0;
        const etaMin = distance * MARCH_SPEED_TICKS_PER_TILE;
        const isCamp = attackModal.marchType === "attack_camp";
        const hasTroops = totalUnits > 0;
        return (
          <div className="raid-modal-overlay" onClick={() => setAttackModal(null)}>
            <div className="raid-modal" onClick={(e) => e.stopPropagation()}>
              {/* Header strip */}
              <div className={`raid-modal__header ${isCamp ? "raid-modal__header--camp" : "raid-modal__header--pvp"}`}>
                <div className="raid-modal__header-icon">
                  <span className="raid-modal__sword">⚔️</span>
                </div>
                <div className="raid-modal__header-text">
                  <div className="raid-modal__title">
                    {isCamp
                      ? `Attack Camp · Lv ${attackModal.difficulty}`
                      : `Raid ${attackModal.targetPlayerName}`}
                  </div>
                  <div className="raid-modal__subtitle">
                    📍 ({attackModal.x}, {attackModal.y}) · 🚶 {distance} tiles · ⏱ {etaMin}m ETA
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttackModal(null)}
                  className="raid-modal__close"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="raid-modal__body">
                {attackError && (
                  <div className="raid-modal__error">
                    <span>⚠️</span>
                    <span>{attackError}</span>
                  </div>
                )}

                <div className="raid-modal__section-title">⚔️ Select your army</div>

                {troops.length === 0 ? (() => {
                  const hasBarracks = playerBuildings.some((b) => b.buildingType === "barracks");
                  return (
                    <div className="raid-modal__empty">
                      <span className="text-3xl block mb-1">🛡️</span>
                      <div className="text-sm mb-2">
                        {hasBarracks
                          ? "No troops available. Recruit some in your Barracks."
                          : "No troops available. Build a Barracks first."}
                      </div>
                      <button
                        onClick={() => goToBuilding(hasBarracks ? "barracks" : "keep")}
                        className="btn-primary btn-sm"
                      >
                        {hasBarracks ? "⚔️ Go to Barracks" : "🏰 Go to HQ"}
                      </button>
                    </div>
                  );
                })() : (
                  <div className="raid-modal__troops">
                    {troops.map((t) => {
                      const def = TROOP_MAP[t.troopType];
                      const qty = selectedTroops[t.troopType] || 0;
                      const pickedAll = qty > 0 && qty === t.quantity;
                      return (
                        <div key={t.troopType} className={`raid-troop-row${qty > 0 ? " raid-troop-row--picked" : ""}`}>
                          <span className="raid-troop-row__icon">
                            {TROOP_ICONS[t.troopType] || "⚔️"}
                          </span>
                          <div className="raid-troop-row__info">
                            <div className="raid-troop-row__name">{def?.name || t.troopType}</div>
                            <div className="raid-troop-row__stats">
                              <span title="Available">🎯 {t.quantity}</span>
                              <span title="Attack" className="text-[var(--color-danger)]">⚔️ {def?.attack}</span>
                              <span title="Defense" className="text-[var(--color-info)]">🛡️ {def?.defense}</span>
                            </div>
                          </div>
                          <div className="raid-troop-row__controls">
                            <button
                              type="button"
                              onClick={() => setSelectedTroops((s) => ({ ...s, [t.troopType]: Math.max(0, (s[t.troopType] || 0) - 1) }))}
                              disabled={qty <= 0}
                              className="raid-troop-row__btn"
                            >
                              −
                            </button>
                            <span className="raid-troop-row__qty">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTroops((s) => ({ ...s, [t.troopType]: Math.min(t.quantity, (s[t.troopType] || 0) + 1) }))}
                              disabled={qty >= t.quantity}
                              className="raid-troop-row__btn"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedTroops((s) => ({ ...s, [t.troopType]: pickedAll ? 0 : t.quantity }))}
                              className="raid-troop-row__all"
                              title={pickedAll ? "Clear" : "Select all"}
                            >
                              {pickedAll ? "✕" : "All"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                <div className={`raid-summary${hasTroops ? " raid-summary--active" : ""}`}>
                  <div className="raid-summary__row">
                    <div className="raid-summary__stat">
                      <div className="raid-summary__val" style={{ color: "var(--color-danger)" }}>{totalAttack}</div>
                      <div className="raid-summary__label">⚔️ ATK</div>
                    </div>
                    <div className="raid-summary__stat">
                      <div className="raid-summary__val" style={{ color: "var(--color-info)" }}>{totalDefense}</div>
                      <div className="raid-summary__label">🛡️ DEF</div>
                    </div>
                    <div className="raid-summary__stat">
                      <div className="raid-summary__val">{totalUnits}</div>
                      <div className="raid-summary__label">🎯 Units</div>
                    </div>
                    <div className="raid-summary__stat">
                      <div className="raid-summary__val">{etaMin}m</div>
                      <div className="raid-summary__label">⏱ ETA</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="raid-modal__footer">
                <button
                  onClick={() => setAttackModal(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttack}
                  disabled={attackLoading || !hasTroops}
                  className={`btn-primary raid-modal__attack-btn${hasTroops ? " raid-modal__attack-btn--ready" : ""}`}
                >
                  {attackLoading ? (
                    <>
                      <span className="spinner w-3 h-3 inline-block mr-1.5" />
                      Marching...
                    </>
                  ) : (
                    <>⚔️ Send Army</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
