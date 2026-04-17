import type { TechDefinition } from "../types/tech.js";

/**
 * Tech tree: three categories (Economy / Military / Fortification), each
 * laid out across multiple tiers with cross-branch prerequisites for a
 * more interwoven progression.
 *
 * Bonus type strings the client recognises:
 *   production_all, production_wood, production_stone, production_iron,
 *   production_food, production_gold, capacity_all, attack, defense,
 *   march_speed, wall_bonus
 */
export const TECH_TREE: TechDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // ECONOMY — 13 techs, tiers 0-4
  // ═══════════════════════════════════════════════════════════════

  // ── Tier 0 ──
  {
    id: "improved_tools",
    name: "Improved Tools",
    description:
      "The first systematic reform of every workshop in your realm. Sharper saws, properly tempered hammerheads, and iron-shod picks replace the soft, makeshift tools of earlier days. A ploughman plants a third more furrow in a morning; a quarryman loosens twice the stone with the same sweat. It is a small edge — but a small edge, repeated across every village, compounds into the difference between a starving hamlet and a thriving province.",
    category: "economy",
    prerequisites: [],
    cost: { wood: 100, stone: 50, iron: 30, gold: 20 },
    researchTicks: 10,
    bonuses: [{ type: "production_all", value: 0.1 }],
    tier: 0,
  },

  // ── Tier 1 ──
  {
    id: "logging_techniques",
    name: "Logging Techniques",
    description:
      "Seasoned woodsmen master the two-man saw, the river drive, and the skidding chain. Instead of felling trees one by one and dragging each trunk by ox, your crews move timber by the raft-load down spring rivers to the sawpits. The forest yields faster, cleaner timber, and the men return home alive at season's end — a luxury the old methods could not promise.",
    category: "economy",
    prerequisites: ["improved_tools"],
    cost: { wood: 150, stone: 60, iron: 20, gold: 30 },
    researchTicks: 15,
    bonuses: [{ type: "production_wood", value: 0.2 }],
    tier: 1,
  },
  {
    id: "deep_mining",
    name: "Deep Mining",
    description:
      "Your master-engineers sink shafts past the shallow seams that common diggers abandon. Timbered galleries support the overburden; crude hand-pumps and leather buckets keep ground-water at bay; pit-ponies haul the ore up winding drifts. Stone and iron ore come up in greater heaps, and the smelters no longer waste heat on the poor surface rock of older days.",
    category: "economy",
    prerequisites: ["improved_tools"],
    cost: { wood: 120, stone: 100, iron: 50, gold: 40 },
    researchTicks: 15,
    bonuses: [
      { type: "production_stone", value: 0.15 },
      { type: "production_iron", value: 0.15 },
    ],
    tier: 1,
  },
  {
    id: "crop_rotation",
    name: "Crop Rotation",
    description:
      "Three-field rotation leaves one parcel fallow in turn, restoring the soil between harvests. Beans follow grain, grain follows clover, clover rests the ground. The practice demands patience and good record-keeping by the village reeves — but the yield climbs year after year, and no army has ever lost a campaign because its men were too well fed.",
    category: "economy",
    prerequisites: ["improved_tools"],
    cost: { wood: 80, stone: 40, iron: 10, gold: 50 },
    researchTicks: 12,
    bonuses: [{ type: "production_food", value: 0.25 }],
    tier: 1,
  },
  {
    id: "apprentice_guilds",
    name: "Apprentice Guilds",
    description:
      "Each craft — smiths, coopers, weavers, masons — binds itself into a sworn guild with strict apprentice laws, shared patterns, and a guildhall in every market town. Standards rise; shoddy work is punished; wages are protected from the whims of crude lords. The guilds become a quiet second power in your realm, and every coin passed through their halls earns a little more on the way.",
    category: "economy",
    prerequisites: ["improved_tools"],
    cost: { wood: 110, stone: 70, iron: 30, gold: 60 },
    researchTicks: 14,
    bonuses: [{ type: "production_gold", value: 0.15 }],
    tier: 1,
  },

  // ── Tier 2 ──
  {
    id: "sawmills_and_pulleys",
    name: "Sawmills & Pulleys",
    description:
      "Water-driven sawmills replace the exhausting pit-saw. A single dammed stream and a great wooden wheel cut more planks in a day than a dozen sawyers could manage in a week. Pulleys, cranes, and treadwheels lift beams into place that before required a whole village of backs. Your construction sites hum with rope and creaking timber, and the savings ripple outward into every trade.",
    category: "economy",
    prerequisites: ["logging_techniques"],
    cost: { wood: 180, stone: 80, iron: 40, gold: 50 },
    researchTicks: 18,
    bonuses: [
      { type: "production_wood", value: 0.15 },
      { type: "production_all", value: 0.05 },
    ],
    tier: 2,
  },
  {
    id: "smelting_reforms",
    name: "Smelting Reforms",
    description:
      "Larger bloomery stacks, pre-heated bellows, and careful charcoal husbandry give your smelters cleaner metal and far less waste slag. Ironmasters travel between sites to share techniques, and the forges of your realm begin to rival those of the southern principalities. Armour plates grow thicker, ploughshares last longer, and every swing of a hammer returns more finished steel.",
    category: "economy",
    prerequisites: ["deep_mining"],
    cost: { wood: 120, stone: 90, iron: 150, gold: 70 },
    researchTicks: 20,
    bonuses: [{ type: "production_iron", value: 0.2 }],
    tier: 2,
  },
  {
    id: "terraced_fields",
    name: "Terraced Fields",
    description:
      "On slopes once abandoned as useless, your peasants carve stepped terraces held by drystone walls. Streams are coaxed into narrow irrigation ditches that thread along every contour. Land that once grew only gorse and thorn now yields barley, rye, and vegetables — and in seasons of drought, the terraces hold the last water when the plains have baked dry.",
    category: "economy",
    prerequisites: ["crop_rotation"],
    cost: { wood: 140, stone: 180, iron: 30, gold: 60 },
    researchTicks: 18,
    bonuses: [{ type: "production_food", value: 0.2 }],
    tier: 2,
  },
  {
    id: "trade_routes",
    name: "Trade Routes",
    description:
      "Caravan masters chart safe passes through the mountains, bribe border-lords into tolerable tolls, and open letters of credit with the great banking houses of the south. Your markets fill with salt from inland flats, spice from sea-traders, and silk from kingdoms your own grandfather never heard named. Every transaction leaves a little more gold in your coffers.",
    category: "economy",
    prerequisites: ["logging_techniques", "deep_mining"],
    cost: { wood: 200, stone: 150, iron: 80, gold: 100 },
    researchTicks: 25,
    bonuses: [{ type: "production_gold", value: 0.3 }],
    tier: 2,
  },
  {
    id: "advanced_storage",
    name: "Advanced Storage",
    description:
      "Vaulted stone cellars, sealed tile-lined silos, and ironbound chests keep rot, rust, mice, and weevils at bay. Grain once lost to damp now waits through the leanest winter; iron ingots no longer pit; gold is counted and locked behind seals. You can hoard far more against long sieges, lean years, and the slow grind of war.",
    category: "economy",
    prerequisites: ["crop_rotation", "apprentice_guilds"],
    cost: { wood: 180, stone: 120, iron: 40, gold: 60 },
    researchTicks: 20,
    bonuses: [{ type: "capacity_all", value: 0.25 }],
    tier: 2,
  },

  // ── Tier 3 ──
  {
    id: "banking_houses",
    name: "Banking Houses",
    description:
      "The guilds and the great merchant families combine to establish lending houses under royal charter. Gold no longer sits idle in chests — it is lent against mills and mines, returned with interest, and lent again. A realm whose coin circulates is twice as rich as one whose coin is buried. Careful ledger-work becomes as valuable to the crown as any smith or soldier.",
    category: "economy",
    prerequisites: ["trade_routes", "apprentice_guilds"],
    cost: { wood: 220, stone: 180, iron: 90, gold: 200 },
    researchTicks: 30,
    bonuses: [
      { type: "production_gold", value: 0.2 },
      { type: "production_all", value: 0.05 },
    ],
    tier: 3,
  },
  {
    id: "great_granaries",
    name: "Great Granaries",
    description:
      "Cathedral-sized vaults rise above every major town, each capable of feeding a garrison through a year of siege. Grain is turned regularly by workers on wooden ladders; layers of oak shelving separate moisture from stores; cats and terriers patrol by night. Your realm is insulated against famine and blockade alike.",
    category: "economy",
    prerequisites: ["advanced_storage", "terraced_fields"],
    cost: { wood: 260, stone: 300, iron: 60, gold: 90 },
    researchTicks: 30,
    bonuses: [
      { type: "capacity_all", value: 0.2 },
      { type: "production_food", value: 0.1 },
    ],
    tier: 3,
  },
  {
    id: "master_craftsmen",
    name: "Master Craftsmen",
    description:
      "The guilds reach the apex of their art. Journeymen travel freely between chapters, carrying patterns and techniques from distant cities back to your workshops. Master-smiths sign their work; master-masons carve their marks into every cornerstone; master-weavers produce cloth that rival princes pay in gold for. Quality becomes your realm's quiet signature — and rivals envy every bolt and blade that leaves your borders.",
    category: "economy",
    prerequisites: ["trade_routes", "advanced_storage", "smelting_reforms"],
    cost: { wood: 400, stone: 300, iron: 150, gold: 200 },
    researchTicks: 40,
    bonuses: [{ type: "production_all", value: 0.2 }],
    tier: 3,
  },

  // ── Tier 4 ──
  {
    id: "imperial_commerce",
    name: "Imperial Commerce",
    description:
      "Your realm becomes the pivot of a vast trading web — ledgers in a dozen tongues, counting houses in every free city, and diplomatic marriages that are as much about customs rates as dynasty. Every resource flows more freely, every coin earns a richer return, and the commoners speak of your court with the same awed rumour once reserved for the old emperors.",
    category: "economy",
    prerequisites: ["master_craftsmen", "banking_houses", "great_granaries"],
    cost: { wood: 550, stone: 400, iron: 220, gold: 350 },
    researchTicks: 55,
    bonuses: [
      { type: "production_all", value: 0.15 },
      { type: "production_gold", value: 0.2 },
    ],
    tier: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // MILITARY — 13 techs, tiers 0-4
  // ═══════════════════════════════════════════════════════════════

  // ── Tier 0 ──
  {
    id: "iron_weapons",
    name: "Iron Weapons",
    description:
      "Your smiths abandon the soft bronze and patchwork iron of earlier generations. Spearheads are properly tempered; sword-blades ring true when struck; arrowheads bite through leather and mail alike. A common levyman, given a properly forged weapon, stands a fair chance against the heirloom blades of a foreign knight — and the old saying that 'only lords wield true iron' dies quietly in the drill yards.",
    category: "military",
    prerequisites: [],
    cost: { wood: 80, stone: 40, iron: 80, gold: 30 },
    researchTicks: 12,
    bonuses: [{ type: "attack", value: 0.1 }],
    tier: 0,
  },
  {
    id: "shield_wall",
    name: "Shield Wall",
    description:
      "Your drill-sergeants teach the locked wall of painted shields. Footmen brace shoulder to shoulder, spears bristling between the gaps, and every man learns that the line holds only if each holds his place. Cavalry charges that would shatter a loose rabble break helpless against such discipline — and the men who survive their first shield-wall carry its lesson for life.",
    category: "military",
    prerequisites: [],
    cost: { wood: 100, stone: 60, iron: 60, gold: 20 },
    researchTicks: 12,
    bonuses: [{ type: "defense", value: 0.1 }],
    tier: 0,
  },

  // ── Tier 1 ──
  {
    id: "steel_forging",
    name: "Steel Forging",
    description:
      "Pattern-welded blades, careful quenching in oil, and the folding techniques your smiths coaxed out of southern prisoners-of-war produce steel that rings like a bell and holds its edge through a full day of battle. Each blade is a small fortune — and worth every coin when it shears clean through a rival's common iron.",
    category: "military",
    prerequisites: ["iron_weapons"],
    cost: { wood: 150, stone: 80, iron: 150, gold: 60 },
    researchTicks: 20,
    bonuses: [{ type: "attack", value: 0.15 }],
    tier: 1,
  },
  {
    id: "heavy_armor",
    name: "Heavy Armor",
    description:
      "Mail hauberks give way to riveted plate: breastplates, greaves, pauldrons, and great helms. A knight so harnessed can take a war-hammer blow and keep fighting — if he can afford the armour and a destrier strong enough to carry both him and it. Your nobility drill in full harness through the summer heat, and the sight of a charging line of plate-armoured riders becomes a thing of terror on the field.",
    category: "military",
    prerequisites: ["shield_wall"],
    cost: { wood: 120, stone: 100, iron: 180, gold: 70 },
    researchTicks: 20,
    bonuses: [{ type: "defense", value: 0.15 }],
    tier: 1,
  },
  {
    id: "forced_march",
    name: "Forced March",
    description:
      "Your captains drill the men in the long stride, proper boot-wrapping, disciplined baggage trains, and the march-songs that keep cadence through the dead middle of a long day. Armies cover more ground between dawn and dusk and arrive at the battlefield still fit to fight. In war, speed is often a sharper weapon than any blade.",
    category: "military",
    prerequisites: ["iron_weapons"],
    cost: { wood: 100, stone: 50, iron: 40, gold: 80 },
    researchTicks: 15,
    bonuses: [{ type: "march_speed", value: 0.25 }],
    tier: 1,
  },
  {
    id: "archery_ranges",
    name: "Archery Ranges",
    description:
      "Every free-holding village raises its own butts, and every able youth is required to loose a score of arrows each week under the eye of a master bowman. Longbows replace hunting bows; arrows fletched in grey goose fly true past two hundred paces. When the shire-levies gather for war, your archers can darken the sky at a commander's word.",
    category: "military",
    prerequisites: ["shield_wall"],
    cost: { wood: 130, stone: 50, iron: 40, gold: 40 },
    researchTicks: 14,
    bonuses: [{ type: "attack", value: 0.1 }],
    tier: 1,
  },

  // ── Tier 2 ──
  {
    id: "veteran_training",
    name: "Veteran Training",
    description:
      "Old soldiers return to the drill-yard to teach what only survivors know: where to plant the spear when a horse charges, when to press and when to fall back, how to recover a friend's shield when he falls. Veteran banners turn green levies into men who refuse to break — and the long campaigns become, in the end, a matter of which side still has its veterans at the last hour.",
    category: "military",
    prerequisites: ["steel_forging", "heavy_armor"],
    cost: { wood: 300, stone: 200, iron: 250, gold: 150 },
    researchTicks: 35,
    bonuses: [
      { type: "attack", value: 0.1 },
      { type: "defense", value: 0.1 },
    ],
    tier: 2,
  },
  {
    id: "siege_engineering",
    name: "Siege Engineering",
    description:
      "Trebuchets, mangonels, and great belfries rise under the direction of master-engineers lured from every court on the continent. Walls that once stood against whole seasons of assault fall in days once the long arms begin to swing. Your engineers travel with every host, and the mere sight of their waggons approaching a distant tower has broken the nerve of more than one enemy garrison.",
    category: "military",
    prerequisites: ["steel_forging", "smelting_reforms"],
    cost: { wood: 250, stone: 180, iron: 200, gold: 120 },
    researchTicks: 30,
    bonuses: [{ type: "attack", value: 0.2 }],
    tier: 2,
  },
  {
    id: "composite_bows",
    name: "Composite Bows",
    description:
      "Your bowyers laminate horn, sinew, and seasoned yew into bows of a draw-weight that older men could scarcely imagine. A well-trained archer looses six or seven shafts a minute and punches arrows through mail at a hundred paces. Your archery companies become the dreaded front rank of every battle — the arrow-storm that breaks a charge before the charge ever reaches the line.",
    category: "military",
    prerequisites: ["archery_ranges"],
    cost: { wood: 200, stone: 70, iron: 90, gold: 110 },
    researchTicks: 25,
    bonuses: [{ type: "attack", value: 0.15 }],
    tier: 2,
  },
  {
    id: "cavalry_doctrine",
    name: "Cavalry Doctrine",
    description:
      "The horse-lords of your realm draw up a proper school: the couched lance, the wedge-formation, the feigned retreat, the pursuit-and-wheel. Destriers are bred larger and trained to charge home through a line of levelled spears. When a knightly wing rolls up an enemy flank at full gallop, battles end not in slaughter but in the simple, sudden collapse of the other side's will.",
    category: "military",
    prerequisites: ["forced_march", "heavy_armor"],
    cost: { wood: 180, stone: 120, iron: 170, gold: 180 },
    researchTicks: 28,
    bonuses: [
      { type: "march_speed", value: 0.2 },
      { type: "attack", value: 0.1 },
    ],
    tier: 2,
  },

  // ── Tier 3 ──
  {
    id: "grand_strategy",
    name: "Grand Strategy",
    description:
      "Your general-marshals move beyond the art of the single battlefield. They study supply lines, weather, terrain, and the timing of harvests; they learn which passes a rival can cross in March and which must wait until June. War becomes less a gamble and more a vast chess-game — and the opponent who plays without such foresight is usually already lost before the first lance is levelled.",
    category: "military",
    prerequisites: ["veteran_training", "cavalry_doctrine"],
    cost: { wood: 400, stone: 280, iron: 320, gold: 260 },
    researchTicks: 42,
    bonuses: [
      { type: "march_speed", value: 0.15 },
      { type: "attack", value: 0.1 },
      { type: "defense", value: 0.1 },
    ],
    tier: 3,
  },
  {
    id: "war_mastery",
    name: "War Mastery",
    description:
      "Your captains codify everything the realm has learned: formations for every terrain, counter-drills for every enemy tactic, and a written doctrine that passes from one generation of officers to the next. Few rivals can match a host whose every footman and every knight knows his part without being told.",
    category: "military",
    prerequisites: ["veteran_training", "siege_engineering"],
    cost: { wood: 500, stone: 400, iron: 350, gold: 300 },
    researchTicks: 50,
    bonuses: [
      { type: "attack", value: 0.15 },
      { type: "defense", value: 0.15 },
    ],
    tier: 3,
  },

  // ── Tier 4 ──
  {
    id: "legendary_warhost",
    name: "Legendary Warhost",
    description:
      "Songs begin to be written about your armies before the battles are even fought. Young men from distant kingdoms travel to serve under your banner; old veterans come out of retirement rather than miss a famous campaign; rival lords pay tribute simply to avoid being invaded. Your war-host is the standard against which all others are measured.",
    category: "military",
    prerequisites: ["war_mastery", "grand_strategy", "composite_bows"],
    cost: { wood: 700, stone: 500, iron: 500, gold: 450 },
    researchTicks: 60,
    bonuses: [
      { type: "attack", value: 0.2 },
      { type: "defense", value: 0.15 },
      { type: "march_speed", value: 0.15 },
    ],
    tier: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // FORTIFICATION — 9 techs, tiers 0-3
  // ═══════════════════════════════════════════════════════════════

  // ── Tier 0 ──
  {
    id: "stone_masonry",
    name: "Stone Masonry",
    description:
      "Master-masons replace the timber palisades of earlier generations with dressed stone courses bedded in strong lime mortar. Your walls no longer burn to the ground in a summer raid, no longer rot through a wet winter, and no longer fall to a single ladder against a weak section. Stone is patient — and patience, in war, is a virtue with very sharp teeth.",
    category: "fortification",
    prerequisites: [],
    cost: { wood: 60, stone: 120, iron: 20, gold: 30 },
    researchTicks: 10,
    bonuses: [{ type: "wall_bonus", value: 0.02 }],
    tier: 0,
  },
  {
    id: "earthworks",
    name: "Earthworks",
    description:
      "Before a wall, there is a ditch; before a ditch, there is a rampart thrown up by every peasant of fighting age. Your captains draw up standard profiles for field entrenchments, and any encamped host can turn a bare hillside into a defensible position in a single day. Armies that cannot be surprised in their sleep are armies that usually win the morning.",
    category: "fortification",
    prerequisites: [],
    cost: { wood: 80, stone: 70, iron: 15, gold: 20 },
    researchTicks: 10,
    bonuses: [{ type: "wall_bonus", value: 0.02 }],
    tier: 0,
  },

  // ── Tier 1 ──
  {
    id: "moat_construction",
    name: "Moat Construction",
    description:
      "Diggers carve a wide, water-filled ditch around your walls, channeling streams and springs to keep it full through the driest summer. Attackers must drag ladders through mud, wade under a storm of arrows, and still face the stones above — and many never reach them. A moat is a slow weapon, but its work lasts forever.",
    category: "fortification",
    prerequisites: ["stone_masonry", "earthworks"],
    cost: { wood: 100, stone: 200, iron: 30, gold: 50 },
    researchTicks: 18,
    bonuses: [{ type: "wall_bonus", value: 0.03 }],
    tier: 1,
  },
  {
    id: "arrow_slits",
    name: "Arrow Slits",
    description:
      "Narrow slotted embrasures replace plain battlements. Your bowmen loose arrow after arrow in near-perfect safety, flaying the shield-wall below without ever showing themselves. An attacker sees no target; he sees only the quiet dark stripes from which death arrives, and he learns, if he lives, not to climb the next ladder quite so eagerly.",
    category: "fortification",
    prerequisites: ["stone_masonry"],
    cost: { wood: 120, stone: 150, iron: 50, gold: 40 },
    researchTicks: 15,
    bonuses: [{ type: "defense", value: 0.1 }],
    tier: 1,
  },
  {
    id: "reinforced_gates",
    name: "Reinforced Gates",
    description:
      "Oak beams are banded with riveted iron, hinges are set deep into masonry sockets, and portcullises of welded bars drop behind any main door at the pull of a single lever. Gates that were once the weak seam of any curtain-wall become the last place a sensible attacker will try to force.",
    category: "fortification",
    prerequisites: ["earthworks"],
    cost: { wood: 140, stone: 100, iron: 120, gold: 60 },
    researchTicks: 16,
    bonuses: [{ type: "wall_bonus", value: 0.03 }],
    tier: 1,
  },

  // ── Tier 2 ──
  {
    id: "concentric_walls",
    name: "Concentric Walls",
    description:
      "A lower outer wall is raised beyond the main curtain, so that attackers who storm the first line find themselves pinned in a killing ground between two tiers of archers above them. The idea is simple and ancient — but few realms have the masons, the stone, and the patience to build it properly. Yours does.",
    category: "fortification",
    prerequisites: ["moat_construction", "reinforced_gates"],
    cost: { wood: 220, stone: 380, iron: 80, gold: 100 },
    researchTicks: 25,
    bonuses: [
      { type: "wall_bonus", value: 0.04 },
      { type: "defense", value: 0.1 },
    ],
    tier: 2,
  },
  {
    id: "murder_holes",
    name: "Murder Holes",
    description:
      "Slotted openings in the ceilings of gatehouses and passageways let defenders drop stones, hot oil, or boiling water onto anyone who forces their way inside. The practice is grim — your gate-wardens do not boast of it at feast-tables — but the effect on morale is decisive. Attackers learn that passing under your gates is as dangerous as scaling your walls.",
    category: "fortification",
    prerequisites: ["arrow_slits", "reinforced_gates"],
    cost: { wood: 160, stone: 220, iron: 90, gold: 80 },
    researchTicks: 22,
    bonuses: [{ type: "defense", value: 0.15 }],
    tier: 2,
  },
  {
    id: "fortress",
    name: "Fortress",
    description:
      "Concentric walls, flanking towers, an inner keep, a barbican, and every trick your engineers have ever learned: your main fief is no longer merely walled — it is a fortress in the proper old sense, the kind of place whose name is whispered across half a continent as a byword for 'impossible to take'. Enemy armies break themselves upon stone designed to outlast the dynasty that built it.",
    category: "fortification",
    prerequisites: ["moat_construction", "arrow_slits"],
    cost: { wood: 300, stone: 400, iron: 100, gold: 150 },
    researchTicks: 40,
    bonuses: [
      { type: "wall_bonus", value: 0.05 },
      { type: "defense", value: 0.1 },
    ],
    tier: 2,
  },

  // ── Tier 3 ──
  {
    id: "citadel",
    name: "Citadel",
    description:
      "At the heart of the fortress rises a final refuge — a citadel of tall towers, vaulted magazines, deep wells, and curtain walls thick enough to absorb a direct trebuchet strike without so much as a crack. Even if the outer defences somehow fall, the citadel alone can hold a garrison for a full year of siege. No attacker has ever taken such a stronghold by storm, and very few by any means at all.",
    category: "fortification",
    prerequisites: ["fortress", "concentric_walls", "murder_holes"],
    cost: { wood: 450, stone: 650, iron: 200, gold: 260 },
    researchTicks: 55,
    bonuses: [
      { type: "wall_bonus", value: 0.06 },
      { type: "defense", value: 0.15 },
    ],
    tier: 3,
  },
];

export const TECH_MAP = Object.fromEntries(
  TECH_TREE.map((t) => [t.id, t])
) as Record<string, TechDefinition>;
