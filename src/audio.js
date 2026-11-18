// Audio engine: 3D placement (HRTF), distance muffling, echo.

export const MAX_DIST = 120;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.9;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    // Ask iPhone to treat this as playback audio so the silent switch doesn't mute it.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }

    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.comp);

    // Echo off the hills: generated impulse response.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4, 2.2);
    this.reverbOut = ctx.createGain();
    this.reverbOut.gain.value = 0.7;
    this.reverb.connect(this.reverbOut);
    this.reverbOut.connect(this.master);

    // Shared white noise.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Unlock on iOS: play a silent buffer inside the tap.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);

    if (ctx.state === 'suspended') await ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  get now() { return this.ctx.currentTime; }

  suspend() { if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') return this.ctx.resume(); }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        // Small gap before the echo starts, then exponential decay.
        const t = i / len;
        ch[i] = (i < ctx.sampleRate * 0.03 ? 0 : (Math.random() * 2 - 1)) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  // A sound source placed on the battlefield. angle in degrees (0 = straight ahead,
  // negative = left), dist in meters, height in meters (for flyers later).
  createVoice(angle, dist, height = 0) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.rolloffFactor = 0; // we control loudness ourselves
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    const dry = ctx.createGain();
    const wet = ctx.createGain();

    input.connect(filter);
    filter.connect(panner);
    panner.connect(dry);
    panner.connect(wet);
    dry.connect(this.master);
    wet.connect(this.reverb);

    const voice = { input, filter, panner, dry, wet, angle, dist, height, disposed: false };
    this.placeVoice(voice, angle, dist, height, true);
    return voice;
  }

  placeVoice(voice, angle, dist, height = voice.height, instant = false) {
    voice.angle = angle; voice.dist = dist; voice.height = height;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const a = angle * Math.PI / 180;
    const elev = Math.atan2(height, Math.max(dist, 1));
    const x = Math.sin(a) * Math.cos(elev);
    const z = -Math.cos(a) * Math.cos(elev);
    const y = Math.sin(elev);
    const p = voice.panner;
    if (p.positionX) {
      if (instant) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
      else {
        p.positionX.setTargetAtTime(x, t, 0.05);
        p.positionY.setTargetAtTime(y, t, 0.05);
        p.positionZ.setTargetAtTime(z, t, 0.05);
      }
    } else {
      p.setPosition(x, y, z);
    }
    const d = Math.max(0, dist);
    const gain = 1 / (1 + d / 14);
    const cutoff = 1200 + 15000 * Math.exp(-d / 28);
    const wet = 0.08 + 0.55 * Math.min(1, d / MAX_DIST);
    const set = (param, v) => instant ? (param.value = v) : param.setTargetAtTime(v, t, 0.08);
    set(voice.dry.gain, gain);
    set(voice.wet.gain, gain * wet + 0.02);
    set(voice.filter.frequency, cutoff);
  }

  disposeVoice(voice, delay = 2) {
    if (!voice || voice.disposed) return;
    voice.disposed = true;
    setTimeout(() => {
      try { voice.input.disconnect(); voice.filter.disconnect(); voice.panner.disconnect(); voice.dry.disconnect(); voice.wet.disconnect(); } catch (e) { /* already gone */ }
    }, delay * 1000);
  }

  // A non-positioned output with optional left/right pan, for your own weapon and menus.
  createNear(pan = 0, gain = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(this.master);
    } else {
      g.connect(this.master);
    }
    return g;
  }
}
