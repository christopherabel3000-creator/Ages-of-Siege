// One wave of battle: the game loop and the rules.

import * as S from './sounds.js';
import { LANES, ENEMIES, BASE, DIFFICULTY, SPAWN_DIST } from './data.js';

const TOWERS = [
  { angle: -80, dist: 7 },  // left tower
  { angle: 80, dist: 7 },   // right tower
];

export class Battle {
  constructor(opts) {
    this.e = opts.engine;
    this.speaker = opts.speaker;
    this.wave = opts.wave;
    this.label = opts.label;          // e.g. "Wave 2"
    this.up = opts.upgrades;          // { bolts: 1, winch: 0, ... }
    this.introduced = opts.introduced; // { knight: true, ... }
    this.diff = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    this.onEnd = opts.onEnd;
    this.onIntroduce = opts.onIntroduce || (() => {});
    this.onHud = opts.onHud || (() => {});
    this.onPauseChange = opts.onPauseChange || (() => {});

    this.maxHP = BASE.wallHP * (1 + 0.25 * (this.up.walls || 0));
    this.hp = this.maxHP;
    this.damage = (this.up.bolts || 0) ? 2 : 1;
    this.reload = BASE.reload[this.up.winch || 0];
    this.archers = this.up.tower || 0;

    this.aim = 2;
    this.time = 0;
    this.state = 'ready'; // ready, running, paused, over
    this.enemies = [];
    this.pending = [];   // bolts in flight
    this.events = this.wave.events.slice().sort((a, b) => a.t - b.t);
    this.nextEvent = 0;
    this.drumsUntil = -1; this.nextDrum = 0;
    this.reloadUntil = 0;
    this.kills = 0;
    this.goldEarned = 0;
    this.warned50 = false; this.warned25 = false;
    this.firstGroup = true;
    this.nextTower = TOWERS.map((_, i) => 2 + i * BASE.towerInterval / 2);
    this.hudTimer = 0;
    this.ended = false;
    this.endTimer = null;
  }

  // ---------- Lifecycle ----------

  start() {
    const e = this.e;
    this.near = e.createNear(0, 1);
    this.laneVoices = LANES.map(l => e.createVoice(l.angle, 4));
    this.towerVoices = TOWERS.map(t => e.createVoice(t.angle, t.dist));
    this.stopWind = S.windLoop(e, e.master);
    let msg = `${this.label}. ${this.wave.title}.`;
    if (!this.introduced.ready) {
      msg += ' Tap, or press F, to begin.';
      this.onIntroduce('ready');
    }
    this.speaker.say(msg, { urgent: true });
    this._hud(true);
  }

