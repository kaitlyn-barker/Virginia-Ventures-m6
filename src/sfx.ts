// ============================================================================
// sfx.ts  —  synthesized sound effects for Virginia Today (no audio files needed)
// Tiny WebAudio jingles plus the per-stop ambient beds (server hum, village
// murmur, farm breeze, harbor water/gulls). They need no
// files and keep playing inside a WebXR session. The AudioContext can only
// start after the first interaction, so we create it lazily on the first play.
// ============================================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function note(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.18,
  when = 0,
  slideTo?: number,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Soft UI tap.
export function sfxClick() {
  note(660, 0.07, "sine", 0.12);
  note(990, 0.05, "sine", 0.06, 0.02);
}
// Money coming in (earning, interest, a reward). An ascending sparkle.
export function sfxCoin() {
  note(880, 0.09, "square", 0.07);
  note(1175, 0.12, "square", 0.07, 0.07);
}
// Money going down (a dip or a cost). Gentle, not scary.
export function sfxDown() {
  note(420, 0.18, "triangle", 0.12, 0, 260);
}
// A new life stage begins.
export function sfxStage() {
  note(330, 0.16, "sine", 0.12, 0, 660);
  note(880, 0.22, "triangle", 0.1, 0.14);
}
// The final report celebration.
export function sfxFanfare() {
  const b = 523.25;
  note(b, 0.16, "triangle", 0.14, 0);
  note(b * 1.25, 0.16, "triangle", 0.14, 0.13);
  note(b * 1.5, 0.16, "triangle", 0.14, 0.26);
  note(b * 2, 0.42, "triangle", 0.16, 0.39);
}
// The mentor has news.
export function sfxNotify() {
  note(587, 0.1, "sine", 0.12);
  note(784, 0.14, "sine", 0.12, 0.09);
}

// A short, pleasant chime for a strong ("thrive") pick. Soft ascending bells,
// kept quiet and brief so it never startles.
export function sfxChime() {
  note(659.25, 0.18, "sine", 0.1, 0); // E5
  note(987.77, 0.2, "sine", 0.1, 0.09); // B5
  note(1318.51, 0.3, "triangle", 0.09, 0.18); // E6
}

// ----------------------------------------------------------------------------
// AMBIENT HUM  —  a quiet server-room loop: a low electrical hum plus soft
// filtered "fan" air. It loops until stopHum(). Like every sound here it can
// only begin after a first interaction (the AudioContext rule), so the caller
// starts it once the student is inside the stop. Soft on purpose (kids in a
// headset). Gentle fade in and out so it never pops.
// ----------------------------------------------------------------------------
let humHandle: { gain: GainNode; sources: AudioScheduledSourceNode[] } | null = null;
const HUM_LEVEL = 0.05; // master gain of the whole ambience (very soft)

export function startHum() {
  const ctx = getCtx();
  if (!ctx || humHandle) return; // already humming, or no audio
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(HUM_LEVEL, ctx.currentTime + 1.2); // ease in
  master.connect(ctx.destination);

  const sources: AudioScheduledSourceNode[] = [];

  // Low electrical hum: 60 Hz and its octave, the deeper one louder.
  for (const f of [60, 120]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = f === 60 ? 0.6 : 0.22;
    osc.connect(g).connect(master);
    osc.start();
    sources.push(osc);
  }

  // Soft "fan air": looped white noise through a low-pass, kept faint.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 480;
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  noise.connect(lp).connect(ng).connect(master);
  noise.start();
  sources.push(noise);

  humHandle = { gain: master, sources };
}

export function stopHum() {
  const ctx = getCtx();
  if (!humHandle || !ctx) return;
  const { gain, sources } = humHandle;
  const t = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); // ease out
  } catch {
    // ignore: context may be closing
  }
  for (const s of sources) {
    try {
      s.stop(t + 0.7);
    } catch {
      // already stopped
    }
  }
  humHandle = null;
}

// ----------------------------------------------------------------------------
// VILLAGE AMBIENCE  —  the outdoor counterpart to the server-room hum: a soft
// murmur of distant visitors (gently swelling) under a faint warm pad, plus the
// occasional light bird chirp. Same approach as startHum: pure WebAudio drones
// that loop until stopVillageAmbience(), so no rAF; the only timer is a slow
// setInterval that sprinkles in birdsong. Soft and short on purpose (kids in a
// headset), with a gentle fade in/out so it never pops. The caller starts it on
// the student's first action in the stop (the AudioContext is unlocked by then).
// ----------------------------------------------------------------------------
let villageHandle: {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  birds: ReturnType<typeof setInterval>;
} | null = null;
const VILLAGE_LEVEL = 0.05; // master gain of the whole ambience (very soft)

