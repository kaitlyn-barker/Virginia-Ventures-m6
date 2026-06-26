// ============================================================================
// Money Moves: Your Financial Literacy
// FOUNDATION SHELL  —  rebuilt to match the Market Harvest (m4) house style.
// This file sets up:
//   1. The economic CONSTANTS (kept; the stages will read these)
//   2. The house colors (cream / navy / gold / green)
//   3. The three score meters and the HUD that shows them
//   4. The IWSDK world: a walkable, lit space, with mouse-look + WASD/thumbstick
//   5. The hidden-panel click guard and a press helper (needed once panels exist)
//   6. The phase machine skeleton (Select -> Morning -> Midday -> Afternoon -> Close)
// The stations, the mentor, the panels, and the stage logic arrive in later prompts.
// ============================================================================

import {
  World,
  SessionMode,
  LocomotionEnvironment,
  EnvironmentType,
  VisibilityState,
  Hovered,
  Pressed,
  PanelUI,
  PanelDocument,
  Interactable,
  DistanceGrabbable,
  MovementMode,
  Grabbed,
  Vector3,
  Box3,
  Group,
  Color,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  DoubleSide,
} from "@iwsdk/core";

import { buildBaseWorld, buildShopProps, setStageLook, GUS_SPOT, STATIONS } from "./environment";
import { meshBox, meshCyl, meshSphere, meshCone, makeTitleCard, makeSpeechBubble, makeTextPanel, makeButtonCard, makeChoiceCard, makeInfoCard, makeReadoutCard } from "./environment";
import { setActiveShop, activeShop, SHOPS, ShopId, ShopPack } from "./shops";
import { sfxStage, sfxClick, sfxCoin, sfxFanfare, sfxChime, startHum, stopHum, startVillageAmbience, stopVillageAmbience, startFarmAmbience, stopFarmAmbience } from "./sfx";

// ============================================================================
// ECONOMIC CONSTANTS  (carried over; the stages read these in later prompts)
// ============================================================================
const ECON = {
  STARTING_MONEY: 20,            // birthday money in the piggy bank
  ALLOWANCE_PER_WEEK: 10,        // money earned each week in Stage 1
  SAVINGS_INTEREST_RATE: 0.1,    // savings grows this much each week
  FRIEND_OFFER_PRICE: 15,        // the rare item the friend offers in Stage 1
  PAYCHECK_STAGE2: 100,          // the Stage 2 part-time-job paycheck
  INVEST_GOOD_MULTIPLIER: 1.4,   // an investment that does well
  INVEST_BAD_MULTIPLIER: 0.7,    // an investment that struggles
  INVEST_GOOD_PROBABILITY: 0.55, // chance an investment does well
  BIG_DECISION_FUNDS: 200,       // the Stage 3 money to spread around
  SURPRISE_EXPENSE: 30,          // the unexpected cost in Stage 3
  DIVERSIFY_MIN_CHANNELS: 3,     // places you must use to count as spreading out
};

// ============================================================================
// MODULE 6 — HUB CONSTANTS  (the lineup of four stations the student picks from)
// One labeled block for every tunable hub value: where the row sits, how far
// apart the stations are, how tall the pedestals stand, the floating titles,
// the host's spot, and the compact stage everything rests on. Stop-specific
// data (name, region, landmark, done flag) lives in STOPS.
//
// The student spawns near the back (about z +7) and faces -z, so the row is
// centered in FRONT of them. +x is the student's RIGHT, -x is their LEFT. The
// four stations stand in one evenly spaced row, left to right in STOPS order.
// ============================================================================
const HUB = {
  ROW_Z: 4.3,            // world z of the row of pedestals (about 2.7m in front)
  ROW_CENTER_X: 0,       // the WHOLE lineup (Fox + 4 stations) is centered on x = 0
  SPACING: 0.95,         // distance between neighbouring stations, in metres
  PED_TOP_Y: 0.95,       // height of each pedestal top, where the landmark sits
  PED_R: 0.26,           // pedestal radius
  MODEL_SCALE: 2.4,      // enlarge each diorama landmark so the row fills the view
  TITLE_Y: 1.86,         // title card sits just ABOVE its landmark, not high in the sky
  TITLE_W: 0.92,         // width of a compact title card, in metres
  FOX_GAP: 0.95,         // how far left of the first station Foreman Fox stands
  WELCOME_Y: 1.85,       // Fox's speech bubble floats by his head (its tail points down to him)
  WELCOME_W: 0.8,        // width of the speech bubble, in metres (smaller now each place has a title)
  WELCOME_DX: -0.05,     // small sideways nudge of the bubble off Fox's head
  STAGE_TOP_Y: 0.0,      // top of the stage platform (flush with the standing floor)
  STAGE_THICK: 0.14,     // stage slab thickness
  STAGE_FRONT_Z: 3.7,    // stage near edge (just in front of the row)
  STAGE_BACK_Z: 7.7,     // stage far edge (just behind the standing student)
  STAGE_MARGIN: 0.5,     // how far the stage reaches past Fox and the last station
  BADGE_Y: 0.62,         // height of the gold "visited" check on the pedestal front
  GROUND_PAD_W: 1.4,     // how far the warm ground reaches past the stage, left+right total
  GROUND_PAD_D: 0.9,     // how far the warm ground reaches past the stage, front+back total
  GROUND_THICK: 0.08,    // ground slab thickness
  FOX_PODIUM_H: 0.12,    // height of the little podium Fox stands on (head of the lineup)
  FOX_PODIUM_R: 0.5,     // radius of Fox's podium
};

// How each landmark glows and bobs, so the lineup feels alive. One setInterval
// loop drives both the bob and the visited-state pulse (rAF pauses in headset).
const LANDMARK = {
  GLOW: 0.4,         // base soft self-lit emissive strength (0 = none, 1 = full)
  BOB_AMP: 0.012,    // how far each landmark drifts up and down, in metres
  BOB_SPEED: 1.4,    // bob rate (higher = quicker); kept gentle on purpose
  BOB_STAGGER: 1.6,  // phase offset between landmarks so they do not move in sync
  PULSE_MIN: 0.25,   // glow low point while a stop is unvisited (inviting pulse)
  PULSE_MAX: 0.75,   // glow high point of that inviting pulse
  PULSE_SPEED: 2.2,  // how quickly an unvisited station breathes its glow
  DONE_GLOW: 0.16,   // calm steady glow once a stop is finished (pulse off)
  // A soft "come here" glow pool at the base of each UNVISITED landmark, in that
  // stop's color. It breathes with the same pulse and vanishes once the stop is
  // done (the gold check takes over). This is the clearest "come explore" cue.
  PAD_R: 1.5,        // glow-pool radius as a multiple of the pedestal radius
  PAD_GLOW_MIN: 0.55, // emissive low point of the inviting pool
  PAD_GLOW_MAX: 1.3,  // emissive high point of the inviting pool
  PAD_OP_MIN: 0.32,  // opacity low point (translucent, so it reads as glow not plate)
  PAD_OP_MAX: 0.68,  // opacity high point
  PAD_SCALE_AMP: 0.18, // how much the pool swells and shrinks as it breathes
  // Point-at highlight: when the student aims at a landmark it brightens and grows
  // a touch, so the place the press will enter is unmistakable. Applied over the
  // pulse/done look in the same loop, so there is one owner of the glow.
  HOVER_GLOW: 1.0,    // emissive while pointed at (well above the pulse high point)
  HOVER_SCALE: 1.08,  // gentle grow while pointed at
};

// The warm palette for the stage, the pedestals, and the gold visited badge.
const HUB_COLOR = {
  stage: "#c9b48a",      // warm sand stage platform
  stageRim: "#9c7f53",   // darker trim peeking out under the stage edge
  pedestal: "#b9a47e",   // stone pedestal column
  pedestalCap: "#d8c8a4", // lighter cap ring on each pedestal
  badge: "#f4c20d",      // gold visited badge disk
  badgeCheck: "#ffffff", // white check stroke on the badge
  ground: "#d3c8ad",     // calm warm-neutral ground under the row and Fox
};

// The four stops, laid out left to right in THIS order across the row. region
// is the smaller line under each title; landmark picks the prop; color tints
// the station; done flips true once the student actually finishes that stop
// (drives the visited badge + pulse). Visit order is still the student's choice.
const STOPS = [
  {
    id: "tech",
    name: "Tech Office",
    title: "Tech Office, Northern Virginia",
    region: "Northern Virginia",
    tagline: "Where the internet lives",
    landmark: "Data Center",
    color: "#3f9fd0",   // tech blue
    done: false,        // earned by actually finishing the stop
  },
  {
    id: "port",
    name: "Port of Virginia",
    title: "Port of Virginia, Norfolk",
    region: "Norfolk",
    tagline: "Goods from around the world",
    landmark: "Cargo Ship",
    color: "#e06a4f",   // port red-orange
    done: false,
  },
  {
    id: "tourism",
    name: "Tourism Hub",
    title: "Tourism Hub, Colonial Williamsburg",
    region: "Williamsburg",
    tagline: "Where history comes alive",
    landmark: "Capitol Building",
    color: "#caa24a",   // colonial gold
    done: false,        // earned by actually finishing the stop
  },
  {
    id: "farm",
    name: "Modern Farm",
    title: "Modern Farm, Shenandoah Valley",
    region: "Shenandoah Valley",
    tagline: "Where farming goes high-tech",
    landmark: "Red Barn",
    color: "#5fae4a",   // farm green
    done: false,
  },
];

// ============================================================================
// MODULE 6 — DECISION PACKS  (the shared grammar the three "lean" stops fill)
// A decision pack is pure DATA the reusable runner plays inside the stop shell.
// Keep it clean and general: Tourism and Farm fill this SAME shape later (the Port
// is the one custom mini game, so it has no pack). A pack is:
//   setup:     one plain-language line that frames the whole stop (Fox's intro)
//   decisions: the choices the student makes in order; each decision has a
//     question and exactly three options; each option has
//       label:   the words on the pointable card
//       effects: how this pick moves the three meters, any of which may be
//                positive, negative, or zero —
//                  ei = Economic Impact, it = Innovation Thinking, ps = Problem Solving
//       note:    one short sentence shown after the pick, explaining the result
// No pick is a wrong answer that fails the student: weaker picks simply add less
// or take a little. Every amount is a starting value to tune later, so they all
// live here and nothing is hardcoded in the runner.
// ============================================================================
type MeterEffects = { ei: number; it: number; ps: number };
// A stop's build reacts to each pick. A strong choice makes the new piece THRIVE
// (steady bright glow, data flowing along its cables); a weak one makes it STRUGGLE
// (dim, gently flickering, stalled flow); an in-between one runs NEUTRAL (a quiet,
// steady hum). The staging reads this; the meter math (effects) is unchanged.
type StageReaction = "thrive" | "struggle" | "neutral";
type DecisionOption = { label: string; effects: MeterEffects; note: string; reaction?: StageReaction };
type Decision = { question: string; options: DecisionOption[] };
type DecisionPack = { setup: string; decisions: Decision[] };

const DECISION_PACKS: { [stopId: string]: DecisionPack } = {
  tech: {
    setup:
      "A company wants to build a new data center, a giant building full of computers that helps run the internet. You make three choices to set it up.",
    decisions: [
      {
        question: "Where should we build it?",
        options: [
          {
            label: "Out in the cheap countryside.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Cheap land, but it is far from the internet lines and power, so it runs slow.",
          },
          {
            label: "In Northern Virginia, near the internet lines and lots of power.",
            effects: { ei: 8, it: 3, ps: 8 },
            reaction: "thrive",
            note: "Great spot. The internet lines and plenty of power are right here, so it runs fast.",
          },
          {
            label: "Downtown, with no spare power.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "No room or spare power downtown, so it cannot grow.",
          },
        ],
      },
      {
        question: "How will you power it?",
        options: [
          {
            label: "Use only the power already there.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Not enough power on its own. It could overload.",
          },
          {
            label: "Build a strong, reliable supply and add solar panels.",
            effects: { ei: 0, it: 8, ps: 8 },
            reaction: "thrive",
            note: "Steady power, and the solar panels are a smart, modern touch.",
          },
          {
            label: "Buy the cheapest power, even if it cuts out.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "It saves money, but the power cuts out and the center stops.",
          },
        ],
      },
      {
        question: "How will you run it once it is open?",
        options: [
          {
            label: "Hire local workers and connect to the fast internet lines.",
            effects: { ei: 8, it: 0, ps: 8 },
            reaction: "thrive",
            note: "New jobs for local workers, and the fast connection keeps it running.",
          },
          {
            label: "Run it with as few people as possible.",
            effects: { ei: 3, it: -3, ps: 0 },
            reaction: "neutral",
            note: "It saves money, but it creates very few jobs.",
          },
          {
            label: "Use a slow, cheap connection.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "The slow connection cannot keep up with all the computers.",
          },
        ],
      },
    ],
  },

  // ---- Tourism Hub, Colonial Williamsburg (decision segment). Same shape as Tech:
  // price the tickets, bring visitors in, then balance crowds against protecting the
  // old buildings. Strong picks thrive, weak picks struggle, the safe-but-quiet pick
  // is neutral. The reusable runner and the meter math read this; nothing hardcoded.
  tourism: {
    setup:
      "You run a historic site in Colonial Williamsburg, where visitors come to see how Virginians lived long ago. You make three choices to welcome visitors and protect the site.",
    decisions: [
      {
        question: "How will you price tickets?",
        options: [
          {
            label: "Make them free.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Big happy crowds come, but with no ticket money you cannot keep the old buildings repaired.",
          },
          {
            label: "Set a fair price.",
            effects: { ei: 8, it: 0, ps: 8 },
            reaction: "thrive",
            note: "Plenty of visitors still come, and you earn enough to keep the site beautiful.",
          },
          {
            label: "Charge a very high price.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Each ticket earns a lot, but few people can afford to come and the town feels left out.",
          },
        ],
      },
      {
        question: "How will you bring visitors in?",
        options: [
          {
            label: "Do nothing and hope they show up.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Almost no one finds the site.",
          },
          {
            label: "Share the real history and hands-on experiences.",
            effects: { ei: 8, it: 8, ps: 0 },
            reaction: "thrive",
            note: "People travel from far away for something authentic.",
          },
          {
            label: "Build flashy fake attractions that ignore the real history.",
            effects: { ei: 3, it: -5, ps: 0 },
            reaction: "struggle",
            note: "A crowd comes, but it cheapens what makes the place special.",
          },
        ],
      },
      {
        question: "How will you handle crowds and the old buildings?",
        options: [
          {
            label: "Let in huge crowds with no limits.",
            effects: { ei: 8, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Lots of money today, but the historic buildings get worn and damaged.",
          },
          {
            label: "Set smart limits and protect the buildings.",
            effects: { ei: 8, it: 8, ps: 8 },
            reaction: "thrive",
            note: "Steady visitors, and the site stays beautiful for years to come.",
          },
          {
            label: "Close off most of the site to be safe.",
            effects: { ei: -5, it: 0, ps: 3 },
            reaction: "neutral",
            note: "The buildings are protected, but visitors leave disappointed and you make very little.",
          },
        ],
      },
    ],
  },

  // ---- Modern Farm, Shenandoah Valley (decision segment). Same shape as the others:
  // plant the crops, decide how to water them, then bring in and sell the harvest.
  // Farming did not disappear in Virginia, it got smarter; the strong picks use new
  // technology and THRIVE, the old wasteful ways STRUGGLE, and the small local choice
  // is NEUTRAL. The reusable runner and the meter math read this; nothing hardcoded.
  farm: {
    setup:
      "You run a modern farm in the Shenandoah Valley. Farming did not disappear in Virginia, it got smarter. You make three choices to grow a great harvest using new technology.",
    decisions: [
      {
        question: "How will you plant your crops?",
        options: [
          {
            label: "Plant by hand the old way, guessing where the seeds go.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "It works, but seeds get wasted and the rows come out uneven.",
          },
          {
            label: "Use a GPS-guided tractor to plant in perfect rows.",
            effects: { ei: 3, it: 8, ps: 8 },
            reaction: "thrive",
            note: "No wasted seed, and every plant has room to grow.",
          },
          {
            label: "Pack in way too many seeds to be safe.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Nothing is wasted, but the crowded plants choke each other.",
          },
        ],
      },
      {
        question: "How will you know when the crops need water?",
        options: [
          {
            label: "Water the whole field the same every day, just in case.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Simple, but you waste a lot of water on parts that do not need it.",
          },
          {
            label: "Fly a sensor drone to find the dry spots, then water only those.",
            effects: { ei: 0, it: 8, ps: 8 },
            reaction: "thrive",
            note: "You save water and the crops stay healthy.",
          },
          {
            label: "Only water once plants already look like they are wilting.",
            effects: { ei: 0, it: 0, ps: -5 },
            reaction: "struggle",
            note: "You save water at first, but by then the crops are hurt.",
          },
        ],
      },
      {
        question: "How will you bring in the harvest and sell it?",
        options: [
          {
            label: "Harvest slowly by hand and sell only at the local stand.",
            effects: { ei: 3, it: -5, ps: 0 },
            reaction: "neutral",
            note: "A lot of work, and you reach only a few local buyers.",
          },
          {
            label: "Use modern machines to harvest and sell to buyers across the country.",
            effects: { ei: 8, it: 8, ps: 8 },
            reaction: "thrive",
            note: "A big harvest, and you reach far more customers.",
          },
          {
            label: "Rush the harvest with machines but skip checking the crops.",
            effects: { ei: 3, it: 0, ps: -5 },
            reaction: "struggle",
            note: "Fast, but you ship bruised, low-quality produce.",
          },
        ],
      },
    ],
  },
};

// ============================================================================
// STOP STAGING — TUNING  (how the build reacts to each pick; shared by all stops)
// One labeled block for every blink, glow, and flow rate, so the comfort rules
// (slow, gentle, never strobing) are tuned in ONE place. The generic staging
// engine and the Tech Office build read these; the meter math does not.
// ============================================================================
const STAGING = {
  TICK_MS: 33,            // every staging loop runs on setInterval (rAF pauses in headset)
  APPEAR_MS: 520,         // a freshly added piece eases up into place over this long (no pop)
  APPEAR_RISE: 0.14,      // how far (m) it rises as it settles in
  // THRIVE: a calm, bright, steady glow with a barely-there breath so it feels alive.
  THRIVE_GLOW: 0.95,
  THRIVE_PULSE_AMP: 0.07, // tiny breathing on top of the steady glow
  THRIVE_PULSE_HZ: 0.28,  // slow (cycles per second)
  // NEUTRAL: "runs quietly" — a plain steady mid glow, no motion.
  NEUTRAL_GLOW: 0.45,
  // STRUGGLE: dim, with a slow, uneven flicker that never strobes.
  STRUGGLE_GLOW_MIN: 0.07,
  STRUGGLE_GLOW_MAX: 0.34,
  FLICKER_HZ_A: 0.5,      // primary slow wobble (cycles per second)
  FLICKER_HZ_B: 0.27,     // secondary wobble, so the dimming feels uneven not metronomic
  // Data flowing along the cables: small lights that travel end to end and loop.
  FLOW_DOTS: 4,
  FLOW_DOT_R: 0.02,
  FLOW_SPEED_THRIVE: 0.5,    // cable-lengths per second (smooth, healthy)
  FLOW_SPEED_NEUTRAL: 0.1,   // a slow, quiet trickle
  FLOW_SPEED_STRUGGLE: 0.12, // a crawl that stalls on the flicker's low points
  FLOW_GLOW_THRIVE: 1.0,
  FLOW_GLOW_NEUTRAL: 0.4,
  FLOW_GLOW_STRUGGLE: 0.28,
  WORKER_BOB_HZ: 0.6,        // tiny idle bob for workers when the center is thriving
  WORKER_BOB_AMP: 0.02,
};

// ============================================================================
// TECH OFFICE — BUILD LAYOUT  (the data center that assembles on the lot)
// Where each piece sits on the construction lot in front of the student, plus
// the palette. Positions are world coords (the staging group sits at the scene
// origin). The lot is centered ahead and a little below eye line, beyond the
// decision cards, so the student watches it come together as they choose.
// ============================================================================
const TECH_BUILD = {
  FORWARD: 1.8,           // shift the whole build toward the student so it reads big and clear
  LOT: [0, 0.64, -0.85] as [number, number, number], // lot/table-top center (its own local frame)
  LOT_W: 2.9,
  LOT_D: 2.5,
  LOT_THICK: 0.12,        // the build sits on a table at this height so it clears the floating UI
  BLD_POS: [-0.35, 0, -0.95] as [number, number, number], // building footprint center
  BLD_W: 0.95,
  BLD_H: 0.78,
  BLD_D: 1.0,
  TRANSFORMER_POS: [0.6, 0, -0.7] as [number, number, number],
  SOLAR_POS: [1.05, 0, -1.25] as [number, number, number],
  NODE_POS: [-1.3, 0, -0.85] as [number, number, number], // the internet node (a little cloud on a post)
  COLOR: {
    pad: "#3a4b5c",
    wall: "#cdd7df",
    roof: "#8b97a3",
    window: "#46e0f0",
    transformer: "#6b7682",
    bushing: "#9aa6b0",
    indicator: "#ffce54",
    pole: "#54606b",
    line: "#2c3a47",
    solar: "#1b3a6b",
    solarGleam: "#6fd6ff",
    cloud: "#e3eaf0",
    nodeGlow: "#7fe6ff",
    vest: "#f0883c",
    helmet: "#ffd23f",
    grass: "#5fae4a",
    dirt: "#b9a77e",
    concrete: "#9aa3ab",
    tree: "#6f5436",
    leaf: "#4f9a43",
    flow: "#8af3ff",
  },
};

// ============================================================================
// TECH OFFICE — SERVER ROOM  (the place the build sits inside)
// A calm server room wrapped AROUND the build: two rows of tall cabinets to the
// sides and behind, a back wall with data screens. Every prop sits beyond the
// build's sides (|x| > the table) and behind its front edge, so the room never
// crosses in front of the decision panels (z ~3.3) or the build (z ~0.95). The
// motion values are all slow on purpose (gentle blink + scroll, never a strobe).
// ============================================================================
const TECH_ROOM = {
  FLOOR: "#28333f",       // cool slate floor
  WALL: "#2b3a4a",        // cool blue-gray walls
  CAB: "#1c2632",         // server cabinet body
  CAB2: "#212e3c",        // alternate cabinet body, so rows are not flat
  CAP: "#3b5168",         // cabinet top trim / screen bezel
  DOT_CYAN: "#37d0e6",
  DOT_GREEN: "#49e0a3",
  DOT_AMBER: "#ffce54",
  SCREEN_BG: "#0e2230",   // dark screen background
  SCREEN_A: "#37d0e6",    // breathing data bars
  SCREEN_B: "#49e0a3",    // scrolling log lines
  ROW_X: 2.7,             // |x| of each cabinet row (build table half-width is ~1.45)
  ROW_Z: [-1.0, -2.5, -4.0], // cabinets recede toward the back wall
  CAB_W: 0.9,
  CAB_H: 2.2,
  CAB_D: 0.7,
  WALL_Z: -5.2,           // back wall, well behind everything
  SCREEN_X: 1.7,          // |x| of the two back-wall screens (inside the rows)
  SCREEN_Y: 1.78,         // height of the screen centers
  BLINK_HZ: [0.18, 0.26, 0.34], // a few slow blink rates, staggered across the dots
  BAR_HZ: 0.3,            // how fast the screen bars breathe (cycles/sec)
  SCROLL_SPEED: 0.12,     // m/s the screen log-lines drift upward
};

// ============================================================================
// TOURISM HUB — BUILD LAYOUT  (the historic village that assembles on the green)
// The student arrives to a small Colonial Williamsburg site (a raised green with
// two brick buildings already standing) and, choice by choice, adds a ticket booth
// with its crowd, an attraction, and finally the site's condition. Positions are
// local to the staging group (which sits at the scene origin and is shifted FORWARD
// toward the student, exactly like the Tech lot). The crowd COUNTS per option carry
// the "bustling vs empty" story. Palette is the warm colonial parchment look. All
// motion is slow and gentle on purpose (kids in a headset) — tuned via STAGING.
// ============================================================================
const TOURISM_BUILD = {
  FORWARD: 1.8,            // bring the whole village toward the student (matches Tech)
  GREEN: [0, 0.64, -0.85] as [number, number, number], // green/table-top center (own frame)
  GREEN_W: 2.9,
  GREEN_D: 2.5,
  GREEN_THICK: 0.12,       // the village sits on a raised green so it clears the floating UI
  // two colonial buildings, present from arrival (the site you already run).
  HALL_POS: [-0.55, 0, -1.0] as [number, number, number], // main brick hall + cupola
  HALL_W: 0.95, HALL_H: 0.62, HALL_D: 0.85,
  HOUSE_POS: [0.6, 0, -1.2] as [number, number, number],  // a smaller brick house
  HOUSE_W: 0.6, HOUSE_H: 0.46, HOUSE_D: 0.6,
  BOOTH_POS: [1.0, 0, 0.2] as [number, number, number],   // ticket booth near the entrance
  ATTRACT_POS: [-0.15, 0, -0.35] as [number, number, number], // attraction sits center-green
  // crowd cluster anchors (loose clusters of visitors); the COUNTS come from the picks.
  CROWD_BOOTH_AT: [0.45, 0, -0.2] as [number, number, number],
  CROWD_ATTRACT_AT: [-0.4, 0, 0.0] as [number, number, number],
  CROWD_SITE_AT: [0.1, 0, 0.15] as [number, number, number],
  // how many visitors each option draws (index matches the option order in the pack).
  CROWD_BOOTH_N: [7, 5, 2],    // D1 pricing: free=large, fair=healthy, very high=sparse
  CROWD_ATTRACT_N: [0, 5, 4],  // D2 draw:   do nothing=none, authentic=more, flashy=a crowd
  CROWD_SITE_N: [6, 5, 1],     // D3 crowds: huge=lots, smart limits=steady, close off=thin
  COLOR: {
    green: "#6aa84f",       // grassy green
    path: "#d8c79e",        // sandy path
    brick: "#9c4a2f",       // colonial brick red
    trim: "#f2efe6",        // white trim
    roof: "#6b4a30",        // wood shingle brown
    cupola: "#f4f1e8",      // white cupola
    spire: "#caa24a",       // gold spire (colonial gold)
    window: "#ffd98a",      // warm lamp-lit windows (the buildings' lit parts, role "site")
    boothWood: "#8a6a44",
    boothRoof: "#7a4a2c",
    lantern: "#ffcf6b",     // booth lantern + sign (lit, role "booth")
    banner: "#3b5f8a",      // colonial blue banner
    exhibit: "#a9824e",     // wood craft / exhibit table
    barrel: "#7c5a36",
    gaudy1: "#ff3fb0",      // garish neon pink (flashy fake attraction)
    gaudy2: "#46e0ff",      // garish neon cyan
    gaudy3: "#ffe14a",      // garish neon yellow
    signPost: "#7c6a52",
    visitor: "#4f63a6",     // visitor clothing (muted colonial blue)
    visitorAlt: "#8a5b86",  // a second visitor color for variety
    visitorAlt2: "#b07a3c", // a third visitor color
    head: "#e6c39e",        // visitor head / skin
    worn: "#6f675c",        // dingy worn patches on damaged buildings
    cleanGleam: "#fff3c8",  // a fresh, well-kept sparkle (lit, role "site")
    rope: "#caa24a",        // closed-off ropes / barriers (lit, role "site")
    post: "#5b4a36",        // green table legs + rope posts
  },
};

// ============================================================================
// TOURISM HUB — VILLAGE BACKDROP  (the calm Colonial Williamsburg town around the
// build, the outdoor counterpart to the Tech Office server room). A green/lawn, a
// few primitive colonial buildings lining the sides and back, a low white rail
// fence, a sandy path, trees, a flag, a well, and a few slow distant visitors.
// Warm daytime palette. CLEARANCE RULE: nothing tall sits in the central corridor
// in front of the build — buildings/trees stay at |x| >= CLEAR_X unless they are
// safely behind the build (z <= BACK_Z). Low props (the 0.34m fence, the short
// visitors) only need to clear the build's footprint (|x| > ~1.8); they are too
// low to hide the panels (which also draw on top via depthTest off). All motion is
// slow and runs on the shared scene setInterval (never rAF). Tunable here.
// ============================================================================
const TOURISM_VILLAGE = {
  GROUND_Y: -0.06,        // grass top, a touch below the standing floor
  CLEAR_X: 3.0,           // tall props keep |x| >= this (clear of the central corridor)
  BACK_Z: -3.6,           // ...unless they sit behind the build at z <= this
  FENCE_H: 0.34,          // low rail fence height (never blocks anything)
  // gentle motion (cycles/sec + small amplitudes). Slow on purpose; nothing flashes.
  FLAG_HZ: 0.3, FLAG_SWING: 0.1,
  TREE_HZ: 0.12, TREE_SWAY: 0.04,
  VISITOR_HZ: 0.5, VISITOR_BOB: 0.02, VISITOR_SWAY: 0.05,
  COLOR: {
    grass: "#6aa84f",
    path: "#d8c79e",
    brickA: "#9c4a2f",      // brick-red house
    brickB: "#b06a4a",      // a lighter brick
    clapboardA: "#e7dcc2",  // cream clapboard
    clapboardB: "#cdd8c0",  // pale sage clapboard
    roofA: "#6b4a30",       // brown shingle
    roofB: "#7a6a58",       // weathered grey shingle
    trim: "#f4efe3",        // white trim band
    door: "#5b3a26",        // dark wood door
    window: "#bcd2e0",      // pale daylight glass (NOT emissive, so it never glows/flashes)
    chimney: "#8a5440",
    cupola: "#f4f1e8",      // white meeting-house cupola
    spire: "#caa24a",       // gold spire
    fence: "#efe9da",       // white rail fence
    flagpole: "#6b5036",
    banner: "#3b5f8a",      // colonial blue flag
    trunk: "#6b4f30",
    leaf: "#4f8f43",
    visitor: "#5566a0",     // distant villager clothing
    visitorAlt: "#9a6a8c",
    head: "#e6c39e",
    wellStone: "#9a958c",
    wellRoof: "#6b4a30",
  },
  // colonial buildings lining the green: [x, z, w, h, d, wallKey, roofKey, kind].
  // kind: "house" or "meeting" (+ cupola & gold spire). Each obeys the clearance rule.
  HOUSES: [
    [-3.5, -0.3, 1.1, 0.95, 1.0, "brickA", "roofA", "house"],
    [-3.9, -2.0, 1.0, 0.8, 0.95, "clapboardA", "roofB", "house"],
    [-3.6, 1.3, 0.95, 0.78, 0.9, "clapboardB", "roofA", "house"],
    [3.5, -0.3, 1.1, 0.95, 1.0, "clapboardA", "roofA", "house"],
    [3.9, -2.0, 1.0, 0.85, 0.95, "brickB", "roofB", "house"],
    [3.6, 1.3, 0.95, 0.78, 0.9, "brickA", "roofA", "house"],
    [-1.5, -4.7, 1.3, 1.0, 1.1, "brickA", "roofA", "meeting"], // back row, behind the build
    [1.7, -4.9, 1.1, 0.85, 1.0, "clapboardB", "roofB", "house"],
  ] as [number, number, number, number, number, string, string, string][],
  // simple far rooftops for a town skyline (body + roof only), well behind everything.
  FAR_ROOFS: [[-2.6, -6.6], [0.6, -7.0], [2.9, -6.6]] as [number, number][],
  // a few trees framing the green (sides/back only).
  TREES: [
    [-4.9, -1.1, 1.1], [-4.7, 0.9, 0.95], [4.9, -1.1, 1.1], [4.7, 0.9, 0.95],
    [-2.7, -5.0, 1.0], [2.9, -5.0, 1.0], [0.0, -5.5, 1.2],
  ] as [number, number, number][],
  // low white rail fences lining the green: [x, z, length, axis] (axis "x" or "z").
  FENCES: [
    [-2.4, -0.8, 4.4, "z"], [2.4, -0.8, 4.4, "z"], [0.0, -3.2, 4.6, "x"],
  ] as [number, number, number, string][],
  // a few distant visitors strolling the green edges: [x, z, colorKey].
  VISITORS: [
    [-2.5, -0.9, "visitor"], [-2.7, 0.5, "visitorAlt"], [2.5, -0.9, "visitorAlt"],
    [2.7, 0.6, "visitor"], [-2.4, -2.2, "visitor"], [2.4, -2.4, "visitorAlt"],
  ] as [number, number, string][],
  FLAG_POS: [-2.1, 0, -2.9] as [number, number, number], // flagpole on the green, behind the build
  WELL_POS: [1.6, 0, -2.7] as [number, number, number],  // a colonial well, behind the build
};

// ============================================================================
// MODERN FARM — BUILD LAYOUT  (the field that assembles on the plot ahead)
// The student arrives to a tilled, empty field plot (a raised soil bed, so it
// clears the floating UI exactly like the Tech lot and Tourism green) and, choice
// by choice, plants the crops, adds the watering tech, and brings in the harvest.
// Positions are local to the staging group (shifted FORWARD toward the student).
// The crop GRID and the swappable per-pick cues carry the "smart vs wasteful"
// story. Warm valley palette. All motion stays slow and gentle (kids in a headset);
// the actual blink/glow rates live in STAGING so the comfort rules sit in one place.
// ============================================================================
const FARM_BUILD = {
  FORWARD: 1.8,            // bring the whole field toward the student (matches Tech/Tourism)
  PLOT: [0, 0.64, -0.85] as [number, number, number], // plot/table-top center (own frame)
  PLOT_W: 2.9,
  PLOT_D: 2.5,
  PLOT_THICK: 0.12,        // the field sits on a raised plot so it clears the floating UI
  SOIL_W: 2.5,             // tilled soil bed on top of the plot
  SOIL_D: 1.9,
  SOIL_THICK: 0.05,
  SOIL_Z: -0.9,            // soil center z on the plot top (own frame)
  // the crop field: a tidy grid of plant clumps. Columns run across (x), rows
  // recede toward the back (z). The hand/crowded cues reuse these anchors, jittered.
  ROWS: 4,
  PER_ROW: 6,
  COL_X0: -1.0, COL_DX: 0.4,   // clump x = COL_X0 + col*COL_DX  (spans -1.0..1.0)
  ROW_Z0: -1.55, ROW_DZ: 0.36, // clump z = ROW_Z0 + row*ROW_DZ  (recedes to the back)
  PLANT_H: 0.18,           // a healthy plant's height
  DRONE_HOVER_Y: 0.7,      // sensor drone height above the soil top
  DRONE_SWEEP: 0.85,       // how far (m) the drone sweeps side to side over the field
  DRONE_SWEEP_HZ: 0.16,    // slow sweep (cycles/sec) — calm, never darting
  HARVEST_Z: -0.05,        // the harvest payoff sits at the front edge, toward "market"
  COLOR: {
    plot: "#6b4a2c",       // wooden plot frame / legs
    soil: "#5b4128",       // dark tilled soil
    crop: "#5fae4a",       // healthy crop green (matches the farm-green stop color)
    cropChoke: "#8a9a3e",  // yellowed, choking crop (the overcrowded pick)
    stem: "#3f7a32",
    drone: "#d7dde2",      // drone body (light grey)
    droneTrim: "#3a4650",
    sensor: "#6fe0ff",     // drone sensor beam glow (lit, role "water")
    greened: "#7fe06a",    // a freshly-greened dry spot (lit, role "water")
    sprinkler: "#8b97a3",  // sprinkler post / head
    puddle: "#4a8fc0",     // standing, wasted water (lit, role "water")
    wilt: "#9a8a3c",       // a drooping, sickly plant (lit, role "water")
    harvester: "#e0a52c",  // harvester body (farm yellow)
    harvesterTrim: "#c2451f",
    cab: "#2f3a44",        // dark cab glass
    produce: "#e3b94a",    // golden harvested produce (lit, role "harvest")
    bruised: "#7a6a4a",    // dull, bruised low-quality produce (lit, role "harvest")
    truck: "#4a6f9a",      // market truck body
    truckBed: "#6b5236",
    headlight: "#fff2c0",  // truck marker light (lit, role "harvest")
    stand: "#8a6a44",      // small local stand wood
    standRoof: "#7a4a2c",
    standSign: "#ffcf6b",  // stand lantern/sign (lit, role "harvest")
    crate: "#9c6b3f",      // produce crates
    wheel: "#23282d",
  },
};

// ============================================================================
// MODERN FARM — VALLEY BACKDROP  (the calm Shenandoah Valley around the build,
// the outdoor counterpart to the Tech Office server room and the Tourism village).
// Rolling green fields, the Blue Ridge mountains hazing the horizon, a red barn +
// silo, a slowly-turning windmill, split-rail fences, hay bales, trees, and a few
// drifting clouds. The barn echoes the hub landmark's colors. CLEARANCE RULE: tall
// props stay at |x| >= CLEAR_X unless safely behind the build at z <= BACK_Z; low
// props (the 0.36m fence, hay bales) only need to clear the build footprint. All
// motion is slow and runs on the shared scene setInterval (never rAF). Tunable here.
// ============================================================================
const FARM_VALLEY = {
  GROUND_Y: -0.06,        // grass top, a touch below the standing floor
  CLEAR_X: 3.0,           // tall props keep |x| >= this (clear of the central corridor)
  BACK_Z: -3.6,           // ...unless they sit behind the build at z <= this
  FENCE_H: 0.36,          // low split-rail fence height (never blocks anything)
  // gentle motion (cycles/sec + small amplitudes). Slow on purpose; nothing flashes.
  WINDMILL_HZ: 0.06,      // slow blade spin
  CLOUD_HZ: 0.015, CLOUD_DRIFT: 0.5,   // very slow cloud drift (m) before it loops
  CROP_HZ: 0.12, CROP_SWAY: 0.025,     // distant cropland stripes sway
  TREE_HZ: 0.12, TREE_SWAY: 0.04,
  COLOR: {
    grass: "#7bb24a",       // valley green underfoot
    field: "#c8b25a",       // golden distant cropland
    fieldAlt: "#9bbf52",    // green distant cropland
    path: "#cdb98a",        // dirt lane
    barn: "#bd3b2c",        // matches the hub Red Barn landmark
    barnRoof: "#7c241a",
    barnTrim: "#f1e7d0",
    silo: "#d8d2c4",
    siloCap: "#b9b1a0",
    ridgeNear: "#6f86a8",   // Blue Ridge (nearer, a touch darker)
    ridgeFar: "#8fa2bd",    // Blue Ridge (farther, hazier)
    trunk: "#6b4f30",
    leaf: "#4f8f43",
    fence: "#caa877",       // split-rail wood fence (farm, not white)
    hay: "#d8b552",         // round hay bale
    windmillTower: "#9aa0a6",
    windmillBlade: "#e7e2d4",
    cloud: "#f3f1ea",
    hill: "#5f9e44",        // rolling green hill (a touch deeper than the lawn, for depth)
    hillAlt: "#6fab4e",     // a second hill green, so neighbouring swells read apart
  },
  // Blue Ridge silhouette: wide, low, rounded ridges far behind everything.
  // [x, z, width, height, colorKey]
  RIDGES: [
    [-2.8, -8.6, 7.2, 2.4, "ridgeFar"],
    [2.6, -8.9, 7.6, 2.7, "ridgeFar"],
    [-1.0, -7.6, 6.2, 1.9, "ridgeNear"],
    [3.4, -7.4, 5.6, 1.7, "ridgeNear"],
  ] as [number, number, number, number, string][],
  // ROLLING GREEN HILLS rising between the valley floor and the Blue Ridge: wide,
  // low, rounded green swells (the same flattened-sphere trick as the ridges). ALL
  // sit well behind the build (z <= BACK_Z), so they never enter the central
  // corridor in front of the panels / build / field. [x, z, width, height, colorKey]
  HILLS: [
    [-0.2, -8.0, 7.4, 1.3, "hillAlt"],
    [0.2, -6.6, 6.4, 0.95, "hill"],
    [-3.5, -5.3, 4.4, 0.78, "hillAlt"],
    [3.6, -5.5, 4.6, 0.82, "hill"],
  ] as [number, number, number, number, string][],
  // distant cropland stripes (low wide slabs that gently sway): [x, z, w, d, colorKey].
  FIELDS: [
    [-4.2, -4.6, 3.0, 2.2, "field"], [4.2, -4.6, 3.0, 2.2, "fieldAlt"],
    [-3.6, -6.0, 3.4, 1.6, "fieldAlt"], [3.6, -6.0, 3.4, 1.6, "field"],
    [0.0, -6.4, 3.2, 1.4, "field"],
  ] as [number, number, number, number, string][],
  // trees framing the valley (sides/back only, per the clearance rule): [x, z, scale].
  TREES: [
    [-4.9, -1.2, 1.1], [-4.6, 1.0, 0.95], [4.9, -1.2, 1.1], [4.6, 1.0, 0.95],
    [-2.8, -5.0, 1.0], [2.9, -5.0, 1.0],
  ] as [number, number, number][],
  // low split-rail fences lining the field: [x, z, length, axis] (axis "x" or "z").
  FENCES: [
    [-2.5, -0.6, 4.6, "z"], [2.5, -0.6, 4.6, "z"], [0.0, -3.4, 4.8, "x"],
  ] as [number, number, number, string][],
  // round hay bales dotting the field edges (low, only clear the footprint): [x, z, scale].
  HAY_BALES: [
    [-2.7, 0.7, 1.0], [2.6, 0.8, 1.1], [-2.4, -2.0, 0.9], [2.5, -2.2, 1.0],
  ] as [number, number, number][],
  // a few slow drifting clouds: [x, y, z, scale].
  CLOUDS: [
    [-2.0, 4.0, -7.0, 1.2], [1.6, 4.4, -8.0, 1.5], [3.6, 4.1, -6.4, 1.0],
  ] as [number, number, number, number][],
  BARN_POS: [-3.8, 0, -1.2] as [number, number, number],   // red barn to the left
  SILO_POS: [-3.0, 0, -1.7] as [number, number, number],   // silo beside the barn
  WINDMILL_POS: [3.6, 0, -1.7] as [number, number, number], // a wind pump to the right
};

// ============================================================================
// PORT OF VIRGINIA  —  the signature stop's custom container-loading game (NOT a
// decision pack). Three docked ships, each a destination + color; a dock shelf of
// color-coded containers the student grabs (distance grab, the same ray they
// already point with) and releases onto the matching ship. A correct ship loads
// it with a happy cue; the wrong ship gently refuses and the container drifts
// back to the dock. No choice ever fails. All positions are WORLD coordinates
// (the student spawns near z = +7 and looks toward -z, so smaller z is farther
// out over the water). The game reads ONLY this block; timers, the conveyor, and
// real scoring arrive in later prompts.
// ============================================================================
const PORT = {
  TICK_MS: 33,                 // every port loop runs on setInterval (rAF pauses in headset)
  // ---- the three ships: a row across the dock on a gentle arc, each carrying a
  // destination and a color. key drives BOTH the ship color and the matching
  // container color, so the two can never drift apart.
  SHIPS: [
    { key: "europe", label: "EUROPE",        color: "#2f7fd0", pos: [-1.7, 0.0, 4.35] }, // blue
    { key: "asia",   label: "ASIA",          color: "#d23b30", pos: [ 0.0, 0.0, 4.0 ] }, // red
    { key: "usa",    label: "UNITED STATES", color: "#3fa64a", pos: [ 1.7, 0.0, 4.35] }, // green
  ] as { key: string; label: string; color: string; pos: [number, number, number] }[],
  SHIP_HULL_W: 1.5, SHIP_HULL_H: 0.55, SHIP_HULL_D: 0.95,  // low-poly hull box
  DECK_Y: 0.72,                // world y of the deck top (where a loaded box would sit)
  WATER_Y: 0.05,              // harbor water top (the ships sit in it)
  BOB_HZ: 0.16, BOB_AMP: 0.03, // a very gentle ship bob (slow; nothing lurches)
  PULSE_FALL: 0.06,            // how fast the "loaded!" gold glow on a ship eases away
  // ---- each ship's drop zone: a generous box (really an angular sector) so a
  // released container near the right ship loads even when the aim is a little off.
  ZONE_W: 1.5, ZONE_H: 1.9,  // X width picks WHICH ship; Y is a loose drop window (Z is not gated)
  ZONE_CENTER_Y: 0.95,
  // ---- the container supply: a fixed handful on a dock shelf in front of the
  // student that recycles, so a few are always available (the conveyor comes later).
  CONTAINER: 0.34,            // container cube size (m)
  SLOTS: [                    // dock-shelf slots (world pos), in easy view ahead of the spawn
    [-1.5, 1.0, 5.6], [-0.75, 1.0, 5.6], [0.0, 1.0, 5.6], [0.75, 1.0, 5.6], [1.5, 1.0, 5.6],
  ] as [number, number, number][],
  SHELF_Y: 0.78, SHELF_W: 3.9, SHELF_D: 0.74, SHELF_Z: 5.6,  // plank shelf the resting containers sit on
  START_COLORS: ["europe", "asia", "usa", "asia", "europe"], // a spread of all three to begin
  REFILL_CYCLE: ["usa", "europe", "asia"],                   // refill an emptied slot, cycling colors
  PARK_Y: -100,              // a loaded container parks far below the world: invisible AND out of any aim
  // ---- distance-grab feel: the held container floats this far out along the aim,
  // about the dock-to-ship distance, so pointing at a ship carries it onto that ship.
  GRAB_REACH: 2.7,           // targetPositionOffset distance (m in front of the controller)
  GRAB_SPEED: 0.5,           // how briskly the held container tracks the aim (0..1)
  RETURN_MS: 280,            // a wrong / empty drop eases back to its shelf slot over this
  REFILL_MS: 460,            // a beat after a load before a fresh container appears in the slot
  TINT_FALL: 0.05,           // how fast the red "wrong ship" blink on a container fades
  // ---- the dock + harbor backdrop ----
  DOCK_COLOR: "#9c7b4f", DOCK_TRIM: "#7d6038", PILING: "#5e4a30",
  WATER_COLOR: "#2b6c8f", WATER_SHIMMER: 0.1, WATER_HZ: 0.05,
  CRANE: "#c8543a", CRANE_LEG: "#9a9ea3",   // distant dock cranes, harbor flavor only
  // ---- the TEMPORARY debug count readout (replaced by real scoring later) ----
  DEBUG_POS: [-2.35, 2.25, 4.9] as [number, number, number],
  DEBUG_W: 1.15, DEBUG_H: 0.92,
};

// ============================================================================
// HOUSE PALETTE  (the Market Harvest colonial parchment look)
// Bright values are for graphics (bars). The TEXT_ values are darker,
// high-contrast versions for words on light backgrounds.
// ============================================================================
const COLOR_NAVY = "#1F3A5F";
const TEXT_GOLD = "#8a6118";
const TEXT_GREEN = "#2e7d32";
const TEXT_BLUE = "#1e5fa8";
const TEXT_CORAL = "#a23a1c";
const METER_SATISFACTION_COLOR = "#ee7a4f"; // Customer Satisfaction bar (coral)
const METER_PROFIT_COLOR = "#5fae4a";       // Business Profit bar (green)
const METER_INSTINCT_COLOR = "#3f9fd0";     // Owner's Instinct bar (blue)

// ============================================================================
// THREE METERS  (each starts at 50, the neutral middle, and moves 0..100)
// ============================================================================
const SCORE_MIN = 0;
const SCORE_MAX = 100;
let scoreSatisfaction = 50;
let scoreProfit = 50;
let scoreInstinct = 50;

// Which plan the player picked in each stage. The final money personality is
// decided from THESE choices, not just the meter numbers, so the report can
// never tell a spender they were a saver. Set when a plan card is clicked.
let stage1Choice = "";
let stage2Choice = "";
let stage3Choice = "";

function clampScore(value: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value));
}