  begin() {
    this.state = 'running';
    this.last = performance.now();
    const tick = (now) => {
      if (this.state === 'over') return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.state === 'running') this.update(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    if (this.state !== 'running' && this.state !== 'ready') return;
    this.prevState = this.state;
    this.state = 'paused';
    this.e.suspend();
    this.speaker.say('Paused.', { urgent: true, remember: false });
    this.onPauseChange(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.e.resume();
    this.state = this.prevState === 'ready' ? 'ready' : 'running';
    this.last = performance.now();
    this.speaker.say('Resumed.', { urgent: true, remember: false });
    this.onPauseChange(false);
  }

  quit() { this._cleanup(); }

  _cleanup() {
    this.state = 'over';
    cancelAnimationFrame(this.raf);
    if (this.endTimer) clearTimeout(this.endTimer);
    if (this.stopWind) this.stopWind();
    this.e.resume();
    for (const en of this.enemies) this._silence(en);
    this.enemies = [];
    for (const v of [...(this.laneVoices || []), ...(this.towerVoices || [])]) this.e.disposeVoice(v, 1);
  }

  // ---------- Input ----------

  action(a) {
    if (this.state === 'over') return;
    if (a === 'pause') { this.state === 'paused' ? this.resume() : this.pause(); return; }
    if (this.state === 'paused') return;
    if (a === 'repeat') { this.speaker.repeat(); return; }
    if (a === 'status') { this.speaker.say(this.statusText(), { urgent: true }); return; }
    if (this.state === 'ready') {
      if (a === 'fire') { this.speaker.stop(); this.begin(); }
      return;
    }
    if (a === 'aimLeft') this.setAim(this.aim - 1);
    else if (a === 'aimRight') this.setAim(this.aim + 1);
    else if (a.startsWith('lane')) this.setAim(Number(a.slice(4)));
    else if (a === 'fire') this.fire();
  }

  setAim(lane) {
    const t = this.e.now + 0.005;
    if (lane < 0 || lane > 4) { S.edgeThump(this.e, this.near, t); return; }
    this.aim = lane;
    S.laneTick(this.e, this.laneVoices[lane].input, t, lane);
    this._hud(true);
  }

  fire() {
    const e = this.e;
    const t = e.now + 0.005;
    if (this.time < this.reloadUntil) { S.dryClick(e, this.near, t); return; }
    S.crossbowFire(e, this.near, t);
    this.reloadUntil = this.time + this.reload;
    S.reloadDone(e, this.near, t + this.reload);
    this._launch(this.aim, LANES[this.aim].angle, 'player');
  }

  _launch(lane, fromAngle, source) {
    const target = this._pickTarget(lane);
    if (!target) {
      // Bolt lands in the dirt.
      this.pending.push({ at: this.time + 0.45, miss: true, lane });
      return;
    }
    target.incoming += this.damage;
    const flight = Math.max(0.05, target.dist / BASE.boltSpeed);
    this.pending.push({ at: this.time + flight, target, damage: this.damage, source });
  }

  _pickTarget(lane) {
    const inLane = this.enemies.filter(en => (lane === null || en.lane === lane) && !en.dead && en.dist <= SPAWN_DIST + 15);
    if (!inLane.length) return null;
    inLane.sort((a, b) => a.dist - b.dist);
    return inLane.find(en => en.hp - en.incoming > 0) || inLane[0];
  }

  // ---------- Update ----------

  update(dt) {
    this.time += dt;
    const now = this.time;
    const e = this.e;
    const at = e.now + 0.01;

    // Spawn scheduled groups.
    while (this.nextEvent < this.events.length && this.events[this.nextEvent].t <= now) {
      this._runEvent(this.events[this.nextEvent]);
      this.nextEvent++;
    }

    // Distant war drums during lulls.
    if (now < this.drumsUntil && now >= this.nextDrum) {
      if (!this.drumVoice) this.drumVoice = e.createVoice(0, 115);
      S.drum(e, this.drumVoice.input, at);
      const beat = Math.floor(this.nextDrum / 0.6) % 4;
      this.nextDrum = now + (beat === 3 ? 1.2 : 0.6);
    }

    // Bolts in flight.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (p.at > now) continue;
      this.pending.splice(i, 1);
      this._resolve(p, at);
    }

    // Archer towers.
    for (let i = 0; i < this.archers; i++) {
      if (now >= this.nextTower[i]) {
        this.nextTower[i] = now + BASE.towerInterval;
        const target = this._pickTarget(null);
        if (target && target.dist <= BASE.towerRange) {
          S.archerShot(e, this.towerVoices[i].input, at);
          target.incoming += 1;
          const flight = 0.2 + target.dist / 60;
          this.pending.push({ at: now + flight, target, damage: 1, source: 'tower' });
        } else {
          this.nextTower[i] = now + 0.5; // check again soon
        }
      }
    }

    // Enemies.
    for (const en of this.enemies) {
      if (en.dead) continue;
      this._updateEnemy(en, dt, now, at);
      if (this.state === 'over') return;
    }
    this.enemies = this.enemies.filter(en => !en.dead);

    // Wave cleared?
    if (!this.ended && this.nextEvent >= this.events.length && this.enemies.length === 0 && this.pending.length === 0) {
      this.ended = true;
      this.endTimer = setTimeout(() => this._finish(true), 1500);
    }

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.25; this._hud(); }
  }

