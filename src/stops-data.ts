// ============================================================================
// stops-data.ts  —  the tunable DATA and copy for Virginia Today (Module 6).
// Every CONSTANTS block that is pure data (no world/scene refs): the hub and
// stop layout, the onboarding words, the decision packs, the per-stop staging
// and backdrop tuning, the Port mini-game config, and the Explorer Report copy.
// index.ts imports these; the logic that reads them stays there. Adding or
// tuning a stop should mean editing this file, not the shell.
// ============================================================================

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
export const HUB = {
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
export const LANDMARK = {
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
export const HUB_COLOR = {
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
export const STOPS = [
  {
    id: "tech",
    name: "Tech Office",
    title: "Tech Office, Northern Virginia",
    region: "Northern Virginia",
    tagline: "Where tech and defense cluster",
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
// MODULE 6 — OPENING ONBOARDING  (the welcome the student gets before the map
// is explorable). Two blocks: ONBOARD is every tunable position/size/timing for
// the goal card, Fox's tutorial bubble, the highlight cues, and the three gold
// buttons; ONBOARD_LINES is all the student-facing words (kept exact). The flow
// is: a goal card, then Foreman Fox teaches the one control one line at a time
// (with a real practice tap), then the gate opens. It is fully skippable. All of
// this drives off setInterval (rAF pauses in the headset) and reuses the same
// canvas-card + Interactable pointing the rest of the hub uses.
// ============================================================================
export const ONBOARD = {
  TICK_MS: 33,
  // The goal card and the buttons sit in the SAME comfortable zone in front of the
  // student that the Explorer Report uses (just ahead of the landmark row), so the
  // opening and the finish feel like one place. Front is +Z, toward the student.
  GOAL_POS: [0, 1.74, 5.0] as [number, number, number],
  GOAL_W: 1.95,            // goal card width (m); height follows its canvas
  // Foreman Fox's tutorial speech bubble, by his head. This REPLACES the old static
  // welcome bubble, so the student is welcomed exactly once, here.
  BUBBLE_W: 1.06,          // a touch wider than the old welcome, for the longer lines
  BUBBLE_Y: 1.95,          // floats just above Fox (his tail points down to him)
  // The advance button (Start on the goal card, Next on the tutorial) and the small
  // Skip option. Start and Next share one spot since only one shows at a time.
  ADVANCE_POS: [0, 0.86, 5.14] as [number, number, number],
  ADVANCE_W: 1.2, ADVANCE_H: 0.34,
  SKIP_POS: [1.12, 0.7, 5.08] as [number, number, number],
  SKIP_W: 0.82, SKIP_H: 0.27,
  HOVER_SCALE: 1.06, PRESS_SCALE: 0.95,   // button feedback (matches VISIT.BTN_*)
  // The Fox practice target: an invisible hit box over Fox so the "point at me and
  // press" practice tap registers, plus how much Fox grows while pointed at.
  FOX_HIT_W: 0.74, FOX_HIT_H: 1.55, FOX_HIT_D: 0.74, FOX_HIT_Y: 0.78,
  FOX_HOVER_SCALE: 1.06,
  // The gold highlight frames Fox points with: one bracketing Fox (step 2), one
  // ringing the meters panel (step 3). The landmarks (step 4) use their OWN bright
  // glow via introHighlightLandmarks, so there is one owner of each highlight.
  FOX_FRAME_W: 0.98, FOX_FRAME_H: 1.72, FOX_FRAME_Y: 0.92, FOX_FRAME_Z_OFF: 0.22,
  METERS_FRAME_W: 1.36, METERS_FRAME_H: 1.06, METERS_FRAME_BACK: 0.05,
  // The highlight breathe: a calm sine between these, never a flash.
  PULSE_MIN: 0.3, PULSE_MAX: 0.72, PULSE_SPEED: 2.4,
  HALO_COLOR: "#f4c20d",   // house gold, matching the buttons and the visited badge
};

// Every student-facing word of the opening, kept EXACTLY as written. Fifth-grade,
// second person, short sentences, no em dashes. tut[1] (index 1) is the practice
// line: it ends by asking the student to point at Fox and press, and the flow
// waits for that tap. rest is the calm line Fox is left on once the gate opens.
export const ONBOARD_LINES = {
  speaker: "Foreman Fox",
  experienceTitle: "Virginia Today: Industry Explorer", // the VR experience name, shown as the header on the goal card
  goalTitle: "Your Virginia Adventure",
  goalIntro: "Today you will:",
  goalBullets: [
    "Explore four real places that drive Virginia's economy today.",
    "Make smart choices that fill three meters: Economic Impact, Innovation Thinking, and Problem Solving.",
    "Finish with your own Explorer Report.",
  ],
  tut: [
    "Welcome, explorer! I am Fox, and today you get to explore how Virginia's economy works right now.",
    "Here is how you do everything in here: point your controller at something, then press to choose it. Try it now, point at me and press.",
    "Nice! Up here are your three meters: Economic Impact, Innovation Thinking, and Problem Solving. Every good choice fills them up.",
    "Ahead of you are four places in Virginia to explore. Visit all four, and you will earn your Explorer Report at the end.",
  ],
  rest: "That is everything. Point at any place to start exploring. Have fun!",
};

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
export type MeterEffects = { ei: number; it: number; ps: number };
// A stop's build reacts to each pick. A strong choice makes the new piece THRIVE
// (steady bright glow, data flowing along its cables); a weak one makes it STRUGGLE
// (dim, gently flickering, stalled flow); an in-between one runs NEUTRAL (a quiet,
// steady hum). The staging reads this; the meter math (effects) is unchanged.
export type StageReaction = "thrive" | "struggle" | "neutral";
export type DecisionOption = { label: string; effects: MeterEffects; note: string; reaction?: StageReaction };
export type Decision = { question: string; options: DecisionOption[] };
export type DecisionPack = { setup: string; decisions: Decision[] };

// SCORE-TUNING TARGETS (checked by `npm run audit:score`, see scripts/audit-score.ts).
// Totals accumulate across the four stops, 0..100 per meter; the report gives 3
// stars at >= 60, 2 stars at >= 60/2, and the top "Virginia Economist" title at an
// average >= 60. Current numbers, from the audit:
//   - Decision stops, all strong picks: EI 52 / IN 52 / PS 62 (best possible here).
//   - Port strong haul adds up to EI 36 / IN 18 / PS 24 (its caps). Economic Impact
//     and Innovation lean on the Port to clear 60, so a perfect run needs a real
//     Port haul (about 4+ correct loads covering all three ships).
// The audit enforces all of these:
//   - a perfect run earns 3 stars on all three meters + the Economist title;
//   - a typical (uniform random-pick) run still reaches 2 stars on every meter,
//     because each question below offers two defensible options with different
//     meter profiles and at most one weak pick (Phase 3.2);
//   - a weak run still earns 1 star everywhere (no fail). Keep new options in that
//     band and re-run `npm run audit:score` after any edit here.

export const DECISION_PACKS: { [stopId: string]: DecisionPack } = {
  // ---- Tech Office, Northern Virginia (decision segment). Three data-center
  // choices. Each question now offers two defensible options with DIFFERENT meter
  // profiles (a strong all-around pick and a real tradeoff) plus one weak-but-not-
  // punishing option, so a thoughtful student is choosing between good ideas, not
  // spotting the one right answer. No pick fails: weak picks still earn a little.
  // reaction drives the 3D staging (thrive bright / neutral steady / struggle dim);
  // the runner and meter math read effects, nothing is hardcoded.
  tech: {
    setup:
      "A tech company in Northern Virginia, next to Washington, D.C. Nearby are companies that help defend the country. Make three smart choices.",
    decisions: [
      {
        question: "Where should we build it?",
        options: [
          {
            label: "Out in the cheap countryside.",
            effects: { ei: 6, it: 0, ps: 2 },
            reaction: "neutral",
            note: "Cheap land saves money, but it sits far from the internet lines and power, so the center runs slower.",
          },
          {
            label: "In Northern Virginia, near the internet lines and lots of power.",
            effects: { ei: 8, it: 6, ps: 8 },
            reaction: "thrive",
            note: "This is why tech clusters here by D.C.: fast internet, plenty of power, and government and defense customers all close by.",
          },
          {
            label: "Downtown, with no spare power.",
            effects: { ei: 2, it: 0, ps: 0 },
            reaction: "struggle",
            note: "Downtown has no spare room or power, so the center cannot grow.",
          },
        ],
      },
      {
        question: "How will you power it?",
        options: [
          {
            label: "Rely on the strong, steady power grid.",
            effects: { ei: 6, it: 0, ps: 8 },
            reaction: "neutral",
            note: "A steady grid keeps it reliable and costs less, though it misses the chance to use cleaner energy.",
          },
          {
            label: "Build a strong supply and add solar panels.",
            effects: { ei: 3, it: 8, ps: 8 },
            reaction: "thrive",
            note: "Steady power plus solar is a smart, modern choice, though the panels cost a little more to add.",
          },
          {
            label: "Buy the cheapest power, even if it cuts out.",
            effects: { ei: 3, it: 0, ps: 0 },
            reaction: "struggle",
            note: "The cheapest power saves money, but it cuts out and the whole center stops.",
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
            note: "New jobs for local workers, and the fast connection keeps every computer running.",
          },
          {
            label: "Run it lean with smart software.",
            effects: { ei: 2, it: 7, ps: 6 },
            reaction: "neutral",
            note: "Smart software makes it efficient and modern, but it creates fewer local jobs.",
          },
          {
            label: "Use a slow, cheap connection.",
            effects: { ei: 2, it: 0, ps: 0 },
            reaction: "struggle",
            note: "A slow connection saves money, but it cannot keep up with all the computers.",
          },
        ],
      },
    ],
  },

  // ---- Tourism Hub, Colonial Williamsburg (decision segment). The pricing question
  // is the model for the whole module: every option is a real tradeoff. Two defensible
  // options per question with different profiles, at most one weak pick, and no pick
  // fails. reaction drives the staging; effects feed the shared runner and meters.
  tourism: {
    setup:
      "Welcome to historic Colonial Williamsburg. Make three choices to welcome visitors and protect the site.",
    decisions: [
      {
        question: "How will you price tickets?",
        options: [
          {
            label: "Make them free.",
            effects: { ei: 6, it: 0, ps: 0 },
            reaction: "neutral",
            note: "Free tickets bring big, happy crowds, but with no ticket money it is harder to keep the old buildings repaired.",
          },
          {
            label: "Set a fair price.",
            effects: { ei: 8, it: 0, ps: 8 },
            reaction: "thrive",
            note: "Plenty of visitors still come, and the ticket money keeps the historic site beautiful.",
          },
          {
            label: "Charge a very high price.",
            effects: { ei: 6, it: 0, ps: 3 },
            reaction: "neutral",
            note: "A high price earns a lot per ticket and keeps crowds small, but fewer families can afford to visit.",
          },
        ],
      },
      {
        question: "How will you bring visitors in?",
        options: [
          {
            label: "Do nothing and hope they show up.",
            effects: { ei: 2, it: 0, ps: 0 },
            reaction: "struggle",
            note: "Waiting for visitors to find the site on their own brings very few.",
          },
          {
            label: "Share the real history and hands-on experiences.",
            effects: { ei: 8, it: 8, ps: 0 },
            reaction: "thrive",
            note: "People travel from far away for real, hands-on history they cannot get anywhere else.",
          },
          {
            label: "Build flashy modern attractions instead.",
            effects: { ei: 6, it: 0, ps: 0 },
            reaction: "neutral",
            note: "Flashy attractions pull a quick crowd, but they cover up the real history people came to see.",
          },
        ],
      },
      {
        question: "How will you handle crowds and the old buildings?",
        options: [
          {
            label: "Let in huge crowds with no limits.",
            effects: { ei: 8, it: 0, ps: 0 },
            reaction: "neutral",
            note: "Huge crowds bring in a lot of money today, but with no limits the historic buildings get worn and damaged.",
          },
          {
            label: "Set smart limits and protect the buildings.",
            effects: { ei: 6, it: 6, ps: 8 },
            reaction: "thrive",
            note: "Steady visitors, and smart limits keep the site beautiful for years to come.",
          },
          {
            label: "Close off most of the site to be safe.",
            effects: { ei: 0, it: 0, ps: 4 },
            reaction: "struggle",
            note: "Closing off most of the site keeps it very safe, but visitors leave disappointed and you earn very little.",
          },
        ],
      },
    ],
  },

  // ---- Modern Farm, Shenandoah Valley (decision segment). Farming did not disappear
  // in Virginia, it got smarter. Each question pits a modern, tech-forward pick against
  // a simpler, cheaper one with a different profile, plus one weak-but-not-punishing
  // option. reaction drives the staging; effects feed the shared runner and meters.
  farm: {
    setup:
      "Welcome to a modern farm in the Shenandoah Valley. Make three choices to grow a great harvest with new technology.",
    decisions: [
      {
        question: "How will you plant your crops?",
        options: [
          {
            label: "Plant by hand the old way.",
            effects: { ei: 4, it: 0, ps: 2 },
            reaction: "neutral",
            note: "Planting by hand costs little, but seeds get wasted and the rows come out uneven.",
          },
          {
            label: "Use a GPS-guided tractor to plant in perfect rows.",
            effects: { ei: 3, it: 8, ps: 8 },
            reaction: "thrive",
            note: "No wasted seed, and every plant has room to grow.",
          },
          {
            label: "Pack in way too many seeds to be safe.",
            effects: { ei: 3, it: 0, ps: 0 },
            reaction: "struggle",
            note: "Packing in extra seed wastes nothing, but the crowded plants choke each other.",
          },
        ],
      },
      {
        question: "How will you know when the crops need water?",
        options: [
          {
            label: "Water the whole field the same every day.",
            effects: { ei: 2, it: 0, ps: 3 },
            reaction: "neutral",
            note: "Watering everything every day keeps crops alive, but it wastes a lot of water.",
          },
          {
            label: "Fly a sensor drone to find the dry spots, then water only those.",
            effects: { ei: 0, it: 8, ps: 8 },
            reaction: "thrive",
            note: "You water only the dry spots, so you save water and the crops stay healthy.",
          },
          {
            label: "Only water once plants already look like they are wilting.",
            effects: { ei: 2, it: 0, ps: 0 },
            reaction: "struggle",
            note: "Waiting until plants wilt saves water at first, but by then the crops are already hurt.",
          },
        ],
      },
      {
        question: "How will you bring in the harvest and sell it?",
        options: [
          {
            label: "Harvest by hand and sell at the local stand.",
            effects: { ei: 4, it: 0, ps: 4 },
            reaction: "neutral",
            note: "Selling at the local stand builds close ties to your town, but by hand you reach only a few buyers.",
          },
          {
            label: "Use modern machines to harvest and sell to buyers across the country.",
            effects: { ei: 8, it: 8, ps: 6 },
            reaction: "thrive",
            note: "A big harvest, and modern machines let you reach far more customers.",
          },
          {
            label: "Rush the harvest with machines but skip checking the crops.",
            effects: { ei: 3, it: 0, ps: 0 },
            reaction: "struggle",
            note: "Fast, but skipping quality checks ships bruised, low-quality produce.",
          },
        ],
      },
    ],
  },
};

// ============================================================================
// THEN AND NOW  (the module's history through-line, "The Great Shift").
// One short then-vs-now fact per stop, shown on a shared card when the stop
// finishes, right before its Finish button. Two sentences each, fifth-grade
// voice, no em dashes. Keep them short so they fit the finish card.
// ============================================================================
export const THEN_NOW: { [stopId: string]: string } = {
  tech: "Long ago this land was farm fields. Today it is home to the internet, in giant data centers full of humming computers.",
  port: "Long ago, colonists shipped tobacco to England from these same waters. Today the Port of Virginia ships goods all around the world.",
  tourism: "Long ago, Williamsburg was Virginia's busy capital. Today its history is the main attraction, and sharing that story is the business.",
  farm: "Long ago, farmers planted and watered by hand and by guess. Today GPS tractors and sensor drones help them grow more and waste less.",
};

// ============================================================================
// STOP STAGING — TUNING  (how the build reacts to each pick; shared by all stops)
// One labeled block for every blink, glow, and flow rate, so the comfort rules
// (slow, gentle, never strobing) are tuned in ONE place. The generic staging
// engine and the Tech Office build read these; the meter math does not.
// ============================================================================
export const STAGING = {
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
export const TECH_BUILD = {
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
export const TECH_ROOM = {
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
export const TOURISM_BUILD = {
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
export const TOURISM_VILLAGE = {
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
export const FARM_BUILD = {
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
export const FARM_VALLEY = {
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
// decision pack). It is a real trade lesson: three docked ships, each a MARKET
// (Europe / Asia / United States); a conveyor of Virginia PRODUCTS the student taps
// and sends to the ship for the market that buys it. A correct market loads it with a
// happy cue; the wrong market gently refuses and the product flies back, no penalty.
// Each ship also wears a "wants" sign, and each product keeps its market's backup
// color, so the student can match by reasoning or by color. No choice ever fails. All positions are WORLD coordinates
// (the student spawns near z = +7 and looks toward -z, so smaller z is farther
// out over the water). The game reads ONLY this block. Scoring (correct loads -> the
// three meters + result), a slow MOVING CONVEYOR supply, and ambient SHIP DEPARTURES
// (sail out + a fresh same-destination ship pulls in) are all wired here now.
// ============================================================================
export const PORT = {
  TICK_MS: 33,                 // every port loop runs on setInterval (rAF pauses in headset)
  // ---- the three ships: a row across the dock on a gentle arc. key is the MARKET the
  // ship sails to; color is that market's color, shared with the backup color of every
  // PRODUCT bound for it (see PRODUCTS below), so a color match still lines up. wants is
  // the short sign on the ship telling the student which products that market buys, so
  // the student can reason out the match instead of only matching colors.
  SHIPS: [
    { key: "europe", label: "EUROPE",        color: "#2f7fd0", wants: "Europe buys: Machines, Lumber",      pos: [-1.7, 0.0, 4.35] }, // blue
    { key: "asia",   label: "ASIA",          color: "#d23b30", wants: "Asia buys: Soybeans, Coal",          pos: [ 0.0, 0.0, 4.0 ] }, // red
    { key: "usa",    label: "UNITED STATES", color: "#3fa64a", wants: "Stays in the USA: Chicken, Seafood",  pos: [ 1.7, 0.0, 4.35] }, // green
  ] as { key: string; label: string; color: string; wants: string; pos: [number, number, number] }[],
  // ---- the six Virginia PRODUCTS the student loads, each onto the ship for the MARKET
  // that buys it. color is a backup equal to that market's ship color, so a student who
  // cannot read the labels yet can still match by color. The PRODUCT decides the match
  // (correct when its market is the ship's market), NOT the color. icon names the simple
  // shape drawn on the container face beside the product name.
  PRODUCTS: [
    { name: "Soybeans", market: "asia",   color: "#d23b30", icon: "soybeans" }, // red, to Asia
    { name: "Coal",     market: "asia",   color: "#d23b30", icon: "coal" },     // red, to Asia
    { name: "Machines", market: "europe", color: "#2f7fd0", icon: "gear" },     // blue, to Europe
    { name: "Lumber",   market: "europe", color: "#2f7fd0", icon: "lumber" },   // blue, to Europe
    { name: "Chicken",  market: "usa",    color: "#3fa64a", icon: "chicken" },  // green, stays in the USA
    { name: "Seafood",  market: "usa",    color: "#3fa64a", icon: "fish" },     // green, stays in the USA
  ] as { name: string; market: string; color: string; icon: string }[],
  // ---- the teaching layer: a one-line WHY-FACT shown briefly on each CORRECT load, so the
  // student learns from the trade, not just sorts it. Keyed by product name; fifth-grade
  // voice, one short sentence each. Shown on the calm fact card (FACT_* below), then faded.
  WHY_FACT: {
    Soybeans: "Virginia grows lots of soybeans, and Asia is the biggest buyer.",
    Coal:     "Coal is Virginia's number one export, shipped across the ocean to Asia.",
    Machines: "Virginia factories build machines that Europe buys.",
    Lumber:   "Virginia's forests give us wood that Europe buys.",
    Chicken:  "Virginia chicken is trucked to families in other US states.",
    Seafood:  "Virginia's coast brings in seafood for restaurants across the USA.",
  } as Record<string, string>,
  SHIP_HULL_W: 1.5, SHIP_HULL_H: 0.55, SHIP_HULL_D: 0.95,  // low-poly hull box
  DECK_Y: 0.72,                // world y of the deck top (where a loaded box would sit)
  WATER_Y: 0.05,              // harbor water top (the ships sit in it)
  BOB_HZ: 0.16, BOB_AMP: 0.03, // a very gentle ship bob (slow; nothing lurches)
  PULSE_FALL: 0.06,            // how fast the "loaded!" gold glow on a ship eases away
  // ---- the clickable ship target: ONE generous, invisible hit-pad that wraps the WHOLE
  // ship (base, hull, name tag, mast, and flag), so a tap on ANY part of the ship sends the
  // selected container there. It is a fully transparent box (opacity 0), never a hidden mesh,
  // so it always registers a tap. The pad is a live ray target ONLY while the student is
  // holding a container (see the gating in tick): the rest of the time it leaves the ray set
  // entirely, so an idle aim passes straight THROUGH it to the Finish button that lines up
  // just behind the green berth. That gating is why the pad can now stand full height without
  // ever stealing a Finish press, so it no longer has to be kept short.
  PAD_W: 1.6, PAD_H: 1.7, PAD_D: 1.05,  // hit-pad size (m): a touch wider than the hull, tall enough to cover the flag (no neighbor overlap, ships are 1.7 apart)
  PAD_Y: 0.8,                           // hit-pad center height; spans ~[-0.05, 1.65], the waterline up past the flag + mast top
  SHIP_HOVER_GLOW: 0.28,                // faint gold on a ship while the ray rests on it
  // ---- the moving CONVEYOR supply ----  Containers ride a slow LEFT->RIGHT belt into
  // the student's reach and are tapped there. Spacing is guaranteed by N fixed belt
  // "slots" that travel together and wrap; each slot's container scales 0<->1 near the
  // belt ends (the seam), so a container grows in at the left, rides across full-size,
  // shrinks away at the right, and the wrap itself is never a visible jump. The belt
  // travel is the only constant supply motion and is slow + calm. Driven on setInterval.
  CONTAINER: 0.34,            // container cube size (m)
  BELT_N: 5,                  // containers riding the belt at once (the moving "slots")
  // belt span in x; the whole run sits in easy reach AND inside the forward view. The
  // belt is close (BELT_Z below), so a wide span would push the end containers past a
  // laptop's screen edges; kept to +-1.5 so every tappable container is in view without
  // a camera drag (the seam ends, where a container has scaled to ~0, may sit at the
  // very edge but are never tappable there anyway).
  BELT_X_MIN: -1.4, BELT_X_MAX: 1.4,
  BELT_Y: 1.0,               // container center height riding the belt
  BELT_Z: 5.6,               // belt depth: the reach line, just ahead of the spawn
  BELT_SPEED: 0.26,          // belt travel speed (m/s) — slow and calm
  BELT_SEAM_FRAC: 0.16,      // fraction of the belt at EACH end where a container scales 0<->1 (hides the wrap)
  BELT_TAP_MIN_SCALE: 0.82,  // a container is only tappable once it has scaled in past this (clear of the ends)
  ENTER_MS: 300,             // a refilled / returned container scales back in over this, so it never pops
  START_PRODUCTS: ["Machines", "Soybeans", "Chicken", "Coal", "Lumber"],          // the belt opens with a spread across all three markets
  REFILL_PRODUCTS: ["Seafood", "Machines", "Soybeans", "Chicken", "Lumber", "Coal"], // a loaded slot refills with the next product here, cycling through all six
  PARK_Y: -100,              // a loaded container parks far below the world: invisible AND out of any aim
  // ---- the belt STRUCTURE (drawn in buildPortGame): a dark bed with a scrolling
  // chevron surface, two side rails, end rollers, and legs down to the dock. ----
  BELT_BED_COLOR: "#34393f", BELT_CHEVRON: "#525a62", BELT_RAIL_COLOR: "#787f86",
  BELT_ROLLER_COLOR: "#9aa0a7", BELT_LEG_COLOR: "#5e4a30",
  BELT_BED_D: 0.66,          // belt depth in z (the bed + the container footprint)
  BELT_BED_PAD: 0.5,         // how far the bed/rollers extend past the slot span at each end
  BELT_CHEVRON_REPEAT: 14,   // chevrons tiled along the bed (scrolls to show motion)
  // ---- tap-to-select + fly feel ----  A tapped container lifts and glows so it is
  // clearly the chosen one; tapping a ship then sends it on a smooth arc to the deck.
  SELECT_LIFT: 0.18,         // how far a selected container rises above its slot (m)
  SELECT_HOVER_AMP: 0.015, SELECT_HOVER_HZ: 0.5, // a tiny, calm hover while selected (never a flash)
  SELECT_GLOW: "#fff0b8",    // warm gold selection glow (reads over the blue/red/green cubes)
  SELECT_GLOW_MIN: 0.32, SELECT_GLOW_MAX: 0.68,  // the selection glow breathes gently between these
  WRONG_GLOW: "#d23b30",     // the red "wrong ship" blink color
  HOVER_SCALE: 1.08,         // an idle container grows a touch while the ray rests on it
  FLIGHT_MS: 520,            // how long a container's arc to a ship takes (smooth, not slow)
  FLIGHT_ARC: 0.6,           // peak extra height of the flight arc (m), eased up then down
  // ---- the empty-water deselect catcher: a big invisible plane BEHIND every ship, so a
  // tap on open water (past the containers and ships) lands here and clears the selection.
  CATCH_Z: 1.5, CATCH_Y: 2.5, CATCH_W: 16, CATCH_H: 12,
  RETURN_MS: 280,            // a wrong ship eases the container back to its shelf slot over this
  REFILL_MS: 460,            // a beat after a load before a fresh container appears in the slot
  TINT_FALL: 0.05,           // how fast the red "wrong ship" blink on a container fades
  // ---- SHIP DEPARTURE CYCLE ----  A busy working port: each ship loads at its berth
  // for a calm stretch, then sails out to sea (shrinking into the distance with a soft
  // horn) and a fresh ship of the SAME destination pulls in to take the berth. The three
  // labeled berths (EUROPE/ASIA/USA) are therefore ALWAYS present, so matching, scoring,
  // the round, and the directions never change — this is ambient life, not a deadline,
  // and there is no fail. Staggered so the berths are rarely empty together. setInterval.
  DOCK_MS_FIRST: 13000,      // a generous first stretch docked, so the student loads before any ship leaves
  DOCK_MS: 16000,            // how long a ship stays docked on later cycles
  DOCK_STAGGER: 5200,        // per-ship offset so the three never depart in lockstep
  SAIL_MS: 4500,             // a slow, smooth sail OUT (ease-in, shrinking away)
  ARRIVE_MS: 4500,           // a slow, smooth sail IN (ease-out, growing as it nears)
  SAIL_OUT_Z: -8.5,          // world z a departing ship recedes to (far out over the water)
  SAIL_OUT_SCALE: 0.18,      // a departing ship shrinks to this as it recedes, then hides (reads as "gone")
  // ---- the dock + harbor backdrop ----
  DOCK_COLOR: "#9c7b4f", DOCK_TRIM: "#7d6038", PILING: "#5e4a30",
  WATER_COLOR: "#2b6c8f", WATER_SHIMMER: 0.1, WATER_HZ: 0.05,
  CRANE: "#c8543a", CRANE_LEG: "#9a9ea3",   // distant dock cranes, harbor flavor only
  // ---- two TALL loading cranes that frame the dock (drawn in buildPortScene) ----
  // Placed at the far sides, well outside the ship row and the conveyor, so they never
  // block the ships, containers, panels, or counts. Tower + horizontal jib + a hanging
  // cable/hook, all static (the moving belt + sailing ships carry the motion).
  LOAD_CRANE_X: 3.5,         // |x| of each tall crane (outside the |1.7| ship row and |2.3| belt)
  LOAD_CRANE_Z: 4.3,         // z of the tall cranes (alongside the ships, over the water edge)
  LOAD_CRANE_H: 4.2,         // tower height (tall, reads as a real loading crane)
  LOAD_CRANE_JIB: 2.4,       // jib arm length, reaching out over the water (toward -z)
  LOAD_CRANE_TOWER: "#c8543a", LOAD_CRANE_FRAME: "#9a9ea3", LOAD_CRANE_CABLE: "#3a3f45",
  // ---- a warm sky: a wide gradient backdrop low on the horizon + a soft sun, both far
  // behind everything so they never interfere. The sun sits off to one side, not behind
  // a ship sign. ----
  SKY_Z: -16, SKY_W: 66, SKY_H: 32, SKY_Y: 11,   // the warm gradient backdrop, far out and wide
  // a warm, hazy late-afternoon sky: warm mauve-grey up high easing through peach to a
  // golden horizon, so even the upper sky (all that shows above the ships) reads warm.
  SKY_TOP: "#cdbcc6", SKY_MID: "#edcaa6", SKY_HORIZON: "#f4bd82",
  SUN_POS: [-6.5, 3.2, -14] as [number, number, number], SUN_R: 1.1, SUN_COLOR: "#ffd9a0",
  // ---- the live SHIPPED manifest (per-ship counts + a running total) ----
  // Friendly in-play feedback so the student sees their haul grow; the final tally
  // also drives the result panel + the three-meter award below.
  // The live SHIPPED manifest sits in the upper LEFT, brought in from the old far-left
  // spot so it stays inside the forward view on a laptop, and lifted just above the
  // centre hint so the two never overlap. (It draws on top, like the other port cards.)
  DEBUG_POS: [-1.5, 2.45, 4.9] as [number, number, number],
  DEBUG_W: 1.15, DEBUG_H: 0.92,
  // ---- SCORING: correct loads -> the three meters ----  The Port LEANS ON Economic
  // Impact (the other three stops lean on Innovation and Problem Solving). Every
  // container dropped on its MATCHING ship adds these; a wrong tap never subtracts, it
  // only costs the student a little time. There is no fail state.
  SCORE_PER_LOAD: { ei: 3, it: 1, ps: 2 },     // per correct load; EI is the largest
  // A small GLOBAL-TRADE bonus: getting at least one container onto ALL THREE ships
  // rewards using the whole trade network. Added once, before the cap below.
  ALL_SHIPS_BONUS: { ei: 0, it: 5, ps: 0 },    // +5 Innovation when every ship got one
  // A marathon session still stays inside one stop's share of the 0..100 meters (the
  // decision stops top out near here too), so the Port can never swamp the report.
  SCORE_MAX: { ei: 36, it: 18, ps: 24 },
  // ---- result lines by haul size (ALL positive; no losing). The count of correctly
  // shipped containers picks the tier. ----
  HAUL_BIG_AT: 8,   // this many correct loads or more -> the top line
  HAUL_MID_AT: 4,   // 4..7 -> the middle line; 1..3 -> the warm line
  RESULT_BIG:  "Amazing work! You kept the whole world trading through Virginia.",
  RESULT_MID:  "Great job! You sent goods out to ports across the globe.",
  RESULT_WARM: "Nice start! Every container helps Virginia trade with the world.",
  // The "why the meters grew" framing, shown UNDER the three gains in the result card (a
  // smaller, calmer sub-note). One short line per meter, in the SAME order the gains list
  // them, so the student learns what each one rewarded. Newlines keep them on tidy rows.
  RESULT_WHY:
    "Economic Impact: trade like this supports about one in five Virginia jobs.\n" +
    "Innovation Thinking: you reached markets around the world.\n" +
    "Problem Solving: you matched each product to the right market.",
  // ---- the round-end FINISH button -> result panel -> RETURN button ----  The student
  // loads at their own pace; FINISH ends the round and brings up the result. RETURN (same
  // spot, shown WITH the result) lands the score and fades back to the map. Both sit UP
  // and to the RIGHT, ABOVE the ship pads and the moving belt: a low button here (the old
  // y=0.9) sat behind the green berth, so the student's pointing ray caught the belt
  // containers and the ship tap-pad before ever reaching it and it read as unclickable in
  // the headset. Lifting them clear of every play interactable in Y fixes that while
  // staying inside the desktop forward view, and they still draw on top (z~3.3) so they
  // never clip the dock, ships, or the result card centered below them.
  FINISH_POS: [1.65, 2.05, 3.3] as [number, number, number], FINISH_W: 1.0, FINISH_H: 0.36,
  RETURN_POS: [1.65, 2.05, 3.3] as [number, number, number], RETURN_W: 1.2, RETURN_H: 0.36,
  RESULT_POS: [0, 1.9, 3.3] as [number, number, number], RESULT_W: 2.2, // lifted a touch so the taller why-framed card still clears the containers below
  // ---- on-arrival DIRECTIONS (guidance only; mechanic/count/timers are untouched) ----
  // An intro panel + Start button explain the goal, then a short hint follows the play.
  // All sit ABOVE the dock and draw on top (depthTest off), so they never cover the ships,
  // containers, or count; text redraws only on a state change, so nothing flashes. The
  // intro rides the calm, comfortable runner depth (z~3.3); the Start button rides its
  // lower margin; the hint floats just above the shelf, clear of the centre ship's mast.
  INTRO_POS: [0, 2.45, 3.3] as [number, number, number], INTRO_W: 2.1,
  START_POS: [0, 1.74, 3.2] as [number, number, number], START_W: 0.95, START_H: 0.26, // sits just below the arrival card so the full directions show above it
  HINT_POS: [0, 1.9, 5.7] as [number, number, number], HINT_W: 1.8, HINT_H: 0.34,
  // ---- the WHY-FACT pop (the teaching layer) ----  A brief parchment card on each correct
  // load, set HIGH and centered so it covers neither the ships (their tops sit well below)
  // nor the conveyor; the running hint hides while it shows so the two never overlap. It
  // fades in, holds long enough to read, then fades out on its own, so it never blocks play.
  FACT_POS: [0, 2.0, 5.0] as [number, number, number], FACT_W: 1.9, FACT_H: 0.52,
  FACT_IN_MS: 240,            // gentle fade IN (never a pop)
  FACT_HOLD_MS: 2600,         // held fully visible, long enough to read one line
  FACT_OUT_MS: 760,           // gentle fade OUT, so it clears itself without a tap
  // The THEN AND NOW finish card: shown centered at comfortable reading height BEFORE
  // the result (the finish area is too busy to show both at once), then it steps aside.
  THEN_NOW_POS: [0, 1.95, 3.3] as [number, number, number], THEN_NOW_W: 2.0,
  THEN_NOW_HOLD_MS: 3200,     // long enough to read two sentences before the result appears
};

// ============================================================================
// EXPLORER REPORT  —  copy + layout for the end-of-tour report card.
// (The reveal/draw logic lives in index.ts.)
// ============================================================================
export const REPORT = {
  // The "See your Explorer Report" offer: a clear banner floating ABOVE the
  // landmark row, fully on screen, covering no gold check and blocking no
  // landmark (the row stays pointable for a revisit). Angled to the student.
  SEE_POS: [-0.3, 2.22, 4.6] as [number, number, number],
  SEE_YAW: 0.15, SEE_W: 1.7, SEE_H: 0.42,
  // The report card: centered in front of the student, just ahead of the row.
  PANEL_POS: [0, 1.78, 4.95] as [number, number, number],
  PANEL_W: 2.0,          // report card width (metres); height follows the canvas
  // The two buttons under the card: Save (left), Return (right).
  SAVE_POS: [-0.58, 0.74, 5.12] as [number, number, number],
  SAVE_W: 1.04, SAVE_H: 0.4,
  RETURN_POS: [0.58, 0.74, 5.12] as [number, number, number],
  RETURN_W: 1.04, RETURN_H: 0.4,
  HOVER_SCALE: 1.06, PRESS_SCALE: 0.95,  // button feedback (matches VISIT.BTN_*)
  TICK_MS: 33,           // loop rate (rAF pauses in the headset)

  // The three meters, in reveal order. key reads m6Totals; color matches the hub
  // meters (coral / green / blue). Each has two POSITIVE line tiers: a strong
  // line at or above LINE_HI_AT, a warm line below. Fifth-grade, second person.
  METERS: [
    { key: "economic", label: "Economic Impact", color: "#d76f4f",
      hi: "You helped Virginia's economy grow.", warm: "You gave Virginia's economy a boost." },
    { key: "innovation", label: "Innovation Thinking", color: "#5fae4a",
      hi: "You used new ideas to solve real problems.", warm: "You found smart new ways to help." },
    { key: "problem", label: "Problem Solving", color: "#4a8fd6",
      hi: "You made careful choices that paid off.", warm: "You thought through tricky choices." },
  ],
  LINE_HI_AT: 50,        // a meter at or above this earns its "hi" line (else "warm")
  STAR3_AT: 60,          // 3 stars at or above this score
  STAR2_AT: 30,          // 2 stars at or above this; below, 1 star (never 0, no fail)

  // The combined Virginia title, chosen by the AVERAGE of the three meters
  // (checked top down). All three are warm and encouraging.
  TITLES: [
    { at: 60, name: "Virginia Economist", note: "You see how Virginia's economy works." },
    { at: 35, name: "Virginia Innovator", note: "You bring fresh ideas to Virginia." },
    { at: 0, name: "Virginia Trailblazer", note: "You are blazing your own trail in Virginia." },
  ],

  // The staged reveal timings (milliseconds). Slow and smooth, never a flash.
  STOPS_HOLD_MS: 750,    // hold on the four stamps before the first meter fills
  METER_GAP_MS: 850,     // time between each meter starting to fill
  FILL_EASE: 0.16,       // how fast each bar eases toward its score
  TITLE_AT_MS: 3350,     // when the Virginia title appears (after the third meter)
  RETURN_AT_MS: 750,     // Return is offered once the stamps are up (never stuck)
  SAVE_AT_MS: 3850,      // Save is offered once the whole report has revealed
};