// The one and only way to change a meter. meter is "satisfaction", "profit", or
// "instinct"; delta is positive to reward, negative to penalize.
function updateScore(meter: string, delta: number) {
  let before = 0;
  let after = 0;
  if (meter === "satisfaction") { before = scoreSatisfaction; after = clampScore(scoreSatisfaction + delta); scoreSatisfaction = after; }
  else if (meter === "profit") { before = scoreProfit; after = clampScore(scoreProfit + delta); scoreProfit = after; }
  else if (meter === "instinct") { before = scoreInstinct; after = clampScore(scoreInstinct + delta); scoreInstinct = after; }
  else { console.warn("updateScore: unknown meter " + meter); return; }
  console.log("[SCORE] " + meter + ": " + before + " to " + after);
  refreshHUD();
  if (meter === "satisfaction") bumpHudValue(hudSatisfactionValue);
  else if (meter === "profit") bumpHudValue(hudProfitValue);
  else bumpHudValue(hudInstinctValue);
}
void updateScore; // used by the stages in later prompts

// ============================================================================
// HUD  (a small panel pinned to the top-left, always showing the three meters)
// Built as a plain HTML overlay on top of the 3D canvas. pointerEvents is off
// so it never blocks a click. A matching 3D scoreboard for the headset is added
// with the panels in a later prompt.
// ============================================================================
let hudSatisfactionValue: HTMLElement | null = null;
let hudProfitValue: HTMLElement | null = null;
let hudInstinctValue: HTMLElement | null = null;
let hudSatisfactionFill: HTMLElement | null = null;
let hudProfitFill: HTMLElement | null = null;
let hudInstinctFill: HTMLElement | null = null;
let hudStageChip: HTMLElement | null = null;
let hudObjective: HTMLElement | null = null;
let hudPanel: HTMLElement | null = null;

function makeHudMeter(label: string, barColor: string, textColor: string) {
  const row = document.createElement("div");
  row.style.marginBottom = "9px";

  // The label sits on its own line, so a long name like "Customer Satisfaction"
  // gets the full width and is never clipped. The bar and number go below it.
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.color = COLOR_NAVY;
  labelEl.style.fontWeight = "700";
  labelEl.style.fontSize = "12.5px";
  labelEl.style.display = "block";
  labelEl.style.marginBottom = "4px";

  const barRow = document.createElement("div");
  barRow.style.display = "flex";
  barRow.style.alignItems = "center";
  barRow.style.gap = "8px";

  const track = document.createElement("div");
  track.style.width = "120px";
  track.style.height = "12px";
  track.style.background = "#e4ddd0";
  track.style.borderRadius = "6px";
  track.style.overflow = "hidden";
  track.style.flexShrink = "0";

  const fill = document.createElement("div");
  fill.style.height = "100%";
  fill.style.width = "50%";
  fill.style.background = barColor;
  fill.style.borderRadius = "6px";
  fill.style.transition = "width 0.45s ease";
  track.appendChild(fill);

  const value = document.createElement("span");
  value.textContent = "50";
  value.style.color = textColor;
  value.style.fontWeight = "800";
  value.style.minWidth = "26px";
  value.style.textAlign = "right";
  value.style.transition = "transform 0.18s ease";

  barRow.appendChild(track);
  barRow.appendChild(value);
  row.appendChild(labelEl);
  row.appendChild(barRow);
  return { row, value, fill };
}

// Turn a #rrggbb color into a see-through rgba string, so the overlay keeps
// its soft translucent look instead of becoming a solid block.
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

// Tint the corner overlay to the active shop: a translucent version of the
// shop's panel color, with the shop's border. The bars, money, and text keep
// their own colors.
function applyShopHudTheme(pack: ShopPack) {
  if (!hudPanel) return;
  hudPanel.style.background = hexToRgba(pack.theme.panelBg, 0.95);
  hudPanel.style.border = "2px solid " + pack.theme.panelBorder;
}

// Show a counter activity's meter changes in its result: one short line per
// meter that moved, green for a gain and red for a drop. Unchanged meters stay
// hidden. Shared by all three activities.
const DELTA_UP = "#2e7d32";
const DELTA_DOWN = "#b23a2e";

function setMeterChange(doc: any, id: string, label: string, delta: number) {
  const el = doc.getElementById(id);
  if (!el) return;
  if (!delta) {
    el.setProperties({ display: "none" });
    return;
  }
  el.setProperties({
    text: label + "   " + (delta > 0 ? "+" : "") + delta,
    color: delta > 0 ? DELTA_UP : DELTA_DOWN,
    display: "flex",
  });
}

function showMeterChanges(doc: any, sat: number, profit: number, instinct: number) {
  setMeterChange(doc, "change-sat", "Customer Satisfaction", sat);
  setMeterChange(doc, "change-profit", "Business Profit", profit);
  setMeterChange(doc, "change-instinct", "Owner's Instinct", instinct);
  flashHudDeltas(sat, profit, instinct);
}

// Desktop HUD: a small +/- badge beside each meter's number that flashes the
// change from a counter activity (green up, red down) and fades. These are
// on-screen DOM elements, so they appear on the laptop and are unused in the
// headset, where the floating dashboard already shows the meters.
let hudDeltaSat: HTMLElement | null = null;
let hudDeltaProfit: HTMLElement | null = null;
let hudDeltaInstinct: HTMLElement | null = null;

function makeDeltaBadge(valueEl: HTMLElement | null): HTMLElement | null {
  if (!valueEl) return null;
  const badge = document.createElement("span");
  badge.style.marginLeft = "8px";
  badge.style.fontWeight = "700";
  badge.style.fontSize = "13px";
  badge.style.opacity = "0";
  badge.style.transition = "opacity 0.3s ease";
  valueEl.insertAdjacentElement("afterend", badge);
  return badge;
}

function setupHudDeltas() {
  hudDeltaSat = makeDeltaBadge(hudSatisfactionValue);
  hudDeltaProfit = makeDeltaBadge(hudProfitValue);
  hudDeltaInstinct = makeDeltaBadge(hudInstinctValue);
}

function flashOneDelta(badge: HTMLElement | null, delta: number) {
  if (!badge) return;
  if (!delta) {
    badge.style.opacity = "0";
    return;
  }
  badge.textContent = (delta > 0 ? "+" : "") + delta;
  badge.style.color = delta > 0 ? "#2e7d32" : "#b23a2e";
  badge.style.opacity = "1";
  window.setTimeout(function () {
    badge.style.opacity = "0";
  }, 1800);
}

function flashHudDeltas(sat: number, profit: number, instinct: number) {
  flashOneDelta(hudDeltaSat, sat);
  flashOneDelta(hudDeltaProfit, profit);
  flashOneDelta(hudDeltaInstinct, instinct);
}

function createHUD() {
  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.top = "16px";
  hud.style.left = "16px";
  hud.style.zIndex = "1000";
  hud.style.background = "rgba(255, 252, 244, 0.95)";
  hud.style.padding = "12px 16px 10px";
  hud.style.borderRadius = "14px";
  hud.style.border = "2px solid " + COLOR_NAVY;
  hud.style.fontFamily = "system-ui, sans-serif";
  hud.style.fontSize = "14px";
  hud.style.boxShadow = "0 4px 14px rgba(31, 58, 95, 0.3)";
  hud.style.pointerEvents = "none";
  hudPanel = hud; // remember the panel so we can recolor it per shop

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";
  header.style.marginBottom = "8px";

  const title = document.createElement("span");
  title.textContent = "Boss for a Day";
  title.style.color = COLOR_NAVY;
  title.style.fontWeight = "800";
  title.style.fontSize = "15px";

  hudStageChip = document.createElement("span");
  hudStageChip.textContent = "Getting Ready";
  hudStageChip.style.background = TEXT_GREEN;
  hudStageChip.style.color = "#ffffff";
  hudStageChip.style.fontWeight = "700";
  hudStageChip.style.fontSize = "12px";
  hudStageChip.style.padding = "2px 10px";
  hudStageChip.style.borderRadius = "10px";

  header.appendChild(title);
  header.appendChild(hudStageChip);
  hud.appendChild(header);

  const moneyRow = buildMoneyRow();
  hud.appendChild(moneyRow);

  const satisfactionRow = makeHudMeter("Customer Satisfaction", METER_SATISFACTION_COLOR, TEXT_CORAL);
  const profitRow       = makeHudMeter("Business Profit", METER_PROFIT_COLOR, TEXT_GREEN);
  const instinctRow     = makeHudMeter("Owner's Instinct", METER_INSTINCT_COLOR, TEXT_BLUE);

  hudSatisfactionValue = satisfactionRow.value;
  hudProfitValue = profitRow.value;
  hudInstinctValue = instinctRow.value;
  hudSatisfactionFill = satisfactionRow.fill;
  hudProfitFill = profitRow.fill;
  hudInstinctFill = instinctRow.fill;

  hud.appendChild(satisfactionRow.row);
  hud.appendChild(profitRow.row);
  hud.appendChild(instinctRow.row);

  hudObjective = document.createElement("div");
  hudObjective.textContent = "";
  hudObjective.style.marginTop = "8px";
  hudObjective.style.background = TEXT_GOLD;
  hudObjective.style.color = "#ffffff";
  hudObjective.style.fontWeight = "800";
  hudObjective.style.fontSize = "13px";
  hudObjective.style.padding = "6px 10px";
  hudObjective.style.borderRadius = "10px";
  hudObjective.style.maxWidth = "260px";
  hudObjective.style.display = "none";
  hud.appendChild(hudObjective);

  document.body.appendChild(hud);
  refreshHUD();
}

// Push the current numbers and bar widths into the HUD.
function refreshHUD() {
  if (hudSatisfactionValue) hudSatisfactionValue.textContent = String(Math.round(scoreSatisfaction));
  if (hudProfitValue) hudProfitValue.textContent = String(Math.round(scoreProfit));
  if (hudInstinctValue) hudInstinctValue.textContent = String(Math.round(scoreInstinct));
  if (hudSatisfactionFill) hudSatisfactionFill.style.width = scoreSatisfaction + "%";
  if (hudProfitFill) hudProfitFill.style.width = scoreProfit + "%";
  if (hudInstinctFill) hudInstinctFill.style.width = scoreInstinct + "%";
}

// ---- In-headset dashboard: keep its numbers in step with the game ----
// The follow loop calls this each tick while you are in the headset. It reads
// the same live numbers the corner overlay uses, and only pushes a value when
// it actually changed, so the panel is never redrawn for no reason.
let dashboardDoc: any = null;
const DASH_TRACK = 64; // must match the .track width in ui/dashboard.uikitml
let _lastSat = -1;
let _lastProf = -1;
let _lastInst = -1;
let _lastMoney = -1;
let _lastObjective = "";

function refreshVrDashboard() {
  if (!dashboardDoc) return;

  const sat = Math.round(scoreSatisfaction);
  if (sat !== _lastSat) {
    _lastSat = sat;
    const v = dashboardDoc.getElementById("dash-val-sat");
    if (v) v.setProperties({ text: String(sat) });
    const f = dashboardDoc.getElementById("dash-fill-sat");
    if (f) f.setProperties({ width: (DASH_TRACK * sat) / 100 });
  }

  const prof = Math.round(scoreProfit);
  if (prof !== _lastProf) {
    _lastProf = prof;
    const v = dashboardDoc.getElementById("dash-val-profit");
    if (v) v.setProperties({ text: String(prof) });
    const f = dashboardDoc.getElementById("dash-fill-profit");
    if (f) f.setProperties({ width: (DASH_TRACK * prof) / 100 });
  }

  const inst = Math.round(scoreInstinct);
  if (inst !== _lastInst) {
    _lastInst = inst;
    const v = dashboardDoc.getElementById("dash-val-instinct");
    if (v) v.setProperties({ text: String(inst) });
    const f = dashboardDoc.getElementById("dash-fill-instinct");
    if (f) f.setProperties({ width: (DASH_TRACK * inst) / 100 });
  }

  if (currentMoney !== _lastMoney) {
    _lastMoney = currentMoney;
    const m = dashboardDoc.getElementById("dash-money");
    if (m) m.setProperties({ text: "$" + currentMoney });
  }

  const obj =
    hudObjective && hudObjective.textContent
      ? hudObjective.textContent
      : "Running your shop.";
  if (obj !== _lastObjective) {
    _lastObjective = obj;
    const o = dashboardDoc.getElementById("dash-objective");
    if (o) o.setProperties({ text: obj });
  }
}

// A quick pop on a number that just changed.
function bumpHudValue(el: HTMLElement | null) {
  if (!el) return;
  el.style.transform = "scale(1.25)";
  setTimeout(function () { if (el) el.style.transform = "scale(1)"; }, 180);
}

// One short line telling the student what to do right now.
function setObjective(text: string) {
  if (hudObjective) {
    hudObjective.textContent = text ? "Goal: " + text : "";
    hudObjective.style.display = text ? "block" : "none";
  }
  console.log("[OBJECTIVE] " + text);
}

// Update the little stage label in the HUD header for each phase.
function setHudStage(phase: string) {
  if (!hudStageChip) return;
  let label = "Pick a Shop";
  if (phase === PHASE_MORNING) label = "Morning";
  else if (phase === PHASE_MIDDAY) label = "Midday";
  else if (phase === PHASE_AFTERNOON) label = "Afternoon";
  else if (phase === PHASE_CLOSE) label = "Daily Report";
  hudStageChip.textContent = label;
}

// ============================================================================
// MONEY READOUT  (a live "Your Money" number on the dashboard)
// A fresh amount each stage. setMoney() sets it when a stage begins. changeMoney()
// nudges it up or down as the student spends, saves, earns, or invests, counting
// to the new value and flashing green for a gain or red for a loss. The number
// lives in the HUD (a screen overlay), so it shows on a laptop. In the headset,
// the stage panels show the money where it changes.
// ============================================================================
let currentMoney = 0;
let moneyRowEl: HTMLElement | null = null;
let moneyValueEl: HTMLElement | null = null;
const MONEY_DOWN = "#a33b2a"; // rust red for a loss (green and gold reuse the palette)

// Build the "Your Money" row. createHUD() drops it in at the top of the panel.
function buildMoneyRow(): HTMLElement {
  const row = document.createElement("div");
  row.style.display = "none"; // hidden until a stage sets an amount
  row.style.alignItems = "center";
  row.style.justifyContent = "space-between";
  row.style.gap = "10px";
  row.style.margin = "2px 0 10px";
  row.style.padding = "7px 11px";
  row.style.background = "#fbf3dd";
  row.style.border = "1px solid #e8d6a8";
  row.style.borderRadius = "10px";

  const label = document.createElement("span");
  label.textContent = "Your Money";
  label.style.color = COLOR_NAVY;
  label.style.fontWeight = "800";
  label.style.fontSize = "13px";

  moneyValueEl = document.createElement("span");
  moneyValueEl.textContent = "$0";
  moneyValueEl.style.color = TEXT_GOLD;
  moneyValueEl.style.fontWeight = "800";
  moneyValueEl.style.fontSize = "20px";
  moneyValueEl.style.transition = "transform 0.16s ease, color 0.2s ease";

  row.appendChild(label);
  row.appendChild(moneyValueEl);
  moneyRowEl = row;
  return row;
}

function showMoneyRow() {
  if (moneyRowEl) moneyRowEl.style.display = "flex";
}
function hideMoneyRow() {
  if (moneyRowEl) moneyRowEl.style.display = "none";
}

// Set the money to a fresh amount (used when each stage begins). Instant, with a pop.
function setMoney(amount: number) {
  currentMoney = Math.max(0, Math.round(amount));
  showMoneyRow();
  if (moneyValueEl) {
    moneyValueEl.style.color = TEXT_GOLD;
    moneyValueEl.textContent = "$" + currentMoney;
    moneyValueEl.style.transform = "scale(1.18)";
    setTimeout(function () {
      if (moneyValueEl) moneyValueEl.style.transform = "scale(1)";
    }, 170);
  }
  console.log("[MONEY] set to " + currentMoney);
}

// Count the money up or down by delta, flashing green for a gain, red for a loss.
// (Used by the coin budgeting and the investing result in the next prompts.)
function changeMoney(delta: number) {
  const target = Math.max(0, Math.round(currentMoney + delta));
  if (delta === 0) {
    if (moneyValueEl) {
      moneyValueEl.style.transform = "scale(1.12)";
      setTimeout(function () {
        if (moneyValueEl) moneyValueEl.style.transform = "scale(1)";
      }, 160);
    }
    currentMoney = target;
    console.log("[MONEY] unchanged at " + currentMoney);
    return;
  }
  animateMoneyTo(target, delta > 0);
  console.log("[MONEY] change " + delta + " to " + target);
}
void changeMoney; // used by the stages in the next prompts

// The little counting animation behind changeMoney().
function animateMoneyTo(target: number, isGain: boolean) {
  if (!moneyValueEl) {
    currentMoney = target;
    return;
  }
  const start = currentMoney;
  const steps = 14;
  let i = 0;
  moneyValueEl.style.color = isGain ? TEXT_GREEN : MONEY_DOWN;
  moneyValueEl.style.transform = "scale(1.28)";
  const timer = setInterval(function () {
    i = i + 1;
    const t = i / steps;
    const val = Math.round(start + (target - start) * t);
    if (moneyValueEl) moneyValueEl.textContent = "$" + val;
    if (i >= steps) {
      clearInterval(timer);
      if (moneyValueEl) {
        moneyValueEl.textContent = "$" + target;
        moneyValueEl.style.transform = "scale(1)";
      }
      setTimeout(function () {
        if (moneyValueEl) moneyValueEl.style.color = TEXT_GOLD;
      }, 280);
    }
  }, 26);
  currentMoney = target;
}

// ============================================================================
// PHASE MACHINE  (the master flow; panels get attached in a later prompt)
// ============================================================================
const PHASE_SELECT = "select";
const PHASE_MORNING = "morning";
const PHASE_MIDDAY = "midday";
const PHASE_AFTERNOON = "afternoon";
const PHASE_CLOSE = "close";
const PHASE_ORDER = [PHASE_SELECT, PHASE_MORNING, PHASE_MIDDAY, PHASE_AFTERNOON, PHASE_CLOSE];
let currentPhase = PHASE_SELECT;

// Panels registered per phase. showPhase shows the active one and hides the rest.
const phasePanels: any = {};

function showPhase(phase: string) {
  currentPhase = phase;
  setHudStage(phase);
  if (phase === PHASE_SELECT) setMoney(ECON.STARTING_MONEY);
  else if (phase === PHASE_MORNING) setMoney(ECON.STARTING_MONEY + ECON.ALLOWANCE_PER_WEEK);
  else if (phase === PHASE_MIDDAY) setMoney(ECON.PAYCHECK_STAGE2);
  else if (phase === PHASE_AFTERNOON) setMoney(ECON.BIG_DECISION_FUNDS);
  else hideMoneyRow();
  for (const key in phasePanels) {
    const panel = phasePanels[key];
    if (panel && panel.object3D) panel.object3D.visible = false;
  }
  const active = phasePanels[phase];
  if (active && active.object3D) active.object3D.visible = true;
  console.log("[PHASE] now in " + phase);
}

