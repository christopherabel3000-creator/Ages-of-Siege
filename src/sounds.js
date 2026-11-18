// Every sound effect, synthesized in code for the prototype.
// Each function takes the engine, a destination node and a start time.
// Later these get swapped for recorded sounds with the same names.

const rand = (a, b) => a + Math.random() * (b - a);

function envGain(ctx, dest, t, { attack = 0.003, dur = 0.1, peak = 1, curve = 'exp' }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t + attack + dur);
  g.connect(dest);
  return g;
}

function noise(e, dest, t, { type = 'bandpass', freq = 1000, freqEnd = null, q = 1, dur = 0.1, gain = 0.5, attack = 0.002 }) {
  const ctx = e.ctx;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + dur);
  f.Q.value = q;
  const g = envGain(ctx, dest, t, { attack, dur, peak: gain });
  src.connect(f); f.connect(g);
  const off = Math.random() * 1.5;
  src.start(t, off);
  src.stop(t + attack + dur + 0.05);
}

function tone(e, dest, t, { type = 'sine', freq = 440, freqEnd = null, dur = 0.2, gain = 0.3, attack = 0.003, filter = null, curve = 'exp' }) {
  const ctx = e.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + dur);
  const g = envGain(ctx, dest, t, { attack, dur, peak: gain, curve });
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.value = filter.freq;
    f.Q.value = filter.q || 0.7;
    o.connect(f); f.connect(g);
  } else {
    o.connect(g);
  }
  o.start(t);
  o.stop(t + attack + dur + 0.05);
  return o;
}

// ---------- Enemies ----------

export function footstep(e, dest, t, heavy = false) {
  noise(e, dest, t, { freq: rand(320, 560), q: 1.3, dur: heavy ? 0.1 : 0.07, gain: heavy ? 0.8 : 0.6 });
  tone(e, dest, t, { freq: heavy ? 80 : 100, freqEnd: 45, dur: 0.07, gain: heavy ? 0.45 : 0.25 });
}

export function runStep(e, dest, t) {
  noise(e, dest, t, { freq: rand(500, 800), q: 1.5, dur: 0.05, gain: 0.5 });
}

export function clank(e, dest, t) {
  const base = rand(0.94, 1.06);
  for (const f of [1240, 1810, 2690, 3320]) {
    tone(e, dest, t + rand(0, 0.015), { freq: f * base, dur: rand(0.15, 0.3), gain: 0.05 });
  }
  noise(e, dest, t, { type: 'highpass', freq: 4000, dur: 0.03, gain: 0.15 });
}

export function woodRattle(e, dest, t) {
  for (const dt of [0, 0.05, 0.11]) {
    noise(e, dest, t + dt + rand(0, 0.01), { freq: rand(1000, 1500), q: 5, dur: 0.03, gain: 0.5 });
  }
}

export function ladderSlam(e, dest, t) {
  noise(e, dest, t, { freq: 700, q: 1.5, dur: 0.2, gain: 1.2 });
  tone(e, dest, t, { type: 'triangle', freq: 170, freqEnd: 80, dur: 0.25, gain: 0.6 });
  noise(e, dest, t + 0.12, { freq: 1100, q: 4, dur: 0.06, gain: 0.5 });
}

export function climbCreak(e, dest, t, urgency = 0) {
  noise(e, dest, t, { freq: 1800 + urgency * 900, q: 12, dur: 0.22, gain: 0.45 });
  noise(e, dest, t + 0.08, { freq: rand(900, 1300), q: 5, dur: 0.04, gain: 0.35 });
}

export function overTheWall(e, dest, t) {
  // A roar of voices and a clash of steel.
  for (let i = 0; i < 4; i++) {
    tone(e, dest, t + i * 0.04, { type: 'sawtooth', freq: rand(140, 220), freqEnd: rand(110, 160), dur: 0.7, gain: 0.18, attack: 0.05, filter: { freq: 900, type: 'bandpass', q: 1.5 } });
  }
  for (const dt of [0.2, 0.45, 0.6]) clank(e, dest, t + dt);
}

export function hack(e, dest, t) {
  // A blade or pick against stone.
  noise(e, dest, t, { freq: rand(2200, 3200), q: 3, dur: 0.05, gain: 0.5 });
  tone(e, dest, t, { freq: rand(2400, 2900), dur: 0.08, gain: 0.05 });
}

export function rumbleLoop(e, dest) {
  // Continuous wheels-on-dirt rumble. Returns a stop function.
  const ctx = e.ctx;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 140;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(1.6, ctx.currentTime + 1);
  // Wobble so it sounds like rolling wheels.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1.6;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(); lfo.start();
  return () => {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    src.stop(t + 0.5); lfo.stop(t + 0.5);
  };
}