  _runEvent(ev) {
    const e = this.e;
    const at = e.now + 0.01;
    if (ev.drums) {
      this.drumsUntil = this.time + ev.drums;
      this.nextDrum = this.time;
      return;
    }
    const def = ENEMIES[ev.type];
    const lane = ev.type === 'ram' ? 2 : ev.lane;
    if (ev.horn || this.firstGroup) {
      const hv = e.createVoice(LANES[lane].angle, 90);
      S.horn(e, hv.input, at);
      e.disposeVoice(hv, 3);
    }
    this.firstGroup = false;
    for (let i = 0; i < ev.count; i++) this._spawn(ev.type, lane, SPAWN_DIST + i * 5 + Math.random() * 2);

    const laneName = LANES[lane].name;
    if (!this.introduced[ev.type]) {
      this.onIntroduce(ev.type);
      this.speaker.say(`${def.intro} Coming in the ${laneName}.`);
    } else if (this.up.scouts) {
      const what = ev.count > 1 ? `${ev.count} ${def.plural}` : article(def.name);
      this.speaker.say(`${what}, ${laneName}.`);
    }
  }

  _spawn(type, lane, dist) {
    const def = ENEMIES[type];
    const voice = this.e.createVoice(LANES[lane].angle + (Math.random() * 6 - 3), dist);
    const en = {
      type, def, lane, dist, hp: def.hp, incoming: 0, dead: false,
      state: 'advancing', voice,
      speed: def.speed * this.diff.speed * (0.92 + Math.random() * 0.16),
      pitch: def.pitch * (0.9 + Math.random() * 0.2),
      nextSound: this.time + Math.random() * def.stepInterval,
      stepCount: 0, timer: 0,
    };
    if (type === 'ram') en.stopRumble = S.rumbleLoop(this.e, voice.input);
    this.enemies.push(en);
  }

  _updateEnemy(en, dt, now, at) {
    const e = this.e;
    const def = en.def;
    const dest = en.voice.input;

    if (en.state === 'advancing') {
      en.dist = Math.max(0, en.dist - en.speed * dt);
      e.placeVoice(en.voice, en.voice.angle, en.dist);
      if (now >= en.nextSound) {
        en.stepCount++;
        if (en.type === 'soldier') S.footstep(e, dest, at);
        else if (en.type === 'knight') { S.footstep(e, dest, at, true); if (en.stepCount % 2 === 0) S.clank(e, dest, at + 0.02); }
        else if (en.type === 'ladder') { S.runStep(e, dest, at); if (en.stepCount % 2 === 0) S.woodRattle(e, dest, at + 0.03); }
        else if (en.type === 'ram') S.heave(e, dest, at);
        en.nextSound = now + def.stepInterval * (0.9 + Math.random() * 0.2) / this.diff.speed;
      }
      if (en.dist <= 0) this._arrive(en, now, at);
      return;
    }

    if (en.state === 'atWall') {
      if (now >= en.nextSound) {
        if (en.type === 'ram') {
          S.heave(e, dest, at);
          S.ramBoom(e, dest, at + 0.35);
          this._damageWall(def.boomDamage * this._gateFactor(def), at + 0.35);
          en.nextSound = now + def.boomInterval;
        } else {
          S.hack(e, dest, at);
          this._damageWall(def.wallDamage, at);
          en.nextSound = now + def.hackInterval * (0.85 + Math.random() * 0.3);
        }
      }
      return;
    }

    if (en.state === 'climbing') {
      en.timer -= dt;
      const urgency = 1 - Math.max(0, en.timer) / def.climbTime;
      if (now >= en.nextSound) {
        S.climbCreak(e, dest, at, urgency);
        en.nextSound = now + 0.7 - urgency * 0.45;
      }
      if (en.timer <= 0) {
        S.overTheWall(e, dest, at);
        en.dead = true;
        this._damageWall(def.climbDamage * this._gateFactor(def), at + 0.3);
        this._silence(en);
      }
    }
  }

  _arrive(en, now, at) {
    const e = this.e;
    en.dist = 0;
    e.placeVoice(en.voice, en.voice.angle, 0);
    if (en.type === 'ladder') {
      en.state = 'climbing';
      en.timer = en.def.climbTime;
      S.ladderSlam(e, en.voice.input, at);
      en.nextSound = now + 0.6;
    } else {
      en.state = 'atWall';
      en.nextSound = now + (en.type === 'ram' ? 0.8 : 0.3 + Math.random() * 0.5);
    }
  }