function nextPhase() {
  const i = PHASE_ORDER.indexOf(currentPhase);
  const next = PHASE_ORDER[i + 1];
  if (next) {
    sfxStage();
    showPhase(next);
  }
}
void nextPhase; // called by the panels in later prompts

// ============================================================================
// THE WORLD
// ============================================================================
World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets: {},
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: { handTracking: { required: false }, layers: { required: false } },
  },
  features: {
    // initialPlayerPosition spawns the player RIG (the locomotion collision
    // capsule) on the entrance side of the plaza. The camera below sits at
    // local z 0, so the capsule lines up with where you actually appear to
    // stand — that is what makes the hedge boundary stop you in the right place.
    // useWorker is OFF on purpose: the worker only syncs world.player back to the
    // app after the first move, so with it on the spawn would sit at the origin
    // and snap forward on the first keypress. On the main thread the initial
    // position applies immediately. The scene is light, so there is no cost.
    locomotion: { useWorker: false, browserControls: true, initialPlayerPosition: [0, 0, 7] },
    grabbing: true,
    physics: true,
    sceneUnderstanding: false,
    environmentRaycast: false,
  },
}).then(function (world) {
  const scene = world.scene;
  const camera = world.camera;

  // Eye height only — no z offset. The player rig is spawned back on the
  // entrance side via locomotion's initialPlayerPosition, so keeping the camera
  // at local z 0 means the collision capsule sits exactly under the viewer
  // (otherwise walls would block you metres away from where they look).
  camera.position.set(0, 1.6, 0);

  // --------------------------------------------------------------------------
  // BROWSER MOUSE LOOK (right button looks; left button stays for clicks).
  // In the headset the headset owns the view, so this only runs in the browser.
  // --------------------------------------------------------------------------
  const lookContainer = document.getElementById("scene-container") as HTMLDivElement;
  const LOOK_BUTTON = 2; // right mouse button
  let lookDragging = false;
  let lookHasLooked = false;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const LOOK_SENSITIVITY = 0.0025;
  const LOOK_PITCH_LIMIT = 1.4;

  lookContainer.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  lookContainer.addEventListener("pointerdown", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = true;
    lookHasLooked = true;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookContainer.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", function (e) {
    if (!lookDragging) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookYaw = lookYaw - dx * LOOK_SENSITIVITY;
    lookPitch = lookPitch - dy * LOOK_SENSITIVITY;
    lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch));
  });
  window.addEventListener("pointerup", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = false;
    lookContainer.style.cursor = "";
  });

  function browserLookLoop() {
    if (lookHasLooked) {
      if (world.visibilityState.peek() === VisibilityState.NonImmersive) {
        camera.rotation.set(lookPitch, lookYaw, 0, "YXZ");
      }
    }
    requestAnimationFrame(browserLookLoop);
  }
  browserLookLoop();

  // --------------------------------------------------------------------------
  // HIDDEN-PANEL CLICK GUARD
  // IWSDK keeps every panel alive and just toggles visibility. Pointer ray tests
  // do NOT skip invisible meshes, so a hidden button can sit in front of a real
  // one and silently swallow the click. Each tick we mark effectively-hidden ray
  // targets pointerEvents = "none" so they are skipped, and restore them when
  // shown. setInterval (not requestAnimationFrame) because rAF pauses in a headset.
  // --------------------------------------------------------------------------
  function hitTestVisibilityLoop() {
    const targets = (scene as any).rayDescendants as any[] | undefined;
    if (!targets) return;
    for (const obj of targets) {
      let visible = obj.visible;
      let p = obj.parent;
      while (visible) {
        if (!p) break;
        visible = p.visible;
        p = p.parent;
      }
      if (!visible) {
        if (!obj.__guardHidden) {
          obj.__savedPointerEvents = obj.pointerEvents;
          obj.__guardHidden = true;
        }
        obj.pointerEvents = "none";
      } else if (obj.__guardHidden) {
        obj.pointerEvents = obj.__savedPointerEvents;
        obj.__guardHidden = false;
      }
    }
  }
  setInterval(hitTestVisibilityLoop, 33);

  // --------------------------------------------------------------------------
  // PANEL PRESENTATION
  // The story panels are anchored in the world, near Gus or a building. But the
  // player almost always walks RIGHT UP to that anchor, ending up far too close
  // to read the panel — the cards and buttons at the bottom fall off the screen.
  // presentPanel snaps a panel to a comfortable distance directly in front of
  // the player, sized from the panel's real bounds and the live camera so the
  // WHOLE panel fits in view, then turns it to face the player. It is called
  // once each time a panel first appears (showPanel), so a panel you are reading
  // or clicking stays put. Works the same on desktop and in a headset.
  // --------------------------------------------------------------------------
  const _presEye = new Vector3();
  const _presFwd = new Vector3();
  const _presSize = new Vector3();
  const _presBox = new Box3();
  const PRESENT_MARGIN = 1.18;  // breathing room so the panel is not edge-to-edge
  const PRESENT_MARGIN_DESKTOP = 1.4; // a bit more on a laptop, so the corner overlay does not crowd panels
  const PRESENT_MIN_DIST = 2.4; // never closer than this, however small the panel
  const PRESENT_MAX_DIST = 6.0; // never farther than this, however large the panel

  function presentPanel(entity: any) {
    const cam: any = world.camera;
    const o3d = entity.object3D;
    if (!cam || !o3d) return;

    // Measure the panel's real size. For a flat panel turned only on its Y axis,
    // the width lives in the X/Z plane and the height is always Y, so this stays
    // correct no matter which way the panel is currently facing.
    _presBox.setFromObject(o3d);
    _presBox.getSize(_presSize);
    const w = Math.hypot(_presSize.x, _presSize.z) || 2.6;
    const h = _presSize.y > 0.01 ? _presSize.y : 2.2;

    // Distance that fits the height (vertical FOV) and the width (FOV * aspect).
    const tanV = Math.tan((cam.fov * Math.PI) / 360); // tan(halfFov)
    const aspect = cam.aspect || 1;
    const distH = h / 2 / tanV;
    const distW = w / 2 / (tanV * aspect);
    // On a laptop the corner overlay sits in front of panels, so give them more
    // room there. In the headset there is no overlay, so keep them big.
    const desktopView = world.visibilityState.peek() === VisibilityState.NonImmersive;
    const margin = desktopView ? PRESENT_MARGIN_DESKTOP : PRESENT_MARGIN;
    let dist = Math.max(distH, distW) * margin;
    dist = Math.max(PRESENT_MIN_DIST, Math.min(PRESENT_MAX_DIST, dist));

    // Place it straight ahead of the camera, level, at the player's eye height.
    cam.getWorldPosition(_presEye);
    cam.getWorldDirection(_presFwd);
    _presFwd.y = 0;
    if (_presFwd.lengthSq() < 1e-6) _presFwd.set(0, 0, -1);
    _presFwd.normalize();
    const px = _presEye.x + _presFwd.x * dist;
    const pz = _presEye.z + _presFwd.z * dist;
    o3d.position.set(px, _presEye.y, pz);
    // Turn to face the player (a panel's front is its +Z side).
    o3d.rotation.set(0, Math.atan2(_presEye.x - px, _presEye.z - pz), 0, "YXZ");
    applyPanelOnTop(entity);
  }

  // Draw a panel OVER the 3D world so Gus, his cart, or a building can never sit
  // in front of it and hide the cards. The player walks right up to these spots,
  // so a readable (far enough) panel often lands at or behind the thing it
  // belongs to; turning off depth testing and lifting the render order keeps the
  // whole panel visible while preserving UIKit's own internal layering.
  function applyPanelOnTop(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    o3d.traverse(function (child: any) {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m.depthTest = false;
        m.depthWrite = false;
      }
      // Lift above the scene (renderOrder 0) once, keeping relative UIKit order.
      if (!child.__onTop) {
        child.renderOrder = (child.renderOrder || 0) + 2000;
        child.__onTop = true;
      }
    });
  }

  // Make a panel visible, snapping it in front of the player the first time it
  // appears. Idempotent while already shown, so reading/clicking it is stable.
  // The on-top maintenance loop (below) keeps it drawing over the world, even as
  // UIKit builds later content (a reply, a result) into the panel.
  function showPanel(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    if (!o3d.visible) presentPanel(entity);
    o3d.visible = true;
  }

  // Every story panel, watched by one loop that re-applies applyPanelOnTop to
  // whichever is visible. UIKit creates text/glyph meshes lazily and only after
  // a panel's content is set, so a one-time pass misses them — a panel placed
  // behind Gus or a building would then show its boxes but hide its words. This
  // keeps the WHOLE visible panel on top, frame after frame.
  const storyPanels: any[] = [];
  setInterval(function () {
    for (const p of storyPanels) {
      if (p.object3D && p.object3D.visible) applyPanelOnTop(p);
    }
  }, 33);

  // --------------------------------------------------------------------------
  // The walkable world (sky, light, ground). See src/environment.ts.
  // --------------------------------------------------------------------------
  const built = buildBaseWorld(world);
  const ground = built.ground;
  ground.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  // The hedge ring is collision too: the locomotion engine bakes its meshes into
  // the walkable BVH, so the player's capsule bumps into it and can no longer
  // walk off the edge of the world and fall.
  built.boundary.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  setStageLook(world, PHASE_SELECT);

  // Hide the shop shell during the picker, so the student chooses over an empty
  // lobby. It is revealed in pick() once they choose. The floor stays present
  // (just invisible) so they are always standing on solid ground.
  ground.object3D!.visible = false;
  built.boundary.object3D!.visible = false;
  for (const e of built.street) e.object3D!.visible = false;

  // Build the HUD and show the opening goal.
  createHUD();
  setupHudDeltas();
  setObjective("Take a moment to read the welcome screen.");
  // Module 6 hub step: the meters panel is not built yet, so keep the leftover
  // Module 8 corner overlay hidden. It comes back when the meters are wired in.
  if (hudPanel) hudPanel.style.display = "none";

  // ======================================================================
  // IN-HEADSET DASHBOARD
  // The corner overlay is a flat screen element and does not render inside
  // the headset, so there we show this 3D panel and have it ride along with
  // the view so it is always visible. On desktop it stays hidden, because the
  // corner overlay covers that. Wired to live numbers in a later step.
  // ======================================================================
  const dashboardPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/dashboard.json", maxWidth: 1.0, maxHeight: 0.85 });
  dashboardPanel.object3D!.visible = false;

  // Grab the panel's document once it has loaded, so we can update its numbers.
  whenPanelReady(dashboardPanel, function (doc) {
    dashboardDoc = doc;
  });

  // --- Where the dashboard sits in your view (metres). Tune these in headset. ---
  const DASH_DIST = 1.4;   // how far in front of you
  const DASH_DROP = 0.45;  // how far below your eye line
  const DASH_SIDE = -0.6;  // sideways shift (negative = left)
  const DASH_LERP = 0.18;  // 0..1, how quickly it catches up when you turn

  const _dashEye = new Vector3();
  const _dashFwd = new Vector3();
  const _dashRight = new Vector3();
  const _dashUp = new Vector3();
  const _dashTarget = new Vector3();
  const _dashWorldUp = new Vector3(0, 1, 0);

  // Module 6 hub step: the meters panel is not built yet. Keep the in-headset
  // dashboard hidden until the meters are wired in (then flip this to true).
  let showVrDashboard = false;
  setInterval(function () {
    const o3d = dashboardPanel.object3D;
    if (!o3d) return;
    // Hidden during the hub step, and on desktop (the corner overlay covers that).
    if (!showVrDashboard || world.visibilityState.peek() === VisibilityState.NonImmersive) {
      o3d.visible = false;
      return;
    }
    const cam = world.camera as any;
    cam.getWorldPosition(_dashEye);
    cam.getWorldDirection(_dashFwd);
    _dashFwd.normalize();
    _dashRight.crossVectors(_dashFwd, _dashWorldUp).normalize();
    _dashUp.crossVectors(_dashRight, _dashFwd).normalize();
    _dashTarget.copy(_dashEye)
      .addScaledVector(_dashFwd, DASH_DIST)
      .addScaledVector(_dashUp, -DASH_DROP)
      .addScaledVector(_dashRight, DASH_SIDE);
    if (!o3d.visible) {
      o3d.position.copy(_dashTarget); // snap into place the first time
      o3d.visible = true;
    } else {
      o3d.position.lerp(_dashTarget, DASH_LERP); // smooth follow afterwards
    }
    // Face the player, staying upright.
    o3d.rotation.set(0, Math.atan2(_dashEye.x - o3d.position.x, _dashEye.z - o3d.position.z), 0, "YXZ");
    refreshVrDashboard();
  }, 33);

  // ======================================================================
  // MODULE 6 HUB  —  a clean lineup of four stations the student picks from.
  // The host (Foreman Fox) stands at the left end, each landmark sits on its
  // own pedestal in one evenly spaced row, each wears a floating title, and a
  // gold check marks the ones already finished. No pointing, travel, or meters
  // yet. Everything reads its numbers from the HUB + STOPS constants and the
  // shared mesh helpers in environment.ts.
  // ======================================================================
  // The big Module 8 checker floor is gone; a compact stage (below) is the only
  // floor now, so the lineup reads as a tight composition over open sky.
  ground.object3D!.visible = false;

  const hubGroup = new Group();
  scene.add(hubGroup);

  // Where the row sits, derived once so the stage and Fox line up with it. The
  // WHOLE lineup is centered on ROW_CENTER_X: Fox takes the left "slot" and the
  // four stations follow, so looking straight ahead the student sees all of it
  // at once. Fox = -2 spacings, Tech = -1, Port = 0, Tourism = +1, Farm = +2.
  const firstX = HUB.ROW_CENTER_X - HUB.SPACING;       // Tech, the left station
  const lastX = HUB.ROW_CENTER_X + 2 * HUB.SPACING;    // Farm, the right station
  const foxX = firstX - HUB.FOX_GAP;                    // Fox just left of the row

  // --- The stage: one compact platform under Fox and the four pedestals. It
  // replaces both the old map table and the big checker floor. Just wide enough
  // for Fox plus the row, and deep enough that the student stands on it too. ---
  const stageLeft = foxX - HUB.STAGE_MARGIN;
  const stageRight = lastX + HUB.STAGE_MARGIN;
  const stageW = stageRight - stageLeft;
  const stageCx = (stageLeft + stageRight) / 2;
  const stageD = HUB.STAGE_BACK_Z - HUB.STAGE_FRONT_Z;
  const stageCz = (HUB.STAGE_FRONT_Z + HUB.STAGE_BACK_Z) / 2;

  // A slightly larger, darker slab beneath gives the stage a finished edge.
  const stageRim = meshBox(stageW + 0.22, HUB.STAGE_THICK * 0.7, stageD + 0.22, HUB_COLOR.stageRim);
  stageRim.position.set(stageCx, HUB.STAGE_TOP_Y - HUB.STAGE_THICK, stageCz);
  hubGroup.add(stageRim);
  const stage = meshBox(stageW, HUB.STAGE_THICK, stageD, HUB_COLOR.stage);
  stage.position.set(stageCx, HUB.STAGE_TOP_Y - HUB.STAGE_THICK / 2, stageCz);
  hubGroup.add(stage);

  // --- The ground: a calm, warm-neutral surface just under the stage so nothing
  // floats over open sky. Sized to the scene (a little past the stage on every
  // side), NOT the old large checker floor. The sky overhead is untouched. ---
  const groundW = stageW + HUB.GROUND_PAD_W;
  const groundD = stageD + HUB.GROUND_PAD_D;
  const groundTopY = HUB.STAGE_TOP_Y - HUB.STAGE_THICK - 0.05; // just below the stage rim
  const groundSlab = meshBox(groundW, HUB.GROUND_THICK, groundD, HUB_COLOR.ground);
  groundSlab.position.set(stageCx, groundTopY - HUB.GROUND_THICK / 2, stageCz);
  hubGroup.add(groundSlab);

  // --- The host: a friendly low-poly Foreman Fox at the LEFT end of the row,
  // facing the student. A primitive stand-in until the real model lands. ---
  function buildHubFox(): Group {
    const fox = new Group();
    const ORANGE = "#e07a30";
    const CREAM = "#f6ead3";
    const DARK = "#3a2a1c";
    const HAT = "#f4c20d";

    const torso = meshBox(0.34, 0.46, 0.22, ORANGE); torso.position.y = 0.72; fox.add(torso);
    const belly = meshBox(0.2, 0.34, 0.06, CREAM); belly.position.set(0, 0.7, 0.12); fox.add(belly);
    for (const sx of [-1, 1]) {
      const leg = meshBox(0.1, 0.5, 0.12, DARK); leg.position.set(sx * 0.1, 0.25, 0); fox.add(leg);
      const arm = meshBox(0.08, 0.34, 0.1, ORANGE); arm.position.set(sx * 0.22, 0.78, 0); fox.add(arm);
    }
    const head = meshSphere(0.19, ORANGE); head.position.y = 1.12; fox.add(head);
    const snout = meshBox(0.12, 0.1, 0.14, CREAM); snout.position.set(0, 1.06, 0.16); fox.add(snout);
    const nose = meshSphere(0.03, DARK); nose.position.set(0, 1.08, 0.24); fox.add(nose);
    for (const sx of [-1, 1]) {
      const eye = meshSphere(0.025, DARK); eye.position.set(sx * 0.07, 1.16, 0.16); fox.add(eye);
      const ear = meshCone(0.07, 0.16, ORANGE); ear.position.set(sx * 0.13, 1.28, 0); fox.add(ear);
      const inner = meshCone(0.035, 0.1, CREAM); inner.position.set(sx * 0.13, 1.29, 0.02); fox.add(inner);
    }
    // Bushy tail with a cream tip.
    const tail = meshBox(0.12, 0.12, 0.3, ORANGE); tail.position.set(0, 0.62, -0.24); fox.add(tail);
    const tailTip = meshSphere(0.08, CREAM); tailTip.position.set(0, 0.63, -0.42); fox.add(tailTip);
    // A foreman's hard hat.
    const dome = meshSphere(0.17, HAT); dome.scale.set(1, 0.6, 1); dome.position.y = 1.24; fox.add(dome);
    const brim = meshCyl(0.21, 0.21, 0.03, HAT); brim.position.y = 1.19; fox.add(brim);
    return fox;
  }
  // --- Fox's podium: a small two-tier stand that lifts him a little, so he
  // reads as stationed at the head of the lineup, not standing loose. Same warm
  // palette as the pedestals. ---
  const podium = meshCyl(HUB.FOX_PODIUM_R, HUB.FOX_PODIUM_R * 1.06, HUB.FOX_PODIUM_H, HUB_COLOR.pedestal);
  podium.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H / 2, HUB.ROW_Z);
  hubGroup.add(podium);
  const podiumCap = meshCyl(HUB.FOX_PODIUM_R * 1.05, HUB.FOX_PODIUM_R * 1.05, 0.03, HUB_COLOR.pedestalCap);
  podiumCap.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H - 0.015, HUB.ROW_Z);
  hubGroup.add(podiumCap);

  const fox = buildHubFox();
  fox.position.set(foxX, HUB.STAGE_TOP_Y + HUB.FOX_PODIUM_H, HUB.ROW_Z); // standing on his podium
  hubGroup.add(fox); // built facing +z, toward the student

  // --- Fox's welcome, now a speech bubble by his head (its tail points down to
  // him), so it reads as Fox greeting you rather than a separate sign. Smaller
  // now that each place carries its own title. Same welcome words. ---
  const welcomeSign = makeSpeechBubble(
    "Welcome, Explorer!",
    "Virginia's economy looks very different today than it used to. Four places on this map show you why. Point at any one to visit it first.",
    HUB.WELCOME_W,
  );
  welcomeSign.position.set(foxX + HUB.WELCOME_DX, HUB.WELCOME_Y, HUB.ROW_Z);
  hubGroup.add(welcomeSign); // PlaneGeometry faces +z, so it faces the student

  // --- One small low-poly landmark per stop, each on its own pedestal ---
  // Each is built diorama scale with its base at y = 0, then enlarged and lifted
  // onto a pedestal so the whole group bobs up and down as one piece.

  // Give a whole landmark a soft self-lit glow: each mesh emits a dim version of
  // its own color, so colors stay true but the piece reads as gently lit. The
  // touched materials are collected so the bob loop can pulse them per stop.
  function softGlow(obj: Group, intensity: number, collect?: any[]) {
    obj.traverse(function (child: any) {
      if (child.isMesh && child.material && child.material.color) {
        child.material.emissive = new Color(child.material.color.getHex());
        child.material.emissiveIntensity = intensity;
        if (collect) collect.push(child.material);
      }
    });
  }

  // A gold "visited" check badge: a bright disk facing the student with a white
  // tick across it. Shown on a pedestal front once that stop's done flag is true.
  function makeCheckBadge(): Group {
    const g = new Group();
    const disk = meshCyl(0.1, 0.1, 0.02, HUB_COLOR.badge, 20);
    disk.rotation.x = Math.PI / 2; // turn the flat face toward the student (+z)
    g.add(disk);
    const short = meshBox(0.022, 0.06, 0.012, HUB_COLOR.badgeCheck);
    short.position.set(-0.032, -0.006, 0.013); short.rotation.z = Math.PI / 4; g.add(short);
    const long = meshBox(0.022, 0.11, 0.012, HUB_COLOR.badgeCheck);
    long.position.set(0.022, 0.022, 0.013); long.rotation.z = -Math.PI / 5; g.add(long);
    // Self-lit so the gold and white read brightly without depending on scene light.
    g.traverse(function (c: any) {
      if (c.isMesh && c.material && c.material.color) {
        c.material.emissive = new Color(c.material.color.getHex());
        c.material.emissiveIntensity = 0.5;
      }
    });
    return g;
  }

  // tech: a tall thin glass office tower with window banding.
  function buildTechTower(): Group {
    const g = new Group();
    const GLASS = "#5bbbe0";
    const FRAME = "#2a6f8f";
    const tower = meshBox(0.085, 0.26, 0.085, GLASS); tower.position.y = 0.13; g.add(tower);
    for (const by of [0.07, 0.12, 0.17, 0.22]) {
      const band = meshBox(0.092, 0.012, 0.092, FRAME); band.position.y = by; g.add(band);
    }
    const cap = meshBox(0.05, 0.02, 0.05, FRAME); cap.position.y = 0.27; g.add(cap);
    const mast = meshCyl(0.004, 0.004, 0.05, "#cdd6db"); mast.position.y = 0.305; g.add(mast);
    return g;
  }

  // port: a dockside crane over a little ship loaded with stacked containers.
  function buildPortCrane(): Group {
    const g = new Group();
    const HULL = "#7a3d2c";
    const DECK = "#caa24a";
    const CRANE = "#e0a13a";
    // The ship: a hull with a small wheelhouse.
    const hull = meshBox(0.26, 0.06, 0.11, HULL); hull.position.set(0.02, 0.03, 0); g.add(hull);
    const deck = meshBox(0.24, 0.015, 0.09, DECK); deck.position.set(0.02, 0.065, 0); g.add(deck);
    const cabin = meshBox(0.05, 0.05, 0.07, "#f1e7d0"); cabin.position.set(0.11, 0.095, 0); g.add(cabin);
    // Stacked shipping containers in the three trade colors.
    const cont = [
      { c: "#cf4636", x: -0.05, y: 0.095 },
      { c: "#3f7fd0", x: 0.0,  y: 0.095 },
      { c: "#5fae4a", x: -0.025, y: 0.135 },
    ];
    for (const k of cont) {
      const box = meshBox(0.05, 0.04, 0.07, k.c); box.position.set(k.x, k.y, 0); g.add(box);
    }
    // The crane: a post on the dock side with a jib reaching over the deck.
    const post = meshBox(0.022, 0.2, 0.022, CRANE); post.position.set(-0.13, 0.1, 0.04); g.add(post);
    const jib = meshBox(0.18, 0.02, 0.022, CRANE); jib.position.set(-0.05, 0.2, 0.04); g.add(jib);
    const line = meshCyl(0.003, 0.003, 0.06, "#3a2a1c"); line.position.set(0.0, 0.17, 0.04); g.add(line);
    const hook = meshBox(0.04, 0.03, 0.05, "#caa24a"); hook.position.set(0.0, 0.13, 0.04); g.add(hook);
    return g;
  }

  // tourism: a low colonial brick building with a white cupola on top.
  function buildColonial(): Group {
    const g = new Group();
    const BRICK = "#b15c3c";
    const TRIM = "#f3ecdb";
    const ROOF = "#7c3b2a";
    const body = meshBox(0.2, 0.1, 0.13, BRICK); body.position.y = 0.05; g.add(body);
    const roof = meshBox(0.22, 0.022, 0.15, ROOF); roof.position.y = 0.108; g.add(roof);
    // White-trim windows and a door across the front (+z) face.
    for (const wx of [-0.06, 0.06]) {
      const win = meshBox(0.03, 0.045, 0.01, TRIM); win.position.set(wx, 0.06, 0.066); g.add(win);
    }
    const door = meshBox(0.03, 0.06, 0.01, TRIM); door.position.set(0, 0.03, 0.066); g.add(door);
    // The cupola: a small white tower with a gold spire.
    const cupola = meshBox(0.045, 0.05, 0.045, TRIM); cupola.position.y = 0.145; g.add(cupola);
    const dome = meshSphere(0.028, TRIM); dome.position.y = 0.178; g.add(dome);
    const spire = meshCone(0.012, 0.05, "#d9a441"); spire.position.y = 0.215; g.add(spire);
    return g;
  }

  // farm: a red barn with a small silo beside it.
  function buildFarm(): Group {
    const g = new Group();
    const BARN = "#bd3b2c";
    const ROOF = "#7c241a";
    const TRIM = "#f1e7d0";
    const SILO = "#d8d2c4";
    const barn = meshBox(0.17, 0.1, 0.12, BARN); barn.position.set(-0.03, 0.05, 0); g.add(barn);
    const roof = meshBox(0.19, 0.05, 0.14, ROOF); roof.position.set(-0.03, 0.115, 0); g.add(roof);
    const door = meshBox(0.05, 0.06, 0.01, TRIM); door.position.set(-0.03, 0.03, 0.061); g.add(door);
    const beam = meshBox(0.12, 0.008, 0.008, TRIM); beam.position.set(-0.03, 0.075, 0.061); g.add(beam);
    // The silo: a cylinder with a domed cap.
    const silo = meshCyl(0.035, 0.035, 0.15, SILO); silo.position.set(0.085, 0.075, 0.02); g.add(silo);
    const cap = meshSphere(0.035, "#b9b1a0"); cap.position.set(0.085, 0.15, 0.02); g.add(cap);
    return g;
  }

  const LANDMARK_BUILDERS: { [id: string]: () => Group } = {
    tech: buildTechTower,
    port: buildPortCrane,
    tourism: buildColonial,
    farm: buildFarm,
  };

  // Build the row, left to right in STOPS order: a pedestal, the enlarged
  // landmark on top, a floating title above, and a (hidden until done) badge.
  const hubLandmarks: {
    obj: Group; baseY: number; stop: any; glowMats: any[]; badge: Group; pad: any;
    entity: any; wasPressed: boolean;
  }[] = [];
  for (let i = 0; i < STOPS.length; i++) {
    const stop = STOPS[i];
    const build = LANDMARK_BUILDERS[stop.id];
    if (!build) continue;
    const px = HUB.ROW_CENTER_X + (i - 1) * HUB.SPACING; // even spacing, Fox holds -2

    // The pedestal: a short stone column with a lighter cap, same for all four.
    const pedH = HUB.PED_TOP_Y - HUB.STAGE_TOP_Y;
    const ped = meshCyl(HUB.PED_R, HUB.PED_R * 1.06, pedH, HUB_COLOR.pedestal);
    ped.position.set(px, HUB.STAGE_TOP_Y + pedH / 2, HUB.ROW_Z);
    hubGroup.add(ped);
    const cap = meshCyl(HUB.PED_R * 1.08, HUB.PED_R * 1.08, 0.03, HUB_COLOR.pedestalCap);
    cap.position.set(px, HUB.PED_TOP_Y - 0.015, HUB.ROW_Z);
    hubGroup.add(cap);

    // A soft "come here" glow pool on the pedestal top, in the stop's color. The
    // bob loop breathes it while the stop is unvisited and hides it once done, so
    // an unvisited place clearly reads as "come explore." Translucent so it glows.
    const pad = meshCyl(HUB.PED_R * LANDMARK.PAD_R, HUB.PED_R * LANDMARK.PAD_R, 0.02, stop.color, 24);
    pad.position.set(px, HUB.PED_TOP_Y + 0.012, HUB.ROW_Z);
    (pad.material as any).emissive = new Color(stop.color);
    (pad.material as any).transparent = true;
    hubGroup.add(pad);

    // The landmark, enlarged so the row fills the view, resting on the pedestal.
    const landmark = build();
    landmark.scale.setScalar(HUB.MODEL_SCALE);
    landmark.position.set(px, HUB.PED_TOP_Y, HUB.ROW_Z);
    const glowMats: any[] = [];
    softGlow(landmark, LANDMARK.GLOW, glowMats);

    // A see-through hit box so a small landmark (the thin tech tower especially) is
    // still easy to point at: invisible, but it still raycasts, so it just enlarges
    // the target. Added after softGlow so it is not tinted, and it rides inside the
    // landmark group so it scales and bobs along with it.
    const hit = meshBox(0.3, 0.46, 0.3, "#ffffff");
    hit.castShadow = false;
    hit.receiveShadow = false;
    const hitMat = hit.material as any;
    hitMat.transparent = true;
    hitMat.opacity = 0;
    hitMat.depthWrite = false;
    hit.position.set(0, 0.22, 0);
    landmark.add(hit);

    // Make the whole landmark a ray target, the SAME pointing mechanism the panels
    // use (Interactable). createTransformEntity reparents it to the scene root, but
    // hubGroup sits at the origin so the coordinates above place it identically. We
    // keep the entity so the loops can read Hovered / Pressed, and so the hub
    // hide/show can toggle it alongside the rest of the lineup.
    const landmarkEntity = world.createTransformEntity(landmark).addComponent(Interactable);

    // The floating title card: place name, region line, and flavor tagline. It is
    // compact and sits just above this landmark, aligned with the other cards.
    const title = makeTitleCard(stop.name, stop.region, stop.tagline, HUB.TITLE_W);
    title.position.set(px, HUB.TITLE_Y, HUB.ROW_Z);
    hubGroup.add(title);

    // The gold visited check on the pedestal front; the bob loop shows/hides it.
    const badge = makeCheckBadge();
    badge.position.set(px, HUB.BADGE_Y, HUB.ROW_Z + HUB.PED_R + 0.02);
    badge.visible = stop.done;
    hubGroup.add(badge);

    hubLandmarks.push({ obj: landmark, baseY: HUB.PED_TOP_Y, stop, glowMats, badge, pad, entity: landmarkEntity, wasPressed: false });
  }

  // One gentle loop drives the bob, the visited state, AND the point-at highlight,
  // so flipping a stop's done flag (or pointing at it) later just works. setInterval,
  // not rAF (rAF pauses in the headset).
  let bobT = 0;
  setInterval(function () {
    bobT += 0.033;
    for (let i = 0; i < hubLandmarks.length; i++) {
      const lm = hubLandmarks[i];
      // Bob: all four drift up and down, phase-staggered so they feel alive.
      lm.obj.position.y =
        lm.baseY + Math.sin(bobT * LANDMARK.BOB_SPEED + i * LANDMARK.BOB_STAGGER) * LANDMARK.BOB_AMP;

      // Is the student pointing at this landmark right now? Hovered while the ray
      // rests on it, Pressed the instant they select. Drives the "this is the
      // target" highlight, layered over whatever the pulse/done look is doing.
      const pointed =
        lm.entity.hasComponent(Hovered) || lm.entity.hasComponent(Pressed);

      let glow: number;
      if (lm.stop.done) {
        // Finished: pulse off, a calm steady glow, the gold check showing, the
        // inviting glow pool gone (the check now says "done", not "come here").
        glow = LANDMARK.DONE_GLOW;
        lm.badge.visible = true;
        lm.pad.visible = false;
      } else {
        // Unvisited: breathe the landmark glow AND the floor pool to invite a
        // visit, no badge. The pool swells, brightens, and fades as it breathes;
        // pointing at it snaps the pool to its brightest so the cue is obvious.
        const t = 0.5 + 0.5 * Math.sin(bobT * LANDMARK.PULSE_SPEED + i * LANDMARK.BOB_STAGGER);
        glow = LANDMARK.PULSE_MIN + (LANDMARK.PULSE_MAX - LANDMARK.PULSE_MIN) * t;
        lm.badge.visible = false;
        lm.pad.visible = true;
        const pt = pointed ? 1 : t;
        const pm = lm.pad.material;
        pm.emissiveIntensity = LANDMARK.PAD_GLOW_MIN + (LANDMARK.PAD_GLOW_MAX - LANDMARK.PAD_GLOW_MIN) * pt;
        pm.opacity = LANDMARK.PAD_OP_MIN + (LANDMARK.PAD_OP_MAX - LANDMARK.PAD_OP_MIN) * pt;
        const s = 1 + LANDMARK.PAD_SCALE_AMP * pt;
        lm.pad.scale.set(s, 1, s);
      }

      // The point-at highlight itself: brighten the glow and grow the landmark a
      // touch, in either state, so the student always knows which place a press
      // will enter. One owner of glow + scale keeps it from fighting the pulse.
      if (pointed) glow = LANDMARK.HOVER_GLOW;
      for (const m of lm.glowMats) m.emissiveIntensity = glow;
      lm.obj.scale.setScalar(HUB.MODEL_SCALE * (pointed ? LANDMARK.HOVER_SCALE : 1));
    }
  }, 33);

  // ======================================================================
  // MODULE 6 VISIT LOOP  —  point at a landmark, travel into that stop, run its
  // (placeholder) challenge, finish, and travel back to the map. This is the
  // reusable SHELL; the real per-stop challenges drop into showStop() later.
  // Everything reads the VISIT tunables; nothing is hardcoded inline. Every loop
  // is setInterval (rAF pauses in the headset).
  // ======================================================================
  const VISIT = {
    // The travel fade: a calm, slow dip to a solid color and back, never a flash.
    FADE_COLOR: "#0e1c2b",   // calm deep navy to dip through (not pure black)
    FADE_MS: 700,            // time to fade fully OUT, and again to fade fully IN
    FADE_HOLD_MS: 140,       // a short beat held at full cover while the world swaps
    FADE_DIST: 0.4,          // how far in front of the eye the cover sits (metres)
    FADE_SIZE: 6,            // cover size; oversized so it always fills the view
    TICK_MS: 33,             // loop rate for the fade and the point-to-select watch
    // The placeholder INSIDE a stop: a title/description panel and one big button.
    PANEL_POS: [0, 1.72, 3.3] as [number, number, number], // ahead of the spawn, kid eye height
    PANEL_W: 2.1,            // description panel width (metres)
    BTN_POS: [1.7, 0.9, 3.45] as [number, number, number],  // the Finish button, to the lower-RIGHT so the model stays in view
    BTN_W: 1.3,              // button width (metres)
    BTN_H: 0.36,             // button height (metres)
    BTN_HOVER_SCALE: 1.06,   // gentle grow while pointed at
    BTN_PRESS_SCALE: 0.95,   // quick squish on press
    // PLACEHOLDER award handed to completeStop on Finish. Real per-challenge
    // scoring (the three meters in CLAUDE.md) replaces this in a later prompt.
    PLACEHOLDER_AWARD: { economic: 20, innovation: 20, problem: 20 },
  };

  // The one gate that decides what a point/press does: "hub" (the map reacts),
  // "fading" (mid-travel, nothing reacts), or "stop" (only Finish reacts).
  let currentView = "hub";
  let activeStopId: string | null = null;
  // The REAL per-stop award handed to completeStop on Finish. A decision-pack stop
  // (the runner) sets this to the student's true tally; a placeholder stop leaves
  // it null and falls back to VISIT.PLACEHOLDER_AWARD. Reset on every enterStop.
  let pendingAward: { economic: number; innovation: number; problem: number } | null = null;

  // ---- SCORING SPINE ----  Each finished stop stores ONE award, keyed by id; the
  // running totals are the SUM of those awards. Finishing a stop again just
  // overwrites its award, so a re-visit never double counts (prompt step 6). The
  // visible meters panel and the report card arrive in the next prompt; for now we
  // keep the numbers and log them.
  const M6_AWARDS: Record<string, { economic: number; innovation: number; problem: number }> = {};
  const m6Totals = { economic: 0, innovation: 0, problem: 0 };
  function recomputeM6Totals() {
    let ec = 0, inn = 0, pr = 0;
    for (const id in M6_AWARDS) {
      ec += M6_AWARDS[id].economic;
      inn += M6_AWARDS[id].innovation;
      pr += M6_AWARDS[id].problem;
    }
    // Meters live 0..100; clamp so placeholder sums never run past the top.
    m6Totals.economic = Math.max(0, Math.min(100, ec));
    m6Totals.innovation = Math.max(0, Math.min(100, inn));
    m6Totals.problem = Math.max(0, Math.min(100, pr));
  }
  function completeStop(stopId: string, award: { economic: number; innovation: number; problem: number }) {
    M6_AWARDS[stopId] = award;          // overwrite, never add
    const stop = STOPS.find(function (s) { return s.id === stopId; });
    if (stop) stop.done = true;          // lights the gold check, stops the invite glow
    recomputeM6Totals();
    console.log("[M6] finished " + stopId + " with award", award, "=> totals", m6Totals);
  }

  // ---- THE TRAVEL FADE ----  A solid quad that rides just in front of the camera,
  // square to the view, whose opacity we animate on setInterval. At full cover we
  // swap the world (onCover); when clear again we settle the view state (onDone).
  // The same slow fade runs both directions, so entering and leaving feel identical.
  const fadeMat = new MeshBasicMaterial({
    color: new Color(VISIT.FADE_COLOR),
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const fadeQuad = new Mesh(new PlaneGeometry(VISIT.FADE_SIZE, VISIT.FADE_SIZE), fadeMat);
  fadeQuad.renderOrder = 100000;     // over the whole world AND any panel
  fadeQuad.frustumCulled = false;
  fadeQuad.visible = false;
  (fadeQuad as any).pointerEvents = "none";
  scene.add(fadeQuad);

  let fadePhase = "idle"; // "idle" | "out" | "hold" | "in"
  let fadeElapsed = 0;
  let fadeOnCover: (() => void) | null = null;
  let fadeOnDone: (() => void) | null = null;
  const _fadeEye = new Vector3();
  const _fadeFwd = new Vector3();

  function startFade(onCover: () => void, onDone: () => void) {
    fadeOnCover = onCover;
    fadeOnDone = onDone;
    fadeElapsed = 0;
    fadePhase = "out";
    fadeQuad.visible = true;
  }

  setInterval(function () {
    if (!fadeQuad.visible) return;
    // Ride just in front of the camera, square to the view, so it fills the screen.
    const cam = world.camera as any;
    cam.getWorldPosition(_fadeEye);
    cam.getWorldDirection(_fadeFwd);
    _fadeFwd.normalize();
    fadeQuad.position.set(
      _fadeEye.x + _fadeFwd.x * VISIT.FADE_DIST,
      _fadeEye.y + _fadeFwd.y * VISIT.FADE_DIST,
      _fadeEye.z + _fadeFwd.z * VISIT.FADE_DIST,
    );
    fadeQuad.quaternion.copy(cam.quaternion);

    if (fadePhase === "out") {
      fadeElapsed += VISIT.TICK_MS;
      fadeMat.opacity = Math.min(1, fadeElapsed / VISIT.FADE_MS);
      if (fadeElapsed >= VISIT.FADE_MS) {
        fadeMat.opacity = 1;
        if (fadeOnCover) fadeOnCover();
        fadePhase = "hold";
        fadeElapsed = 0;
      }
    } else if (fadePhase === "hold") {
      fadeElapsed += VISIT.TICK_MS;
      if (fadeElapsed >= VISIT.FADE_HOLD_MS) {
        fadePhase = "in";
        fadeElapsed = 0;
      }
    } else if (fadePhase === "in") {
      fadeElapsed += VISIT.TICK_MS;
      fadeMat.opacity = Math.max(0, 1 - fadeElapsed / VISIT.FADE_MS);
      if (fadeElapsed >= VISIT.FADE_MS) {
        fadeMat.opacity = 0;
        fadeQuad.visible = false;
        fadePhase = "idle";
        if (fadeOnDone) fadeOnDone();
      }
    }
  }, VISIT.TICK_MS);

  // ---- HIDE / SHOW THE HUB ----  The stage, ground, Fox, pedestals, titles and
  // badges all live in hubGroup; the four landmark MODELS are their own ray-target
  // entities, so we toggle them alongside it. (Selection is also gated on
  // currentView, so a hidden landmark can never start a visit on its own.)
  function hideHub() {
    hubGroup.visible = false;
    for (const lm of hubLandmarks) if (lm.entity.object3D) lm.entity.object3D.visible = false;
  }
  function showHub() {
    hubGroup.visible = true;
    for (const lm of hubLandmarks) if (lm.entity.object3D) lm.entity.object3D.visible = true;
  }

  // ---- THE STOP SHELL (placeholder inside) ----  A description panel plus one big
  // Finish button, parked ahead of the spawn. The button label never changes, so it
  // is built once; only the panel's words are rebuilt per stop. The real challenge
  // replaces what showStop()/hideStop() put INSIDE, not this shell around it.
  const stopHolder = new Group();
  scene.add(stopHolder);
  stopHolder.visible = false;
  let stopPanelMesh: any = null;

  const finishBtnMesh = makeButtonCard("Finish and return to the map", VISIT.BTN_W, VISIT.BTN_H);
  finishBtnMesh.position.set(VISIT.BTN_POS[0], VISIT.BTN_POS[1], VISIT.BTN_POS[2]);
  (finishBtnMesh.material as any).depthTest = false; // always readable over the sky
  (finishBtnMesh.material as any).depthWrite = false;
  finishBtnMesh.renderOrder = 50000;
  const finishBtn = world.createTransformEntity(finishBtnMesh).addComponent(Interactable);
  if (finishBtn.object3D) finishBtn.object3D.visible = false;
  let finishWasPressed = false;

  // The Port of Virginia's custom game controller, built once below (after its
  // scene is registered) and driven by showStop/hideStop + its own loop.
  let portGame: { group: Group; start: () => void; stop: () => void; tick: () => void } | null = null;

  function showStop(stop: any) {
    // A stop with a decision pack runs through the reusable RUNNER (its own calm
    // scene, setup line, decisions, readout, and the shared finish button). Stops
    // without a pack yet keep the simple placeholder panel + finish button below.
    const pack = DECISION_PACKS[stop.id];
    if (pack) {
      showStopScene(stop.id);
      // Start the stop's quiet ambience now the student is inside. Entering the
      // stop was itself an interaction (the landmark press), so the AudioContext is
      // already allowed to play: the Tech Office gets its server-room hum, the
      // Tourism Hub gets its outdoor village murmur + birdsong, and the Modern Farm
      // gets a gentle rural breeze + birdsong.
      if (stop.id === "tech") startHum();
      else if (stop.id === "tourism") startVillageAmbience();
      else if (stop.id === "farm") startFarmAmbience();
      startDecisionPack(stop, pack);
      return;
    }
    // The Port of Virginia is the SIGNATURE stop: a custom container-loading game,
    // not a decision pack. Show its dock scene, start the game, and reveal the
    // shared Finish button as a TEMPORARY return while the game is built out. With
    // no pendingAward set, Finish completes the port with VISIT.PLACEHOLDER_AWARD;
    // real scoring replaces that in a later prompt.
    if (stop.id === "port") {
      showStopScene("port");
      if (portGame) portGame.start();
      if (finishBtn.object3D) finishBtn.object3D.visible = true;
      return;
    }
    // Rebuild the description for THIS stop (cheap, and it happens under full cover).
    if (stopPanelMesh) stopHolder.remove(stopPanelMesh);
    stopPanelMesh = makeTextPanel(
      stop.name,
      "This is where you will run the " + stop.name + " challenge.",
      VISIT.PANEL_W,
    );
    (stopPanelMesh.material as any).depthTest = false;
    (stopPanelMesh.material as any).depthWrite = false;
    stopPanelMesh.renderOrder = 50000;
    stopPanelMesh.position.set(VISIT.PANEL_POS[0], VISIT.PANEL_POS[1], VISIT.PANEL_POS[2]);
    stopHolder.add(stopPanelMesh);
    stopHolder.visible = true;
    if (finishBtn.object3D) finishBtn.object3D.visible = true;
  }
  function hideStop() {
    stopHolder.visible = false;
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    hideRunner();          // clear any runner panels / option cards
    if (portGame) portGame.stop(); // park the Port's ships + grabbable containers
    hideAllStopScenes();   // and the calm per-stop backdrop
    stopHum();             // fade out the Tech Office room ambience as we leave
    stopVillageAmbience(); // fade out the Tourism village ambience as we leave
    stopFarmAmbience();    // fade out the Modern Farm rural ambience as we leave
  }

  // ---- THE VISIT: enter on a landmark select, finish on the button ----
  function enterStop(stopId: string) {
    if (currentView !== "hub") return;   // only the map starts a visit
    const stop = STOPS.find(function (s) { return s.id === stopId; });
    if (!stop) return;
    currentView = "fading";
    activeStopId = stopId;
    pendingAward = null;                 // a fresh visit; the runner sets the real award
    sfxStage();                          // a soft travel cue
    startFade(
      function onCover() { hideHub(); showStop(stop); },
      function onDone() { currentView = "stop"; },
    );
  }
  function finishStop() {
    if (currentView !== "stop" || !activeStopId) return; // only a real Finish counts
    sfxClick();
    // The runner's REAL tally if this stop produced one this visit; otherwise the
    // placeholder (for stops whose challenge is not built yet).
    completeStop(activeStopId, pendingAward || VISIT.PLACEHOLDER_AWARD);
    pendingAward = null;
    currentView = "fading";
    startFade(
      function onCover() { hideStop(); showHub(); activeStopId = null; },
      function onDone() { currentView = "hub"; },
    );
  }

  // ---- POINT-TO-SELECT ----  Watch each landmark for a FRESH press (one that was
  // not pressed last tick, so a held trigger fires once), and the Finish button the
  // same way, with a little grow/squish while pointed at. setInterval, not rAF.
  setInterval(function () {
    for (const lm of hubLandmarks) {
      const pressed = !!lm.entity.hasComponent(Pressed);
      if (currentView === "hub" && pressed && !lm.wasPressed) enterStop(lm.stop.id);
      lm.wasPressed = pressed;
    }
    if (currentView === "stop") {
      const hov = !!finishBtn.hasComponent(Hovered);
      const prs = !!finishBtn.hasComponent(Pressed);
      finishBtnMesh.scale.setScalar(prs ? VISIT.BTN_PRESS_SCALE : (hov ? VISIT.BTN_HOVER_SCALE : 1));
      if (prs && !finishWasPressed) finishStop();
      finishWasPressed = prs;
    } else {
      finishBtnMesh.scale.setScalar(1);
      finishWasPressed = false;
    }
  }, VISIT.TICK_MS);

  // ======================================================================
  // DECISION RUNNER  —  the reusable engine the three lean stops share. It plays a
  // DECISION_PACK (data, defined up top) inside the stop shell: a calm scene, a
  // setup line, then each decision as a question with three pointable option cards
  // (the SAME Interactable pointing the hub landmarks use), a short interim readout
  // after each pick, and finally the shell's "Finish and return to the map" button
  // carrying the student's REAL tally. Only stops with a pack use it; the rest keep
  // the placeholder. Tune the layout here; every loop is setInterval (rAF pauses in
  // the headset).
  // ======================================================================
  const RUNNER = {
    INFO_W: 2.3,            // setup / closing panel width (m)
    Q_W: 2.3,              // question card width (m)
    READOUT_W: 2.3,        // interim readout width (m)
    // The panels ride ABOVE the build and the buttons BELOW it, so the data
    // center the student is assembling is never hidden behind a box. The model
    // tops out near eye height, so a panel centered at ~2.3 clears it.
    SETUP_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    Q_PANEL_POS: [0, 2.34, 3.3] as [number, number, number],   // up top, cards below it
    READOUT_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    CLOSE_PANEL_POS: [0, 2.3, 3.3] as [number, number, number],
    CARD_W: 2.5,           // option card width (m)
    CARD_H: 0.44,          // option card height (m)
    CARD_X: 0,             // option cards are centered in front of the student
    CARD_TOP_Y: 1.55,      // y of the FIRST (top) option card
    CARD_STEP: 0.54,       // center-to-center drop between option cards
    CARD_Z: 3.28,          // option cards distance in front of the spawn
    BTN_W: 1.6,            // Start / Next button size (m)
    BTN_H: 0.34,
    BTN_POS: [1.7, 0.9, 3.4] as [number, number, number], // lower-RIGHT, clear of the centered model AND the centered option cards
    HOVER_SCALE: 1.06,     // gentle grow while pointed at
    PRESS_SCALE: 0.95,     // quick squish on press
    READOUT_HOLD_MS: 900,  // keep the readout up this long to read BEFORE Next appears
    TICK_MS: 33,
  };

  // Draw a flat runner mesh OVER the calm scene and the sky (the same trick the
  // shell uses for its panels): no depth test, lifted render order.
  function runnerOnTop(mesh: any) {
    const m = mesh.material;
    m.depthTest = false;
    m.depthWrite = false;
    mesh.renderOrder = 50000;
  }

  // ---- THE SERVER ROOM  —  the place the Tech Office build sits inside. Two
  // rows of tall cabinets with slow-blinking status lights flank and back the
  // build, and a back wall carries two data screens (one breathing bars, one
  // scrolling log lines). Everything sits beyond the build's sides and behind
  // its front edge, so it never crosses in front of the panels or the build.
  // Returns its Group plus a tick(clock) the caller drives on setInterval (rAF
  // pauses in the headset). Only Tech Office has a room today; other stops can
  // build their own the same way. ----
  function buildTechStopScene(): { group: Group; tick: (clock: number) => void } {
    const R = TECH_ROOM;
    const g = new Group();

    // animated bits, all serviced by tick()
    const dots: { mesh: any; hz: number; phase: number; min: number; max: number }[] = [];
    const bars: { mesh: any; bottomY: number; maxH: number; hz: number; phase: number }[] = [];
    const lines: { mesh: any; topY: number; botY: number; speed: number }[] = [];

    function emissive(mesh: any, color: string, intensity: number) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = intensity;
      mesh.castShadow = false;
      return mesh;
    }

    // floor + an enclosing wall on three sides, so it reads as a room not a void.
    const floor = meshBox(12, 0.12, 13, R.FLOOR);
    floor.position.set(0, -0.06, 1.0);
    g.add(floor);
    const wall = meshBox(12, 3.8, 0.2, R.WALL);
    wall.position.set(0, 1.9, R.WALL_Z);
    g.add(wall);
    for (const sx of [-5.4, 5.4]) {
      const side = meshBox(0.2, 3.8, 11, R.WALL);
      side.position.set(sx, 1.9, -1.4);
      g.add(side);
    }

    // two rows of tall server cabinets, each studded with small status lights.
    let di = 0;
    for (const sgn of [-1, 1]) {
      const x = sgn * R.ROW_X;
      for (let r = 0; r < R.ROW_Z.length; r++) {
        const z = R.ROW_Z[r];
        const cab = meshBox(R.CAB_W, R.CAB_H, R.CAB_D, r % 2 === 0 ? R.CAB : R.CAB2);
        cab.position.set(x, R.CAB_H / 2, z);
        g.add(cab);
        const cap = meshBox(R.CAB_W + 0.05, 0.08, R.CAB_D + 0.05, R.CAP);
        cap.position.set(x, R.CAB_H, z);
        cap.castShadow = false;
        g.add(cap);
        // status lights on the front (+z) face, a 2 x 4 grid, each blinking slowly.
        const faceZ = z + R.CAB_D / 2 + 0.012;
        const palette = [R.DOT_CYAN, R.DOT_GREEN, R.DOT_CYAN, R.DOT_AMBER, R.DOT_GREEN, R.DOT_CYAN, R.DOT_GREEN, R.DOT_CYAN];
        let k = 0;
        for (const dx of [-0.22, 0.22]) {
          for (const dy of [0.5, 0.9, 1.3, 1.7]) {
            const col = palette[k % palette.length];
            const dot = meshBox(0.07, 0.07, 0.02, col);
            dot.position.set(x + dx, dy, faceZ);
            emissive(dot, col, 0.5);
            dots.push({ mesh: dot, hz: R.BLINK_HZ[(di + k) % R.BLINK_HZ.length], phase: (di + k) * 1.7, min: 0.06, max: 0.85 });
            g.add(dot);
            k++;
          }
        }
        // a soft steady seam of light down the inner edge of the cabinet.
        const seam = meshBox(0.03, 1.5, 0.02, R.DOT_CYAN);
        seam.position.set(x + (sgn < 0 ? 0.4 : -0.4), 1.15, faceZ);
        emissive(seam, R.DOT_CYAN, 0.22);
        g.add(seam);
        di += k;
      }
    }

    // a back-wall screen at cx; returns where to lay its data on the glass.
    function screenPanel(cx: number) {
      const sz = R.WALL_Z + 0.12;
      const bezel = meshBox(1.9, 1.2, 0.04, R.CAP);
      bezel.position.set(cx, R.SCREEN_Y, sz - 0.02);
      bezel.castShadow = false;
      g.add(bezel);
      const panel = meshBox(1.8, 1.1, 0.06, R.SCREEN_BG);
      panel.position.set(cx, R.SCREEN_Y, sz);
      emissive(panel, R.SCREEN_BG, 0.25);
      g.add(panel);
      return { cx, sz: sz + 0.04, midY: R.SCREEN_Y };
    }

    // Screen A: a row of data bars that breathe up and down, gently.
    {
      const s = screenPanel(-R.SCREEN_X);
      const bottomY = s.midY - 0.5;
      const maxH = 0.86;
      for (let i = 0; i < 7; i++) {
        const col = i % 2 === 0 ? R.SCREEN_A : R.SCREEN_B;
        const bar = meshBox(0.14, maxH, 0.03, col);
        bar.position.set(s.cx - 0.66 + i * 0.22, bottomY + maxH / 2, s.sz);
        emissive(bar, col, 0.7);
        bars.push({ mesh: bar, bottomY, maxH, hz: R.BAR_HZ * (0.7 + 0.1 * i), phase: i * 0.9 });
        g.add(bar);
      }
    }

    // Screen B: log lines that scroll slowly upward and wrap around.
    {
      const s = screenPanel(R.SCREEN_X);
      const topY = s.midY + 0.48;
      const botY = s.midY - 0.48;
      for (let i = 0; i < 5; i++) {
        const col = i % 2 === 0 ? R.SCREEN_B : R.SCREEN_A;
        const line = meshBox(1.45, 0.05, 0.03, col);
        line.position.set(s.cx, botY + (i / 5) * (topY - botY), s.sz);
        emissive(line, col, 0.6);
        lines.push({ mesh: line, topY, botY, speed: R.SCROLL_SPEED * (0.8 + 0.1 * i) });
        g.add(line);
      }
    }

    // The gentle motion. Blinks are smooth sine fades (no hard on/off), bars
    // breathe, lines drift. All slow; the caller ticks this on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const d of dots) {
        d.mesh.material.emissiveIntensity = d.min + (d.max - d.min) * (0.5 + 0.5 * Math.sin(2 * Math.PI * d.hz * t + d.phase));
      }
      for (const b of bars) {
        const s = 0.18 + 0.78 * (0.5 + 0.5 * Math.sin(2 * Math.PI * b.hz * t + b.phase));
        b.mesh.scale.y = s;
        b.mesh.position.y = b.bottomY + (b.maxH * s) / 2;
      }
      const dt = STAGING.TICK_MS / 1000;
      for (const l of lines) {
        let y = l.mesh.position.y + l.speed * dt;
        if (y > l.topY) y = l.botY;
        l.mesh.position.y = y;
      }
    }

    return { group: g, tick };
  }

  // ---- Tourism Hub: a calm Colonial Williamsburg VILLAGE wrapped around the build,
  // the outdoor counterpart to the Tech Office server room. A grassy green + sandy
  // path, a few primitive colonial buildings + far rooftops lining the sides and
  // back, a low white rail fence, trees, a flag, a well, and a few slow distant
  // visitors. Warm daytime palette. Everything obeys TOURISM_VILLAGE's clearance
  // rule (tall props at |x| >= CLEAR_X unless behind the build at z <= BACK_Z; low
  // props just clear the build footprint), so the village never sits in front of
  // the decision panels, the build spot, or the assembling scene. Returns its Group
  // + a tick(clock) the caller drives on setInterval (rAF pauses in the headset).
  // Same { group, tick } contract the server room uses. ----
  function buildTourismStopScene(): { group: Group; tick: (clock: number) => void } {
    const V = TOURISM_VILLAGE;
    const C = V.COLOR;
    const g = new Group();
    const swayers: { mesh: any; baseX: number; amp: number; phase: number }[] = [];
    const flags: { mesh: any; phase: number }[] = [];
    const visitors: { g: Group; baseX: number; phase: number }[] = [];

    // the green underfoot, wide enough to replace the indoor floor with open lawn,
    // plus a sandy path leading from the student up into the village.
    const grass = meshBox(16, 0.12, 16, C.grass);
    grass.position.set(0, V.GROUND_Y, 0.5);
    g.add(grass);
    const approach = meshBox(1.6, 0.02, 9, C.path);
    approach.position.set(0.2, 0.01, 3.6);
    g.add(approach);

    // a colonial building from primitives: brick/clapboard body, a hip roof (a
    // 4-sided pyramid, faces aligned to the walls), a chimney, white trim, a door,
    // and two plain daylight windows on the front (+z, toward the student). Windows
    // are NOT emissive, so the backdrop never glows or competes with the build.
    function colonialBuilding(
      x: number, z: number, w: number, h: number, d: number,
      wallKey: string, roofKey: string, kind: string,
    ) {
      const wall = (C as any)[wallKey], roofC = (C as any)[roofKey];
      const body = meshBox(w, h, d, wall);
      body.position.set(x, h / 2, z);
      g.add(body);
      const span = Math.max(w, d);
      const roofH = span * 0.42;
      const roof = meshCone(span * 0.8, roofH, roofC, 4);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, h + roofH / 2, z);
      g.add(roof);
      const chim = meshBox(0.12, 0.34, 0.12, C.chimney);
      chim.position.set(x + w * 0.28, h + 0.2, z - d * 0.18);
      g.add(chim);
      const fz = z + d / 2 + 0.012;
      const trim = meshBox(w * 0.96, 0.06, 0.02, C.trim);
      trim.position.set(x, h - 0.05, fz);
      g.add(trim);
      const door = meshBox(0.16, 0.3, 0.02, C.door);
      door.position.set(x, 0.15, fz);
      g.add(door);
      for (const wx of [x - w * 0.26, x + w * 0.26]) {
        const win = meshBox(0.16, 0.18, 0.02, C.window);
        win.position.set(wx, h * 0.55, fz);
        g.add(win);
      }
      if (kind === "meeting") {
        const cup = meshBox(0.22, 0.18, 0.22, C.cupola);
        cup.position.set(x, h + roofH + 0.09, z);
        g.add(cup);
        const spire = meshCone(0.08, 0.26, C.spire, 8);
        spire.position.set(x, h + roofH + 0.3, z);
        g.add(spire);
      }
    }
    for (const b of V.HOUSES) {
      colonialBuilding(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
    }
    // simple far rooftops for a town skyline (body + roof), well behind everything.
    for (const rp of V.FAR_ROOFS) {
      const house = meshBox(1.1, 0.7, 1.0, C.brickA);
      house.position.set(rp[0], 0.35, rp[1]);
      g.add(house);
      const roof = meshCone(0.95, 0.5, C.roofA, 4);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(rp[0], 0.9, rp[1]);
      g.add(roof);
    }

    // a leafy tree: a trunk + a canopy that sways slowly side to side.
    for (const sp of V.TREES) {
      const s = sp[2];
      const trunk = meshCyl(0.1 * s, 0.14 * s, 1.1 * s, C.trunk);
      trunk.position.set(sp[0], 0.55 * s, sp[1]);
      g.add(trunk);
      const canopy = meshSphere(0.68 * s, C.leaf);
      canopy.position.set(sp[0], 1.25 * s, sp[1]);
      g.add(canopy);
      swayers.push({ mesh: canopy, baseX: sp[0], amp: V.TREE_SWAY * s, phase: sp[0] * 0.7 + sp[1] * 0.3 });
    }

    // a low white rail fence (two rails + sparse posts) lining the green's edges.
    for (const fc of V.FENCES) {
      const fx = fc[0], fz = fc[1], len = fc[2], axis = fc[3];
      for (const ry of [V.FENCE_H * 0.55, V.FENCE_H]) {
        const rail = axis === "z" ? meshBox(0.04, 0.04, len, C.fence) : meshBox(len, 0.04, 0.04, C.fence);
        rail.position.set(fx, ry, fz);
        g.add(rail);
      }
      const n = Math.max(2, Math.round(len / 0.9));
      for (let i = 0; i <= n; i++) {
        const f = i / n - 0.5;
        const post = meshBox(0.05, V.FENCE_H + 0.06, 0.05, C.fence);
        post.position.set(axis === "x" ? fx + f * len : fx, (V.FENCE_H + 0.06) / 2, axis === "z" ? fz + f * len : fz);
        g.add(post);
      }
    }

    // a tall flagpole on the green with a colonial banner that waves gently.
    const pole = meshCyl(0.035, 0.035, 2.4, C.flagpole);
    pole.position.set(V.FLAG_POS[0], 1.2, V.FLAG_POS[2]);
    g.add(pole);
    const flag = meshBox(0.7, 0.42, 0.03, C.banner);
    flag.position.set(V.FLAG_POS[0] + 0.35, 2.12, V.FLAG_POS[2]);
    g.add(flag);
    flags.push({ mesh: flag, phase: 0 });

    // a little colonial well for charm, behind the build.
    {
      const wx = V.WELL_POS[0], wz = V.WELL_POS[2];
      const stone = meshCyl(0.22, 0.24, 0.4, C.wellStone);
      stone.position.set(wx, 0.2, wz);
      g.add(stone);
      for (const sx of [-0.2, 0.2]) {
        const wpost = meshCyl(0.025, 0.025, 0.5, C.flagpole);
        wpost.position.set(wx + sx, 0.55, wz);
        g.add(wpost);
      }
      const wroof = meshCone(0.34, 0.2, C.wellRoof, 4);
      wroof.rotation.y = Math.PI / 4;
      wroof.position.set(wx, 0.9, wz);
      g.add(wroof);
    }

    // a few distant visitors strolling the green edges (a body + head Group we can
    // bob/sway). Slow and calm; well clear of the build footprint.
    for (const vp of V.VISITORS) {
      const vg = new Group();
      const body = meshCyl(0.06, 0.08, 0.28, (C as any)[vp[2]]);
      body.position.set(0, 0.14, 0);
      vg.add(body);
      const head = meshSphere(0.08, C.head);
      head.position.set(0, 0.34, 0);
      vg.add(head);
      vg.position.set(vp[0], 0, vp[1]);
      g.add(vg);
      visitors.push({ g: vg, baseX: vp[0], phase: vp[0] * 1.7 + vp[1] });
    }

    // The gentle life: canopies drift, the flag waves, distant visitors bob and
    // sway slowly. All slow, nothing flashes; the caller ticks this on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const s of swayers) {
        s.mesh.position.x = s.baseX + Math.sin(2 * Math.PI * V.TREE_HZ * t + s.phase) * s.amp;
      }
      for (const f of flags) {
        const w = Math.sin(2 * Math.PI * V.FLAG_HZ * t + f.phase);
        f.mesh.rotation.z = w * V.FLAG_SWING;
        f.mesh.scale.x = 1 + 0.12 * w;
      }
      for (const v of visitors) {
        v.g.position.y = Math.abs(Math.sin(2 * Math.PI * V.VISITOR_HZ * t + v.phase)) * V.VISITOR_BOB;
        v.g.position.x = v.baseX + Math.sin(2 * Math.PI * V.VISITOR_HZ * 0.5 * t + v.phase) * V.VISITOR_SWAY;
      }
    }

    return { group: g, tick };
  }

  // ---- Modern Farm: a calm Shenandoah Valley wrapped around the build, the outdoor
  // counterpart to the Tech Office server room and the Tourism village. Rolling green
  // underfoot, the Blue Ridge mountains hazing the horizon, distant cropland stripes,
  // a red barn + silo (echoing the hub landmark), a slowly turning windmill, split-rail
  // fences, hay bales, trees, and a few drifting clouds. Everything obeys FARM_VALLEY's
  // clearance rule (tall props at |x| >= CLEAR_X unless behind the build at z <= BACK_Z;
  // low props just clear the footprint), so the valley never sits in front of the panels,
  // the build spot, or the assembling field. Same { group, tick } contract the server
  // room and village use; the caller ticks it on setInterval (rAF pauses in the headset). ----
  function buildFarmStopScene(): { group: Group; tick: (clock: number) => void } {
    const V = FARM_VALLEY;
    const C = V.COLOR;
    const g = new Group();
    const swayers: { mesh: any; baseX: number; amp: number; phase: number }[] = [];
    const clouds: { g: Group; baseX: number; phase: number }[] = [];
    const fans: { g: Group }[] = [];

    // the valley floor + a dirt lane leading from the student up into the farm.
    const grass = meshBox(16, 0.12, 16, C.grass);
    grass.position.set(0, V.GROUND_Y, 0.5);
    g.add(grass);
    const lane = meshBox(1.6, 0.02, 9, C.path);
    lane.position.set(0.2, 0.01, 3.6);
    g.add(lane);

    // the Blue Ridge: wide, low, rounded ridges sunk into the horizon (a flattened
    // sphere shows just its dome, so it reads as a soft mountain line, never a hard edge).
    for (const r of V.RIDGES) {
      const ridge = meshSphere(1, (C as any)[r[4]]);
      ridge.scale.set(r[2] / 2, r[3], 1.6);
      ridge.position.set(r[0], V.GROUND_Y - r[3] * 0.45, r[1]);
      g.add(ridge);
    }

    // rolling green hills between the valley floor and the Blue Ridge: the same
    // flattened-sphere swells, greener, lower, and a touch nearer, so the ground
    // reads as gently rolling rather than flat. All sit behind the build.
    for (const h of V.HILLS) {
      const hill = meshSphere(1, (C as any)[h[4]]);
      hill.scale.set(h[2] / 2, h[3], 2.2);
      hill.position.set(h[0], V.GROUND_Y - h[3] * 0.55, h[1]);
      g.add(hill);
    }

    // distant cropland stripes: low wide slabs that drift a touch in the wind.
    for (const f of V.FIELDS) {
      const slab = meshBox(f[2], 0.04, f[3], (C as any)[f[4]]);
      slab.position.set(f[0], V.GROUND_Y + 0.02, f[1]);
      g.add(slab);
      swayers.push({ mesh: slab, baseX: f[0], amp: V.CROP_SWAY, phase: f[0] * 0.6 + f[1] * 0.2 });
    }

    // the red barn (matching the hub landmark): body + roof + white door & trim beam.
    {
      const x = V.BARN_POS[0], z = V.BARN_POS[2];
      const body = meshBox(1.4, 0.95, 1.2, C.barn);
      body.position.set(x, 0.475, z);
      g.add(body);
      const roof = meshBox(1.55, 0.28, 1.32, C.barnRoof);
      roof.position.set(x, 1.05, z);
      g.add(roof);
      const fz = z + 0.62;
      const door = meshBox(0.42, 0.55, 0.02, C.barnTrim);
      door.position.set(x, 0.275, fz);
      g.add(door);
      const beamH = meshBox(0.42, 0.05, 0.02, C.barn);
      beamH.position.set(x, 0.36, fz + 0.005);
      g.add(beamH);
      const beamV = meshBox(0.05, 0.55, 0.02, C.barn);
      beamV.position.set(x, 0.275, fz + 0.005);
      g.add(beamV);
    }
    // a grain silo beside the barn: a tall cylinder with a domed cap.
    {
      const x = V.SILO_POS[0], z = V.SILO_POS[2];
      const silo = meshCyl(0.32, 0.32, 1.3, C.silo);
      silo.position.set(x, 0.65, z);
      g.add(silo);
      const cap = meshSphere(0.32, C.siloCap);
      cap.scale.y = 0.6;
      cap.position.set(x, 1.3, z);
      g.add(cap);
    }
    // a classic farm windmill: a tapered tower with a multi-blade fan that turns
    // slowly, plus a tail vane. The fan is a child Group we spin in tick().
    {
      const x = V.WINDMILL_POS[0], z = V.WINDMILL_POS[2];
      const tower = meshCyl(0.05, 0.15, 2.2, C.windmillTower);
      tower.position.set(x, 1.1, z);
      g.add(tower);
      const fan = new Group();
      fan.position.set(x, 2.2, z + 0.12);
      const hub = meshCyl(0.06, 0.06, 0.06, C.windmillTower);
      hub.rotation.x = Math.PI / 2;
      fan.add(hub);
      for (let i = 0; i < 7; i++) {
        const blade = meshBox(0.62, 0.07, 0.015, C.windmillBlade);
        blade.rotation.z = (i / 7) * Math.PI * 2;
        fan.add(blade);
      }
      g.add(fan);
      fans.push({ g: fan });
      // the tail vane behind the tower.
      const boom = meshBox(0.5, 0.02, 0.02, C.windmillTower);
      boom.position.set(x, 2.2, z - 0.28);
      g.add(boom);
      const vane = meshBox(0.02, 0.22, 0.26, C.windmillBlade);
      vane.position.set(x, 2.2, z - 0.5);
      g.add(vane);
    }

    // leafy trees framing the valley: a trunk + a canopy that sways slowly.
    for (const sp of V.TREES) {
      const s = sp[2];
      const trunk = meshCyl(0.1 * s, 0.14 * s, 1.1 * s, C.trunk);
      trunk.position.set(sp[0], 0.55 * s, sp[1]);
      g.add(trunk);
      const canopy = meshSphere(0.68 * s, C.leaf);
      canopy.position.set(sp[0], 1.25 * s, sp[1]);
      g.add(canopy);
      swayers.push({ mesh: canopy, baseX: sp[0], amp: V.TREE_SWAY * s, phase: sp[0] * 0.7 + sp[1] * 0.3 });
    }

    // low split-rail wood fences (three rails + posts) lining the field's edges.
    for (const fc of V.FENCES) {
      const fx = fc[0], fz = fc[1], len = fc[2], axis = fc[3];
      for (const ry of [V.FENCE_H * 0.4, V.FENCE_H * 0.7, V.FENCE_H]) {
        const rail = axis === "z" ? meshBox(0.05, 0.04, len, C.fence) : meshBox(len, 0.04, 0.05, C.fence);
        rail.position.set(fx, ry, fz);
        g.add(rail);
      }
      const n = Math.max(2, Math.round(len / 1.0));
      for (let i = 0; i <= n; i++) {
        const f = i / n - 0.5;
        const post = meshBox(0.07, V.FENCE_H + 0.08, 0.07, C.fence);
        post.position.set(axis === "x" ? fx + f * len : fx, (V.FENCE_H + 0.08) / 2, axis === "z" ? fz + f * len : fz);
        g.add(post);
      }
    }

    // round hay bales (a cylinder laid on its side) dotting the field edges.
    for (const hb of V.HAY_BALES) {
      const s = hb[2];
      const bale = meshCyl(0.22 * s, 0.22 * s, 0.4 * s, C.hay);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(hb[0], 0.22 * s, hb[1]);
      g.add(bale);
    }

    // a few soft clouds (clusters of white spheres) drifting slowly across the sky.
    for (const cl of V.CLOUDS) {
      const cg = new Group();
      for (const off of [[-0.5, 0, 0, 0.5], [0.2, 0.1, 0, 0.6], [0.7, -0.05, 0.1, 0.45]]) {
        const puff = meshSphere(off[3] * cl[3], C.cloud);
        puff.position.set(off[0] * cl[3], off[1] * cl[3], off[2] * cl[3]);
        cg.add(puff);
      }
      cg.position.set(cl[0], cl[1], cl[2]);
      g.add(cg);
      clouds.push({ g: cg, baseX: cl[0], phase: cl[0] + cl[2] });
    }

    // The gentle life: canopies + distant fields drift, the windmill fan turns slowly,
    // clouds drift and loop. All slow, nothing flashes; the caller ticks on setInterval.
    function tick(clock: number) {
      const t = clock / 1000;
      for (const s of swayers) {
        s.mesh.position.x = s.baseX + Math.sin(2 * Math.PI * V.TREE_HZ * t + s.phase) * s.amp;
      }
      for (const fn of fans) {
        fn.g.rotation.z = 2 * Math.PI * V.WINDMILL_HZ * t;
      }
      for (const c of clouds) {
        const drift = ((V.CLOUD_HZ * t + c.phase) % 1) - 0.5;
        c.g.position.x = c.baseX + drift * V.CLOUD_DRIFT * 8;
      }
    }

    return { group: g, tick };
  }

  // Each stop owns a calm BACKDROP scene, registered here as { group, tick }: the
  // group shows/hides with the stop, and ONE shared loop ticks whichever stop is
  // active. Generic on purpose — adding a stop is just another registerStopScene
  // call; the loop never special-cases a stop id.
  const stopScenes: { [id: string]: Group } = {};
  const stopSceneTicks: { [id: string]: (clock: number) => void } = {};
  function registerStopScene(id: string, built: { group: Group; tick: (clock: number) => void }) {
    built.group.visible = false;
    scene.add(built.group);
    stopScenes[id] = built.group;
    stopSceneTicks[id] = built.tick;
  }
  registerStopScene("tech", buildTechStopScene());       // the Tech Office server room
  registerStopScene("tourism", buildTourismStopScene()); // the Colonial Williamsburg green
  registerStopScene("farm", buildFarmStopScene());       // the Shenandoah Valley farm

  // One shared loop gently animates whichever stop's backdrop is showing (server
  // room dots/screens, or the Tourism treeline/flag). setInterval, not rAF (rAF
  // pauses in the headset); idle on the hub, where no stop scene is shown.
  let sceneClock = 0;
  setInterval(function () {
    sceneClock += STAGING.TICK_MS;
    if (currentView === "hub") return;
    const tick = activeStopId ? stopSceneTicks[activeStopId] : null;
    if (tick) tick(sceneClock);
  }, STAGING.TICK_MS);

  function showStopScene(id: string) {
    for (const key in stopScenes) stopScenes[key].visible = key === id;
  }
  function hideAllStopScenes() {
    for (const key in stopScenes) stopScenes[key].visible = false;
  }

  // ======================================================================
  // STOP STAGING  —  the build that assembles itself as the student decides.
  // Generic by design: a stop registers a staging object; the runner calls
  // reset() at the start of a visit and addStage(decisionIndex, optionIndex,
  // reaction) after each pick. The staging owns its own Group (parented to the
  // stop's calm scene, so it shows/hides with it) and animates from ONE shared
  // setInterval (rAF pauses in the headset). Only Tech Office has one today; the
  // other lean stops can register their own the same way, so the runner shell
  // never grows a per-stop special case.
  // ======================================================================
  type StopStaging = {
    group: Group;
    reset: () => void;
    addStage: (decisionIndex: number, optionIndex: number, reaction: StageReaction) => void;
    tick: (clock: number) => void;
  };
  const stopStagings: { [id: string]: StopStaging } = {};
  type GlowRole = "building" | "power" | "runtime";
  type TourismRole = "booth" | "attraction" | "site"; // the Tourism build's three stages
  type FarmRole = "field" | "water" | "harvest";       // the Modern Farm's three stages

  // ---- Tech Office: a data center built piece by piece on the lot ahead of the
  // student. Decision 1 raises the BUILDING (with a cue for the site chosen),
  // Decision 2 adds POWER (transformer, lines, and solar panels if chosen),
  // Decision 3 adds WORKERS and the internet CABLE. Each piece then THRIVES,
  // STRUGGLES, or runs NEUTRAL based on that pick: a steady bright glow with data
  // flowing, a dim slow flicker with stalled data, or a quiet steady hum. Every
  // bit of motion is slow and gentle on purpose (kids in a headset). ----
  function buildTechStaging(): StopStaging {
    const C = TECH_BUILD.COLOR;
    const group = new Group();
    group.position.z = TECH_BUILD.FORWARD; // bring the whole construction site toward the student

    // role-tagged animated lights and cable "data" flows, all serviced by tick().
    const glowParts: { mesh: any; role: GlowRole }[] = [];
    const flows: { dots: any[]; a: number[]; b: number[]; role: GlowRole; t: number }[] = [];
    const workers: { g: Group }[] = [];
    // each stage's current reaction (null until built) and its ease-in progress.
    const reaction: { building: StageReaction | null; power: StageReaction | null; runtime: StageReaction | null } =
      { building: null, power: null, runtime: null };
    const appear = { building: 0, power: 0, runtime: 0 };

    // register a mesh as an animated light (intensity driven by its stage's reaction).
    function lit(mesh: any, color: string, role: GlowRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }
    // a fixed self-lit glow that does not animate (used for static site cues).
    function glowConst(mesh: any, color: string, intensity: number) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = intensity;
      return mesh;
    }
    // a string of little lights that travel a->b along a cable and loop.
    function addFlow(parent: Group, a: number[], b: number[], role: GlowRole) {
      const dots: any[] = [];
      for (let i = 0; i < STAGING.FLOW_DOTS; i++) {
        const d = meshSphere(STAGING.FLOW_DOT_R, C.flow);
        (d.material as any).emissive = new Color(C.flow);
        (d.material as any).emissiveIntensity = 0;
        d.visible = false;
        parent.add(d);
        dots.push(d);
      }
      flows.push({ dots, a, b, role, t: 0 });
    }

    // ---- the empty lot (shown the moment you arrive, before the first pick) ----
    const lot = meshBox(TECH_BUILD.LOT_W, TECH_BUILD.LOT_THICK, TECH_BUILD.LOT_D, C.pad);
    lot.position.set(TECH_BUILD.LOT[0], TECH_BUILD.LOT[1], TECH_BUILD.LOT[2]);
    group.add(lot);
    const lotTop = TECH_BUILD.LOT[1] + TECH_BUILD.LOT_THICK / 2;
    // four legs so the lot reads as a build table standing on the floor.
    const padBottom = TECH_BUILD.LOT[1] - TECH_BUILD.LOT_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, padBottom, 0.12, C.line);
        leg.position.set(lx, padBottom / 2, TECH_BUILD.LOT[2] + lz);
        group.add(leg);
      }
    }
    const bx = TECH_BUILD.BLD_POS[0], bz = TECH_BUILD.BLD_POS[2];
    const bW = TECH_BUILD.BLD_W, bH = TECH_BUILD.BLD_H, bD = TECH_BUILD.BLD_D;

    // =================== STAGE 1: the building + the site cue ===================
    const buildingStage = new Group();
    buildingStage.visible = false;
    group.add(buildingStage);

    const walls = meshBox(bW, bH, bD, C.wall);
    walls.position.set(bx, lotTop + bH / 2, bz);
    buildingStage.add(walls);
    const roof = meshBox(bW + 0.04, 0.06, bD + 0.04, C.roof);
    roof.position.set(bx, lotTop + bH + 0.03, bz);
    buildingStage.add(roof);
    // a 2x3 grid of windows on the front face (+z, toward the student) — the lights.
    const frontZ = bz + bD / 2 + 0.011;
    for (const wx of [bx - 0.2, bx + 0.2]) {
      for (const wy of [lotTop + 0.22, lotTop + 0.4, lotTop + 0.58]) {
        const win = meshBox(0.16, 0.12, 0.012, C.window);
        win.position.set(wx, wy, frontZ);
        buildingStage.add(lit(win, C.window, "building"));
      }
    }

    // three swappable site cues; addStage reveals the one that matches the pick.
    const cueNoVA = new Group();
    const cueCountry = new Group();
    const cueDowntown = new Group();
    buildingStage.add(cueNoVA, cueCountry, cueDowntown);
    function siteTile(color: string) {
      const tile = meshBox(1.35, 0.02, 1.35, color);
      tile.position.set(bx, lotTop + 0.012, bz);
      return tile;
    }
    // Northern Virginia: green ground + a glowing "fast line" leading toward the net.
    cueNoVA.add(siteTile(C.grass));
    const fastLine = meshBox(0.7, 0.012, 0.08, C.flow);
    fastLine.position.set(bx - 0.78, lotTop + 0.02, bz + 0.5);
    cueNoVA.add(glowConst(fastLine, C.flow, 0.6));
    // Countryside: dry dirt + a lone tree far off, to read "out on its own".
    cueCountry.add(siteTile(C.dirt));
    const trunk = meshCyl(0.04, 0.05, 0.3, C.tree);
    trunk.position.set(0.95, lotTop + 0.15, -1.7);
    cueCountry.add(trunk);
    const leaf = meshCone(0.22, 0.42, C.leaf);
    leaf.position.set(0.95, lotTop + 0.5, -1.7);
    cueCountry.add(leaf);
    // Downtown: concrete + tall neighbors crowding the lot, no room to grow.
    cueDowntown.add(siteTile(C.concrete));
    const n1 = meshBox(0.5, 1.4, 0.5, "#7d868f");
    n1.position.set(-1.15, lotTop + 0.7, -1.5);
    cueDowntown.add(n1);
    const n2 = meshBox(0.45, 1.1, 0.45, "#8b949c");
    n2.position.set(0.55, lotTop + 0.55, -1.6);
    cueDowntown.add(n2);
    cueNoVA.visible = cueCountry.visible = cueDowntown.visible = false;

    // =============== STAGE 2: power (transformer, lines, optional solar) ========
    const powerStage = new Group();
    powerStage.visible = false;
    group.add(powerStage);
    const tx = TECH_BUILD.TRANSFORMER_POS[0], tz = TECH_BUILD.TRANSFORMER_POS[2];
    const trans = meshBox(0.3, 0.34, 0.3, C.transformer);
    trans.position.set(tx, lotTop + 0.17, tz);
    powerStage.add(trans);
    for (const ox of [-0.08, 0.08]) {
      const bush = meshCyl(0.03, 0.03, 0.1, C.bushing);
      bush.position.set(tx + ox, lotTop + 0.39, tz);
      powerStage.add(bush);
    }
    const indicator = meshBox(0.09, 0.05, 0.012, C.indicator);
    indicator.position.set(tx, lotTop + 0.2, tz + 0.151);
    powerStage.add(lit(indicator, C.indicator, "power"));
    // a pole and a line carrying power across to the building; data flows along it.
    const pole = meshCyl(0.02, 0.02, 0.7, C.pole);
    pole.position.set(tx, lotTop + 0.35, tz);
    powerStage.add(pole);
    const bRightX = bx + bW / 2;
    const lineY = lotTop + 0.66;
    const line = meshBox(tx - bRightX, 0.02, 0.02, C.line);
    line.position.set((tx + bRightX) / 2, lineY, tz);
    powerStage.add(line);
    addFlow(powerStage, [tx, lineY, tz], [bRightX, lineY, bz + bD / 2 - 0.1], "power");
    // solar panels — only when the student adds them (the "smart, modern touch").
    const solarGroup = new Group();
    powerStage.add(solarGroup);
    for (const sx of [TECH_BUILD.SOLAR_POS[0] - 0.18, TECH_BUILD.SOLAR_POS[0] + 0.2]) {
      const post = meshCyl(0.02, 0.02, 0.2, C.pole);
      post.position.set(sx, lotTop + 0.1, TECH_BUILD.SOLAR_POS[2]);
      solarGroup.add(post);
      const panel = meshBox(0.34, 0.02, 0.26, C.solar);
      panel.position.set(sx, lotTop + 0.26, TECH_BUILD.SOLAR_POS[2]);
      panel.rotation.x = -0.6;
      solarGroup.add(panel);
      const gleam = meshBox(0.3, 0.006, 0.04, C.solarGleam);
      gleam.position.set(sx, lotTop + 0.29, TECH_BUILD.SOLAR_POS[2] + 0.04);
      gleam.rotation.x = -0.6;
      solarGroup.add(lit(gleam, C.solarGleam, "power"));
    }
    solarGroup.visible = false;

    // =============== STAGE 3: workers + the internet cable ======================
    const runtimeStage = new Group();
    runtimeStage.visible = false;
    group.add(runtimeStage);
    // an internet node (a little cloud on a post) at the edge of the lot.
    const nx = TECH_BUILD.NODE_POS[0], nz = TECH_BUILD.NODE_POS[2];
    const nodePost = meshCyl(0.025, 0.025, 0.52, C.pole);
    nodePost.position.set(nx, lotTop + 0.26, nz);
    runtimeStage.add(nodePost);
    for (const puffAt of [[-0.1, 0.6, 0, 0.12], [0.08, 0.62, 0.02, 0.1], [0.0, 0.58, -0.06, 0.1]]) {
      const puff = meshSphere(puffAt[3], C.cloud);
      puff.position.set(nx + puffAt[0], lotTop + puffAt[1], nz + puffAt[2]);
      runtimeStage.add(puff);
    }
    const nodeGlow = meshSphere(0.05, C.nodeGlow);
    nodeGlow.position.set(nx, lotTop + 0.6, nz + 0.12);
    runtimeStage.add(lit(nodeGlow, C.nodeGlow, "runtime"));
    // the cable from the building to the internet, carrying data when it runs well.
    const bLeftX = bx - bW / 2;
    const cableY = lotTop + 0.5;
    const cable = meshBox(bLeftX - nx, 0.018, 0.018, C.line);
    cable.position.set((bLeftX + nx) / 2, cableY, nz);
    runtimeStage.add(cable);
    addFlow(runtimeStage, [bLeftX, cableY, bz], [nx, cableY, nz], "runtime");
    // up to three workers in front (one only, when run with as few people as possible).
    for (const spot of [[-0.75, -0.3], [-0.4, -0.12], [-0.05, -0.32]]) {
      const wg = new Group();
      const body = meshCyl(0.05, 0.06, 0.14, C.vest);
      body.position.set(spot[0], lotTop + 0.07, spot[1]);
      wg.add(body);
      const head = meshSphere(0.045, C.helmet);
      head.position.set(spot[0], lotTop + 0.18, spot[1]);
      wg.add(head);
      runtimeStage.add(wg);
      workers.push({ g: wg });
    }

    const stages: GlowRole[] = ["building", "power", "runtime"];
    const stageGroup: { [k in GlowRole]: Group } = { building: buildingStage, power: powerStage, runtime: runtimeStage };

    // a slow, uneven 0..1 wave for the "struggling" look — gentle, never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.building = reaction.power = reaction.runtime = null;
      appear.building = appear.power = appear.runtime = 0;
      buildingStage.visible = powerStage.visible = runtimeStage.visible = false;
      buildingStage.position.y = powerStage.position.y = runtimeStage.position.y = 0;
      cueNoVA.visible = cueCountry.visible = cueDowntown.visible = false;
      solarGroup.visible = false;
      for (const w of workers) w.g.visible = false;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
      for (const fl of flows) { fl.t = 0; for (const d of fl.dots) d.visible = false; }
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        cueNoVA.visible = optionIndex === 1;     // option 1 = Northern Virginia
        cueCountry.visible = optionIndex === 0;  // option 0 = countryside
        cueDowntown.visible = optionIndex === 2; // option 2 = downtown
        reaction.building = r; appear.building = 0; buildingStage.visible = true;
      } else if (i === 1) {
        solarGroup.visible = optionIndex === 1;  // option 1 = reliable supply + solar
        reaction.power = r; appear.power = 0; powerStage.visible = true;
      } else if (i === 2) {
        const few = optionIndex === 1;           // option 1 = as few people as possible
        for (let k = 0; k < workers.length; k++) workers[k].g.visible = few ? k === 0 : true;
        reaction.runtime = r; appear.runtime = 0; runtimeStage.visible = true;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // run the data flows: smooth when thriving, a trickle when neutral, a crawl
      // (that stalls on the flicker low points) when struggling.
      for (const fl of flows) {
        const r = reaction[fl.role];
        if (!r) { for (const d of fl.dots) d.visible = false; continue; }
        let speed: number, glow: number;
        if (r === "thrive") { speed = STAGING.FLOW_SPEED_THRIVE; glow = STAGING.FLOW_GLOW_THRIVE; }
        else if (r === "neutral") { speed = STAGING.FLOW_SPEED_NEUTRAL; glow = STAGING.FLOW_GLOW_NEUTRAL; }
        else { speed = STAGING.FLOW_SPEED_STRUGGLE * (0.2 + 0.8 * flicker(t)); glow = STAGING.FLOW_GLOW_STRUGGLE; }
        fl.t = (fl.t + speed * (STAGING.TICK_MS / 1000)) % 1;
        const a = fl.a, b = fl.b;
        const vis = appear[fl.role] > 0.2;
        for (let i = 0; i < fl.dots.length; i++) {
          const d = fl.dots[i];
          const f = (fl.t + i / fl.dots.length) % 1;
          d.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
          d.visible = vis;
          (d.material as any).emissiveIntensity = glow * appear[fl.role];
        }
      }
      // a tiny idle bob for the workers when the center is thriving (they're busy).
      const lively = reaction.runtime === "thrive";
      for (let i = 0; i < workers.length; i++) {
        workers[i].g.position.y = lively
          ? Math.abs(Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * t + i)) * STAGING.WORKER_BOB_AMP
          : 0;
      }
    }

    reset();
    return { group, reset, addStage, tick };
  }

  // ---- Tourism Hub: a Colonial Williamsburg village built up choice by choice on
  // the green ahead of the student. The site (a green with two brick buildings) is
  // there from arrival. Decision 1 (pricing) raises the TICKET BOOTH and an arriving
  // crowd sized by the price; Decision 2 (draw) reveals the ATTRACTION (real exhibits,
  // gaudy fakes, or almost nothing) with more or fewer visitors; Decision 3 (crowds vs
  // buildings) sets the SITE's condition (a clean gleam, worn patches, or closed-off
  // ropes) and the final crowd. Each stage then THRIVES (warm steady glow), STRUGGLES
  // (dim uneven flicker), or runs NEUTRAL (a quiet mid glow). Same { group, reset,
  // addStage, tick } contract Tech uses, so the runner drives it unchanged. All motion
  // stays slow and gentle (kids in a headset). ----
  function buildTourismStaging(): StopStaging {
    const T = TOURISM_BUILD;
    const C = T.COLOR;
    const group = new Group();
    group.position.z = T.FORWARD; // bring the village toward the student

    // role-tagged animated lights (intensity follows each stage's reaction).
    const glowParts: { mesh: any; role: TourismRole }[] = [];
    const visitorPalette = [C.visitor, C.visitorAlt, C.visitorAlt2];
    // each stage's reaction (null until built) + its ease-in progress.
    const reaction: { booth: StageReaction | null; attraction: StageReaction | null; site: StageReaction | null } =
      { booth: null, attraction: null, site: null };
    const appear = { booth: 0, attraction: 0, site: 0 };

    // register a mesh as an animated light (driven by its stage's reaction).
    function lit(mesh: any, color: string, role: TourismRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }

    // ---- the green (a raised table) + the colonial buildings already standing ----
    const green = meshBox(T.GREEN_W, T.GREEN_THICK, T.GREEN_D, C.green);
    green.position.set(T.GREEN[0], T.GREEN[1], T.GREEN[2]);
    group.add(green);
    const greenTop = T.GREEN[1] + T.GREEN_THICK / 2;
    const greenBottom = T.GREEN[1] - T.GREEN_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, greenBottom, 0.12, C.post);
        leg.position.set(lx, greenBottom / 2, T.GREEN[2] + lz);
        group.add(leg);
      }
    }
    // a sandy path across the green so it reads as a walkable village.
    const path = meshBox(0.55, 0.012, T.GREEN_D * 0.85, C.path);
    path.position.set(0.15, greenTop + 0.008, T.GREEN[2]);
    group.add(path);

    // a colonial building: brick block + wood roof + white trim + warm windows.
    // The windows are role "site", so they light up with the final-condition pick.
    function colonialBuilding(pos: [number, number, number], w: number, h: number, d: number, cupola: boolean) {
      const cx = pos[0], cz = pos[2];
      const body = meshBox(w, h, d, C.brick);
      body.position.set(cx, greenTop + h / 2, cz);
      group.add(body);
      const roof = meshBox(w + 0.06, 0.06, d + 0.06, C.roof);
      roof.position.set(cx, greenTop + h + 0.03, cz);
      group.add(roof);
      const fz = cz + d / 2 + 0.012;
      const trim = meshBox(w, 0.05, 0.02, C.trim);
      trim.position.set(cx, greenTop + 0.05, fz);
      group.add(trim);
      for (const wx of [cx - w * 0.25, cx + w * 0.25]) {
        const win = meshBox(0.12, 0.16, 0.012, C.window);
        win.position.set(wx, greenTop + h * 0.5, fz);
        group.add(lit(win, C.window, "site"));
      }
      if (cupola) {
        const base = meshBox(0.18, 0.12, 0.18, C.cupola);
        base.position.set(cx, greenTop + h + 0.1, cz);
        group.add(base);
        const spire = meshCone(0.06, 0.18, C.spire);
        spire.position.set(cx, greenTop + h + 0.27, cz);
        group.add(spire);
      }
      return { cx, cz, fz, w, h };
    }
    const hall = colonialBuilding(T.HALL_POS, T.HALL_W, T.HALL_H, T.HALL_D, true);
    const house = colonialBuilding(T.HOUSE_POS, T.HOUSE_W, T.HOUSE_H, T.HOUSE_D, false);

    // a calm visitor figure (body + head) parented to a Group we can bob/sway.
    function makeVisitor(parent: Group, x: number, z: number, color: string) {
      const vg = new Group();
      const body = meshCyl(0.05, 0.07, 0.16, color);
      body.position.set(x, greenTop + 0.08, z);
      vg.add(body);
      const head = meshSphere(0.045, C.head);
      head.position.set(x, greenTop + 0.2, z);
      vg.add(head);
      parent.add(vg);
      return vg;
    }
    // a crowd pool of `max` visitors in a loose cluster; deterministic spots (no rng).
    function makeCrowd(parent: Group, anchor: [number, number, number], max: number) {
      const spots = [
        [0.0, 0.0], [0.24, 0.13], [-0.22, 0.1], [0.13, -0.18], [-0.18, -0.15],
        [0.36, -0.05], [-0.36, -0.02], [0.05, 0.26],
      ];
      const list: { g: Group; phase: number }[] = [];
      for (let i = 0; i < max; i++) {
        const s = spots[i % spots.length];
        const v = makeVisitor(parent, anchor[0] + s[0], anchor[2] + s[1], visitorPalette[i % visitorPalette.length]);
        v.visible = false;
        list.push({ g: v, phase: i * 1.3 });
      }
      return list;
    }

    // =================== STAGE 1: ticket booth + arriving crowd ===================
    const boothStage = new Group();
    boothStage.visible = false;
    group.add(boothStage);
    {
      const bx = T.BOOTH_POS[0], bz = T.BOOTH_POS[2];
      const booth = meshBox(0.34, 0.4, 0.3, C.boothWood);
      booth.position.set(bx, greenTop + 0.2, bz);
      boothStage.add(booth);
      const counter = meshBox(0.38, 0.05, 0.14, C.trim);
      counter.position.set(bx, greenTop + 0.3, bz + 0.18);
      boothStage.add(counter);
      const roof = meshCone(0.34, 0.18, C.boothRoof);
      roof.position.set(bx, greenTop + 0.49, bz);
      roof.rotation.y = Math.PI / 4;
      boothStage.add(roof);
      // the booth lantern + sign: the lit parts that react to the pricing pick.
      const lantern = meshSphere(0.05, C.lantern);
      lantern.position.set(bx + 0.16, greenTop + 0.42, bz + 0.14);
      boothStage.add(lit(lantern, C.lantern, "booth"));
      const sign = meshBox(0.26, 0.12, 0.02, C.lantern);
      sign.position.set(bx, greenTop + 0.52, bz + 0.16);
      boothStage.add(lit(sign, C.lantern, "booth"));
    }
    const crowdBooth = makeCrowd(boothStage, T.CROWD_BOOTH_AT, Math.max(...T.CROWD_BOOTH_N));

    // =================== STAGE 2: the attraction (3 swappable cues) ===============
    const attractStage = new Group();
    attractStage.visible = false;
    group.add(attractStage);
    const ax = T.ATTRACT_POS[0], az = T.ATTRACT_POS[2];
    // cue A: authentic colonial history — a craft table, barrels, a colonial banner.
    const cueAuthentic = new Group();
    attractStage.add(cueAuthentic);
    {
      const table = meshBox(0.5, 0.06, 0.3, C.exhibit);
      table.position.set(ax, greenTop + 0.18, az);
      cueAuthentic.add(table);
      for (const lx of [-0.2, 0.2]) for (const lz of [-0.1, 0.1]) {
        const leg = meshBox(0.04, 0.18, 0.04, C.barrel);
        leg.position.set(ax + lx, greenTop + 0.09, az + lz);
        cueAuthentic.add(leg);
      }
      for (const bx2 of [-0.34, 0.34]) {
        const barrel = meshCyl(0.08, 0.08, 0.18, C.barrel);
        barrel.position.set(ax + bx2, greenTop + 0.09, az - 0.04);
        cueAuthentic.add(barrel);
      }
      const bpole = meshCyl(0.02, 0.02, 0.6, C.signPost);
      bpole.position.set(ax + 0.12, greenTop + 0.3, az + 0.16);
      cueAuthentic.add(bpole);
      const banner = meshBox(0.02, 0.24, 0.3, C.banner);
      banner.position.set(ax + 0.13, greenTop + 0.46, az + 0.31);
      cueAuthentic.add(lit(banner, C.banner, "attraction"));
      const lamp = meshSphere(0.045, C.lantern);
      lamp.position.set(ax - 0.12, greenTop + 0.4, az + 0.16);
      cueAuthentic.add(lit(lamp, C.lantern, "attraction"));
    }
    // cue B: flashy fake — a gaudy oversized arch in clashing neon colors.
    const cueFlashy = new Group();
    attractStage.add(cueFlashy);
    {
      for (const sx of [-0.3, 0.3]) {
        const leg = meshBox(0.1, 0.7, 0.1, sx < 0 ? C.gaudy1 : C.gaudy2);
        leg.position.set(ax + sx, greenTop + 0.35, az);
        cueFlashy.add(lit(leg, sx < 0 ? C.gaudy1 : C.gaudy2, "attraction"));
      }
      const top = meshBox(0.82, 0.12, 0.12, C.gaudy3);
      top.position.set(ax, greenTop + 0.74, az);
      cueFlashy.add(lit(top, C.gaudy3, "attraction"));
      const blob = meshSphere(0.14, C.gaudy1);
      blob.position.set(ax, greenTop + 0.92, az);
      cueFlashy.add(lit(blob, C.gaudy1, "attraction"));
    }
    // cue C: do nothing — a lone empty signpost, almost nothing to see.
    const cueNothing = new Group();
    attractStage.add(cueNothing);
    {
      const post = meshCyl(0.025, 0.025, 0.5, C.signPost);
      post.position.set(ax, greenTop + 0.25, az);
      cueNothing.add(post);
      const board = meshBox(0.28, 0.16, 0.02, C.signPost);
      board.position.set(ax, greenTop + 0.5, az);
      cueNothing.add(board);
    }
    cueAuthentic.visible = cueFlashy.visible = cueNothing.visible = false;
    const crowdAttract = makeCrowd(attractStage, T.CROWD_ATTRACT_AT, Math.max(...T.CROWD_ATTRACT_N));

    // =================== STAGE 3: the site's condition (3 swappable cues) =========
    const siteStage = new Group();
    siteStage.visible = false;
    group.add(siteStage);
    // cue: smart limits — fresh and well-kept (a clean gleam + tidy flower boxes).
    const cueClean = new Group();
    siteStage.add(cueClean);
    for (const b of [hall, house]) {
      const gleam = meshBox(b.w * 0.9, 0.04, 0.02, C.cleanGleam);
      gleam.position.set(b.cx, greenTop + b.h - 0.02, b.fz);
      cueClean.add(lit(gleam, C.cleanGleam, "site"));
      const box = meshBox(b.w * 0.7, 0.05, 0.06, C.spire);
      box.position.set(b.cx, greenTop + b.h * 0.32, b.fz + 0.02);
      cueClean.add(box);
    }
    // cue: huge crowds — worn, dingy patches across the building fronts.
    const cueWorn = new Group();
    siteStage.add(cueWorn);
    for (const b of [hall, house]) {
      for (const p of [[-0.22, 0.55], [0.2, 0.32], [0.0, 0.72]]) {
        const patch = meshBox(0.14, 0.12, 0.012, C.worn);
        patch.position.set(b.cx + p[0] * b.w, greenTop + b.h * p[1], b.fz + 0.003);
        cueWorn.add(patch);
      }
    }
    // cue: close off — ropes on posts across the front, the site mostly shut.
    const cueClosed = new Group();
    siteStage.add(cueClosed);
    {
      const frontZ = T.GREEN[2] + 0.35;
      for (const px of [-0.8, -0.27, 0.27, 0.8]) {
        const rpost = meshCyl(0.02, 0.02, 0.3, C.post);
        rpost.position.set(px, greenTop + 0.15, frontZ);
        cueClosed.add(rpost);
      }
      for (const seg of [[-0.8, -0.27], [-0.27, 0.27], [0.27, 0.8]]) {
        const rope = meshBox(seg[1] - seg[0], 0.02, 0.02, C.rope);
        rope.position.set((seg[0] + seg[1]) / 2, greenTop + 0.26, frontZ);
        cueClosed.add(lit(rope, C.rope, "site"));
      }
    }
    cueClean.visible = cueWorn.visible = cueClosed.visible = false;
    const crowdSite = makeCrowd(siteStage, T.CROWD_SITE_AT, Math.max(...T.CROWD_SITE_N));

    const stages: TourismRole[] = ["booth", "attraction", "site"];
    const stageGroup: { [k in TourismRole]: Group } = { booth: boothStage, attraction: attractStage, site: siteStage };
    const crowds: { [k in TourismRole]: { g: Group; phase: number }[] } = { booth: crowdBooth, attraction: crowdAttract, site: crowdSite };

    // a slow, uneven 0..1 wave for the "struggling/troubled" look — never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }
    function setCrowdCount(list: { g: Group; phase: number }[], n: number) {
      for (let i = 0; i < list.length; i++) list[i].g.visible = i < n;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.booth = reaction.attraction = reaction.site = null;
      appear.booth = appear.attraction = appear.site = 0;
      boothStage.visible = attractStage.visible = siteStage.visible = false;
      boothStage.position.y = attractStage.position.y = siteStage.position.y = 0;
      cueAuthentic.visible = cueFlashy.visible = cueNothing.visible = false;
      cueClean.visible = cueWorn.visible = cueClosed.visible = false;
      for (const c of [crowdBooth, crowdAttract, crowdSite]) for (const v of c) v.g.visible = false;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        setCrowdCount(crowdBooth, T.CROWD_BOOTH_N[optionIndex] || 0); // free=large, fair=healthy, high=sparse
        reaction.booth = r; appear.booth = 0; boothStage.visible = true;
      } else if (i === 1) {
        cueNothing.visible = optionIndex === 0;   // option 0 = do nothing
        cueAuthentic.visible = optionIndex === 1; // option 1 = real history
        cueFlashy.visible = optionIndex === 2;    // option 2 = flashy fake
        setCrowdCount(crowdAttract, T.CROWD_ATTRACT_N[optionIndex] || 0);
        reaction.attraction = r; appear.attraction = 0; attractStage.visible = true;
      } else if (i === 2) {
        cueWorn.visible = optionIndex === 0;      // option 0 = huge crowds (worn)
        cueClean.visible = optionIndex === 1;     // option 1 = smart limits (clean)
        cueClosed.visible = optionIndex === 2;    // option 2 = close off (shut)
        setCrowdCount(crowdSite, T.CROWD_SITE_N[optionIndex] || 0);
        reaction.site = r; appear.site = 0; siteStage.visible = true;
      }
    }

    // gently bob + sway each visible visitor (slow and calm; a thriving crowd is a
    // touch livelier). Never fast, never flashing.
    function bobCrowd(role: TourismRole, t: number) {
      const r = reaction[role];
      const amp = r === "thrive" ? STAGING.WORKER_BOB_AMP * 1.5 : STAGING.WORKER_BOB_AMP;
      for (const v of crowds[role]) {
        if (!v.g.visible) continue;
        v.g.position.y = Math.abs(Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * t + v.phase)) * amp;
        v.g.position.x = Math.sin(2 * Math.PI * STAGING.WORKER_BOB_HZ * 0.5 * t + v.phase) * 0.02;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // calm visitors: a slow bob + a gentle sway on whoever is present.
      bobCrowd("booth", t);
      bobCrowd("attraction", t);
      bobCrowd("site", t);
    }

    reset();
    return { group, reset, addStage, tick };
  }

  // ---- Modern Farm: a field built up choice by choice on the plot ahead of the
  // student. The tilled, empty plot is there from arrival. Decision 1 (planting)
  // PLANTS the field — neat green rows, a patchy uneven field, or overcrowded clumps.
  // Decision 2 (watering) adds the WATERING tech and the field responds — a sensor
  // drone sweeps over and greens the dry spots, sprinklers leave wasteful puddles, or
  // the crops droop from waiting too long. Decision 3 (harvest) shows the PAYOFF — a
  // harvester with a full crop and trucks to market, a small local stand, or a bruised
  // low-quality haul. Each stage then THRIVES (lush steady glow), STRUGGLES (dim uneven
  // flicker), or runs NEUTRAL (a quiet mid glow). Same { group, reset, addStage, tick }
  // contract Tech and Tourism use, so the runner drives it unchanged. All motion stays
  // slow and gentle (kids in a headset). ----
  function buildFarmStaging(): StopStaging {
    const F = FARM_BUILD;
    const C = F.COLOR;
    const group = new Group();
    group.position.z = F.FORWARD; // bring the field toward the student

    // role-tagged animated lights (intensity follows each stage's reaction).
    const glowParts: { mesh: any; role: FarmRole }[] = [];
    // each stage's reaction (null until built) + its ease-in progress.
    const reaction: { field: StageReaction | null; water: StageReaction | null; harvest: StageReaction | null } =
      { field: null, water: null, harvest: null };
    const appear = { field: 0, water: 0, harvest: 0 };
    let droneActive = false; // true only for the drone watering pick (it sweeps in tick)

    // register a mesh as an animated light (driven by its stage's reaction).
    function lit(mesh: any, color: string, role: FarmRole) {
      mesh.material.emissive = new Color(color);
      mesh.material.emissiveIntensity = 0;
      glowParts.push({ mesh, role });
      return mesh;
    }

    // ---- the plot (a raised table) + the tilled soil bed, both there from arrival ----
    const plot = meshBox(F.PLOT_W, F.PLOT_THICK, F.PLOT_D, C.plot);
    plot.position.set(F.PLOT[0], F.PLOT[1], F.PLOT[2]);
    group.add(plot);
    const plotTop = F.PLOT[1] + F.PLOT_THICK / 2;
    const plotBottom = F.PLOT[1] - F.PLOT_THICK / 2;
    for (const lx of [-1.2, 1.2]) {
      for (const lz of [-1.0, 1.0]) {
        const leg = meshBox(0.12, plotBottom, 0.12, C.plot);
        leg.position.set(lx, plotBottom / 2, F.PLOT[2] + lz);
        group.add(leg);
      }
    }
    const soil = meshBox(F.SOIL_W, F.SOIL_THICK, F.SOIL_D, C.soil);
    soil.position.set(0, plotTop + F.SOIL_THICK / 2, F.SOIL_Z);
    group.add(soil);
    const soilTop = plotTop + F.SOIL_THICK;
    // furrow lines across the soil, so the empty bed already reads as "tilled and ready".
    for (let r = 0; r < F.ROWS; r++) {
      const fz = F.ROW_Z0 + r * F.ROW_DZ;
      const furrow = meshBox(F.SOIL_W * 0.92, 0.012, 0.04, "#4a3420");
      furrow.position.set(0, soilTop + 0.006, fz);
      group.add(furrow);
    }

    const clumpX = (col: number) => F.COL_X0 + col * F.COL_DX;
    const clumpZ = (row: number) => F.ROW_Z0 + row * F.ROW_DZ;
    // a single plant: a short stem + a leafy top (the lit part, so it reacts). A tilt
    // leans it over for the drooping/wilted look.
    function plant(parent: Group, x: number, z: number, h: number, topColor: string, role: FarmRole, tilt = 0) {
      const stemH = h * 0.5;
      const stem = meshCyl(0.012, 0.018, stemH, C.stem);
      stem.position.set(x, soilTop + stemH / 2, z);
      stem.rotation.z = tilt;
      parent.add(stem);
      const topH = h * 0.62;
      const top = meshCone(0.07, topH, topColor);
      top.position.set(x + Math.sin(tilt) * h * 0.4, soilTop + stemH + topH / 2 - 0.02, z);
      top.rotation.z = tilt;
      parent.add(lit(top, topColor, role));
    }

    // =================== STAGE 1: the planted field (3 swappable cues) ============
    const fieldStage = new Group();
    fieldStage.visible = false;
    group.add(fieldStage);
    // cue: GPS tractor — a full, tidy grid of even, healthy rows.
    const cueRows = new Group();
    fieldStage.add(cueRows);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW; col++) {
        plant(cueRows, clumpX(col), clumpZ(r), F.PLANT_H, C.crop, "field");
      }
    }
    // cue: by hand — the same field but patchy: gaps, jitter, and uneven heights.
    const cueHand = new Group();
    fieldStage.add(cueHand);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW; col++) {
        if ((col * 2 + r) % 3 === 0) continue; // ~a third of the spots come up empty
        const dx = (((col * 7 + r * 3) % 5) - 2) * 0.03;
        const dz = (((col * 3 + r * 5) % 5) - 2) * 0.03;
        const hh = F.PLANT_H * (0.65 + ((col + r) % 3) * 0.2);
        plant(cueHand, clumpX(col) + dx, clumpZ(r) + dz, hh, C.crop, "field");
      }
    }
    // cue: too many seeds — a dense, packed grid (half spacing) of choked, yellowed plants.
    const cueCrowded = new Group();
    fieldStage.add(cueCrowded);
    for (let r = 0; r < F.ROWS; r++) {
      for (let col = 0; col < F.PER_ROW * 2 - 1; col++) {
        const x = F.COL_X0 + col * (F.COL_DX / 2);
        const hh = F.PLANT_H * (0.7 + ((col * 3 + r) % 3) * 0.12);
        plant(cueCrowded, x, clumpZ(r), hh, C.cropChoke, "field");
      }
    }
    cueRows.visible = cueHand.visible = cueCrowded.visible = false;

    // =================== STAGE 2: the watering tech (3 swappable cues) ============
    const waterStage = new Group();
    waterStage.visible = false;
    group.add(waterStage);
    // cue: sensor drone — a quadcopter that hovers and sweeps, greening the dry spots.
    const cueDrone = new Group();
    waterStage.add(cueDrone);
    const droneGroup = new Group();
    const droneBaseX = 0;
    const droneZ = F.SOIL_Z;
    {
      const body = meshBox(0.18, 0.06, 0.18, C.drone);
      droneGroup.add(body);
      for (const [ax, az] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]] as [number, number][]) {
        const arm = meshBox(0.04, 0.02, 0.04, C.droneTrim);
        arm.position.set(ax, 0.02, az);
        droneGroup.add(arm);
        const rotor = meshCyl(0.06, 0.06, 0.012, C.droneTrim);
        rotor.position.set(ax, 0.05, az);
        droneGroup.add(rotor);
      }
      const eye = meshSphere(0.035, C.sensor);
      eye.position.set(0, -0.04, 0);
      droneGroup.add(lit(eye, C.sensor, "water"));
      const beam = meshCone(0.07, 0.3, C.sensor);
      beam.rotation.x = Math.PI; // point the scanning beam straight down at the field
      beam.position.set(0, -0.2, 0);
      droneGroup.add(lit(beam, C.sensor, "water"));
    }
    droneGroup.position.set(droneBaseX, soilTop + F.DRONE_HOVER_Y, droneZ);
    cueDrone.add(droneGroup);
    // the freshly-greened dry spots the drone found: small bright disks on the soil.
    for (const sp of [[-0.7, -1.3], [0.5, -1.45], [-0.2, -0.7], [0.8, -0.9], [-0.9, -0.6]]) {
      const patch = meshCyl(0.13, 0.13, 0.014, C.greened);
      patch.position.set(sp[0], soilTop + 0.012, sp[1]);
      cueDrone.add(lit(patch, C.greened, "water"));
    }
    // cue: water the whole field — sprinklers with wasteful standing puddles.
    const cueSprinklers = new Group();
    waterStage.add(cueSprinklers);
    for (const px of [-0.7, 0, 0.7]) {
      const post = meshCyl(0.018, 0.018, 0.28, C.sprinkler);
      post.position.set(px, soilTop + 0.14, -0.9);
      cueSprinklers.add(post);
      const head = meshSphere(0.04, C.sprinkler);
      head.position.set(px, soilTop + 0.29, -0.9);
      cueSprinklers.add(head);
    }
    for (const pd of [[-0.6, -1.2, 0.2], [0.4, -1.4, 0.26], [-0.1, -0.7, 0.3], [0.7, -0.9, 0.22], [0.0, -1.6, 0.24]]) {
      const puddle = meshCyl(pd[2], pd[2], 0.012, C.puddle);
      puddle.position.set(pd[0], soilTop + 0.01, pd[1]);
      cueSprinklers.add(lit(puddle, C.puddle, "water"));
    }
    // cue: wait until they wilt — a scatter of drooping, sickly plants.
    const cueWilt = new Group();
    waterStage.add(cueWilt);
    for (const wp of [[-0.7, -1.3], [0.2, -1.5], [0.6, -1.0], [-0.3, -0.8], [0.9, -1.4], [-0.9, -1.0]]) {
      plant(cueWilt, wp[0], wp[1], F.PLANT_H * 0.95, C.wilt, "water", 0.6);
    }
    cueDrone.visible = cueSprinklers.visible = cueWilt.visible = false;

    // =================== STAGE 3: the harvest payoff (3 swappable cues) ===========
    const harvestStage = new Group();
    harvestStage.visible = false;
    group.add(harvestStage);
    const hz = F.HARVEST_Z;
    function wheel(parent: Group, x: number, z: number, r: number) {
      const w = meshCyl(r, r, 0.06, C.wheel);
      w.rotation.z = Math.PI / 2; // lay the wheel on its side (axis along x)
      w.position.set(x, soilTop + r, z);
      parent.add(w);
    }
    function produceHeap(parent: Group, cx: number, cz: number, color: string, role: FarmRole) {
      for (const o of [[0, 0.07, 0], [0.1, 0.06, 0.05], [-0.1, 0.06, -0.04], [0.05, 0.13, -0.02], [-0.06, 0.12, 0.06], [0, 0.18, 0.0]]) {
        const ball = meshSphere(0.06, color);
        ball.position.set(cx + o[0], soilTop + o[1], cz + o[2]);
        parent.add(lit(ball, color, role));
      }
    }
    // cue: modern machines — a harvester, a full golden crop, and trucks to market.
    const cueMachines = new Group();
    harvestStage.add(cueMachines);
    {
      // the harvester, parked at the field's left, header toward the rows.
      const hx = -0.85;
      const body = meshBox(0.46, 0.26, 0.36, C.harvester);
      body.position.set(hx, soilTop + 0.07 + 0.13, hz - 0.1);
      cueMachines.add(body);
      const cab = meshBox(0.22, 0.2, 0.24, C.cab);
      cab.position.set(hx, soilTop + 0.07 + 0.36, hz - 0.16);
      cueMachines.add(cab);
      const header = meshBox(0.6, 0.12, 0.14, C.harvesterTrim);
      header.position.set(hx, soilTop + 0.1, hz - 0.32);
      cueMachines.add(header);
      wheel(cueMachines, hx - 0.2, hz + 0.04, 0.09);
      wheel(cueMachines, hx + 0.2, hz + 0.04, 0.09);
      wheel(cueMachines, hx - 0.2, hz - 0.22, 0.07);
      wheel(cueMachines, hx + 0.2, hz - 0.22, 0.07);
      produceHeap(cueMachines, hx + 0.05, hz + 0.18, C.produce, "harvest"); // the full crop beside it
      // two market trucks lined up heading toward the student (toward "market", +z).
      for (const tx of [0.55, 1.0]) {
        const tz = hz + 0.2;
        const bed = meshBox(0.32, 0.14, 0.46, C.truckBed);
        bed.position.set(tx, soilTop + 0.07 + 0.07, tz);
        cueMachines.add(bed);
        const tcab = meshBox(0.3, 0.18, 0.2, C.truck);
        tcab.position.set(tx, soilTop + 0.07 + 0.13, tz + 0.32);
        cueMachines.add(tcab);
        const headlight = meshBox(0.22, 0.05, 0.02, C.headlight);
        headlight.position.set(tx, soilTop + 0.07 + 0.08, tz + 0.43);
        cueMachines.add(lit(headlight, C.headlight, "harvest"));
        produceHeap(cueMachines, tx, tz - 0.02, C.produce, "harvest"); // loaded with the harvest
        wheel(cueMachines, tx - 0.16, tz - 0.12, 0.07);
        wheel(cueMachines, tx + 0.16, tz - 0.12, 0.07);
        wheel(cueMachines, tx - 0.16, tz + 0.2, 0.07);
        wheel(cueMachines, tx + 0.16, tz + 0.2, 0.07);
      }
    }
    // cue: by hand to the local stand — a small wooden stand with a little produce.
    const cueStand = new Group();
    harvestStage.add(cueStand);
    {
      const sx = 0.1;
      const counter = meshBox(0.6, 0.1, 0.3, C.stand);
      counter.position.set(sx, soilTop + 0.28, hz + 0.1);
      cueStand.add(counter);
      for (const lx of [-0.26, 0.26]) {
        const leg = meshBox(0.05, 0.28, 0.05, C.stand);
        leg.position.set(sx + lx, soilTop + 0.14, hz + 0.1);
        cueStand.add(leg);
      }
      const roof = meshBox(0.72, 0.05, 0.36, C.standRoof);
      roof.position.set(sx, soilTop + 0.52, hz + 0.06);
      roof.rotation.x = -0.12;
      cueStand.add(roof);
      const sign = meshBox(0.34, 0.14, 0.02, C.standSign);
      sign.position.set(sx, soilTop + 0.46, hz + 0.27);
      cueStand.add(lit(sign, C.standSign, "harvest"));
      // a small basket of produce on the counter.
      produceHeap(cueStand, sx, hz + 0.1, C.produce, "harvest");
    }
    // cue: rush the harvest — a tipped crate and a small pile of dull, bruised produce.
    const cueRush = new Group();
    harvestStage.add(cueRush);
    {
      const rx = 0.1;
      const crate = meshBox(0.34, 0.22, 0.26, C.crate);
      crate.position.set(rx - 0.2, soilTop + 0.08, hz + 0.1);
      crate.rotation.z = 0.5; // knocked over
      cueRush.add(crate);
      // a small, low heap of bruised produce spilled out.
      for (const o of [[0, 0.05, 0], [0.12, 0.05, 0.05], [0.2, 0.05, -0.04], [0.08, 0.05, 0.12], [0.26, 0.05, 0.07]]) {
        const ball = meshSphere(0.055, C.bruised);
        ball.position.set(rx + o[0], soilTop + o[1], hz + 0.1 + o[2]);
        cueRush.add(lit(ball, C.bruised, "harvest"));
      }
    }
    cueMachines.visible = cueStand.visible = cueRush.visible = false;

    const stages: FarmRole[] = ["field", "water", "harvest"];
    const stageGroup: { [k in FarmRole]: Group } = { field: fieldStage, water: waterStage, harvest: harvestStage };

    // a slow, uneven 0..1 wave for the "struggling/troubled" look — never a strobe.
    function flicker(t: number) {
      const w = 0.6 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_A * t)
              + 0.4 * Math.sin(2 * Math.PI * STAGING.FLICKER_HZ_B * t + 1.3);
      return 0.5 + 0.5 * w;
    }

    // ---- the three calls the runner drives ----
    function reset() {
      reaction.field = reaction.water = reaction.harvest = null;
      appear.field = appear.water = appear.harvest = 0;
      droneActive = false;
      fieldStage.visible = waterStage.visible = harvestStage.visible = false;
      fieldStage.position.y = waterStage.position.y = harvestStage.position.y = 0;
      cueRows.visible = cueHand.visible = cueCrowded.visible = false;
      cueDrone.visible = cueSprinklers.visible = cueWilt.visible = false;
      cueMachines.visible = cueStand.visible = cueRush.visible = false;
      droneGroup.position.x = droneBaseX;
      for (const gp of glowParts) gp.mesh.material.emissiveIntensity = 0;
    }

    function addStage(i: number, optionIndex: number, r: StageReaction) {
      if (i === 0) {
        cueHand.visible = optionIndex === 0;    // option 0 = plant by hand (patchy)
        cueRows.visible = optionIndex === 1;    // option 1 = GPS tractor (tidy rows)
        cueCrowded.visible = optionIndex === 2; // option 2 = too many seeds (choked)
        reaction.field = r; appear.field = 0; fieldStage.visible = true;
      } else if (i === 1) {
        cueSprinklers.visible = optionIndex === 0; // option 0 = water the whole field
        cueDrone.visible = optionIndex === 1;      // option 1 = sensor drone
        cueWilt.visible = optionIndex === 2;       // option 2 = wait until they wilt
        droneActive = optionIndex === 1;
        reaction.water = r; appear.water = 0; waterStage.visible = true;
      } else if (i === 2) {
        cueStand.visible = optionIndex === 0;    // option 0 = by hand to the local stand
        cueMachines.visible = optionIndex === 1; // option 1 = modern machines to market
        cueRush.visible = optionIndex === 2;     // option 2 = rush (bruised haul)
        reaction.harvest = r; appear.harvest = 0; harvestStage.visible = true;
      }
    }

    function tick(clock: number) {
      const t = clock / 1000;
      // ease each freshly-added stage up into place (a gentle rise, no pop).
      for (const key of stages) {
        if (reaction[key] && appear[key] < 1) {
          appear[key] = Math.min(1, appear[key] + STAGING.TICK_MS / STAGING.APPEAR_MS);
        }
        const e = 1 - (1 - appear[key]) * (1 - appear[key]); // ease-out
        stageGroup[key].position.y = (1 - e) * -STAGING.APPEAR_RISE;
      }
      // drive each role-tagged light to match its stage's reaction.
      for (const gp of glowParts) {
        const r = reaction[gp.role];
        if (!r) continue;
        let v: number;
        if (r === "thrive") v = STAGING.THRIVE_GLOW + STAGING.THRIVE_PULSE_AMP * Math.sin(2 * Math.PI * STAGING.THRIVE_PULSE_HZ * t);
        else if (r === "neutral") v = STAGING.NEUTRAL_GLOW;
        else v = STAGING.STRUGGLE_GLOW_MIN + (STAGING.STRUGGLE_GLOW_MAX - STAGING.STRUGGLE_GLOW_MIN) * flicker(t);
        gp.mesh.material.emissiveIntensity = v * appear[gp.role];
      }
      // the sensor drone sweeps slowly side to side over the field as it scans.
      if (droneActive) {
        droneGroup.position.x = droneBaseX + Math.sin(2 * Math.PI * F.DRONE_SWEEP_HZ * t) * F.DRONE_SWEEP;
      }
    }

    reset();
    return { group, reset, addStage, tick };
  }

  const techStaging = buildTechStaging();
  stopScenes["tech"].add(techStaging.group);
  stopStagings["tech"] = techStaging;

  // Tourism Hub: the colonial village that assembles on the green as the student
  // decides. Same { group, reset, addStage, tick } contract the runner drives.
  const tourismStaging = buildTourismStaging();
  stopScenes["tourism"].add(tourismStaging.group);
  stopStagings["tourism"] = tourismStaging;

  // Modern Farm: the field that plants, waters, and harvests itself on the plot as
  // the student decides. Same { group, reset, addStage, tick } contract the runner drives.
  const farmStaging = buildFarmStaging();
  stopScenes["farm"].add(farmStaging.group);
  stopStagings["farm"] = farmStaging;

  // ======================================================================
  // PORT OF VIRGINIA  —  the signature stop's custom container-loading game.
  // buildPortScene() is the calm dock + harbor backdrop (registered like the other
  // stops' scenes). buildPortGame() is the game: three ships, a recycling supply of
  // grabbable color-coded containers, and the match-and-load loop. The student grabs
  // a container with the SAME ray they point with (DistanceGrabbable, MoveTowardsTarget):
  // it floats out along the aim about as far as the ships, so pointing at a ship
  // carries it there; releasing over the MATCHING ship loads it (chime + the ship
  // glows gold), the wrong ship gently refuses (a soft click + a red blink, then it
  // drifts back), and an open-water drop just floats home. No choice ever fails.
  // Every loop is setInterval (rAF pauses in the headset).
  // ======================================================================

  // A small readable sign baked on a canvas (DOM panels do not show in the headset),
  // used for each ship's destination label. Front faces +Z, toward the student.
  function portSign(text: string, accent: string): Mesh {
    const W = 384, H = 132;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#fbf3dd";
    ctx.fillRect(6, 6, W - 12, H - 12);
    ctx.lineWidth = 10;
    ctx.strokeStyle = accent;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.fillStyle = "#1F3A5F";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 58;
    do { ctx.font = "bold " + size + "px sans-serif"; size -= 2; }
    while (ctx.measureText(text).width > W - 44 && size > 16);
    ctx.fillText(text, W / 2, H / 2 + 2);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return new Mesh(
      new PlaneGeometry(0.7, 0.24),
      new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide }),
    );
  }

  // The calm backdrop: a wood dock underfoot, open harbor water the ships sit in,
  // and a few distant cranes for flavor. The water shimmers very slowly in tick().
  function buildPortScene(): { group: Group; tick: (clock: number) => void } {
    const g = new Group();
    const water = meshBox(40, 0.1, 40, PORT.WATER_COLOR);
    water.position.set(0, PORT.WATER_Y, -6);
    (water.material as any).emissive = new Color(PORT.WATER_COLOR);
    (water.material as any).emissiveIntensity = 0;
    g.add(water);
    // the dock the student stands on, with a darker trim lip and a row of pilings.
    const dock = meshBox(7.6, 0.16, 5.4, PORT.DOCK_COLOR);
    dock.position.set(0, -0.02, 6.0);
    g.add(dock);
    const trim = meshBox(7.8, 0.08, 0.22, PORT.DOCK_TRIM);
    trim.position.set(0, 0.06, 3.3);
    g.add(trim);
    for (const px of [-3.5, -1.2, 1.2, 3.5]) {
      const pile = meshCyl(0.12, 0.12, 1.1, PORT.PILING);
      pile.position.set(px, -0.35, 3.3);
      g.add(pile);
    }
    // a plank shelf the supply of containers rests on, so they read as cargo on the
    // pier rather than floating boxes; two legs carry it down to the dock.
    const shelf = meshBox(PORT.SHELF_W, 0.12, PORT.SHELF_D, PORT.DOCK_TRIM);
    shelf.position.set(0, PORT.SHELF_Y, PORT.SHELF_Z);
    g.add(shelf);
    for (const lx of [-1.7, 1.7]) {
      const leg = meshBox(0.14, PORT.SHELF_Y, 0.14, PORT.PILING);
      leg.position.set(lx, PORT.SHELF_Y / 2, PORT.SHELF_Z);
      g.add(leg);
    }
    // distant dock cranes, well past the ships and never in reach.
    for (const cx of [-4.7, -2.4, 2.5, 4.7]) {
      const crane = new Group();
      for (const lx of [-0.4, 0.4]) {
        const leg = meshBox(0.12, 2.6, 0.12, PORT.CRANE_LEG);
        leg.position.set(lx, 1.3, 0);
        crane.add(leg);
      }
      const top = meshBox(1.0, 0.16, 0.16, PORT.CRANE);
      top.position.set(0, 2.5, 0);
      crane.add(top);
      const arm = meshBox(0.16, 0.16, 2.0, PORT.CRANE);
      arm.position.set(0, 2.5, 0.9);
      crane.add(arm);
      crane.position.set(cx, 0, -2.8);
      g.add(crane);
    }
    function tick(clock: number) {
      const s = (Math.sin(clock * 0.001 * Math.PI * 2 * PORT.WATER_HZ) * 0.5 + 0.5) * PORT.WATER_SHIMMER;
      (water.material as any).emissiveIntensity = s;
    }
    return { group: g, tick };
  }

  // One low-poly ship: a colored hull, a deck rim, a stern wheelhouse, a mast with a
  // destination-colored flag, and a destination label facing the student. The group
  // sits at the ship's dock position; the game's tick() bobs and pulses it.
  function buildShip(ship: { key: string; label: string; color: string; pos: [number, number, number] }) {
    const g = new Group();
    const H = PORT.SHIP_HULL_H;
    const hull = meshBox(PORT.SHIP_HULL_W, H, PORT.SHIP_HULL_D, ship.color);
    hull.position.set(0, PORT.DECK_Y - H / 2, 0);
    (hull.material as any).emissive = new Color("#ffd76a"); // gold "loaded!" pulse, intensity set in tick
    (hull.material as any).emissiveIntensity = 0;
    g.add(hull);
    const rim = meshBox(PORT.SHIP_HULL_W * 0.9, 0.07, PORT.SHIP_HULL_D * 0.9, "#363b41");
    rim.position.set(0, PORT.DECK_Y + 0.035, 0);
    g.add(rim);
    const cabin = meshBox(PORT.SHIP_HULL_W * 0.46, 0.32, 0.34, "#eae3d2");
    cabin.position.set(0, PORT.DECK_Y + 0.19, PORT.SHIP_HULL_D * 0.32);
    g.add(cabin);
    const mast = meshCyl(0.025, 0.025, 0.7, "#6d5636");
    mast.position.set(0, PORT.DECK_Y + 0.5, PORT.SHIP_HULL_D * 0.32);
    g.add(mast);
    const flag = meshBox(0.32, 0.2, 0.02, ship.color);
    flag.position.set(0.18, PORT.DECK_Y + 0.72, PORT.SHIP_HULL_D * 0.32);
    g.add(flag);
    const sign = portSign(ship.label, ship.color);
    sign.position.set(0, PORT.DECK_Y + 0.5, 0.02);
    g.add(sign);
    g.position.set(ship.pos[0], 0, ship.pos[2]);
    return { group: g, hull };
  }

  function buildPortGame() {
    const group = new Group();   // ships + the debug panel live here (hide with the scene)
    let portClock = 0;

    // a container's color is exactly its destination ship's color (one source of truth).
    const colorByKey: Record<string, string> = {};
    for (const s of PORT.SHIPS) colorByKey[s.key] = s.color;

    // ---- the three ships + their fixed drop zones (world space; the group is identity) ----
    const ships: { key: string; x: number; z: number; group: Group; hull: any; pulse: number }[] = [];
    for (const s of PORT.SHIPS) {
      const built = buildShip(s);
      group.add(built.group);
      ships.push({ key: s.key, x: s.pos[0], z: s.pos[2], group: built.group, hull: built.hull, pulse: 0 });
    }

    // ---- the TEMPORARY debug count readout (a canvas panel; real scoring replaces it) ----
    const counts: Record<string, number> = { europe: 0, asia: 0, usa: 0 };
    const panelCanvas = document.createElement("canvas");
    panelCanvas.width = 512; panelCanvas.height = 410;
    const pctx = panelCanvas.getContext("2d") as CanvasRenderingContext2D;
    const panelTex = new CanvasTexture(panelCanvas);
    panelTex.colorSpace = SRGBColorSpace;
    const panelMesh = new Mesh(
      new PlaneGeometry(PORT.DEBUG_W, PORT.DEBUG_H),
      new MeshBasicMaterial({ map: panelTex, transparent: true, side: DoubleSide }),
    );
    (panelMesh.material as any).depthTest = false;
    (panelMesh.material as any).depthWrite = false;
    panelMesh.renderOrder = 50000;
    panelMesh.position.set(PORT.DEBUG_POS[0], PORT.DEBUG_POS[1], PORT.DEBUG_POS[2]);
    group.add(panelMesh);
    function drawCounts() {
      const W = 512, Hh = 410;
      pctx.clearRect(0, 0, W, Hh);
      pctx.fillStyle = "#fbf3dd";
      pctx.fillRect(8, 8, W - 16, Hh - 16);
      pctx.lineWidth = 10;
      pctx.strokeStyle = "#caa24a";
      pctx.strokeRect(8, 8, W - 16, Hh - 16);
      pctx.fillStyle = "#1F3A5F";
      pctx.textBaseline = "middle";
      pctx.textAlign = "left";
      pctx.font = "bold 38px sans-serif";
      pctx.fillText("LOADED (debug)", 34, 54);
      const rows: [string, string][] = [["Europe", "europe"], ["Asia", "asia"], ["United States", "usa"]];
      let y = 128;
      for (const [label, key] of rows) {
        pctx.fillStyle = colorByKey[key];
        pctx.fillRect(34, y - 20, 40, 40);
        pctx.fillStyle = "#1F3A5F";
        pctx.font = "bold 34px sans-serif";
        pctx.textAlign = "left";
        pctx.fillText(label, 88, y);
        pctx.textAlign = "right";
        pctx.fillText(String(counts[key] || 0), W - 40, y);
        y += 66;
      }
      const total = (counts.europe || 0) + (counts.asia || 0) + (counts.usa || 0);
      pctx.fillStyle = "#7d6038";
      pctx.fillRect(34, y - 14, W - 68, 4);
      pctx.fillStyle = "#1F3A5F";
      pctx.font = "bold 40px sans-serif";
      pctx.textAlign = "left";
      pctx.fillText("Total", 88, y + 34);
      pctx.textAlign = "right";
      pctx.fillText(String(total), W - 40, y + 34);
      panelTex.needsUpdate = true;
    }

    // ---- the recycling container supply ----
    // Each container is a cube ENTITY made grabbable once (DistanceGrabbable). We
    // never tear the grab down (the internal Handle is not exported, and re-adding
    // would not rebuild it), so we control grabbability by PLACEMENT instead: an idle
    // container sits on its dock slot in easy aim; a loaded one parks far below the
    // world (invisible AND unreachable by any forward aim) until its slot refills.
    type Cont = {
      entity: any; mesh: any; key: string; slot: number; state: string; wasGrabbed: boolean;
      fx: number; fy: number; fz: number; t: number; dur: number; tint: number; timer: number;
    };
    // The student points the ray at a container and pulls the trigger to grab it; the
    // cube floats out along the aim about as far as the ships (GRAB_REACH), so aiming
    // at a ship carries it there. Rotation/scale are locked so the cube stays upright
    // and its color stays readable; it stays where released (we handle load / return).
    const GRAB_OPTS = {
      movementMode: MovementMode.MoveTowardsTarget,
      rotate: false, translate: true, scale: false,
      returnToOrigin: false, detachOnGrab: false,
      moveSpeedFactor: PORT.GRAB_SPEED,
      targetPositionOffset: [0, 0, -PORT.GRAB_REACH] as [number, number, number],
    };
    const conts: Cont[] = [];
    for (let i = 0; i < PORT.SLOTS.length; i++) {
      const mesh = meshBox(PORT.CONTAINER, PORT.CONTAINER, PORT.CONTAINER, "#ffffff");
      (mesh.material as any).emissive = new Color("#d23b30"); // red "wrong ship" blink, intensity in tick
      (mesh.material as any).emissiveIntensity = 0;
      mesh.visible = false;
      mesh.position.set(0, PORT.PARK_Y, 0);
      const entity = world.createTransformEntity(mesh).addComponent(DistanceGrabbable, GRAB_OPTS);
      conts.push({ entity, mesh, key: "europe", slot: i, state: "parked", wasGrabbed: false,
                   fx: 0, fy: 0, fz: 0, t: 0, dur: 0, tint: 0, timer: 0 });
    }

    let refillIdx = 0;
    function nextRefillColor(): string {
      const k = PORT.REFILL_CYCLE[refillIdx % PORT.REFILL_CYCLE.length];
      refillIdx++;
      return k;
    }
    function recolor(ct: Cont, key: string) {
      ct.key = key;
      (ct.mesh.material as any).color = new Color(colorByKey[key]);
    }
    function park(ct: Cont) {              // hide a container far below the world: gone AND ungrabbable
      ct.state = "parked"; ct.dur = 0; ct.tint = 0; ct.timer = 0;
      (ct.mesh.material as any).emissiveIntensity = 0;
      ct.mesh.visible = false;
      ct.mesh.position.set(0, PORT.PARK_Y, 0);
      ct.wasGrabbed = false;
    }
    function toSlot(ct: Cont) {            // set a container idle + grabbable on its dock slot
      const sp = PORT.SLOTS[ct.slot];
      ct.state = "idle"; ct.dur = 0; ct.tint = 0; ct.timer = 0;
      (ct.mesh.material as any).emissiveIntensity = 0;
      ct.mesh.position.set(sp[0], sp[1], sp[2]);
      ct.mesh.visible = true;
      ct.wasGrabbed = !!ct.entity.hasComponent(Grabbed); // never fire on a carried-over grab
    }
    function startReturn(ct: Cont) {       // ease a wrong / open-water drop back to its slot
      const wp = new Vector3(); ct.mesh.getWorldPosition(wp);
      ct.fx = wp.x; ct.fy = wp.y; ct.fz = wp.z;
      ct.t = 0; ct.dur = PORT.RETURN_MS; ct.state = "returning";
    }

    // A release: read the container's world position and find the ship whose drop
    // zone holds it (nearest in x among the boxes). Match => load; wrong => gently
    // refuse; none => float home. This owns the cue and the count.
    function onRelease(ct: Cont) {
      const wp = new Vector3(); ct.mesh.getWorldPosition(wp);
      // Pick the ship the student aimed at: nearest in X (which ship), within a
      // generous X width and a loose height window. We deliberately do NOT gate on Z
      // (how far the throw travelled): the destination is decided by which ship you
      // point at, so a relaxed Z keeps the match forgiving for a kid's loose aim.
      let best: any = null;
      let bestdx = Infinity;
      for (const sh of ships) {
        const dx = Math.abs(wp.x - sh.x);
        const dy = Math.abs(wp.y - PORT.ZONE_CENTER_Y);
        if (dx <= PORT.ZONE_W / 2 && dy <= PORT.ZONE_H / 2 && dx < bestdx) {
          best = sh; bestdx = dx;
        }
      }
      if (best && best.key === ct.key) {
        sfxChime();                        // a clear, happy "loaded!"
        counts[best.key] = (counts[best.key] || 0) + 1;
        best.pulse = 1;                    // the ship glows gold, eased down in tick
        drawCounts();
        park(ct);                          // it snaps aboard and is gone from the dock...
        ct.state = "loaded"; ct.timer = PORT.REFILL_MS; // ...and a fresh one refills the slot shortly
        console.log("[PORT] loaded " + ct.key + " => totals", { ...counts });
      } else if (best) {
        sfxClick();                        // a soft, gentle "not that ship"
        ct.tint = 1;                       // a brief red blink, eased down in tick
        startReturn(ct);
        console.log("[PORT] wrong ship: " + ct.key + " over " + best.key);
      } else {
        startReturn(ct);                   // open water: no penalty, just float home
      }
    }

    function tick() {
      // gentle ship bob + the gold "loaded!" pulse easing away.
      for (const sh of ships) {
        sh.group.position.y = Math.sin(portClock * 0.001 * Math.PI * 2 * PORT.BOB_HZ + sh.x) * PORT.BOB_AMP;
        if (sh.pulse > 0) {
          sh.pulse = Math.max(0, sh.pulse - PORT.PULSE_FALL);
          (sh.hull.material as any).emissiveIntensity = sh.pulse * 0.7;
        }
      }
      for (const ct of conts) {
        if (ct.state === "returning") {
          // a re-grab mid-flight wins: hand control back to the grab system.
          if (ct.entity.hasComponent(Grabbed)) {
            ct.dur = 0; ct.state = "idle"; ct.wasGrabbed = true;
          } else {
            ct.t = Math.min(ct.dur, ct.t + PORT.TICK_MS);
            const k = ct.dur > 0 ? ct.t / ct.dur : 1;
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOut
            const sp = PORT.SLOTS[ct.slot];
            ct.mesh.position.set(
              ct.fx + (sp[0] - ct.fx) * e,
              ct.fy + (sp[1] - ct.fy) * e,
              ct.fz + (sp[2] - ct.fz) * e,
            );
            if (ct.t >= ct.dur) toSlot(ct);
          }
        }
        if (ct.tint > 0) {
          ct.tint = Math.max(0, ct.tint - PORT.TINT_FALL);
          (ct.mesh.material as any).emissiveIntensity = ct.tint * 0.85;
        }
        if (ct.state === "loaded" && ct.timer > 0) {
          ct.timer -= PORT.TICK_MS;
          if (ct.timer <= 0) { recolor(ct, nextRefillColor()); toSlot(ct); }
        }
        // a container is grabbable while idle or returning; watch for the release.
        if (ct.state === "idle" || ct.state === "returning") {
          const grabbed = !!ct.entity.hasComponent(Grabbed);
          if (ct.wasGrabbed && !grabbed) onRelease(ct);
          ct.wasGrabbed = grabbed;
        }
      }
    }

    function start() {
      portClock = 0; refillIdx = 0;
      counts.europe = 0; counts.asia = 0; counts.usa = 0;
      drawCounts();
      for (const sh of ships) { sh.pulse = 0; sh.group.position.y = 0; (sh.hull.material as any).emissiveIntensity = 0; }
      for (let i = 0; i < conts.length; i++) {
        const ct = conts[i];
        ct.slot = i;
        recolor(ct, PORT.START_COLORS[i % PORT.START_COLORS.length]);
        toSlot(ct);
      }
    }
    function stop() {
      for (const ct of conts) park(ct); // hidden + unreachable, so nothing leaks back to the hub
    }

    // The game's own loop: bob, eases, refill timers, and release detection. Gated so
    // it is idle unless the student is actually standing in the port. setInterval, not
    // rAF (which pauses in the headset), like every other loop in the build.
    setInterval(function () {
      if (currentView !== "stop" || activeStopId !== "port") return;
      portClock += PORT.TICK_MS;
      tick();
    }, PORT.TICK_MS);

    return { group, start, stop, tick };
  }

  registerStopScene("port", buildPortScene()); // the Norfolk dock + harbor water
  portGame = buildPortGame();
  stopScenes["port"].add(portGame.group);       // ships + debug panel hide with the scene

  // One shared loop animates whichever stop's staging is active. setInterval, not
  // rAF (which pauses in the headset). Idle on the hub, where nothing is built.
  let stagingClock = 0;
  setInterval(function () {
    stagingClock += STAGING.TICK_MS;
    if (currentView === "hub") return;
    const st = activeStopId ? stopStagings[activeStopId] : null;
    if (st) st.tick(stagingClock);
  }, STAGING.TICK_MS);

  // ---- The runner's own pressables: a small fixed POOL reused across decisions,
  // so we never churn ray-target entities. Each is a flat card/button wrapped in an
  // Interactable, hidden until a beat enables it; one loop edge-detects a fresh
  // press and adds the grow/squish feedback. Hidden interactables are skipped by
  // the existing hit-test guard, and we also gate on currentView + an enabled flag,
  // so a stray ray can never fire the wrong beat. ----
  type Pressable = {
    entity: any;
    mesh: any;
    enabled: boolean;
    wasPressed: boolean;
    onPress: (() => void) | null;
    card?: { setLabel: (l: string, a?: string) => void };
  };

  const runnerHolder = new Group();
  scene.add(runnerHolder);
  runnerHolder.visible = false;
  let runnerPanelMesh: any = null;

  // Swap in the beat's panel (setup / question / readout / closing). The plain
  // panel meshes live in runnerHolder; the pressables below are their own entities.
  function setRunnerPanel(mesh: any, pos: [number, number, number]) {
    if (runnerPanelMesh) runnerHolder.remove(runnerPanelMesh);
    runnerOnTop(mesh);
    mesh.position.set(pos[0], pos[1], pos[2]);
    runnerHolder.add(mesh);
    runnerPanelMesh = mesh;
  }

  function makePressable(mesh: any): Pressable {
    runnerOnTop(mesh);
    const entity = world.createTransformEntity(mesh).addComponent(Interactable);
    if (entity.object3D) entity.object3D.visible = false;
    return { entity, mesh, enabled: false, wasPressed: false, onPress: null };
  }

  function enablePressable(p: Pressable, onPress: () => void) {
    p.onPress = onPress;
    p.enabled = true;
    p.mesh.scale.setScalar(1);
    if (p.entity.object3D) p.entity.object3D.visible = true;
    p.wasPressed = !!p.entity.hasComponent(Pressed); // re-arm: never fire on a carried-over press
  }
  function disablePressable(p: Pressable) {
    p.enabled = false;
    p.onPress = null;
    p.wasPressed = false;
    p.mesh.scale.setScalar(1);
    if (p.entity.object3D) p.entity.object3D.visible = false;
  }

  // The three reusable option cards, plus the Start and Next buttons.
  const choiceCards: Pressable[] = [];
  for (let i = 0; i < 3; i++) {
    const card = makeChoiceCard(RUNNER.CARD_W, RUNNER.CARD_H);
    const p = makePressable(card.mesh);
    p.card = card;
    choiceCards.push(p);
  }
  const startBtn = makePressable(makeButtonCard("Start", RUNNER.BTN_W, RUNNER.BTN_H));
  const nextBtn = makePressable(makeButtonCard("Next", RUNNER.BTN_W, RUNNER.BTN_H));
  startBtn.entity.object3D!.position.set(RUNNER.BTN_POS[0], RUNNER.BTN_POS[1], RUNNER.BTN_POS[2]);
  nextBtn.entity.object3D!.position.set(RUNNER.BTN_POS[0], RUNNER.BTN_POS[1], RUNNER.BTN_POS[2]);

  // ---- Runner state for the current stop ----
  let runnerPack: DecisionPack | null = null;
  let runnerStop: any = null;
  let runnerIndex = 0;
  const runnerTally = { ei: 0, it: 0, ps: 0 };
  // The readout's "read it first" beat: while this counts down (in TICK_MS steps),
  // the readout is up and the Next button is hidden; at zero the Next action appears.
  let readoutHoldTicks = 0;
  let pendingNextAction: (() => void) | null = null;

  // Clear every runner pressable + panel (used on hideStop / between visits).
  function hideRunner() {
    runnerHolder.visible = false;
    if (runnerPanelMesh) { runnerHolder.remove(runnerPanelMesh); runnerPanelMesh = null; }
    readoutHoldTicks = 0;
    pendingNextAction = null;
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn);
  }

  // Beat 1: the setup line (Fox's framing) + a Start button.
  function beatSetup() {
    setRunnerPanel(makeTextPanel(runnerStop.name, runnerPack!.setup, RUNNER.INFO_W), RUNNER.SETUP_PANEL_POS);
    for (const c of choiceCards) disablePressable(c);
    disablePressable(nextBtn);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    enablePressable(startBtn, function () { sfxClick(); beatDecision(0); });
    runnerHolder.visible = true;
  }

  // Beat 2: one decision — the question up top, three option cards below.
  function beatDecision(i: number) {
    runnerIndex = i;
    const d = runnerPack!.decisions[i];
    const n = runnerPack!.decisions.length;
    setRunnerPanel(makeInfoCard("Choice " + (i + 1) + " of " + n, d.question, RUNNER.Q_W), RUNNER.Q_PANEL_POS);
    disablePressable(startBtn);
    disablePressable(nextBtn);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    for (let k = 0; k < choiceCards.length; k++) {
      const opt = d.options[k];
      const p = choiceCards[k];
      p.card!.setLabel(opt.label, runnerStop.color);
      p.entity.object3D!.position.set(RUNNER.CARD_X, RUNNER.CARD_TOP_Y - k * RUNNER.CARD_STEP, RUNNER.CARD_Z);
      enablePressable(p, function () { onPick(opt, k); });
    }
    runnerHolder.visible = true;
  }

  // A pick: add its effects to this stop's running tally, then show the readout.
  function onPick(opt: DecisionOption, optionIndex: number) {
    sfxClick();                                                  // soft click on every pick
    if ((opt.reaction || "neutral") === "thrive") sfxChime();    // a pleasant chime for a strong pick
    runnerTally.ei += opt.effects.ei;
    runnerTally.it += opt.effects.it;
    runnerTally.ps += opt.effects.ps;
    // Assemble the matching build piece in the scene and let it react to this pick.
    // (The meter math above and the color-coded readout below are unchanged.)
    const staging = runnerStop ? stopStagings[runnerStop.id] : null;
    if (staging) staging.addStage(runnerIndex, optionIndex, opt.reaction || "neutral");
    console.log("[RUNNER] picked:", opt.label, opt.effects, opt.reaction, "=> stop tally", { ...runnerTally });
    beatReadout(opt);
  }

  // Beat 3: the polished VISIBLE-CONSEQUENCES readout (Module 8's look) — the pick's
  // effect on each meter, green for a gain and red for a drop, unchanged meters left
  // out, with the result note beneath it for the "why". The readout stays up a beat
  // so the student reads it; THEN the Next button appears (revealed by the runner's
  // setInterval loop via readoutHoldTicks). Next advances to the next decision or
  // the finish. The decision data, the tally, and completeStop are untouched.
  function beatReadout(opt: DecisionOption) {
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn); // hidden until the readout has been up long enough to read
    const changes = [
      { label: "Economic Impact", delta: opt.effects.ei },
      { label: "Innovation Thinking", delta: opt.effects.it },
      { label: "Problem Solving", delta: opt.effects.ps },
    ];
    setRunnerPanel(makeReadoutCard(changes, opt.note, { widthMeters: RUNNER.READOUT_W }), RUNNER.READOUT_PANEL_POS);
    if (finishBtn.object3D) finishBtn.object3D.visible = false;
    // Queue the Next action; the service loop reveals the button after the hold.
    const last = runnerIndex >= runnerPack!.decisions.length - 1;
    pendingNextAction = function () {
      sfxClick();
      if (last) beatFinish();
      else beatDecision(runnerIndex + 1);
    };
    readoutHoldTicks = Math.ceil(RUNNER.READOUT_HOLD_MS / RUNNER.TICK_MS);
    runnerHolder.visible = true;
  }

  // Beat 4: after the last decision — a wrap-up line and the shell's EXISTING
  // Finish button, now carrying the student's real tally (not the placeholder).
  function beatFinish() {
    for (const c of choiceCards) disablePressable(c);
    disablePressable(startBtn);
    disablePressable(nextBtn);
    // Generic wrap-up: the runner is shared by every decision stop, so the line
    // must not name one stop's build (it used to say "data center", which read
    // wrong at the Tourism Hub). The per-stop flavor lives in the setup + notes.
    setRunnerPanel(
      makeTextPanel("All set!", "You made all three choices. Press the button to return to the map.", RUNNER.INFO_W),
      RUNNER.CLOSE_PANEL_POS,
    );
    // Hand the real totals to the shell; finishStop reads pendingAward.
    pendingAward = { economic: runnerTally.ei, innovation: runnerTally.it, problem: runnerTally.ps };
    console.log("[RUNNER] finished " + runnerStop.id + " => award", pendingAward);
    finishWasPressed = true; // require a fresh press, so revealing the button never auto-fires
    if (finishBtn.object3D) finishBtn.object3D.visible = true;
    runnerHolder.visible = true;
  }

  // Start a pack for a stop: reset the tally and show the setup beat.
  function startDecisionPack(stop: any, pack: DecisionPack) {
    runnerStop = stop;
    runnerPack = pack;
    runnerIndex = 0;
    runnerTally.ei = 0;
    runnerTally.it = 0;
    runnerTally.ps = 0;
    readoutHoldTicks = 0;
    pendingNextAction = null;
    const staging = stopStagings[stop.id]; // clear any pieces left from a prior visit
    if (staging) staging.reset();
    beatSetup();
  }

  // One loop services every runner pressable: grow on hover, squish on press, and
  // fire a fresh press once. It also runs the readout's "read it first" countdown,
  // revealing the Next button once the hold elapses. Gated on currentView + each
  // pressable's enabled flag. setInterval (rAF pauses in the headset).
  setInterval(function () {
    const live = currentView === "stop";
    // Readout hold: count down, then reveal the queued Next action as a clear button.
    if (live && readoutHoldTicks > 0) {
      readoutHoldTicks -= 1;
      if (readoutHoldTicks === 0 && pendingNextAction) {
        enablePressable(nextBtn, pendingNextAction);
        pendingNextAction = null;
      }
    }
    const all = [startBtn, nextBtn, choiceCards[0], choiceCards[1], choiceCards[2]];
    for (const p of all) {
      if (!live || !p.enabled) {
        p.mesh.scale.setScalar(1);
        p.wasPressed = false;
        continue;
      }
      const hov = !!p.entity.hasComponent(Hovered);
      const prs = !!p.entity.hasComponent(Pressed);
      p.mesh.scale.setScalar(prs ? RUNNER.PRESS_SCALE : hov ? RUNNER.HOVER_SCALE : 1);
      if (prs && !p.wasPressed && p.onPress) p.onPress();
      p.wasPressed = prs;
    }
  }, RUNNER.TICK_MS);

  // ======================================================================
  // HUB METERS PANEL  —  a fixed card in the upper-left of the map showing the
  // three running totals as filling bars, in the SAME colors as the end report
  // (ui/hub-meters.uikitml mirrors ui/report.uikitml's bars). It reads the live
  // m6Totals the report uses, so the bars fill as stops finish, and sit empty
  // when nothing is done. It rides with the hub (mirrors hubGroup.visible) so it
  // hides inside a stop, without touching the visit loop. setInterval only.
  // ======================================================================
  const HUB_METERS = {
    POS: [-1.7, 2.5, 4.4] as [number, number, number], // upper-left, above Fox's bubble
    YAW: 0.58,           // radians; turns the card to face the student (about 33 deg)
    MAXW: 1.0,           // panel physical width (metres)
    MAXH: 0.8,           // panel physical height (metres)
    TRACK: 68,           // must match the .track width in ui/hub-meters.uikitml
    EASE: 0.16,          // how fast each bar eases toward its total each tick
    TICK_MS: 33,         // loop rate (rAF pauses in the headset)
  };
  const hubMetersPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/hub-meters.json", maxWidth: HUB_METERS.MAXW, maxHeight: HUB_METERS.MAXH });
  hubMetersPanel.object3D!.position.set(HUB_METERS.POS[0], HUB_METERS.POS[1], HUB_METERS.POS[2]);
  hubMetersPanel.object3D!.rotation.set(0, HUB_METERS.YAW, 0, "YXZ"); // turn to face the student

  let hubMetersDoc: any = null;
  whenPanelReady(hubMetersPanel, function (doc) { hubMetersDoc = doc; });

  // Eased display values, so a finished stop visibly FILLS its bar rather than
  // snapping. We only push a bar when its rounded number actually changed.
  const hubShown = { economic: 0, innovation: 0, problem: 0 };
  const hubLast = { economic: -1, innovation: -1, problem: -1 };
  function pushHubMeter(key: "economic" | "innovation" | "problem", fillId: string, valId: string) {
    const rounded = Math.round(hubShown[key]);
    if (rounded === hubLast[key]) return;
    hubLast[key] = rounded;
    const f = hubMetersDoc.getElementById(fillId);
    if (f) f.setProperties({ width: (HUB_METERS.TRACK * hubShown[key]) / 100 });
    const v = hubMetersDoc.getElementById(valId);
    if (v) v.setProperties({ text: String(rounded) });
  }
  setInterval(function () {
    // Ride with the hub: shown on the map, hidden inside a stop. Mirroring
    // hubGroup.visible means the swap happens under the fade cover, so no pop.
    const onMap = hubGroup.visible;
    if (hubMetersPanel.object3D) hubMetersPanel.object3D.visible = onMap;
    if (!hubMetersDoc || !onMap) return; // only animate while the map is in view
    let k: "economic" | "innovation" | "problem";
    for (k of ["economic", "innovation", "problem"] as const) {
      const target = m6Totals[k];
      if (Math.abs(target - hubShown[k]) < 0.5) hubShown[k] = target; // settle exactly
      else hubShown[k] += (target - hubShown[k]) * HUB_METERS.EASE;
    }
    pushHubMeter("economic", "hub-fill-economic", "hub-val-economic");
    pushHubMeter("innovation", "hub-fill-innovation", "hub-val-innovation");
    pushHubMeter("problem", "hub-fill-problem", "hub-val-problem");
  }, HUB_METERS.TICK_MS);

  // Start the flow at Setup.
  // ==========================================================================
  // OPENING PANELS  —  title -> how to play -> into Main Street.
  // Built from ui/title.uikitml and ui/welcome.uikitml (compiled to public/ui).
  // ==========================================================================

  // A panel's UI document loads over a frame or two. Run wiring once it is ready.
  function whenPanelReady(entity: any, callback: (doc: any) => void) {
    const check = function () {
      if (entity.hasComponent(PanelDocument)) {
        const doc = entity.getValue(PanelDocument, "document");
        if (doc) {
          callback(doc);
          return;
        }
      }
      requestAnimationFrame(check);
    };
    check();
  }

  // The title card, floating in front of where you start.
  const titlePanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/title.json", maxWidth: 2.4, maxHeight: 1.6 })
    .addComponent(Interactable);
  titlePanel.object3D!.position.set(0, 1.6, 4);
  titlePanel.object3D!.visible = false;

  // The how-to-play card, in the same spot.
  const welcomePanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/welcome.json", maxWidth: 2.4, maxHeight: 2.0 })
    .addComponent(Interactable);
  welcomePanel.object3D!.position.set(0, 1.6, 4);
  welcomePanel.object3D!.visible = false;

  // Show the title first.
  function startOpening() {
    titlePanel.object3D!.visible = true;
    welcomePanel.object3D!.visible = false;
  }

  // Title: Start reveals the how-to-play.
  whenPanelReady(titlePanel, function (doc) {
    doc.getElementById("start-button")?.setProperties({
      onClick: function () {
        sfxClick();
        titlePanel.object3D!.visible = false;
        welcomePanel.object3D!.visible = true;
      },
    });
  });

  // How to play: five steps, Back / Next, ending by entering Main Street.
  const WELCOME_STEPS = 5;
  let welcomeStep = 1;
  whenPanelReady(welcomePanel, function (doc) {
    const DISABLED_BG = "#c9c2b5";
    const DISABLED_TEXT = "#7a7a7a";

    const backButton = doc.getElementById("back-button");
    const backLabel = doc.getElementById("back-label");
    const nextButton = doc.getElementById("next-button");
    const nextLabel = doc.getElementById("next-label");
    const indicator = doc.getElementById("step-indicator");

    function showWelcomeStep(n: number) {
      welcomeStep = n;
      for (let i = 1; WELCOME_STEPS >= i; i = i + 1) {
        doc.getElementById("step-" + i)?.setProperties({ display: i === n ? "flex" : "none" });
      }
      indicator?.setProperties({ text: "Step " + n + " of " + WELCOME_STEPS });
      const onFirst = n === 1;
      backButton?.setProperties({ backgroundColor: onFirst ? DISABLED_BG : activeShop.theme.boxBorder });
      backLabel?.setProperties({ color: onFirst ? DISABLED_TEXT : activeShop.theme.ink });
      const onLast = n === WELCOME_STEPS;
      nextLabel?.setProperties({ text: onLast ? "Start Playing" : "Next" });
    }

    backButton?.setProperties({
      onClick: function () {
        if (welcomeStep > 1) {
          sfxClick();
          showWelcomeStep(welcomeStep - 1);
        }
      },
    });
    nextButton?.setProperties({
      onClick: function () {
        if (WELCOME_STEPS > welcomeStep) {
          sfxClick();
          showWelcomeStep(welcomeStep + 1);
        } else {
          sfxClick();
          welcomePanel.object3D!.visible = false;
          showPhase(PHASE_MORNING);
          setObjective(activeShop.goals.sayHi);
        }
      },
    });

    showWelcomeStep(1);
  });

  // ==========================================================================
  // SETUP  —  choose your character, then step onto Main Street.
  // ==========================================================================
  const setupPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/setup.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  setupPanel.object3D!.position.set(0, 1.6, 7.2);
  setupPanel.object3D!.visible = false;
  phasePanels[PHASE_SELECT] = setupPanel;

  // The four characters. Only the name is used in code (for the final report);
  // the words on the cards live in ui/setup.uikitml.
  const CHARACTERS = [
    { id: "ada", name: "Ada" },
    { id: "leo", name: "Leo" },
    { id: "mia", name: "Mia" },
    { id: "sam", name: "Sam" },
  ];
  let chosenCharacter: any = null;

  whenPanelReady(setupPanel, function (doc) {
    const GOLD = "#d98a8f";
    const NAVY = "#5b3a24";

    const beginButton = doc.getElementById("begin-button");
    const beginLabel = doc.getElementById("begin-label");
    const cards: any = {};

    // Highlight the chosen card in gold, clear the rest, and switch Begin on.
    function selectCharacter(ch: any) {
      chosenCharacter = ch;
      for (const c of CHARACTERS) {
        const card = cards[c.id];
        if (card) card.setProperties({ borderColor: c.id === ch.id ? GOLD : NAVY });
      }
      beginButton?.setProperties({ backgroundColor: GOLD });
      beginLabel?.setProperties({ color: NAVY });
    }

    for (const c of CHARACTERS) {
      const card = doc.getElementById("card-" + c.id);
      cards[c.id] = card;
      card?.setProperties({ onClick: function () { sfxClick(); selectCharacter(c); } });
    }

    beginButton?.setProperties({
      onClick: function () {
        if (!chosenCharacter) return; // must pick someone first
        sfxClick();
        setupPanel.object3D!.visible = false;
        showPhase(PHASE_MORNING);
        setObjective(activeShop.goals.sayHi);
      },
    });
  });

  // ==========================================================================
  // GUS'S STAGE 1 QUESTION  —  opens when you walk up to Gus in Stage 1.
  // The best answer grows Money Smarts more; any answer earns some, because
  // thinking it through is the point. Gus explains, then you carry on.
  // ==========================================================================
  const GUSQ1_RADIUS = 3.0; // how close you must be for the question to open
  const SMARTS_BEST = 10;   // Money Smarts for the best answer
  const SMARTS_OK = 0;      // a wrong answer earns no Money Smarts, so the
                            // meter actually reflects getting answers right
                            // (used by all three of Gus's questions)

  const gusQ1Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage1.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ1Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ1Panel.object3D!.visible = false;

  let gusQ1Done = false;     // true once the player has read Gus's reply
  let gusQ1Replying = false; // true while the reply is on screen (keep it up)

  whenPanelReady(gusQ1Panel, function (doc) {
    const beatQ = doc.getElementById("beat-q");
    const beatReply = doc.getElementById("beat-reply");
    const replyText = doc.getElementById("reply-text");

    // Start on the question; hide the reply.
    beatQ?.setProperties({ display: "flex" });
    beatReply?.setProperties({ display: "none" });

    let answered = false; // only the first tap counts
    function answer(isBest: boolean, opener: string) {
      if (answered) return;
      answered = true;
      sfxCoin();
      const instinctGain = isBest ? SMARTS_BEST : SMARTS_OK;
      updateScore("instinct", instinctGain);
      const lesson = activeShop.morning.gusLesson;
      replyText?.setProperties({ text: opener + " " + lesson });
      doc.getElementById("meter-change")?.setProperties({ text: "Owner's Instinct  +" + instinctGain });
      beatQ?.setProperties({ display: "none" });
      beatReply?.setProperties({ display: "flex" });
      gusQ1Replying = true;
    }

    doc.getElementById("answer-a")?.setProperties({ onClick: function () { answer(true, "Exactly right!"); } });
    doc.getElementById("answer-b")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });
    doc.getElementById("answer-c")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ1Done = true;
        gusQ1Replying = false;
        gusQ1Panel.object3D!.visible = false;
        setObjective(activeShop.goals.morningCounter);
      },
    });
  });

  // Watch how close the player is to Gus, and open the question in Stage 1.
  const gusCamPos = new Vector3();
  setInterval(function () {
    if (gusQ1Done) {
      gusQ1Panel.object3D!.visible = false;
      return;
    }
    if (currentPhase !== PHASE_MORNING) {
      gusQ1Panel.object3D!.visible = false;
      return;
    }
    if (gusQ1Replying) {
      showPanel(gusQ1Panel); // keep the reply up until Got It
      return;
    }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusCamPos);
    const dx = gusCamPos.x - GUS_SPOT.x;
    const dz = gusCamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (GUSQ1_RADIUS >= dist) showPanel(gusQ1Panel);
    else gusQ1Panel.object3D!.visible = false;
  }, 33);

  // Begin the opening sequence.
  // ==========================================================================
  // MORNING SETUP  —  opens at the counter, after you have talked with Ms. Delia.
  // Two tap choices (pricing, then stocking) move Profit and Satisfaction; then
  // Open the Doors advances the day to Midday.
  // ==========================================================================
  // Morning setup deltas (tunable). Profit and Satisfaction drift with each call.
  const MORNING = {
    PRICE_PREMIUM: { profit: 12, satisfaction: -8 },
    PRICE_FAIR:    { profit: 6,  satisfaction: 6 },
    PRICE_BARGAIN: { profit: -4, satisfaction: 12 },
    STOCK_FANCY:   { profit: 12, satisfaction: -4 },
    STOCK_MIX:     { profit: 6,  satisfaction: 6 },
    STOCK_BULK:    { profit: -2, satisfaction: 12 },
  };
  const stage1MoneyPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage1-money.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage1MoneyPanel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  stage1MoneyPanel.object3D!.visible = false;

  let stage1MoneyDone = false;      // true once the plan is chosen and reviewed
  let stage1ShowingOutcome = false; // true while the result is on screen

  whenPanelReady(stage1MoneyPanel, function (doc) {
    const beatPrice = doc.getElementById("beat-price");
    const beatStock = doc.getElementById("beat-stock");
    const beatReady = doc.getElementById("beat-ready");
    const readyText = doc.getElementById("ready-text");

    beatPrice?.setProperties({ display: "flex" });
    beatStock?.setProperties({ display: "none" });
    beatReady?.setProperties({ display: "none" });

    let pricePicked = false;
    let stockPicked = false;
    const totals = { satisfaction: 0, profit: 0 };

    function applyChoice(d: { profit: number; satisfaction: number }) {
      updateScore("profit", d.profit);
      updateScore("satisfaction", d.satisfaction);
      totals.profit += d.profit;
      totals.satisfaction += d.satisfaction;
      sfxCoin();
    }

    function pickPrice(d: { profit: number; satisfaction: number }) {
      if (pricePicked) return;
      pricePicked = true;
      applyChoice(d);
      beatPrice?.setProperties({ display: "none" });
      beatStock?.setProperties({ display: "flex" });
    }
    doc.getElementById("price-premium")?.setProperties({ onClick: function () { pickPrice(MORNING.PRICE_PREMIUM); } });
    doc.getElementById("price-fair")?.setProperties({ onClick: function () { pickPrice(MORNING.PRICE_FAIR); } });
    doc.getElementById("price-bargain")?.setProperties({ onClick: function () { pickPrice(MORNING.PRICE_BARGAIN); } });

    function pickStock(d: { profit: number; satisfaction: number }) {
      if (stockPicked) return;
      stockPicked = true;
      applyChoice(d);
      readyText?.setProperties({ text: activeShop.morning.readyText });
      showMeterChanges(doc, totals.satisfaction, totals.profit, 0);
      beatStock?.setProperties({ display: "none" });
      beatReady?.setProperties({ display: "flex" });
      stage1ShowingOutcome = true;
    }
    doc.getElementById("stock-fancy")?.setProperties({ onClick: function () { pickStock(MORNING.STOCK_FANCY); } });
    doc.getElementById("stock-mix")?.setProperties({ onClick: function () { pickStock(MORNING.STOCK_MIX); } });
    doc.getElementById("stock-bulk")?.setProperties({ onClick: function () { pickStock(MORNING.STOCK_BULK); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        stage1MoneyDone = true;
        stage1ShowingOutcome = false;
        stage1MoneyPanel.object3D!.visible = false;
        showPhase(PHASE_MIDDAY);
        setStageLook(world, "midday");
        setObjective(activeShop.goals.middayFind);
      },
    });
  });

  // Open the money plan at the Bank, once you have talked with Gus.
  const bankCamPos = new Vector3();
  const STAGE1_BANK_RADIUS = 3.0;
  setInterval(function () {
    if (stage1MoneyDone) {
      stage1MoneyPanel.object3D!.visible = false;
      return;
    }
    if (currentPhase !== PHASE_MORNING) {
      stage1MoneyPanel.object3D!.visible = false;
      return;
    }
    if (!gusQ1Done) {
      stage1MoneyPanel.object3D!.visible = false; // talk to Gus first
      return;
    }
    if (stage1ShowingOutcome) {
      showPanel(stage1MoneyPanel); // keep the result up until Continue
      return;
    }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bankCamPos);
    const dx = bankCamPos.x - STATIONS.bank.x;
    const dz = bankCamPos.z - STATIONS.bank.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (STAGE1_BANK_RADIUS >= dist) showPanel(stage1MoneyPanel);
    else stage1MoneyPanel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // GUS'S STAGE 2 QUESTION  —  about investing. Opens near Gus in Stage 2.
  // ==========================================================================
  const gusQ2Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage2.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ2Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ2Panel.object3D!.visible = false;

  let gusQ2Done = false;
  let gusQ2Replying = false;

  whenPanelReady(gusQ2Panel, function (doc) {
    const beatQ = doc.getElementById("beat-q");
    const beatReply = doc.getElementById("beat-reply");
    const replyText = doc.getElementById("reply-text");
    beatQ?.setProperties({ display: "flex" });
    beatReply?.setProperties({ display: "none" });

    let answered = false; // only the first tap counts
    function answer(isBest: boolean, opener: string) {
      if (answered) return;
      answered = true;
      sfxCoin();
      const instinctGain = isBest ? SMARTS_BEST : SMARTS_OK;
      updateScore("instinct", instinctGain);
      const lesson = activeShop.midday.gusLesson;
      replyText?.setProperties({ text: opener + " " + lesson });
      doc.getElementById("meter-change")?.setProperties({ text: "Owner's Instinct  +" + instinctGain });
      beatQ?.setProperties({ display: "none" });
      beatReply?.setProperties({ display: "flex" });
      gusQ2Replying = true;
    }

    doc.getElementById("answer-a")?.setProperties({ onClick: function () { answer(true, "Exactly right!"); } });
    doc.getElementById("answer-b")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });
    doc.getElementById("answer-c")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ2Done = true;
        gusQ2Replying = false;
        gusQ2Panel.object3D!.visible = false;
        setObjective(activeShop.goals.middayFloor);
      },
    });
  });

  const gusQ2CamPos = new Vector3();
  setInterval(function () {
    if (gusQ2Done) { gusQ2Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_MIDDAY) { gusQ2Panel.object3D!.visible = false; return; }
    if (gusQ2Replying) { showPanel(gusQ2Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusQ2CamPos);
    const dx = gusQ2CamPos.x - GUS_SPOT.x;
    const dz = gusQ2CamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(gusQ2Panel);
    else gusQ2Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // MIDDAY RUSH  —  opens at your shop floor, after Ms. Delia's Midday question.
  // Two tap choices: the Cary Street rival's deal, then the burnt-loaf complaint,
  // ending in an "Into the Afternoon" button. The rival judgment moves Owner's
  // Instinct; Profit and Satisfaction drift with the choices.
  // ==========================================================================
  // Midday deltas (tunable). Instinct moves on the rival judgment; Profit and Satisfaction drift.
  const MIDDAY = {
    RIVAL_HOLD:   { instinct: 10, profit: 6 },
    RIVAL_MATCH:  { instinct: 0,  profit: -8 },
    RIVAL_IGNORE: { instinct: 0,  profit: 0 },
    COMPLAINT_FREE:     { satisfaction: 12, profit: -2 },
    COMPLAINT_DISCOUNT: { satisfaction: 4,  profit: 0 },
    COMPLAINT_FIRM:     { satisfaction: -8, profit: 2 },
  };

  const stage2Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage2-invest.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage2Panel.object3D!.position.set(STATIONS.business.x, 1.6, STATIONS.business.z + 2.2);
  stage2Panel.object3D!.visible = false;

  let stage2Done = false;
  let stage2ShowingOutcome = false;

  whenPanelReady(stage2Panel, function (doc) {
    const beatRival = doc.getElementById("beat-rival");
    const beatComplaint = doc.getElementById("beat-complaint");
    const beatDone = doc.getElementById("beat-done");
    const doneText = doc.getElementById("done-text");

    beatRival?.setProperties({ display: "flex" });
    beatComplaint?.setProperties({ display: "none" });
    beatDone?.setProperties({ display: "none" });

    let rivalPicked = false;
    let complaintPicked = false;
    const totals = { satisfaction: 0, profit: 0, instinct: 0 };

    function pickRival(d: { instinct: number; profit: number }) {
      if (rivalPicked) return;
      rivalPicked = true;
      updateScore("instinct", d.instinct);
      updateScore("profit", d.profit);
      totals.instinct += d.instinct;
      totals.profit += d.profit;
      sfxCoin();
      beatRival?.setProperties({ display: "none" });
      beatComplaint?.setProperties({ display: "flex" });
    }
    doc.getElementById("rival-hold")?.setProperties({ onClick: function () { pickRival(MIDDAY.RIVAL_HOLD); } });
    doc.getElementById("rival-match")?.setProperties({ onClick: function () { pickRival(MIDDAY.RIVAL_MATCH); } });
    doc.getElementById("rival-ignore")?.setProperties({ onClick: function () { pickRival(MIDDAY.RIVAL_IGNORE); } });

    function pickComplaint(d: { satisfaction: number; profit: number }) {
      if (complaintPicked) return;
      complaintPicked = true;
      updateScore("satisfaction", d.satisfaction);
      updateScore("profit", d.profit);
      totals.satisfaction += d.satisfaction;
      totals.profit += d.profit;
      sfxCoin();
      doneText?.setProperties({ text: activeShop.midday.doneText });
      showMeterChanges(doc, totals.satisfaction, totals.profit, totals.instinct);
      beatComplaint?.setProperties({ display: "none" });
      beatDone?.setProperties({ display: "flex" });
      stage2ShowingOutcome = true;
    }
    doc.getElementById("comp-free")?.setProperties({ onClick: function () { pickComplaint(MIDDAY.COMPLAINT_FREE); } });
    doc.getElementById("comp-discount")?.setProperties({ onClick: function () { pickComplaint(MIDDAY.COMPLAINT_DISCOUNT); } });
    doc.getElementById("comp-firm")?.setProperties({ onClick: function () { pickComplaint(MIDDAY.COMPLAINT_FIRM); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        stage2Done = true;
        stage2ShowingOutcome = false;
        stage2Panel.object3D!.visible = false;
        showPhase(PHASE_AFTERNOON);
        setStageLook(world, "afternoon");
        setObjective(activeShop.goals.afternoonFind);
      },
    });
  });

  // Open the invest board at the Business lot, once you have talked with Gus.
  const bizCamPos = new Vector3();
  setInterval(function () {
    if (stage2Done) { stage2Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_MIDDAY) { stage2Panel.object3D!.visible = false; return; }
    if (!gusQ2Done) { stage2Panel.object3D!.visible = false; return; }
    if (stage2ShowingOutcome) { showPanel(stage2Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bizCamPos);
    const dx = bizCamPos.x - STATIONS.business.x;
    const dz = bizCamPos.z - STATIONS.business.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(stage2Panel);
    else stage2Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // GUS'S STAGE 3 QUESTION  —  about diversifying. Opens near Gus in Stage 3.
  // ==========================================================================
  const gusQ3Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/gus-stage3.json", maxWidth: 2.4, maxHeight: 1.9 })
    .addComponent(Interactable);
  gusQ3Panel.object3D!.position.set(GUS_SPOT.x, 1.7, GUS_SPOT.z + 1.5);
  gusQ3Panel.object3D!.visible = false;

  let gusQ3Done = false;
  let gusQ3Replying = false;

  whenPanelReady(gusQ3Panel, function (doc) {
    const beatQ = doc.getElementById("beat-q");
    const beatReply = doc.getElementById("beat-reply");
    const replyText = doc.getElementById("reply-text");
    beatQ?.setProperties({ display: "flex" });
    beatReply?.setProperties({ display: "none" });

    let answered = false; // only the first tap counts
    function answer(isBest: boolean, opener: string) {
      if (answered) return;
      answered = true;
      sfxCoin();
      const instinctGain = isBest ? SMARTS_BEST : SMARTS_OK;
      updateScore("instinct", instinctGain);
      const lesson = activeShop.afternoon.gusLesson;
      replyText?.setProperties({ text: opener + " " + lesson });
      doc.getElementById("meter-change")?.setProperties({ text: "Owner's Instinct  +" + instinctGain });
      beatQ?.setProperties({ display: "none" });
      beatReply?.setProperties({ display: "flex" });
      gusQ3Replying = true;
    }

    doc.getElementById("answer-a")?.setProperties({ onClick: function () { answer(true, "Exactly right!"); } });
    doc.getElementById("answer-b")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });
    doc.getElementById("answer-c")?.setProperties({ onClick: function () { answer(false, "Good guess! Here is the thing."); } });

    doc.getElementById("got-it-button")?.setProperties({
      onClick: function () {
        sfxClick();
        gusQ3Done = true;
        gusQ3Replying = false;
        gusQ3Panel.object3D!.visible = false;
        setObjective(activeShop.goals.closeCounter);
      },
    });
  });

  const gusQ3CamPos = new Vector3();
  setInterval(function () {
    if (gusQ3Done) { gusQ3Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_AFTERNOON) { gusQ3Panel.object3D!.visible = false; return; }
    if (gusQ3Replying) { showPanel(gusQ3Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(gusQ3CamPos);
    const dx = gusQ3CamPos.x - GUS_SPOT.x;
    const dz = gusQ3CamPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(gusQ3Panel);
    else gusQ3Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // AFTERNOON CLOSE  —  opens at your counter, after Ms. Delia's question.
  // Two quick calls (leftover stock, then a big-order quote) nudge Profit and
  // Satisfaction, then a See Your Day button hands off to the report.
  // ==========================================================================
  // Afternoon deltas (tunable). Profit and Satisfaction drift with each close-out call.
  const AFTERNOON = {
    CLOSE_DONATE:   { satisfaction: 10, profit: -2 },
    CLOSE_MARKDOWN: { satisfaction: 4,  profit: 8 },
    CLOSE_TOSS:     { satisfaction: -6, profit: 0 },
    ORDER_PREMIUM:  { profit: 12, satisfaction: -4 },
    ORDER_FAIR:     { profit: 6,  satisfaction: 6 },
    ORDER_FRIENDLY: { profit: -2, satisfaction: 12 },
  };

  const stage3Panel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/stage3-spread.json", maxWidth: 2.6, maxHeight: 2.0 })
    .addComponent(Interactable);
  stage3Panel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  stage3Panel.object3D!.visible = false;

  let stage3Done = false;
  let stage3Engaged = false; // true from the first close-out call until See Your Day

  whenPanelReady(stage3Panel, function (doc) {
    const beatStock = doc.getElementById("beat-stock");
    const beatOrder = doc.getElementById("beat-order");
    const beatDone = doc.getElementById("beat-done");
    const doneText = doc.getElementById("done-text");

    beatStock?.setProperties({ display: "flex" });
    beatOrder?.setProperties({ display: "none" });
    beatDone?.setProperties({ display: "none" });

    let stockPicked = false;
    let orderPicked = false;
    const totals = { satisfaction: 0, profit: 0, instinct: 0 };

    function pickStock(d: { satisfaction: number; profit: number }) {
      if (stockPicked) return;
      stockPicked = true;
      updateScore("satisfaction", d.satisfaction);
      updateScore("profit", d.profit);
      totals.satisfaction += d.satisfaction;
      totals.profit += d.profit;
      sfxCoin();
      stage3Engaged = true;
      beatStock?.setProperties({ display: "none" });
      beatOrder?.setProperties({ display: "flex" });
    }
    doc.getElementById("close-donate")?.setProperties({ onClick: function () { pickStock(AFTERNOON.CLOSE_DONATE); } });
    doc.getElementById("close-markdown")?.setProperties({ onClick: function () { pickStock(AFTERNOON.CLOSE_MARKDOWN); } });
    doc.getElementById("close-toss")?.setProperties({ onClick: function () { pickStock(AFTERNOON.CLOSE_TOSS); } });

    function pickOrder(d: { profit: number; satisfaction: number }) {
      if (orderPicked) return;
      orderPicked = true;
      updateScore("profit", d.profit);
      updateScore("satisfaction", d.satisfaction);
      totals.profit += d.profit;
      totals.satisfaction += d.satisfaction;
      sfxCoin();
      doneText?.setProperties({ text: activeShop.afternoon.doneText });
      showMeterChanges(doc, totals.satisfaction, totals.profit, totals.instinct);
      beatOrder?.setProperties({ display: "none" });
      beatDone?.setProperties({ display: "flex" });
    }
    doc.getElementById("order-premium")?.setProperties({ onClick: function () { pickOrder(AFTERNOON.ORDER_PREMIUM); } });
    doc.getElementById("order-fair")?.setProperties({ onClick: function () { pickOrder(AFTERNOON.ORDER_FAIR); } });
    doc.getElementById("order-friendly")?.setProperties({ onClick: function () { pickOrder(AFTERNOON.ORDER_FRIENDLY); } });

    doc.getElementById("continue-button")?.setProperties({
      onClick: function () {
        sfxStage();
        stage3Done = true;
        stage3Engaged = false;
        stage3Panel.object3D!.visible = false;
        showReport();
      },
    });
  });

  // Open the spread board at the Bank, once you have talked with Gus.
  const bank3CamPos = new Vector3();
  setInterval(function () {
    if (stage3Done) { stage3Panel.object3D!.visible = false; return; }
    if (currentPhase !== PHASE_AFTERNOON) { stage3Panel.object3D!.visible = false; return; }
    if (!gusQ3Done) { stage3Panel.object3D!.visible = false; return; }
    if (stage3Engaged) { showPanel(stage3Panel); return; }
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(bank3CamPos);
    const dx = bank3CamPos.x - STATIONS.bank.x;
    const dz = bank3CamPos.z - STATIONS.bank.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (3.0 >= dist) showPanel(stage3Panel);
    else stage3Panel.object3D!.visible = false;
  }, 33);

  // ==========================================================================
  // MONEY REPORT  —  the finale. Reads the three meters, names the money
  // personality, greets the chosen explorer, and offers Play Again.
  // ==========================================================================
  const OWNER_TYPES: Record<string, { name: string; blurb: string }> = {
    bossMaterial: {
      name: "Boss Material",
      blurb: "You kept customers happy, the money strong, and your gut in charge, all at once. That is the whole package. The bakery is lucky to have you.",
    },
    crowdPleaser: {
      name: "The Crowd-Pleaser",
      blurb: "Customers loved your bakery today. You put people first, and it showed. A happy, loyal crowd is worth its weight in gold.",
    },
    dealMaker: {
      name: "The Deal-Maker",
      blurb: "You had a sharp eye for profit and made the money work. Every shop needs a boss who watches the bottom line, and that is you.",
    },
    natural: {
      name: "The Natural",
      blurb: "You trusted your instincts and made smart calls all day. That kind of judgment is what turns a good bakery into a great one.",
    },
    steadyHand: {
      name: "The Steady Hand",
      blurb: "You kept everything balanced and steady from open to close. No panic, no drama, just solid choices. That is how shops last.",
    },
    learningRopes: {
      name: "Learning the Ropes",
      blurb: "Running a bakery is hard work, and you gave it a real go today. Every great boss starts somewhere. Come back and try a few new moves!",
    },
  };

  const reportPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/report.json", maxWidth: 2.6, maxHeight: 2.2 })
    .addComponent(Interactable);
  reportPanel.object3D!.position.set(STATIONS.bank.x, 1.6, STATIONS.bank.z + 2.2);
  reportPanel.object3D!.visible = false;
  phasePanels[PHASE_CLOSE] = reportPanel;

  let reportDoc: any = null;
  whenPanelReady(reportPanel, function (doc) {
    reportDoc = doc;
    doc.getElementById("play-again-button")?.setProperties({
      onClick: function () {
        sfxClick();
        window.location.reload(); // a clean, full restart back to the title
      },
    });
  });

  // Decide the money personality from the final meters, fill the card, show it.
  function showReport() {
    const S = scoreSatisfaction;
    const P = scoreProfit;
    const I = scoreInstinct;
    const avg = (S + P + I) / 3;
    const hi = Math.max(S, P, I);
    const lo = Math.min(S, P, I);
    const spread = hi - lo;

    let key: string;
    if (avg < 45) {
      key = "learningRopes";
    } else if (spread <= 15 && avg >= 65) {
      key = "bossMaterial";
    } else if (spread <= 15) {
      key = "steadyHand";
    } else if (S === hi) {
      key = "crowdPleaser";
    } else if (P === hi) {
      key = "dealMaker";
    } else {
      key = "natural";
    }

    const t = OWNER_TYPES[key];
    const name = chosenCharacter ? chosenCharacter.name : "boss";

    if (reportDoc) {
      reportDoc.getElementById("greeting")?.setProperties({ text: "Great work, " + name + "!" });
      reportDoc.getElementById("personality-name")?.setProperties({ text: t.name });
      reportDoc.getElementById("personality-blurb")?.setProperties({ text: t.blurb });
      reportDoc.getElementById("value-growth")?.setProperties({ text: String(S) });
      reportDoc.getElementById("value-security")?.setProperties({ text: String(P) });
      reportDoc.getElementById("value-smarts")?.setProperties({ text: String(I) });
      reportDoc.getElementById("fill-growth")?.setProperties({ width: Math.round(S * 0.4) });
      reportDoc.getElementById("fill-security")?.setProperties({ width: Math.round(P * 0.4) });
      reportDoc.getElementById("fill-smarts")?.setProperties({ width: Math.round(I * 0.4) });
    }

    sfxFanfare();
    showPhase(PHASE_CLOSE);
    presentPanel(reportPanel);
    setObjective("You ran the shop! Here is how your day went.");
  }

  // Watch all the story panels so the on-top loop keeps whichever is showing
  // fully drawn over Gus, his cart, or a building.
  storyPanels.push(
    setupPanel,
    gusQ1Panel,
    stage1MoneyPanel,
    gusQ2Panel,
    stage2Panel,
    gusQ3Panel,
    stage3Panel,
    reportPanel,
  );

  // ========================================================================
  // SHOP PICKER — the first thing the player sees. The floor, walls, and sky
  // are already built, so the player stands in an empty themed room. Tapping a
  // shop sets the active pack, builds that shop's props, hides the picker, and
  // runs the opening.
  // ========================================================================
  // A brief "setting up" card, shown between picking a shop and the shop appearing.
  const loadingPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/loading.json", maxWidth: 2.2, maxHeight: 1.4 })
    .addComponent(Interactable);
  loadingPanel.object3D!.position.set(0, 1.6, 4);
  loadingPanel.object3D!.visible = false;

  const shopPickerPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/shop-picker.json", maxWidth: 2.8, maxHeight: 2.2 })
    .addComponent(Interactable);
  shopPickerPanel.object3D!.position.set(0, 1.6, 4);
  shopPickerPanel.object3D!.visible = false;

  whenPanelReady(shopPickerPanel, function (doc) {
    // How long the "Setting up your shop..." card shows before the shop appears.
    const SHOP_SETUP_MS = 1200;
    function pick(id: ShopId) {
      sfxClick();
      setActiveShop(id);
      shopPickerPanel.object3D!.visible = false;
      loadingPanel.object3D!.visible = true;
      setTimeout(function () {
        // The shop appears now: reveal the shell, build this shop's fixtures,
        // reword and recolor, and switch the sky from lobby to morning.
        ground.object3D!.visible = true;
        built.boundary.object3D!.visible = true;
        for (const e of built.street) e.object3D!.visible = true;
        buildShopProps(world, id);
        applyShopWords(SHOPS[id]);
        applyShopTheme(SHOPS[id]);
        applyShopGameTheme(SHOPS[id]);
        applyShopHudTheme(SHOPS[id]);
        setStageLook(world, PHASE_MORNING);
        loadingPanel.object3D!.visible = false;
        startOpening();
      }, SHOP_SETUP_MS);
    }
    doc.getElementById("shop-bakery")?.setProperties({ onClick: function () { pick("bakery"); } });
    doc.getElementById("shop-surf")?.setProperties({ onClick: function () { pick("surf"); } });
    doc.getElementById("shop-repair")?.setProperties({ onClick: function () { pick("repair"); } });
  });

  // The orientation screen shows first. Its button reveals the shop picker.
  const introPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/intro.json", maxWidth: 2.6, maxHeight: 2.5 })
    .addComponent(Interactable);
  introPanel.object3D!.position.set(0, 1.6, 4);
  introPanel.object3D!.visible = false;
  whenPanelReady(introPanel, function (doc) {
    doc.getElementById("intro-continue")?.setProperties({
      onClick: function () {
        sfxClick();
        introPanel.object3D!.visible = false;
        shopPickerPanel.object3D!.visible = true;
        setObjective("Choose the shop you want to run for the day.");
      },
    });
  });

  // Module 6 hub step: the Module 8 opening (orientation -> shop picker -> shop)
  // stays built but dormant. The student arrives straight at the Virginia map
  // hub instead. The travel flow that wakes these panels comes in a later prompt.
  introPanel.object3D!.visible = false;

  // ========================================================================
  // SHOP WORDS — overwrite each panel's per-shop text from the chosen pack.
  // Called once, the moment a shop is picked, so every panel shows that
  // shop's words. The questions and activities get added here in 3b and 3c.
  // ========================================================================
  function applyShopWords(pack: ShopPack) {
    whenPanelReady(titlePanel, function (doc) {
      doc.getElementById("subtitle")?.setProperties({ text: pack.subtitle });
    });
    whenPanelReady(welcomePanel, function (doc) {
      doc.getElementById("welcome-premise")?.setProperties({ text: pack.premise });
      doc.getElementById("talk-title")?.setProperties({ text: "2. Talk to " + pack.ownerName });
      doc.getElementById("talk-body")?.setProperties({
        text: pack.ownerName + " has run this shop for years and knows every trick of the trade. When the gold ! appears over them, walk over. They will ask you a quick question to sharpen your Owner's Instinct.",
      });
    });

    whenPanelReady(gusQ1Panel, function (doc) {
      const q = pack.morning;
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: q.gusBest });
      doc.getElementById("answer-b-label")?.setProperties({ text: q.gusB });
      doc.getElementById("answer-c-label")?.setProperties({ text: q.gusC });
    });

    whenPanelReady(gusQ2Panel, function (doc) {
      const q = pack.midday;
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: q.gusBest });
      doc.getElementById("answer-b-label")?.setProperties({ text: q.gusB });
      doc.getElementById("answer-c-label")?.setProperties({ text: q.gusC });
    });

    whenPanelReady(gusQ3Panel, function (doc) {
      const q = pack.afternoon;
      doc.getElementById("eyebrow-asks")?.setProperties({ text: pack.ownerName.toUpperCase() + " ASKS" });
      doc.getElementById("eyebrow-says")?.setProperties({ text: pack.ownerName.toUpperCase() + " SAYS" });
      doc.getElementById("q-text")?.setProperties({ text: q.gusQ });
      doc.getElementById("answer-a-label")?.setProperties({ text: q.gusBest });
      doc.getElementById("answer-b-label")?.setProperties({ text: q.gusB });
      doc.getElementById("answer-c-label")?.setProperties({ text: q.gusC });
    });

    whenPanelReady(stage1MoneyPanel, function (doc) {
      const q = pack.morning;
      doc.getElementById("price-q")?.setProperties({ text: q.priceQ });
      doc.getElementById("price-premium-label")?.setProperties({ text: q.priceP });
      doc.getElementById("price-fair-label")?.setProperties({ text: q.priceF });
      doc.getElementById("price-bargain-label")?.setProperties({ text: q.priceB });
      doc.getElementById("stock-q")?.setProperties({ text: q.stockQ });
      doc.getElementById("stock-fancy-label")?.setProperties({ text: q.stockFancy });
      doc.getElementById("stock-mix-label")?.setProperties({ text: q.stockMix });
      doc.getElementById("stock-bulk-label")?.setProperties({ text: q.stockBulk });
    });

    whenPanelReady(stage2Panel, function (doc) {
      const q = pack.midday;
      doc.getElementById("rival-q")?.setProperties({ text: q.rivalQ });
      doc.getElementById("rival-hold-label")?.setProperties({ text: q.rivalHold });
      doc.getElementById("rival-match-label")?.setProperties({ text: q.rivalMatch });
      doc.getElementById("rival-ignore-label")?.setProperties({ text: q.rivalIgnore });
      doc.getElementById("comp-q")?.setProperties({ text: q.compQ });
      doc.getElementById("comp-free-label")?.setProperties({ text: q.compFree });
      doc.getElementById("comp-discount-label")?.setProperties({ text: q.compDiscount });
      doc.getElementById("comp-firm-label")?.setProperties({ text: q.compFirm });
    });

    whenPanelReady(stage3Panel, function (doc) {
      const q = pack.afternoon;
      doc.getElementById("close-q")?.setProperties({ text: q.leftoverQ });
      doc.getElementById("close-donate-label")?.setProperties({ text: q.leftDonate });
      doc.getElementById("close-markdown-label")?.setProperties({ text: q.leftMarkdown });
      doc.getElementById("close-toss-label")?.setProperties({ text: q.leftToss });
      doc.getElementById("order-q")?.setProperties({ text: q.orderQ });
      doc.getElementById("order-premium-label")?.setProperties({ text: q.orderP });
      doc.getElementById("order-fair-label")?.setProperties({ text: q.orderF });
      doc.getElementById("order-friendly-label")?.setProperties({ text: q.orderFriendly });
    });
  }

  // ========================================================================
  // SHOP THEME — paint the onboarding cards (title, welcome, character pick)
  // in the chosen shop's colors. Same idea as applyShopWords, but for color.
  // ========================================================================
  function applyShopTheme(pack: ShopPack) {
    const t = pack.theme;
    whenPanelReady(titlePanel, function (doc) {
      doc.getElementById("title-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("title-text")?.setProperties({ color: t.ink });
      doc.getElementById("subtitle")?.setProperties({ color: t.ink });
      doc.getElementById("start-button")?.setProperties({ backgroundColor: t.accent });
      doc.getElementById("start-label")?.setProperties({ color: t.accentInk });
    });
    whenPanelReady(welcomePanel, function (doc) {
      doc.getElementById("welcome-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("welcome-eyebrow")?.setProperties({ color: t.ink });
      doc.getElementById("welcome-heading")?.setProperties({ color: t.ink });
      for (const sid of ["step-1", "step-2", "step-3", "step-4", "step-5"]) {
        doc.getElementById(sid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      doc.getElementById("next-button")?.setProperties({ backgroundColor: t.accent });
      doc.getElementById("next-label")?.setProperties({ color: t.accentInk });
    });
    whenPanelReady(setupPanel, function (doc) {
      doc.getElementById("setup-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      doc.getElementById("setup-heading")?.setProperties({ color: t.ink });
      for (const cid of ["card-ada", "card-leo", "card-mia", "card-sam"]) {
        doc.getElementById(cid)?.setProperties({ backgroundColor: t.boxBg });
      }
    });
  }

  // ====================================================================
  // SHOP GAME THEME - paint the question, activity, and report panels in
  // the chosen shop's colors, including the bakery.
  // ====================================================================
  function applyShopGameTheme(pack: ShopPack) {
    const t = pack.theme;

    // The owner's three question panels (morning, midday, afternoon).
    for (const panel of [gusQ1Panel, gusQ2Panel, gusQ3Panel]) {
      whenPanelReady(panel, function (doc) {
        doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
        for (const aid of ["answer-a", "answer-b", "answer-c"]) {
          doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
        }
        for (const tid of ["q-text", "answer-a-label", "answer-b-label", "answer-c-label", "reply-text"]) {
          doc.getElementById(tid)?.setProperties({ color: t.ink });
        }
      });
    }

    // Morning activity panel: pricing and stocking.
    whenPanelReady(stage1MoneyPanel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["price-premium", "price-fair", "price-bargain", "stock-fancy", "stock-mix", "stock-bulk"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["price-q", "stock-q", "price-premium-label", "price-fair-label", "price-bargain-label", "stock-fancy-label", "stock-mix-label", "stock-bulk-label", "ready-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // Midday activity panel: rival and complaint.
    whenPanelReady(stage2Panel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["rival-hold", "rival-match", "rival-ignore", "comp-free", "comp-discount", "comp-firm"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["rival-q", "comp-q", "rival-hold-label", "rival-match-label", "rival-ignore-label", "comp-free-label", "comp-discount-label", "comp-firm-label", "done-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // Afternoon activity panel: leftovers and the big order.
    whenPanelReady(stage3Panel, function (doc) {
      doc.getElementById("game-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const aid of ["close-donate", "close-markdown", "close-toss", "order-premium", "order-fair", "order-friendly"]) {
        doc.getElementById(aid)?.setProperties({ backgroundColor: t.boxBg, borderColor: t.boxBorder });
      }
      for (const tid of ["close-q", "order-q", "close-donate-label", "close-markdown-label", "close-toss-label", "order-premium-label", "order-fair-label", "order-friendly-label", "done-text"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // End-of-day report card (meters keep their own colors).
    whenPanelReady(reportPanel, function (doc) {
      doc.getElementById("report-card")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const tid of ["greeting", "personality-name", "personality-blurb"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });

    // In-headset dashboard (the bars, money, and objective keep their own colors).
    whenPanelReady(dashboardPanel, function (doc) {
      doc.getElementById("dash-panel")?.setProperties({ backgroundColor: t.panelBg, borderColor: t.panelBorder });
      for (const tid of ["dash-title", "dash-label-sat", "dash-label-profit", "dash-label-instinct", "dash-val-sat", "dash-val-profit", "dash-val-instinct"]) {
        doc.getElementById(tid)?.setProperties({ color: t.ink });
      }
    });
  }

  // Log the economic constants once so we can confirm they loaded.
  console.log("[Money Moves] economic constants loaded", ECON);

  // consumePress: clear a stuck "Pressed" tag so 3D buttons stay reliable.
  // Used once the panels and 3D buttons arrive in later prompts.
  function consumePress(entity: any) {
    if (entity && entity.hasComponent(Pressed)) {
      entity.removeComponent(Pressed);
    }
  }
  void consumePress;
});