export function heave(e, dest, t) {
  // The ram crew chanting together.
  for (let i = 0; i < 3; i++) {
    const f = rand(105, 135);
    tone(e, dest, t + rand(0, 0.05), { type: 'sawtooth', freq: f, freqEnd: f * 0.85, dur: 0.35, gain: 0.12, attack: 0.04, filter: { type: 'bandpass', freq: 650, q: 2 } });
  }
}

export function ramBoom(e, dest, t) {
  tone(e, dest, t, { freq: 62, freqEnd: 32, dur: 0.9, gain: 1.4 });
  noise(e, dest, t, { type: 'lowpass', freq: 350, dur: 0.5, gain: 1.0 });
  noise(e, dest, t + 0.03, { freq: 900, q: 2, dur: 0.12, gain: 0.6 });
}

export function grunt(e, dest, t, pitch = 130) {
  tone(e, dest, t, { type: 'sawtooth', freq: pitch, freqEnd: pitch * 0.8, dur: 0.16, gain: 0.35, attack: 0.02, filter: { type: 'bandpass', freq: 800, q: 3 } });
}

export function deathCry(e, dest, t, pitch = 130) {
  tone(e, dest, t, { type: 'sawtooth', freq: pitch * 1.4, freqEnd: pitch * 0.6, dur: 0.6, gain: 0.4, attack: 0.03, filter: { type: 'bandpass', freq: 900, q: 2 } });
  noise(e, dest, t + 0.5, { type: 'lowpass', freq: 300, dur: 0.2, gain: 0.8 });
  tone(e, dest, t + 0.5, { freq: 75, freqEnd: 40, dur: 0.15, gain: 0.5 });
}

export function hitFlesh(e, dest, t) {
  noise(e, dest, t, { type: 'lowpass', freq: 600, dur: 0.08, gain: 1.0 });
  tone(e, dest, t, { freq: 150, freqEnd: 70, dur: 0.09, gain: 0.5 });
}

export function hitArmor(e, dest, t) {
  for (const f of [2100, 3150, 4420]) tone(e, dest, t, { freq: f * rand(0.97, 1.03), dur: 0.4, gain: 0.12 });
  noise(e, dest, t, { type: 'highpass', freq: 3000, dur: 0.03, gain: 0.5 });
}

export function hitWood(e, dest, t) {
  noise(e, dest, t, { freq: 900, q: 3, dur: 0.07, gain: 0.9 });
  tone(e, dest, t, { type: 'triangle', freq: 260, freqEnd: 180, dur: 0.08, gain: 0.3 });
}

export function missThunk(e, dest, t) {
  noise(e, dest, t, { type: 'lowpass', freq: 700, dur: 0.06, gain: 0.6 });
}

// ---------- Your weapons ----------

export function crossbowFire(e, dest, t) {
  noise(e, dest, t, { type: 'highpass', freq: 3500, dur: 0.015, gain: 0.6 });
  tone(e, dest, t, { type: 'sawtooth', freq: 200, freqEnd: 150, dur: 0.22, gain: 0.35, filter: { freq: 2200 } });
  noise(e, dest, t + 0.01, { freq: 2400, freqEnd: 500, q: 2, dur: 0.3, gain: 0.25 });
}

export function dryClick(e, dest, t) {
  tone(e, dest, t, { type: 'square', freq: 1800, dur: 0.012, gain: 0.08 });
}

export function reloadDone(e, dest, t) {
  noise(e, dest, t, { freq: 3200, q: 6, dur: 0.02, gain: 0.35 });
  noise(e, dest, t + 0.07, { freq: 2600, q: 6, dur: 0.025, gain: 0.4 });
}

export function ballistaFire(e, dest, t) {
  // A massive wooden arm slamming forward, a deep twang, and a heavy whoosh.
  noise(e, dest, t, { type: 'lowpass', freq: 900, dur: 0.12, gain: 1.0 });
  tone(e, dest, t, { freq: 90, freqEnd: 45, dur: 0.3, gain: 0.8 });
  tone(e, dest, t + 0.01, { type: 'sawtooth', freq: 110, freqEnd: 80, dur: 0.45, gain: 0.35, filter: { freq: 900 } });
  noise(e, dest, t + 0.03, { freq: 1200, freqEnd: 250, q: 1.5, dur: 0.6, gain: 0.45 });
}

export function ballistaReady(e, dest, t) {
  // Heavy wooden ratchet: three deep clacks, clearly different from the crossbow click.
  for (const dt of [0, 0.11, 0.22]) {
    noise(e, dest, t + dt, { freq: 700, q: 4, dur: 0.04, gain: 0.55 });
    tone(e, dest, t + dt, { type: 'triangle', freq: 210, dur: 0.05, gain: 0.25 });
  }
}

export function heavyDryClick(e, dest, t) {
  tone(e, dest, t, { type: 'square', freq: 500, dur: 0.02, gain: 0.08 });
}