// a soft, quick two-note bird call (a little up-tick then a chirp down), pitch
// varied each time so it never sounds mechanical. Routed through note() so it is
// naturally short and quiet.
function birdChirp() {
  const base = 1700 + Math.random() * 1300;
  note(base, 0.08, "sine", 0.035, 0, base * 1.16);
  note(base * 1.12, 0.07, "sine", 0.03, 0.09, base * 0.9);
  if (Math.random() < 0.5) note(base * 1.05, 0.06, "sine", 0.025, 0.18);
}

export function startVillageAmbience() {
  const ctx = getCtx();
  if (!ctx || villageHandle) return; // already running, or no audio
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(VILLAGE_LEVEL, ctx.currentTime + 1.2); // ease in
  master.connect(ctx.destination);

  const sources: AudioScheduledSourceNode[] = [];

  // Soft murmur of visitors: looped white noise through a band-pass around the
  // low-mid "chatter" range, kept faint.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const murmur = ctx.createBufferSource();
  murmur.buffer = buffer;
  murmur.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 500;
  bp.Q.value = 0.7;
  const mg = ctx.createGain();
  mg.gain.value = 0.5;
  murmur.connect(bp).connect(mg).connect(master);
  murmur.start();
  sources.push(murmur);

  // a very slow swell on the murmur (an LFO on its gain), so the crowd gently ebbs
  // and flows. Audio-rate scheduling, not rAF.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.1; // very slow
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.18;
  lfo.connect(lfoGain).connect(mg.gain);
  lfo.start();
  sources.push(lfo);

  // a faint warm pad underneath, so the outdoors feels full, not hissy.
  const pad = ctx.createOscillator();
  pad.type = "sine";
  pad.frequency.value = 110;
  const pg = ctx.createGain();
  pg.gain.value = 0.06;
  pad.connect(pg).connect(master);
  pad.start();
  sources.push(pad);

  // Light birdsong: an occasional soft chirp, sprinkled in on a slow setInterval
  // (randomized so the spacing varies). Cleared in stopVillageAmbience.
  const birds = setInterval(function () {
    if (Math.random() < 0.5) birdChirp();
  }, 3500);

  villageHandle = { gain: master, sources, birds };
}

export function stopVillageAmbience() {
  const ctx = getCtx();
  if (!villageHandle || !ctx) return;
  const { gain, sources, birds } = villageHandle;
  clearInterval(birds);
  const t = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); // ease out
  } catch {
    // ignore: context may be closing
  }
  for (const s of sources) {
    try {
      s.stop(t + 0.7);
    } catch {
      // already stopped
    }
  }
  villageHandle = null;
}

// ----------------------------------------------------------------------------
// FARM AMBIENCE  —  the rural counterpart to the server-room hum and the village
// murmur: a soft, gently GUSTING BREEZE (a slow swell) under a faint warm pad, plus
// the occasional light bird chirp. Same approach as startHum/startVillageAmbience:
// pure WebAudio drones that loop until stopFarmAmbience(), so no rAF; the only timer
// is a slow setInterval that sprinkles in birdsong (reusing the village's birdChirp).
// Soft and short on purpose (kids in a headset), with a gentle fade in/out so it never
// pops. The caller starts it on the student's first action in the stop (entering it),
// by which point the AudioContext is unlocked.
// ----------------------------------------------------------------------------
let farmHandle: {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  birds: ReturnType<typeof setInterval>;
} | null = null;
const FARM_LEVEL = 0.05; // master gain of the whole ambience (very soft)

export function startFarmAmbience() {
  const ctx = getCtx();
  if (!ctx || farmHandle) return; // already running, or no audio
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(FARM_LEVEL, ctx.currentTime + 1.2); // ease in
  master.connect(ctx.destination);

  const sources: AudioScheduledSourceNode[] = [];

  // A light breeze: looped white noise through a low-pass, kept faint and airy
  // (a higher cutoff than the indoor "fan air", so it reads as open-air wind).
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const breeze = ctx.createBufferSource();
  breeze.buffer = buffer;
  breeze.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 800;
  const bg = ctx.createGain();
  bg.gain.value = 0.4;
  breeze.connect(lp).connect(bg).connect(master);
  breeze.start();
  sources.push(breeze);

  // a very slow swell on the breeze (an LFO on its gain), so the wind gently gusts
  // and falls. Audio-rate scheduling, not rAF.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07; // very slow gusting
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  lfo.connect(lfoGain).connect(bg.gain);
  lfo.start();
  sources.push(lfo);

  // a faint warm pad underneath, so the open air feels full, not hissy.
  const pad = ctx.createOscillator();
  pad.type = "sine";
  pad.frequency.value = 98; // G2, low and soft
  const pg = ctx.createGain();
  pg.gain.value = 0.06;
  pad.connect(pg).connect(master);
  pad.start();
  sources.push(pad);

  // Light birdsong: an occasional soft chirp on a slow setInterval (randomized so
  // the spacing varies). Reuses the same birdChirp() as the village. Cleared on stop.
  const birds = setInterval(function () {
    if (Math.random() < 0.45) birdChirp();
  }, 4000);

  farmHandle = { gain: master, sources, birds };
}

