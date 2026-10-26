// Game sounds, generated in code with the Web Audio API (no audio files to download).
// Sound is off by default and only plays after the player turns it on in Settings.
// Browsers (especially iPhone Safari) only allow audio after a tap, so unlock() runs on taps.

let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) unlock();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a tap handler so iOS lets audio play later in the turn. */
export function unlock(): void {
  const c = getCtx();
  if (!c) return;
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    // ignore
  }
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  // pinkish noise: softer and more crowd-like than pure white noise
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
  }
  return buf;
}

function envGain(c: AudioContext, t: number, attack: number, peak: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

/** Bat on ball: a sharp click with a woody knock under it. Louder for better hits. */
export function playCrack(strength = 1): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const vol = 0.25 + 0.45 * Math.min(Math.max(strength, 0), 1);

  const click = c.createBufferSource();
  click.buffer = noiseBuffer(c, 0.08);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const cg = envGain(c, t, 0.002, vol, 0.06);
  click.connect(hp).connect(cg).connect(c.destination);
  click.start(t);

  const knock = c.createOscillator();
  knock.type = 'triangle';
  knock.frequency.setValueAtTime(420, t);
  knock.frequency.exponentialRampToValueAtTime(140, t + 0.09);
  const kg = envGain(c, t, 0.003, vol * 0.8, 0.12);
  knock.connect(kg).connect(c.destination);
  knock.start(t);
  knock.stop(t + 0.2);
}

/** Swing and a miss: a quick swoosh. */
export function playWhiff(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.4);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(2400, t);
  bp.frequency.exponentialRampToValueAtTime(350, t + 0.32);
  const g = envGain(c, t, 0.06, 0.5, 0.28);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
}

/** Ball caught or landing short: a soft glove pop. */
export function playPop(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
  const g = envGain(c, t, 0.004, 0.35, 0.14);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.2);
}

/** Crowd reaction. 0 = polite murmur, 1 = home run roar. */
export function playCrowd(intensity = 1): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const dur = 1.2 + intensity * 1.8;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur + 0.2);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900 + intensity * 500;
  bp.Q.value = 0.6;
  const g = c.createGain();
  const peak = 0.12 + intensity * 0.38;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.25 + intensity * 0.2);
  g.gain.setValueAtTime(peak, t + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
}

/** Last seconds on the clock. */
export function playTick(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = 1150;
  const g = envGain(c, t, 0.002, 0.08, 0.04);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.06);
}

/** Too high or too low after a swing: a short two-note "not quite". */
export function playFoul(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  [520, 390].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = envGain(c, t + i * 0.09, 0.005, 0.16, 0.12);
    o.connect(g).connect(c.destination);
    o.start(t + i * 0.09);
    o.stop(t + i * 0.09 + 0.18);
  });
}