export function weaponSwitch(e, dest, t, toHeavy) {
  // A rising clack for the ballista, a lighter one for the crossbow.
  tone(e, dest, t, { type: 'triangle', freq: toHeavy ? 220 : 660, dur: 0.06, gain: 0.3 });
  tone(e, dest, t + 0.07, { type: 'triangle', freq: toHeavy ? 165 : 880, dur: 0.08, gain: 0.3 });
}

export function oilPour(e, dest, t) {
  // A cauldron tips, oil glugs and splashes, then sizzles.
  tone(e, dest, t, { type: 'triangle', freq: 140, freqEnd: 90, dur: 0.25, gain: 0.3 });
  for (let i = 0; i < 6; i++) {
    noise(e, dest, t + 0.15 + i * 0.07, { freq: rand(300, 600), q: 6, dur: 0.06, gain: 0.5 });
  }
  noise(e, dest, t + 0.5, { type: 'lowpass', freq: 700, dur: 0.25, gain: 0.8 });
  noise(e, dest, t + 0.55, { type: 'highpass', freq: 4500, dur: 1.4, gain: 0.35, attack: 0.05 });
}

export function oilEmpty(e, dest, t) {
  tone(e, dest, t, { type: 'triangle', freq: 180, freqEnd: 150, dur: 0.15, gain: 0.25 });
}

export function towerCreakLoop(e, dest) {
  // A huge wooden tower on wheels: deep rumble plus slow creaks, scheduled by the game.
  return rumbleLoop(e, dest);
}

export function towerCreak(e, dest, t) {
  noise(e, dest, t, { freq: rand(260, 380), q: 14, dur: 0.6, gain: 0.7, attack: 0.1 });
  tone(e, dest, t, { type: 'sawtooth', freq: rand(70, 90), freqEnd: rand(60, 75), dur: 0.6, gain: 0.15, attack: 0.1, filter: { freq: 400 } });
}

export function volley(e, dest, t) {
  // Several bowstrings at once from the tower.
  for (let i = 0; i < 5; i++) {
    const dt = rand(0, 0.15);
    noise(e, dest, t + dt, { type: 'highpass', freq: 3000, dur: 0.01, gain: 0.3 });
    tone(e, dest, t + dt, { type: 'triangle', freq: rand(280, 360), freqEnd: 240, dur: 0.1, gain: 0.12 });
  }
}

export function arrowsIncoming(e, dest, t) {
  // Whistling arrows passing overhead, then thudding into the wall around you.
  noise(e, dest, t, { freq: 3500, freqEnd: 1200, q: 4, dur: 0.5, gain: 0.25, attack: 0.15 });
  for (let i = 0; i < 5; i++) {
    noise(e, dest, t + 0.55 + rand(0, 0.25), { freq: rand(1200, 2000), q: 3, dur: 0.03, gain: 0.45 });
  }
}

export function gangwaySlam(e, dest, t) {
  tone(e, dest, t, { freq: 55, freqEnd: 30, dur: 1.0, gain: 1.4 });
  noise(e, dest, t, { type: 'lowpass', freq: 500, dur: 0.6, gain: 1.0 });
  overTheWall(e, dest, t + 0.3);
}

export function bowShot(e, dest, t) {
  // An enemy longbow: a taut twang and a creak of the bow.
  noise(e, dest, t - 0.25 > 0 ? t - 0.25 : t, { freq: 900, q: 10, dur: 0.2, gain: 0.25, attack: 0.1 });
  tone(e, dest, t, { type: 'sawtooth', freq: 260, freqEnd: 200, dur: 0.18, gain: 0.3, filter: { freq: 1800 } });
  noise(e, dest, t, { type: 'highpass', freq: 3000, dur: 0.015, gain: 0.5 });
}

export function arrowThunk(e, dest, t) {
  // An arrow striking the stone just below you.
  noise(e, dest, t - 0.2, { freq: 3000, freqEnd: 1500, q: 4, dur: 0.18, gain: 0.15, attack: 0.05 });
  noise(e, dest, t, { freq: 1600, q: 3, dur: 0.04, gain: 0.6 });
  tone(e, dest, t, { type: 'triangle', freq: 900, freqEnd: 600, dur: 0.06, gain: 0.15 });
}

export function archerShot(e, dest, t) {
  noise(e, dest, t, { type: 'highpass', freq: 3000, dur: 0.012, gain: 0.4 });
  tone(e, dest, t, { type: 'triangle', freq: 320, freqEnd: 260, dur: 0.12, gain: 0.25 });
  noise(e, dest, t + 0.01, { freq: 3000, freqEnd: 900, q: 3, dur: 0.25, gain: 0.15 });
}

