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
  Pressed,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  Box3,
  Group,
  Color,
} from "@iwsdk/core";

import { buildBaseWorld, buildShopProps, setStageLook, GUS_SPOT, STATIONS } from "./environment";
import { meshBox, meshCyl, meshSphere, meshCone, makeTextPanel } from "./environment";
import { setActiveShop, activeShop, SHOPS, ShopId, ShopPack } from "./shops";
import { sfxStage, sfxClick, sfxCoin, sfxFanfare } from "./sfx";

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
  TITLE_Y: 1.95,         // height of each landmark's floating title panel
  TITLE_W: 0.85,         // width of a title panel, in metres
  FOX_GAP: 0.95,         // how far left of the first station Foreman Fox stands
  WELCOME_Y: 2.3,        // welcome panel rides high above Fox, clear of the titles
  WELCOME_W: 1.0,        // width of the welcome panel, in metres
  STAGE_TOP_Y: 0.0,      // top of the stage platform (flush with the standing floor)
  STAGE_THICK: 0.14,     // stage slab thickness
  STAGE_FRONT_Z: 3.7,    // stage near edge (just in front of the row)
  STAGE_BACK_Z: 7.7,     // stage far edge (just behind the standing student)
  STAGE_MARGIN: 0.5,     // how far the stage reaches past Fox and the last station
  BADGE_Y: 0.62,         // height of the gold "visited" check on the pedestal front
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
};

// The warm palette for the stage, the pedestals, and the gold visited badge.
const HUB_COLOR = {
  stage: "#c9b48a",      // warm sand stage platform
  stageRim: "#9c7f53",   // darker trim peeking out under the stage edge
  pedestal: "#b9a47e",   // stone pedestal column
  pedestalCap: "#d8c8a4", // lighter cap ring on each pedestal
  badge: "#f4c20d",      // gold visited badge disk
  badgeCheck: "#ffffff", // white check stroke on the badge
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
    landmark: "Data Center",
    color: "#3f9fd0",   // tech blue
    done: true,         // TEMP (step 6): preview the visited badge — reset to false
  },
  {
    id: "port",
    name: "Port of Virginia",
    title: "Port of Virginia, Norfolk",
    region: "Norfolk",
    landmark: "Cargo Ship",
    color: "#e06a4f",   // port red-orange
    done: false,
  },
  {
    id: "tourism",
    name: "Tourism Hub",
    title: "Tourism Hub, Colonial Williamsburg",
    region: "Williamsburg",
    landmark: "Capitol Building",
    color: "#caa24a",   // colonial gold
    done: true,         // TEMP (step 6): preview the visited badge — reset to false
  },
  {
    id: "farm",
    name: "Modern Farm",
    title: "Modern Farm, Shenandoah Valley",
    region: "Shenandoah Valley",
    landmark: "Red Barn",
    color: "#5fae4a",   // farm green
    done: false,
  },
];

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
  const fox = buildHubFox();
  fox.position.set(foxX, HUB.STAGE_TOP_Y, HUB.ROW_Z); // left end, in line with the row
  hubGroup.add(fox); // built facing +z, toward the student

  // --- The welcome panel: smaller now, floating above Fox so each landmark's
  // own title can carry the lineup. Keeps Fox's welcome line. ---
  const welcomeSign = makeTextPanel(
    "Welcome, Explorer!",
    "Virginia's economy looks very different today than it used to. Four places on this map show you why. Point at any one to visit it first.",
    HUB.WELCOME_W,
  );
  welcomeSign.position.set(foxX, HUB.WELCOME_Y, HUB.ROW_Z);
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
    obj: Group; baseY: number; stop: any; glowMats: any[]; badge: Group;
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

    // The landmark, enlarged so the row fills the view, resting on the pedestal.
    const landmark = build();
    landmark.scale.setScalar(HUB.MODEL_SCALE);
    landmark.position.set(px, HUB.PED_TOP_Y, HUB.ROW_Z);
    const glowMats: any[] = [];
    softGlow(landmark, LANDMARK.GLOW, glowMats);
    hubGroup.add(landmark);

    // The floating title: big name, smaller region line, facing the student.
    const title = makeTextPanel(stop.name, stop.region, HUB.TITLE_W);
    title.position.set(px, HUB.TITLE_Y, HUB.ROW_Z);
    hubGroup.add(title);

    // The gold visited check on the pedestal front; the bob loop shows/hides it.
    const badge = makeCheckBadge();
    badge.position.set(px, HUB.BADGE_Y, HUB.ROW_Z + HUB.PED_R + 0.02);
    badge.visible = stop.done;
    hubGroup.add(badge);

    hubLandmarks.push({ obj: landmark, baseY: HUB.PED_TOP_Y, stop, glowMats, badge });
  }

  // One gentle loop drives both the bob and the visited state, so flipping a
  // stop's done flag later just works. setInterval, not rAF (rAF pauses in VR).
  let bobT = 0;
  setInterval(function () {
    bobT += 0.033;
    for (let i = 0; i < hubLandmarks.length; i++) {
      const lm = hubLandmarks[i];
      // Bob: all four drift up and down, phase-staggered so they feel alive.
      lm.obj.position.y =
        lm.baseY + Math.sin(bobT * LANDMARK.BOB_SPEED + i * LANDMARK.BOB_STAGGER) * LANDMARK.BOB_AMP;
      if (lm.stop.done) {
        // Finished: pulse off, a calm steady glow, the gold check showing.
        for (const m of lm.glowMats) m.emissiveIntensity = LANDMARK.DONE_GLOW;
        lm.badge.visible = true;
      } else {
        // Unvisited: breathe the glow up and down to invite a visit, no badge.
        const t = 0.5 + 0.5 * Math.sin(bobT * LANDMARK.PULSE_SPEED + i * LANDMARK.BOB_STAGGER);
        const e = LANDMARK.PULSE_MIN + (LANDMARK.PULSE_MAX - LANDMARK.PULSE_MIN) * t;
        for (const m of lm.glowMats) m.emissiveIntensity = e;
        lm.badge.visible = false;
      }
    }
  }, 33);

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
