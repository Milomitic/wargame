import { useState } from "react";
import {
  BUILDINGS,
  TROOPS,
  TECH_TREE,
  TERRAIN_MAP,
  TERRAIN_TYPES,
  CAMP_TROOPS,
  CAMP_LOOT,
  TERRAIN_DEFENSE_BONUS,
  MARCH_SPEED_TICKS_PER_TILE,
  NEWBIE_SHIELD_HOURS,
  MAX_RAIDS_PER_24H,
  RAID_LOOT_CAP,
  OFFLINE_DEFENSE_BONUS,
  ALLIANCE_MAX_MEMBERS,
  type TerrainType,
} from "@wargame/shared";

const SECTIONS = [
  { id: "intro", label: "Introduction", icon: "📖" },
  { id: "buildings", label: "Buildings", icon: "🏗️" },
  { id: "troops", label: "Troops", icon: "⚔️" },
  { id: "combat", label: "Combat", icon: "💥" },
  { id: "map", label: "World Map", icon: "🗺️" },
  { id: "tech", label: "Technology", icon: "🔬" },
  { id: "alliances", label: "Alliances", icon: "🤝" },
  { id: "interface", label: "Interface", icon: "🖥️" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const RES_ICONS: Record<string, string> = {
  wood: "🪵", stone: "🪨", iron: "⚒️",
  food: "🌾", gold: "💰",
};

export default function GameManual() {
  const [section, setSection] = useState<SectionId>("intro");

  return (
    <div className="manual">
      {/* Sidebar nav */}
      <nav className="manual__nav">
        <div className="manual__nav-title">{"📖"} Game Manual</div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`manual__nav-item ${section === s.id ? "manual__nav-item--active" : ""}`}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="manual__content">
        {section === "intro" && <IntroSection />}
        {section === "buildings" && <BuildingsSection />}
        {section === "troops" && <TroopsSection />}
        {section === "combat" && <CombatSection />}
        {section === "map" && <MapSection />}
        {section === "tech" && <TechSection />}
        {section === "alliances" && <AlliancesSection />}
        {section === "interface" && <InterfaceSection />}
      </div>
    </div>
  );
}

/* ── Sections ─────────────────────────────────────────────────── */

function IntroSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🏰"} Medieval Wargame</h1>
      <p className="manual__p">
        Welcome to Medieval Wargame, a browser-based MMO strategy game set in a medieval world.
        Build your fief, recruit armies, research technologies, and conquer the realm.
      </p>

      <h2 className="manual__h2">Getting Started</h2>
      <ol className="manual__ol">
        <li>Register an account and log in</li>
        <li>You start with a fief on the world map with basic resources</li>
        <li>Build resource buildings (Lumbermill, Farm, Quarry, Mine, Market) to generate income</li>
        <li>Construct a Barracks to train troops</li>
        <li>Explore the world map and attack barbarian camps for loot</li>
        <li>Research technologies to gain permanent bonuses</li>
        <li>Form alliances with other players for mutual protection</li>
      </ol>

      <h2 className="manual__h2">Core Mechanics</h2>
      <div className="manual__grid">
        <div className="manual__card">
          <h3>{"🪵"} Resources</h3>
          <p>5 resource types: Wood, Stone, Iron, Food, Gold. Each produced by specific buildings. Resources accumulate in real-time based on production rates.</p>
        </div>
        <div className="manual__card">
          <h3>{"🏗️"} Construction</h3>
          <p>Build and upgrade 13 different building types. Up to 2 buildings can be constructed simultaneously. Higher levels cost more and take longer.</p>
        </div>
        <div className="manual__card">
          <h3>{"⚔️"} Military</h3>
          <p>5 troop types with different ATK/DEF stats. Send armies to raid barbarian camps (PvE) or attack other players (PvP).</p>
        </div>
        <div className="manual__card">
          <h3>{"🔬"} Research</h3>
          <p>3 tech branches: Economy, Military, Fortification. Each research grants permanent bonuses to your fief.</p>
        </div>
      </div>

      <h2 className="manual__h2">Newbie Protection</h2>
      <p className="manual__p">
        New players receive a <strong>{NEWBIE_SHIELD_HOURS}-hour shield</strong> that prevents other players from attacking them.
        Use this time to build up your economy and defenses!
      </p>
    </div>
  );
}

function BuildingsSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🏗️"} Buildings</h1>
      <p className="manual__p">
        Buildings are the foundation of your fief. Each building serves a specific purpose — producing resources,
        training troops, or providing defensive bonuses. You can have up to 2 buildings under construction at the same time.
      </p>

      <table className="manual__table">
        <thead>
          <tr>
            <th>Building</th>
            <th>Max Lv.</th>
            <th>Produces</th>
            <th>Base Cost</th>
            <th>Base Time</th>
            <th>Requires</th>
          </tr>
        </thead>
        <tbody>
          {BUILDINGS.map((b) => (
            <tr key={b.type}>
              <td className="font-bold">{b.name}</td>
              <td className="text-center">{b.maxLevel}</td>
              <td>
                {b.produces ? (
                  <span style={{ color: "var(--color-success)" }}>
                    +{b.produces.baseRate} {b.produces.resource}/min
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </td>
              <td>
                {Object.entries(b.baseCost)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${RES_ICONS[k] || ""}${v}`)
                  .join(" ")}
              </td>
              <td>{b.baseBuildTicks}m</td>
              <td>{b.requires || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="manual__h2">Cost Scaling</h2>
      <p className="manual__p">
        Each building level multiplies the base cost by the <strong>cost multiplier</strong> raised to the power of the current level.
        For example, a building with base cost 100 wood and multiplier 1.5 costs: Lv.2 = 150, Lv.3 = 225, Lv.4 = 338, etc.
      </p>
      <p className="manual__p">
        Construction time scales similarly. Canceling a construction refunds <strong>50%</strong> of the cost.
      </p>
    </div>
  );
}

function TroopsSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"⚔️"} Troops</h1>
      <p className="manual__p">
        Recruit troops in the Barracks (and Stable for cavalry). Each troop type has unique ATK/DEF stats and costs.
        You can recruit 1-50 units per batch.
      </p>

      <table className="manual__table">
        <thead>
          <tr>
            <th>Troop</th>
            <th>ATK</th>
            <th>DEF</th>
            <th>Speed</th>
            <th>Upkeep</th>
            <th>Cost</th>
            <th>Train Time</th>
            <th>Requires</th>
          </tr>
        </thead>
        <tbody>
          {TROOPS.map((t) => (
            <tr key={t.type}>
              <td className="font-bold">{t.name}</td>
              <td className="text-center" style={{ color: "var(--color-danger)" }}>{t.attack}</td>
              <td className="text-center" style={{ color: "var(--color-info)" }}>{t.defense}</td>
              <td className="text-center">—</td>
              <td>
                {t.upkeep > 0 && `${RES_ICONS.food}${t.upkeep}`}
              </td>
              <td>
                {Object.entries(t.baseCost)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${RES_ICONS[k] || ""}${v}`)
                  .join(" ")}
              </td>
              <td>{t.baseRecruitTicks}m per unit</td>
              <td>{t.requiresBuilding || "Barracks"} Lv.{t.requiresBuildingLevel || 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CombatSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"💥"} Combat System</h1>

      <h2 className="manual__h2">How Combat Works</h2>
      <p className="manual__p">
        Combat is resolved automatically when an army arrives at its target. The outcome depends on
        total ATK power vs total DEF power, modified by terrain bonuses and wall level.
      </p>
      <div className="manual__formula">
        Attacker Power = SUM(troop_qty x troop_ATK)<br />
        Defender Power = SUM(troop_qty x troop_DEF) x terrain_bonus x wall_bonus x offline_bonus
      </div>

      <h2 className="manual__h2">Terrain Defense Bonuses</h2>
      <table className="manual__table manual__table--compact">
        <thead><tr><th>Terrain</th><th>Defense Bonus</th></tr></thead>
        <tbody>
          {Object.entries(TERRAIN_DEFENSE_BONUS).map(([t, b]) => (
            <tr key={t}>
              <td className="capitalize">{t}</td>
              <td className="text-center">x{b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="manual__h2">PvP Rules</h2>
      <div className="manual__grid">
        <div className="manual__card">
          <h3>{"🛡️"} Newbie Shield</h3>
          <p>{NEWBIE_SHIELD_HOURS} hours of protection after registration. No PvP attacks can target you.</p>
        </div>
        <div className="manual__card">
          <h3>{"🚫"} Raid Limits</h3>
          <p>Max {MAX_RAIDS_PER_24H} raids per 24h on the same target. Loot cap: {Math.round(RAID_LOOT_CAP * 100)}% of defender's resources.</p>
        </div>
        <div className="manual__card">
          <h3>{"💤"} Offline Defense</h3>
          <p>Players offline for 6+ hours get +{Math.round(OFFLINE_DEFENSE_BONUS * 100)}% defense bonus to their garrison.</p>
        </div>
      </div>

      <h2 className="manual__h2">Barbarian Camps (PvE)</h2>
      <p className="manual__p">
        25 barbarian camps are scattered across the map with difficulty levels 1-5.
        Higher difficulty camps have more troops but better loot.
        March speed: {MARCH_SPEED_TICKS_PER_TILE} tick(s) per tile (~{MARCH_SPEED_TICKS_PER_TILE} minutes per tile).
      </p>

      <table className="manual__table manual__table--compact">
        <thead><tr><th>Difficulty</th><th>Troops</th><th>Loot Range</th></tr></thead>
        <tbody>
          {Object.entries(CAMP_TROOPS).map(([diff, troops]) => {
            const loot = CAMP_LOOT[Number(diff) as keyof typeof CAMP_LOOT];
            return (
              <tr key={diff}>
                <td className="font-bold text-center">Lv.{diff}</td>
                <td>{Object.entries(troops).map(([t, q]) => `${q} ${t}`).join(", ")}</td>
                <td style={{ color: "var(--color-gold)" }}>
                  {loot ? Object.entries(loot).filter(([, v]) => v > 0).map(([k, v]) => `${RES_ICONS[k] || ""}${v}`).join(" ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MapSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🗺️"} World Map</h1>
      <p className="manual__p">
        The world map is a 61x61 tile grid. Each tile has a terrain type that affects movement and combat.
        Your fief occupies one tile. Barbarian camps and other players' fiefs are visible on the map.
      </p>

      <h2 className="manual__h2">Controls</h2>
      <div className="manual__grid">
        <div className="manual__card">
          <h3>{"🖱️"} Mouse</h3>
          <p>Drag to pan. Scroll to zoom. Click a tile to inspect it.</p>
        </div>
        <div className="manual__card">
          <h3>{"⌨️"} Keyboard</h3>
          <p>WASD or Arrow keys to pan. Hold Shift for 5-tile jumps. +/- to zoom. ESC to deselect.</p>
        </div>
      </div>

      <h2 className="manual__h2">Terrain Types</h2>
      <table className="manual__table manual__table--compact">
        <thead><tr><th>Terrain</th><th>Habitable</th><th>Defense Bonus</th></tr></thead>
        <tbody>
          {TERRAIN_TYPES.map((t) => {
            const info = TERRAIN_MAP[t as TerrainType];
            const defBonus = TERRAIN_DEFENSE_BONUS[t as keyof typeof TERRAIN_DEFENSE_BONUS] ?? 1;
            return (
              <tr key={t}>
                <td className="capitalize font-bold">{info?.label || t}</td>
                <td className="text-center">{info?.habitable ? "✅" : "❌"}</td>
                <td className="text-center">x{defBonus}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TechSection() {
  const categories = ["economy", "military", "fortification"] as const;
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🔬"} Technology Research</h1>
      <p className="manual__p">
        Research technologies to gain permanent bonuses. 3 branches: Economy (production), Military (combat), Fortification (defense).
        Only one research can run at a time. Each has prerequisites from lower tiers.
      </p>

      {categories.map((cat) => {
        const techs = TECH_TREE.filter((t) => t.category === cat);
        return (
          <div key={cat}>
            <h2 className="manual__h2 capitalize">{cat === "economy" ? "💰" : cat === "military" ? "⚔️" : "🏰"} {cat}</h2>
            <table className="manual__table">
              <thead><tr><th>Tech</th><th>Tier</th><th>Bonuses</th><th>Cost</th><th>Time</th><th>Prerequisites</th></tr></thead>
              <tbody>
                {techs.map((t) => (
                  <tr key={t.id}>
                    <td className="font-bold">{t.name}</td>
                    <td className="text-center">{t.tier + 1}</td>
                    <td style={{ color: "var(--color-success)" }}>
                      {t.bonuses.map((b) => `+${Math.round(b.value * 100)}% ${b.type.replace(/_/g, " ")}`).join(", ")}
                    </td>
                    <td>
                      {Object.entries(t.cost).filter(([, v]) => v > 0).map(([k, v]) => `${RES_ICONS[k] || ""}${v}`).join(" ")}
                    </td>
                    <td>{t.researchTicks}m</td>
                    <td>{t.prerequisites.length > 0 ? t.prerequisites.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function AlliancesSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🤝"} Alliances</h1>
      <p className="manual__p">
        Form alliances with other players for mutual protection and coordinated attacks.
      </p>

      <div className="manual__grid">
        <div className="manual__card">
          <h3>{"🏳️"} Creating</h3>
          <p>Any player can create an alliance with a name (3-30 chars) and tag (2-5 chars). The creator becomes the leader.</p>
        </div>
        <div className="manual__card">
          <h3>{"👥"} Members</h3>
          <p>Max {ALLIANCE_MAX_MEMBERS} members per alliance. Roles: Leader, Officer, Member. Leaders can promote, kick, and transfer leadership.</p>
        </div>
        <div className="manual__card">
          <h3>{"🛡️"} Protection</h3>
          <p>Alliance members cannot attack each other. The system prevents friendly fire automatically.</p>
        </div>
        <div className="manual__card">
          <h3>{"📨"} Invites</h3>
          <p>Officers and leaders can invite players by username. Invites must be accepted to join.</p>
        </div>
      </div>
    </div>
  );
}

function InterfaceSection() {
  return (
    <div className="manual__section animate-fade-in">
      <h1 className="manual__h1">{"🖥️"} Interface Guide</h1>

      <h2 className="manual__h2">Layout</h2>
      <div className="manual__grid">
        <div className="manual__card">
          <h3>{"⬅️"} Sidebar</h3>
          <p>Main navigation: HQ (village view), Map, Army, Tech, Diplomacy, Admin. Click to switch between views.</p>
        </div>
        <div className="manual__card">
          <h3>{"⬆️"} Top Bar</h3>
          <p>Shows resources (live-updating), kingdom stats (population, morale, level), player rank, and notifications.</p>
        </div>
        <div className="manual__card">
          <h3>{"⬇️"} Bottom Bar</h3>
          <p>Communication log with timestamped events — building completions, battle results, system messages.</p>
        </div>
      </div>

      <h2 className="manual__h2">Village View (HQ)</h2>
      <p className="manual__p">
        The main headquarters view shows your settlement with all buildings positioned on a visual map.
        <strong> Left panel</strong>: list of buildings (built and available).
        <strong> Center</strong>: interactive village scene — click buildings to manage them.
        <strong> Right panel</strong>: garrison, incoming threats, active marches.
        Click any building to open its detail panel with upgrade/build/recruit options.
      </p>

      <h2 className="manual__h2">Keyboard Shortcuts</h2>
      <table className="manual__table manual__table--compact">
        <thead><tr><th>Key</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td><kbd>ESC</kbd></td><td>Close current panel</td></tr>
          <tr><td><kbd>WASD</kbd> / Arrows</td><td>Pan world map</td></tr>
          <tr><td><kbd>Shift</kbd> + WASD</td><td>Fast pan (5 tiles)</td></tr>
          <tr><td><kbd>+</kbd> / <kbd>-</kbd></td><td>Zoom map</td></tr>
          <tr><td>Scroll wheel</td><td>Zoom map</td></tr>
        </tbody>
      </table>
    </div>
  );
}
