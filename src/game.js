// One wave of battle: the game loop and the rules.

import * as S from './sounds.js';
import { LANES, ENEMIES, BASE, DIFFICULTY, SPAWN_DIST, WEAPONS } from './data.js';

const SLOT_ORDER = ['light', 'heavy', 'mortar'];

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

    this.era = opts.era || 0;
    this.maxHP = BASE.wallHP * (1 + 0.25 * ((this.up.walls || 0) + (this.up.ramparts || 0) + (this.up.concrete || 0)));
    this.hp = this.maxHP;
    this.archers = this.up.tower || 0;
    // Boiling oil belongs to the castle eras; from the industrial era on it is not used.
    this.oilLeft = this.up.oil && this.era < 2 ? 1 + this.up.oil : 0;
    // Barbed wire (industrial era on): its own strength, repaired after each wave like the wall.
    this.wireMax = this.era >= 2 ? [0, 60, 100, 150][this.up.wire || 0] : 0;
    this.wire = this.wireMax;
    this.wireWarned = false;
    // From the industrial era, holding one finger fires the machine gun instead of pouring oil.
    this.holdMode = this.era >= 2 ? 'mg' : 'oil';

    // Weapons: the best one you own in each slot. Newer weapons replace older ones.
    const up = this.up;
    this.slots = { light: 'crossbow', heavy: null, mortar: null, aa: null };
    if (up.machineGun) this.slots.light = 'machineGun'; else if (up.musket) this.slots.light = 'musket';
    if (up.artillery) this.slots.heavy = 'artillery'; else if (up.cannon) this.slots.heavy = 'cannon'; else if (up.ballista) this.slots.heavy = 'ballista';
    if (up.trenchMortar) this.slots.mortar = 'trenchMortar'; else if (up.mortar) this.slots.mortar = 'mortar';
    if (up.aaGun) this.slots.aa = 'aaGun';
    this.reloads = {
      crossbow: BASE.reload[up.winch || 0],
      musket: WEAPONS.musket.reload[up.cartridges || 0],
      ballista: BASE.ballistaReload[up.crank || 0],
      cannon: WEAPONS.cannon.reload[up.drill || 0],
      mortar: WEAPONS.mortar.reload[up.mortarCrew || 0],
      artillery: WEAPONS.artillery.reload[up.gunLayers || 0],
      trenchMortar: WEAPONS.trenchMortar.reload[up.mortarCrew ? 1 : 0],
      aaGun: WEAPONS.aaGun.reload[up.aaCrew || 0],
    };
    this.until = { light: 0, heavy: 0, mortar: 0, aa: 0 };
    // Machine gun state.
    this.mgFiring = false; this.mgBurst = 0; this.mgNext = 0;
    this.heat = 0; this.jamUntil = 0; this.jammed = false;
    this.mgCool = WEAPONS.machineGun.cool[up.waterJacket || 0];
    this.wireDamage = 0;
    this.selected = 'light';

    this.aim = 2;
    this.time = 0;
    this.state = 'ready'; // ready, running, paused, over
    this.enemies = [];
    this.pending = [];   // bolts in flight
    this.events = this.wave.events.map(ev => ({ ...ev })).sort((a, b) => a.t - b.t);
    this.nextEvent = 0;
    this.drumsUntil = -1; this.nextDrum = 0;
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
    if (this.slots.light === 'machineGun') this.hiss = S.heatHiss(e, this.near);
    let msg = `${this.label}. ${this.wave.title}.`;
    if (!this.introduced.ready) {
      msg += ' Tap, or press F, to begin.';
      this.onIntroduce('ready');
    }
    // New gear is explained once, the first battle you have it.
    const gearIntro = {
      ballista: ' Ballista mounted. Press B to fire it, or switch to it with a two-finger swipe up or down, then tap.',
      musket: ' Musket loaded. It replaces the crossbow on F and tap. Listen for the ramrod, then the hammer click: that means it is ready.',
      cannon: ' Cannon in place. It replaces the ballista on B. The bell rings when the crew has reloaded.',
      mortar: ' Mortar ready. Press M, or tap with three fingers. The shell lands where the closest enemy in your lane was standing, a couple of seconds later.',
      machineGun: ' Machine gun mounted. Hold F, or hold one finger on the screen, to fire. A tap fires a short burst. Listen for the rising hiss: if it overheats, it jams for a few seconds.',
      artillery: ' Field artillery ready on B. The shell lands a second later on the closest enemy in your lane and hits everything near it.',
      trenchMortar: ' Trench mortar ready on M. It hits harder and lands faster than the old mortar.',
      aaGun: ' Anti-aircraft gun ready. Press A, or tap with four fingers, to fire at the closest aircraft.',
    };
    for (const w of Object.values(this.slots)) {
      if (w && gearIntro[w] && !this.introduced[w]) { msg += gearIntro[w]; this.onIntroduce(w); }
    }
    if (this.wireMax && !this.introduced.wire) {
      msg += ' Barbed wire is strung across the field. It slows riflemen and gas troopers, and vehicles tear through it.';
      this.onIntroduce('wire');
    }
    if (this.oilLeft && !this.introduced.oil) {
      msg += ` Boiling oil ready, ${this.oilLeft} pots. Press O, or hold one finger still, to pour it on the enemies at the wall in your lane.`;
      this.onIntroduce('oil');
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
    if (this.hiss) this.hiss.stop();
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
      if ((a.startsWith('fire') && a !== 'fireLightUp') || a === 'mgStart') { this.speaker.stop(); this.begin(); }
      return;
    }
    if (a === 'aimLeft') this.setAim(this.aim - 1);
    else if (a === 'aimRight') this.setAim(this.aim + 1);
    else if (a.startsWith('lane')) this.setAim(Number(a.slice(4)));
    else if (a === 'fire') {
      if (this.selected === 'light' && this.slots.light === 'machineGun') this.mgBurst = 3;
      else this.fireSlot(this.selected);
    }
    else if (a === 'fireLight' || a === 'mgStart') {
      if (this.slots.light === 'machineGun') this.mgFiring = true;
      else this.fireSlot('light');
    }
    else if (a === 'fireLightUp' || a === 'mgStop') this.mgFiring = false;
    else if (a === 'fireAA') this.fireAA();
    else if (a === 'fireHeavy') this.fireSlot('heavy');
    else if (a === 'fireMortar') this.fireSlot('mortar');
    else if (a === 'switchWeapon') this.switchWeapon();
    else if (a === 'oil') this.pourOil();
  }

  ownedSlots() { return SLOT_ORDER.filter(sl => this.slots[sl]); }

  switchWeapon() {
    const t = this.e.now + 0.005;
    const owned = this.ownedSlots();
    if (owned.length < 2) { this.speaker.say(`${WEAPONS[this.slots.light].name} only.`, { urgent: true, remember: false }); return; }
    const i = owned.indexOf(this.selected);
    this.selected = owned[(i + 1) % owned.length];
    S.weaponSwitch(this.e, this.near, t, this.selected !== 'light');
    this.speaker.say(`${WEAPONS[this.slots[this.selected]].name}.`, { urgent: true, remember: false });
    this._hud(true);
  }

  fireSlot(slot) {
    const e = this.e;
    const t = e.now + 0.005;
    const w = this.slots[slot];
    if (!w) {
      S.heavyDryClick(e, this.near, t);
      if (slot === 'mortar') this.speaker.say('No mortar. Buy it in the shop.', { urgent: true, remember: false });
      return;
    }
    if (this.time < this.until[slot]) { (slot === 'light' ? S.dryClick : S.heavyDryClick)(e, this.near, t); return; }
    const reload = this.reloads[w];
    this.until[slot] = this.time + reload;
    if (w === 'machineGun') { this.until[slot] = 0; this.mgBurst = 3; return; }
    if (w === 'crossbow') { S.crossbowFire(e, this.near, t); S.reloadDone(e, this.near, t + reload); this._shootSingle(this.up.bolts ? 2 : 1, WEAPONS.crossbow.speed); }
    else if (w === 'musket') { S.musketFire(e, this.near, t); S.musketReload(e, this.near, t + 0.3, reload - 0.3); this._shootSingle(WEAPONS.musket.damage, WEAPONS.musket.speed, 0.07); }
    else if (w === 'ballista') { S.ballistaFire(e, this.near, t); S.ballistaReady(e, this.near, t + reload); this._shootLane(BASE.ballistaDamage, WEAPONS.ballista.speed, 'ballista'); }
    else if (w === 'cannon') { S.cannonFire(e, this.near, t); S.cannonReady(e, this.near, t + reload); this._shootLane(WEAPONS.cannon.damage, WEAPONS.cannon.speed, 'cannon'); }
    else if (w === 'mortar' || w === 'trenchMortar') { S.mortarFire(e, this.near, t); S.mortarReady(e, this.near, t + reload); this._shootMortar(w); }
    else if (w === 'artillery') { S.artilleryFire(e, this.near, t); S.artilleryReady(e, this.near, t + reload); this._shootMortar(w); }
  }

  fireAA() {
    const e = this.e;
    const t = e.now + 0.005;
    if (!this.slots.aa) {
      S.heavyDryClick(e, this.near, t);
      this.speaker.say('No anti-aircraft gun. Buy it in the shop.', { urgent: true, remember: false });
      return;
    }
    if (this.time < this.until.aa) { S.heavyDryClick(e, this.near, t); return; }
    const reload = this.reloads.aaGun;
    this.until.aa = this.time + reload;
    S.aaFire(e, this.near, t);
    S.aaReady(e, this.near, t + reload);
    const flyers = this.enemies.filter(en => en.def.flyer && this._targetable(en, true));
    if (!flyers.length) return;
    flyers.sort((a, b) => a.dist - b.dist);
    const target = flyers[0];
    this.pending.push({ at: this.time + 0.5 + target.dist / 200, target, damage: WEAPONS.aaGun.damage, source: 'aa' });
  }

  // Machine gun: called every frame.
  _updateMG(dt, now, at) {
    const w = WEAPONS.machineGun;
    const wantFire = this.mgFiring || this.mgBurst > 0;
    if (this.jammed && now >= this.jamUntil) {
      this.jammed = false;
      this.heat = w.heatMax * 0.4;
      S.mgCleared(this.e, this.near, at);
    }
    if (wantFire && !this.jammed) {
      if (now >= this.mgNext) {
        this.mgNext = now + w.rate;
        if (this.mgBurst > 0) this.mgBurst--;
        S.mgRound(this.e, this.near, at);
        this.heat += 1;
        const target = this._pickTarget(this.aim, true);
        if (target) {
          this.pending.push({ at: now + 0.03 + target.dist / 600, target, damage: w.damage, source: 'mg' });
        } else if (Math.random() < 0.3) {
          this.pending.push({ at: now + 0.2, miss: true, lane: this.aim });
        }
        if (this.heat >= w.heatMax) {
          this.jammed = true;
          this.jamUntil = now + w.jam;
          this.mgBurst = 0;
          S.mgJam(this.e, this.near, at);
        }
      }
    } else if (!this.jammed) {
      this.heat = Math.max(0, this.heat - this.mgCool * dt);
    }
    if (this.hiss) this.hiss.setHeat(this.heat / w.heatMax);
  }

  // Hits the closest enemy in the lane.
  _shootSingle(damage, speed, delay = 0) {
    const target = this._pickTarget(this.aim);
    if (!target) { this.pending.push({ at: this.time + 0.45, miss: true, lane: this.aim }); return; }
    target.incoming += damage;
    this.pending.push({ at: this.time + delay + Math.max(0.05, target.dist / speed), target, damage, source: 'light' });
  }

  // Pierces (ballista) or bounces (cannon) down the lane, losing power with each enemy hit.
  _shootLane(damages, speed, source) {
    const inLane = this.enemies.filter(en => en.lane === this.aim && this._targetable(en));
    if (!inLane.length) { this.pending.push({ at: this.time + 0.6, miss: true, lane: this.aim }); return; }
    inLane.sort((a, b) => a.dist - b.dist);
    const max = source === 'cannon' ? damages.length : inLane.length;
    for (const [i, en] of inLane.slice(0, max).entries()) {
      const dmg = damages[Math.min(i, damages.length - 1)];
      en.incoming += dmg;
      this.pending.push({ at: this.time + Math.max(0.05, en.dist / speed), target: en, damage: dmg, source, bounce: source === 'cannon' });
    }
  }

  // Lands where the closest enemy in the lane was standing, and blasts everything near it.
  _shootMortar(name = 'mortar') {
    const w = WEAPONS[name];
    const target = this._pickTarget(this.aim);
    const point = target ? target.dist : 50;
    const v = this.e.createVoice(LANES[this.aim].angle, point);
    const whistle = Math.min(1.2, w.flight - 0.1);
    S.shellWhistle(this.e, v.input, this.e.now + w.flight - whistle, whistle);
    this.e.disposeVoice(v, w.flight + 1);
    this.pending.push({ at: this.time + w.flight, shell: true, lane: this.aim, point, damage: w.damage, radius: w.radius });
  }

  pourOil() {
    const e = this.e;
    const t = e.now + 0.005;
    if (this.era >= 2) { S.oilEmpty(e, this.near, t); this.speaker.say('No oil in this era.', { urgent: true, remember: false }); return; }
    if (this.oilLeft <= 0) {
      S.oilEmpty(e, this.near, t);
      this.speaker.say(this.up.oil ? 'No oil left.' : 'No boiling oil. Buy it in the shop.', { urgent: true, remember: false });
      return;
    }
    const below = this.enemies.filter(en => en.lane === this.aim && !en.dead && en.dist <= 0.5);
    if (!below.length) {
      // Nothing at the wall here: don't waste a pot.
      S.oilEmpty(e, this.laneVoices[this.aim].input, t);
      this.speaker.say(`Nobody at the wall ${LANES[this.aim].name}.`, { urgent: true, remember: false });
      return;
    }
    this.oilLeft--;
    S.oilPour(e, this.laneVoices[this.aim].input, t);
    for (const en of below) this.pending.push({ at: this.time + 0.55, target: en, damage: BASE.oilDamage, source: 'oil' });
    setTimeout(() => {
      if (this.state === 'over') return;
      this.speaker.say(this.oilLeft ? `${this.oilLeft} ${this.oilLeft === 1 ? 'pot' : 'pots'} left.` : 'Last pot used.', { remember: false });
    }, 1300);
  }

  setAim(lane) {
    const t = this.e.now + 0.005;
    if (lane < 0 || lane > 4) { S.edgeThump(this.e, this.near, t); return; }
    this.aim = lane;
    S.laneTick(this.e, this.laneVoices[lane].input, t, lane);
    this._hud(true);
  }

  // air: whether this weapon can reach aircraft (machine gun, towers, anti-aircraft gun).
  _pickTarget(lane, air = false) {
    const inLane = this.enemies.filter(en => (lane === null || en.lane === lane) && this._targetable(en, air));
    if (!inLane.length) return null;
    inLane.sort((a, b) => a.dist - b.dist);
    return inLane.find(en => en.hp - en.incoming > 0) || inLane[0];
  }

  // Sappers underground can't be hit until they are close enough to hear clearly.
  // Aircraft can only be hit by weapons that can reach the sky.
  _targetable(en, air = false) {
    if (en.dead || en.dist > SPAWN_DIST + 15) return false;
    if (en.def.flyer && !air) return false;
    if (en.def.underground && en.dist > en.def.hearRange) return false;
    return true;
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

    if (this.slots.light === 'machineGun') this._updateMG(dt, now, at);

    // Archer towers.
    for (let i = 0; i < this.archers; i++) {
      if (now >= this.nextTower[i]) {
        this.nextTower[i] = now + BASE.towerInterval;
        const target = this._pickTarget(null, true);
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

    // No waiting around: once the field is clear, the next group arrives right away.
    if (this.enemies.length === 0) this._pullNextGroupForward(now);

    // Wave cleared?
    if (!this.ended && this.nextEvent >= this.events.length && this.enemies.length === 0 && this.pending.length === 0) {
      this.ended = true;
      this.endTimer = setTimeout(() => this._finish(true), 1500);
    }

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.25; this._hud(); }
  }

  _pullNextGroupForward(now) {
    let i = this.nextEvent;
    while (i < this.events.length && this.events[i].drums) i++;
    if (i >= this.events.length) return;
    const shift = this.events[i].t - (now + 0.4);
    if (shift <= 0) return;
    // Move the rest of the wave earlier by the same amount, so its rhythm stays the same.
    for (let j = this.nextEvent; j < this.events.length; j++) this.events[j].t -= shift;
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
      (this.era >= 2 ? S.trenchWhistle : this.era >= 1 ? S.bugle : S.horn)(e, hv.input, at);
      e.disposeVoice(hv, 3);
    }
    this.firstGroup = false;
    // Later waves send bigger groups (rams and towers stay single).
    const count = def.boss || def.single || ev.type === 'ram' ? ev.count : Math.max(1, Math.round(ev.count * (this.wave.crowd || 1)));
    ev.count = count;
    for (let i = 0; i < count; i++) this._spawn(ev.type, lane, SPAWN_DIST + i * 5 + Math.random() * 2);

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
    const voice = this.e.createVoice(LANES[lane].angle + (Math.random() * 6 - 3), dist, def.height || 0);
    const en = {
      type, def, lane, dist, hp: def.hp, incoming: 0, dead: false,
      state: 'advancing', voice,
      speed: def.speed * this.diff.speed * (this.wave.pace || 1) * (0.92 + Math.random() * 0.16),
      pitch: def.pitch * (0.9 + Math.random() * 0.2),
      nextSound: this.time + Math.random() * def.stepInterval,
      stepCount: 0, timer: 0,
    };
    if (type === 'ram' || type === 'siegeTower' || type === 'siegeCannon' || type === 'greatGun') en.stopRumble = S.rumbleLoop(this.e, voice.input);
    if (type === 'siegeTower') en.nextVolley = this.time + 6;
    en.loops = [];
    if (type === 'armoredCar') en.loops.push(S.engineLoop(this.e, voice.input));
    if (type === 'tank' || type === 'landship') en.loops.push(S.treadLoop(this.e, voice.input, type === 'landship'));
    if (type === 'zeppelin') en.loops.push(S.droneLoop(this.e, voice.input));
    if (def.gunRange) en.nextGun = this.time + 4 + Math.random() * 2;
    if (def.flyer) en.nextBomb = 0;
    this.enemies.push(en);
  }

  _updateEnemy(en, dt, now, at) {
    const e = this.e;
    const def = en.def;
    const dest = en.voice.input;

    if (def.gunRange && en.dist <= def.gunRange && now >= en.nextGun) {
      en.nextGun = now + def.gunInterval * (0.85 + Math.random() * 0.3);
      S.tankGun(e, dest, at);
      S.incomingShot(e, this.near, at + 0.3, def.boss);
      this._damageWall(def.gunDamage, at + 0.92);
      if (this.state === 'over') return;
    }
    if (def.flyer) {
      if (en.dist <= def.bombRange && now >= en.nextBomb) {
        en.nextBomb = now + def.bombInterval * (0.85 + Math.random() * 0.3);
        S.bombFall(e, this.near, at);
        this._damageWall(def.bombDamage, at + 1.05);
        if (this.state === 'over') return;
      }
      if (en.state === 'hovering') return;
    }

    if (en.state === 'advancing') {
      let speed = en.speed;
      // Barbed wire, about 15 to 25 meters out.
      if (this.wire > 0 && !def.flyer && !def.underground && en.dist <= 25 && en.dist > 15) {
        if (!en.wireHit) {
          en.wireHit = true;
          if (def.vehicle) { S.wireCrush(e, dest, at); this._damageWire(15); }
          else { S.wireSnag(e, dest, at); this._damageWire(2); }
        }
        if (def.wireSlowed && this.wire > 0) speed *= 0.4;
      }
      en.dist = Math.max(0, en.dist - speed * dt);
      if (def.flyer && en.dist <= def.hover) { en.dist = def.hover; en.state = 'hovering'; }
      e.placeVoice(en.voice, en.voice.angle, en.dist);
      if (now >= en.nextSound) {
        en.stepCount++;
        if (en.type === 'soldier') S.footstep(e, dest, at);
        else if (en.type === 'knight') { S.footstep(e, dest, at, true); if (en.stepCount % 2 === 0) S.clank(e, dest, at + 0.02); }
        else if (en.type === 'ladder') { S.runStep(e, dest, at); if (en.stepCount % 2 === 0) S.woodRattle(e, dest, at + 0.03); }
        else if (en.type === 'ram') S.heave(e, dest, at);
        else if (en.type === 'siegeTower') S.towerCreak(e, dest, at);
        else if (en.type === 'archer') S.runStep(e, dest, at);
        else if (en.type === 'infantry' || en.type === 'musketeers') S.infantryStep(e, dest, at, en.stepCount % 2 === 0);
        else if (en.type === 'cavalry') S.gallop(e, dest, at);
        else if (en.type === 'sapper') S.dig(e, dest, at);
        else if (en.type === 'siegeCannon' || en.type === 'greatGun') S.towerCreak(e, dest, at);
        else if (en.type === 'rifleman' || en.type === 'gasTroops') { S.mudStep(e, dest, at); if (en.stepCount % 3 === 0) S.infantryStep(e, dest, at + 0.05, true); }
        else if (en.type === 'tank' || en.type === 'landship') S.treadClank(e, dest, at);
        en.nextSound = now + def.stepInterval * (0.9 + Math.random() * 0.2) / this.diff.speed;
      }
      if (en.type === 'siegeTower') this._towerVolley(en, now, at);
      if (def.standoff && en.dist <= def.standoff) {
        en.state = 'shooting';
        if (en.stopRumble) { en.stopRumble(); en.stopRumble = null; }
        if (def.gas) en.loops.push(S.gasLoop(e, dest));
        en.nextSound = now + 1 + Math.random() * 1.5;
        return;
      }
      if (en.dist <= 0) this._arrive(en, now, at);
      return;
    }

    if (en.state === 'atWall') {
      if (now >= en.nextSound) {
        if (en.type === 'siegeTower') {
          S.overTheWall(e, dest, at);
          this._damageWall(def.boomDamage * this._gateFactor(def), at + 0.2);
          en.nextSound = now + def.boomInterval;
        } else if (en.type === 'tank' || en.type === 'landship') {
          S.treadClank(e, dest, at);
          S.ramBoom(e, dest, at + 0.1);
          this._damageWall(def.wallDamage, at + 0.1);
          en.nextSound = now + def.hackInterval;
        } else if (en.type === 'ram') {
          S.heave(e, dest, at);
          S.ramBoom(e, dest, at + 0.35);
          this._damageWall(def.boomDamage * this._gateFactor(def), at + 0.35);
          en.nextSound = now + def.boomInterval;
        } else {
          (en.type === 'cavalry' ? S.sabre : S.hack)(e, dest, at);
          this._damageWall(def.wallDamage, at);
          en.nextSound = now + def.hackInterval * (0.85 + Math.random() * 0.3);
        }
      }
      return;
    }

    if (en.state === 'shooting') {
      if (now >= en.nextSound) {
        if (def.gas) {
          S.gasOnWall(e, this.near, at);
          this._damageWall(def.gasDamage, at, true);
          en.nextSound = now + 1;
          return;
        } else if (def.shot === 'mg') {
          S.enemyMgBurst(e, dest, at);
          S.bulletsOnWall(e, this.near, at + 0.15);
          this._damageWall(def.shotDamage, at + 0.2, true);
        } else if (def.shot === 'cannon' || def.shot === 'greatGun') {
          const big = def.shot === 'greatGun';
          S.cannonFar(e, dest, at, big);
          S.incomingShot(e, this.near, at + 0.5, big);
          this._damageWall(def.shotDamage, at + 1.12);
        } else if (en.type === 'musketeers') {
          // Each musketeer fires on their own timer.
          S.enemyVolley(e, dest, at, 1);
          S.ballImpacts(e, this.near, at + 0.35);
          this._damageWall(def.shotDamage, at + 0.4);
        } else {
          S.bowShot(e, dest, at);
          S.arrowThunk(e, this.near, at + 0.9, LANES[en.lane].angle);
          this._damageWall(def.shotDamage, at + 0.9);
        }
        en.nextSound = now + def.shotInterval * (0.85 + Math.random() * 0.3);
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
    if (en.type === 'siegeTower') {
      en.state = 'atWall';
      S.gangwaySlam(e, en.voice.input, at);
      this._damageWall(en.def.slamDamage * this._gateFactor(en.def), at + 0.1);
      en.nextSound = now + en.def.boomInterval;
      this.speaker.say('The siege tower is at the wall!', { urgent: true });
    } else if (en.type === 'sapper') {
      en.dead = true;
      S.mineBlast(e, en.voice.input, at);
      this._damageWall(en.def.mineDamage, at + 0.05);
      this._silence(en);
    } else if (en.type === 'ladder') {
      en.state = 'climbing';
      en.timer = en.def.climbTime;
      S.ladderSlam(e, en.voice.input, at);
      en.nextSound = now + 0.6;
    } else {
      en.state = 'atWall';
      en.nextSound = now + (en.type === 'ram' ? 0.8 : 0.3 + Math.random() * 0.5);
    }
  }

  _towerVolley(en, now, at) {
    const def = en.def;
    if (en.dist > def.archerRange || now < en.nextVolley) return;
    en.nextVolley = now + def.volleyInterval;
    S.volley(this.e, en.voice.input, at);
    S.arrowsIncoming(this.e, this.near, at + 0.4);
    this._damageWall(def.volleyDamage, at + 0.95);
  }

  _gateFactor(def) { return def.gateBlocks && this.up.gate ? 0.6 : 1; }

  _resolve(p, at) {
    const e = this.e;
    if (p.shell) {
      const v = e.createVoice(LANES[p.lane].angle, p.point);
      S.explosion(e, v.input, at);
      e.disposeVoice(v, 2);
      const hit = this.enemies.filter(en => en.lane === p.lane && this._targetable(en) && Math.abs(en.dist - p.point) <= p.radius);
      for (const en of hit) this._resolve({ target: en, damage: p.damage, source: 'shell', silentMiss: true }, at + 0.02);
      return;
    }
    if (p.miss) {
      const v = e.createVoice(LANES[p.lane].angle, 35);
      S.missThunk(e, v.input, at);
      e.disposeVoice(v, 1);
      return;
    }
    const en = p.target;
    if (p.source !== 'shell') en.incoming = Math.max(0, en.incoming - p.damage);
    if (p.bounce) S.bounceThud(e, en.voice.input, at - 0.02);
    if (en.dead) {
      if (p.source === 'oil' || p.silentMiss || p.source === 'mg') return;
      // Already down: the bolt flies past into the dirt.
      const v = e.createVoice(LANES[en.lane].angle, en.dist + 10);
      S.missThunk(e, v.input, at);
      e.disposeVoice(v, 1);
      return;
    }
    // Light weapons barely scratch armor; the machine gun only grazes aircraft.
    let dmg = p.damage;
    const light = p.source === 'light' || p.source === 'tower' || p.source === 'mg';
    if (light && en.def.armor) dmg *= en.def.armor;
    if (en.def.flyer && p.source === 'mg') dmg *= 0.5;
    en.hp -= dmg;
    const dest = en.voice.input;
    if (p.source === 'aa') S.flakBurst(e, dest, at);
    if (en.hp > 0) {
      if (p.source === 'mg' && Math.random() < 0.6) return; // don't bury the field under hit sounds
      if (en.def.vehicle || en.def.flyer) { if (!en.def.flyer) S.hitArmor(e, dest, at); return; }
      if (en.def.armored) S.hitArmor(e, dest, at);
      else if (en.def.wooden) S.hitWood(e, dest, at);
      else S.hitFlesh(e, dest, at);
      if (!en.def.wooden) S.grunt(e, dest, at + 0.04, en.pitch);
      return;
    }
    // Killed.
    en.dead = true;
    if (en.def.flyer) {
      S.zeppelinFall(e, dest, at);
    } else if (en.def.vehicle) {
      S.vehicleBlast(e, dest, at);
    } else if (en.def.wooden) {
      S.hitWood(e, dest, at);
      S.ramBoom(e, dest, at + 0.05);
      S.overTheWall(e, dest, at + 0.1);
    } else if (en.type === 'cavalry') {
      S.hitFlesh(e, dest, at);
      S.horseWhinny(e, dest, at + 0.03);
    } else {
      if (en.def.armored) S.hitArmor(e, dest, at); else S.hitFlesh(e, dest, at);
      S.deathCry(e, dest, at + 0.03, en.pitch);
    }
    // Clear confirmation cue, panned toward the lane of the kill.
    const cue = e.createNear(LANES[en.lane].angle / 75, 1);
    S.killConfirm(e, cue, at + 0.12, en.def.wooden || en.def.vehicle || en.def.flyer);
    if (en.def.boss) setTimeout(() => this.state !== 'over' && this.speaker.say(en.def.downText, { urgent: true }), 700);
    setTimeout(() => { try { cue.disconnect(); } catch (err) { /* gone */ } }, 1500);
    this.kills++;
    this.goldEarned += en.def.gold;
    this._silence(en);
  }

  _silence(en) {
    if (en.stopRumble) { en.stopRumble(); en.stopRumble = null; }
    if (en.loops) { for (const l of en.loops) l.stop(); en.loops = []; }
    this.e.disposeVoice(en.voice, 2.5);
  }

  _damageWire(amount) {
    if (this.wire <= 0) return;
    const before = this.wire;
    this.wire = Math.max(0, this.wire - amount);
    this.wireDamage += before - this.wire;
    if (this.wire === 0 && !this.wireWarned) {
      this.wireWarned = true;
      this.speaker.say('The wire is down.', { urgent: true });
    }
  }

  // quiet: steady damage (gas, bullets) that shouldn't thud the wall every second.
  _damageWall(amount, at, quiet = false) {
    if (this.state === 'over' || this.ended && this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount * this.diff.damage);
    const frac = this.hp / this.maxHP;
    if (!quiet) S.wallHit(this.e, this.near, at, frac);
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
      wireDamage: Math.round(this.wireDamage),
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
    let gear = '';
    if (this.ownedSlots().length > 1) gear += ` ${WEAPONS[this.slots[this.selected]].name} selected.`;
    if (this.up.oil && this.era < 2) gear += ` ${this.oilLeft} oil.`;
    if (this.slots.light === 'machineGun') gear += this.jammed ? ' Machine gun jammed.' : this.heat / WEAPONS.machineGun.heatMax > 0.6 ? ' Machine gun hot.' : '';
    if (this.wireMax) gear += ` Wire ${Math.round(100 * this.wire / this.wireMax)} percent.`;
    // Enemy positions come first: that's what matters most mid-fight.
    return `${enemies} Wall ${pct} percent. Aiming ${LANES[this.aim].name}.${gear}`;
  }

  _hud(force) {
    this.onHud({
      lane: LANES[this.aim].name,
      weapon: this.ownedSlots().length > 1 ? WEAPONS[this.slots[this.selected]].name : null,
      oil: this.up.oil && this.era < 2 ? this.oilLeft : null,
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
