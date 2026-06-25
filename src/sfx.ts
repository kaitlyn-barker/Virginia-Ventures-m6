// ============================================================================
// sfx.ts  —  synthesized sound effects for Money Moves (no audio files needed)
// Tiny WebAudio jingles, the same approach as Market Harvest. They need no
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