export function stopFarmAmbience() {
  const ctx = getCtx();
  if (!farmHandle || !ctx) return;
  const { gain, sources, birds } = farmHandle;
  clearInterval(birds);
  const t = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); // ease out
  } catch {
    // ignore: context may be closing
  }
  for (const s of sources) {
    try {
      s.stop(t + 0.7);
    } catch {
      // already stopped
    }
  }
  farmHandle = null;
}

// ----------------------------------------------------------------------------
// PORT AMBIENCE  —  the harborside counterpart to the other stops' loops: soft
// lapping water (a low, slowly swelling wash) under a faint warm pad, plus the
// occasional distant gull. Same approach as startHum/startFarmAmbience: pure
// WebAudio drones that loop until stopPortAmbience(), so no rAF; the only timer is
// a slow setInterval that sprinkles in gull cries. Soft and short on purpose (kids
// in a headset), with a gentle fade in/out so it never pops. The caller starts it
// on the student's first action in the stop (entering it), by which point the
// AudioContext is unlocked.
// ----------------------------------------------------------------------------
let portHandle: {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  gulls: ReturnType<typeof setInterval>;
} | null = null;
const PORT_LEVEL = 0.05; // master gain of the whole ambience (very soft)

// A distant gull: two soft, slightly nasal cries that slide DOWN (the gull "mew"),
// pitch varied each time so it never sounds mechanical. Quiet and short via note().
function gullCry() {
  const base = 820 + Math.random() * 360;
  note(base, 0.16, "sawtooth", 0.03, 0, base * 0.72);          // a down-slurred cry
  note(base * 0.94, 0.18, "sawtooth", 0.026, 0.2, base * 0.68); // a second, lower
  if (Math.random() < 0.5) note(base * 0.9, 0.16, "sawtooth", 0.022, 0.42, base * 0.66);
}

// A soft, low ship horn for a departure: two low tones a fifth apart with a slow,
// warm swell, kept gentle so it reads as "far across the water," never a blast.
export function sfxShipHorn() {
  note(110, 0.7, "triangle", 0.11, 0, 104);   // A2, easing down a touch
  note(146.83, 0.66, "triangle", 0.07, 0.02); // D3 a fifth up, for body
  note(73.42, 0.74, "sine", 0.06, 0.03);      // D2 sub, for weight
}

export function startPortAmbience() {
  const ctx = getCtx();
  if (!ctx || portHandle) return; // already running, or no audio
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(PORT_LEVEL, ctx.currentTime + 1.2); // ease in
  master.connect(ctx.destination);

  const sources: AudioScheduledSourceNode[] = [];

  // Lapping water: looped white noise through a low-pass, kept faint and round (a
  // lower cutoff than the open-air breeze, so it reads as water against the dock).
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const water = ctx.createBufferSource();
  water.buffer = buffer;
  water.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 620;
  const wg = ctx.createGain();
  wg.gain.value = 0.42;
  water.connect(lp).connect(wg).connect(master);
  water.start();
  sources.push(water);

  // a very slow swell on the water (an LFO on its gain), so the wash gently rises and
  // falls like small harbor waves. Audio-rate scheduling, not rAF.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.09; // very slow wave swell
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  lfo.connect(lfoGain).connect(wg.gain);
  lfo.start();
  sources.push(lfo);

  // a faint warm pad underneath, so the harbor feels full, not hissy.
  const pad = ctx.createOscillator();
  pad.type = "sine";
  pad.frequency.value = 104; // low and soft
  const pg = ctx.createGain();
  pg.gain.value = 0.06;
  pad.connect(pg).connect(master);
  pad.start();
  sources.push(pad);

  // Distant gulls: an occasional soft cry on a slow setInterval (randomized so the
  // spacing varies). Cleared in stopPortAmbience.
  const gulls = setInterval(function () {
    if (Math.random() < 0.4) gullCry();
  }, 5000);

  portHandle = { gain: master, sources, gulls };
}

export function stopPortAmbience() {
  const ctx = getCtx();
  if (!portHandle || !ctx) return;
  const { gain, sources, gulls } = portHandle;
  clearInterval(gulls);
  const t = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); // ease out
  } catch {
    // ignore: context may be closing
  }
  for (const s of sources) {
    try {
      s.stop(t + 0.7);
    } catch {
      // already stopped
    }
  }
  portHandle = null;
}