// A bright, clean two-note chime that means "kill confirmed". Nothing else in the
// game sounds like it. Big kills (the ram) get a third, higher note.
export function killConfirm(e, dest, t, big = false) {
  const notes = big ? [1047, 1319, 1760] : [1319, 1760];
  notes.forEach((f, i) => {
    const at = t + i * 0.085;
    tone(e, dest, at, { type: 'sine', freq: f, dur: 0.35, gain: 0.32 });
    tone(e, dest, at, { type: 'sine', freq: f * 2, dur: 0.15, gain: 0.08 });
  });
}

// ---------- Aim and interface ----------

const LANE_FREQS = [392, 494, 587, 698, 880];

export function laneTick(e, dest, t, lane) {
  tone(e, dest, t, { type: 'triangle', freq: LANE_FREQS[lane], dur: 0.07, gain: 0.35 });
}

export function edgeThump(e, dest, t) {
  tone(e, dest, t, { freq: 90, freqEnd: 60, dur: 0.1, gain: 0.5 });
}

// ---------- Wall ----------

export function wallHit(e, dest, t, strength = 1) {
  tone(e, dest, t, { freq: 72, freqEnd: 38, dur: 0.3, gain: 0.7 });
  noise(e, dest, t, { type: 'lowpass', freq: 450, dur: 0.25, gain: 0.6 });
  if (strength < 0.6) {
    // Cracking stone, more of it as the wall weakens.
    const cracks = strength < 0.3 ? 6 : 3;
    for (let i = 0; i < cracks; i++) {
      noise(e, dest, t + 0.05 + i * rand(0.02, 0.06), { type: 'highpass', freq: rand(2000, 4000), dur: 0.015, gain: 0.5 });
    }
    noise(e, dest, t + 0.1, { type: 'lowpass', freq: 1200, dur: 0.6, gain: 0.25, attack: 0.05 });
  }
}

// ---------- Signals and atmosphere ----------

export function horn(e, dest, t) {
  const ctx = e.ctx;
  for (const [f, g] of [[233, 0.3], [349, 0.12]]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vg = ctx.createGain();
    vg.gain.value = 3;
    vib.connect(vg); vg.connect(o.frequency);
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1300;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + 0.25);
    env.gain.setValueAtTime(g, t + 1.2);
    env.gain.linearRampToValueAtTime(0.0001, t + 1.7);
    o.connect(fl); fl.connect(env); env.connect(dest);
    o.start(t); vib.start(t); o.stop(t + 1.8); vib.stop(t + 1.8);
  }
}

export function drum(e, dest, t) {
  tone(e, dest, t, { freq: 110, freqEnd: 55, dur: 0.35, gain: 0.9 });
  noise(e, dest, t, { type: 'lowpass', freq: 500, dur: 0.08, gain: 0.4 });
}

export function windLoop(e, dest) {
  const ctx = e.ctx;
  const stops = [];
  for (const pan of [-0.7, 0.7]) {
    const src = ctx.createBufferSource();
    src.buffer = e.noise;
    src.loop = true;
    src.playbackRate.value = pan < 0 ? 0.9 : 1.1;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = pan < 0 ? 0.07 : 0.11;
    const lg = ctx.createGain();
    lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(g.gain);
    const flfo = ctx.createOscillator();
    flfo.frequency.value = 0.05;
    const flg = ctx.createGain();
    flg.gain.value = 150;
    flfo.connect(flg); flg.connect(f.frequency);
    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p;
    }
    out.connect(dest);
    src.connect(f); f.connect(g);
    src.start(); lfo.start(); flfo.start();
    stops.push(() => { try { src.stop(); lfo.stop(); flfo.stop(); out.disconnect(); } catch (err) { /* stopped */ } });
  }
  return () => stops.forEach(s => s());
}

export function fanfare(e, dest, t) {
  const notes = [[392, 0], [523, 0.18], [659, 0.36], [784, 0.54]];
  for (const [f, dt] of notes) {
    tone(e, dest, t + dt, { type: 'sawtooth', freq: f, dur: dt === 0.54 ? 0.9 : 0.2, gain: 0.18, attack: 0.02, filter: { freq: 2000 } });
  }
}

export function defeatTones(e, dest, t) {
  const notes = [[220, 0], [196, 0.4], [165, 0.8]];
  for (const [f, dt] of notes) {
    tone(e, dest, t + dt, { type: 'sawtooth', freq: f, dur: 0.6, gain: 0.18, attack: 0.05, filter: { freq: 900 } });
  }
  noise(e, dest, t, { type: 'lowpass', freq: 300, dur: 1.5, gain: 0.8, attack: 0.1 });
}

export function buy(e, dest, t) {
  tone(e, dest, t, { freq: 1320, dur: 0.08, gain: 0.15 });
  tone(e, dest, t + 0.07, { freq: 1760, dur: 0.12, gain: 0.15 });
}