  _gateFactor(def) { return def.gateBlocks && this.up.gate ? 0.6 : 1; }

  _resolve(p, at) {
    const e = this.e;
    if (p.miss) {
      const v = e.createVoice(LANES[p.lane].angle, 35);
      S.missThunk(e, v.input, at);
      e.disposeVoice(v, 1);
      return;
    }
    const en = p.target;
    en.incoming = Math.max(0, en.incoming - p.damage);
    if (en.dead) {
      // Already down: the bolt flies past into the dirt.
      const v = e.createVoice(LANES[en.lane].angle, en.dist + 10);
      S.missThunk(e, v.input, at);
      e.disposeVoice(v, 1);
      return;
    }
    en.hp -= p.damage;
    const dest = en.voice.input;
    if (en.hp > 0) {
      if (en.def.armored) S.hitArmor(e, dest, at);
      else if (en.def.wooden) S.hitWood(e, dest, at);
      else S.hitFlesh(e, dest, at);
      if (!en.def.wooden) S.grunt(e, dest, at + 0.04, en.pitch);
      return;
    }
    // Killed.
    en.dead = true;
    if (en.def.wooden) {
      S.hitWood(e, dest, at);
      S.ramBoom(e, dest, at + 0.05);
      S.overTheWall(e, dest, at + 0.1);
    } else {
      if (en.def.armored) S.hitArmor(e, dest, at); else S.hitFlesh(e, dest, at);
      S.deathCry(e, dest, at + 0.03, en.pitch);
    }
    this.kills++;
    this.goldEarned += en.def.gold;
    this._silence(en);
  }

  _silence(en) {
    if (en.stopRumble) { en.stopRumble(); en.stopRumble = null; }
    this.e.disposeVoice(en.voice, 2.5);
  }

  _damageWall(amount, at) {
    if (this.state === 'over' || this.ended && this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount * this.diff.damage);
    const frac = this.hp / this.maxHP;
    S.wallHit(this.e, this.near, at, frac);
    try { if (navigator.vibrate) navigator.vibrate(amount >= 5 ? 120 : 40); } catch (err) { /* no vibration */ }
    if (this.hp <= 0) { this._finish(false); return; }
    if (!this.warned50 && frac <= 0.5) { this.warned50 = true; this.speaker.say('Wall at half strength.', { urgent: true }); }
    if (!this.warned25 && frac <= 0.25) { this.warned25 = true; this.speaker.say('The wall is crumbling!', { urgent: true }); }
  }

  _finish(victory) {
    if (this.state === 'over') return;
    const e = this.e;
    const at = e.now + 0.05;
    if (victory) S.fanfare(e, this.near, at);
    else S.defeatTones(e, this.near, at);
    const result = {
      victory,
      kills: this.kills,
      gold: this.goldEarned,
      damageTaken: Math.round(this.maxHP - this.hp),
      maxHP: this.maxHP,
    };
    this._cleanup();
    this.onEnd(result);
  }

  // ---------- Reports ----------

  statusText() {
    const pct = Math.round(100 * this.hp / this.maxHP);
    const counts = [0, 0, 0, 0, 0];
    for (const en of this.enemies) if (!en.dead) counts[en.lane]++;
    const parts = counts.map((c, i) => c ? `${c} ${LANES[i].name}` : null).filter(Boolean);
    const enemies = parts.length ? `Enemies: ${parts.join(', ')}.` : 'No enemies on the field.';
    return `Wall ${pct} percent. Aiming ${LANES[this.aim].name}. ${enemies}`;
  }

  _hud(force) {
    this.onHud({
      lane: LANES[this.aim].name,
      wall: Math.round(100 * this.hp / this.maxHP),
      enemies: this.enemies.filter(en => !en.dead).length,
      kills: this.kills,
      state: this.state,
    }, force);
  }
}

function article(name) {
  return (/^[aeiou]/i.test(name) ? 'An ' : 'A ') + name;
}
