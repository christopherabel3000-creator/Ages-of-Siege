// Menus, shop, saving, and connecting everything together.

import { AudioEngine } from './audio.js';
import { Speaker } from './speech.js';
import { Input } from './input.js';
import { Battle } from './game.js';
import { CAMPAIGN, UPGRADES, BASE, endlessWave } from './data.js';
import * as S from './sounds.js';

const SAVE_KEY = 'ages-of-siege-save-v1';

const defaultSave = () => ({
  gold: 0,
  upgrades: {},
  cleared: 0,
  introduced: {},
  endlessBest: 0,
  settings: { voice: 'game', rate: 1.1, difficulty: 'normal', volume: 90 },
});

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = Object.assign(defaultSave(), JSON.parse(raw));
    s.settings = Object.assign(defaultSave().settings, s.settings);
    return s;
  } catch (e) { return defaultSave(); }
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
}

const $ = (id) => document.getElementById(id);
const save = load();
const engine = new AudioEngine();
const speaker = new Speaker($('live'));
let battle = null;
let run = null;        // endless run in progress
let shopCtx = null;    // { target, onDone }
let current = null;    // { mode, index }

function applySettings() {
  speaker.mode = save.settings.voice;
  speaker.rate = Number(save.settings.rate);
  engine.setVolume(save.settings.volume / 100);
}
applySettings();

// ---------- Screens ----------

function show(name) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== 'screen-' + name; });
  const screen = $('screen-' + name);
  if (name === 'campaign') renderCampaign();
  if (name === 'endless') renderEndless();
  if (name === 'settings') renderSettings();
  if (name !== 'battle') {
    const h = screen.querySelector('h1, h2');
    if (h) requestAnimationFrame(() => h.focus());
  }
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) show(go.dataset.go);
});

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'onclick') n.addEventListener('click', v);
    else n.setAttribute(k, v);
  }
  if (text !== undefined) n.textContent = text;
  return n;
}

// ---------- Campaign ----------

function renderCampaign() {
  $('campaign-gold').textContent = `Gold: ${save.gold}.`;
  const list = $('campaign-waves');
  list.innerHTML = '';
  CAMPAIGN.forEach((w, i) => {
    const li = el('li');
    const label = `Wave ${i + 1}: ${w.title}`;
    if (i < save.cleared) {
      li.append(el('button', { type: 'button', onclick: () => startCampaign(i) }, `${label}. Cleared. Replay for half gold.`));
    } else if (i === save.cleared) {
      li.append(el('button', { type: 'button', onclick: () => startCampaign(i) }, `${label}. Play.`));
    } else {
      li.append(el('span', { class: 'locked' }, `${label}. Locked.`));
    }
    list.append(li);
  });
  $('campaign-done').hidden = save.cleared < CAMPAIGN.length;
}

$('campaign-shop').addEventListener('click', () => openShop(save, () => show('campaign')));

function startCampaign(i) {
  current = { mode: 'campaign', index: i };
  beginBattle({
    wave: CAMPAIGN[i],
    label: `Wave ${i + 1}`,
    upgrades: save.upgrades,
    onEnd: (r) => campaignResult(i, r),
  });
}

function campaignResult(i, r) {
  if (!r.victory) {
    persist(); // keeps enemy introductions; gold is untouched by a lost wave
    report('The wall has fallen', [
      `You defeated ${r.kills} enemies before the wall gave way. The gold from this attempt is lost.`,
      'Retry the wave with the upgrades you have, or replay a cleared wave to earn more gold.',
    ], [
      ['Retry wave', () => startCampaign(i)],
      ['Campaign', () => show('campaign')],
    ], 'The wall has fallen.');
    return;
  }
  const replay = i < save.cleared;
  const rate = replay ? BASE.replayRate : 1;
  const earned = Math.round((r.gold + BASE.clearBonus) * rate);
  const repairCost = Math.round(r.damageTaken * BASE.repairCostPerPoint);
  const total = save.gold + earned;
  const repairs = Math.min(repairCost, total);
  save.gold = total - repairs;
  if (!replay) save.cleared = i + 1;
  persist();

  const summary = `Earned ${earned} gold, ${repairs} spent on repairs, ${save.gold} to spend.`;
  const lines = [
    `${r.kills} enemies defeated.${replay ? ' Replay reward: half gold.' : ''}`,
    summary,
  ];
  const buttons = [['Shop', () => openShop(save, () => show('campaign'))]];
  if (i + 1 < CAMPAIGN.length && i + 1 <= save.cleared) buttons.push([`Next: wave ${i + 2}`, () => startCampaign(i + 1)]);
  buttons.push(['Campaign', () => show('campaign')]);
  report('Wave cleared', lines, buttons, `Wave cleared. ${summary}`);
}

// ---------- Endless ----------

function renderEndless() {
  $('endless-best').textContent = save.endlessBest
    ? `Best run: ${save.endlessBest} waves survived.`
    : 'No runs yet.';
}

$('endless-start').addEventListener('click', () => {
  run = { wave: 1, gold: 0, upgrades: {}, kills: 0 };
  startEndless();
});

function startEndless() {
  current = { mode: 'endless' };
  beginBattle({
    wave: endlessWave(run.wave),
    label: `Endless wave ${run.wave}`,
    upgrades: run.upgrades,
    onEnd: endlessResult,
  });
}

function endlessResult(r) {
  run.kills += r.kills;
  if (!r.victory) {
    const survived = run.wave - 1;
    const best = survived > save.endlessBest;
    if (best) save.endlessBest = survived;
    persist();
    report('The wall has fallen', [
      `You survived ${survived} ${survived === 1 ? 'wave' : 'waves'} and defeated ${run.kills} enemies.${best ? ' A new best!' : ''}`,
    ], [
      ['New run', () => { run = { wave: 1, gold: 0, upgrades: {}, kills: 0 }; startEndless(); }],
      ['Main menu', () => show('title')],
    ], `The wall has fallen. You survived ${survived} waves.${best ? ' A new best!' : ''}`);
    return;
  }
  const earned = r.gold + BASE.clearBonus;
  const total = run.gold + earned;
  const repairs = Math.min(Math.round(r.damageTaken * BASE.repairCostPerPoint), total);
  run.gold = total - repairs;
  const summary = `Earned ${earned} gold, ${repairs} spent on repairs, ${run.gold} to spend.`;
  run.wave++;
  report(`Wave ${run.wave - 1} survived`, [`${r.kills} enemies defeated.`, summary], [
    ['Shop', () => openShop(run, () => startEndless(), `Fight wave ${run.wave}`)],
    [`Fight wave ${run.wave}`, () => startEndless()],
  ], `Wave survived. ${summary}`);
}

// ---------- Shop ----------

function openShop(target, onDone, continueLabel = 'Done') {
  shopCtx = { target, onDone };
  $('shop-continue').textContent = continueLabel;
  renderShop();
  show('shop');
}

function renderShop(focusId) {
  const { target } = shopCtx;
  $('shop-gold').textContent = `Gold: ${target.gold}.`;
  const box = $('shop-items');
  box.innerHTML = '';
  for (const u of UPGRADES) {
    const level = target.upgrades[u.id] || 0;
    const max = u.costs.length;
    const div = el('div', { class: 'item' });
    const levelText = max > 1 ? ` (level ${level} of ${max})` : (level ? ' (owned)' : '');
    div.append(el('h3', {}, u.name + levelText));
    div.append(el('p', {}, u.desc));
    if (level >= max) {
      div.append(el('p', {}, max > 1 ? 'Fully upgraded.' : 'Owned.'));
    } else {
      const cost = u.costs[level];
      const afford = target.gold >= cost;
      const btn = el('button', {
        type: 'button', id: 'buy-' + u.id,
        'aria-disabled': afford ? 'false' : 'true',
        onclick: () => buy(u, cost),
      }, `${level ? 'Upgrade' : 'Buy'} for ${cost} gold${afford ? '' : ', not enough gold'}`);
      div.append(btn);
    }
    box.append(div);
  }
  if (focusId) {
    const f = $(focusId) || $('shop-gold');
    if (f === $('shop-gold')) f.setAttribute('tabindex', '-1');
    f.focus();
  }
}

async function buy(u, cost) {
  const { target } = shopCtx;
  if (target.gold < cost) { speaker.say(`Not enough gold. You have ${target.gold}.`, { urgent: true }); return; }
  target.gold -= cost;
  target.upgrades[u.id] = (target.upgrades[u.id] || 0) + 1;
  if (target === save) persist();
  try { await engine.init(); S.buy(engine, engine.master, engine.now + 0.01); } catch (e) { /* audio not ready */ }
  speaker.say(`Bought ${u.name}. ${target.gold} gold left.`, { urgent: true });
  renderShop('buy-' + u.id);
}

$('shop-continue').addEventListener('click', () => { const done = shopCtx.onDone; shopCtx = null; done(); });

// ---------- Report ----------

function report(title, lines, buttons, spoken) {
  $('report-title').textContent = title;
  const body = $('report-body');
  body.innerHTML = '';
  for (const l of lines) body.append(el('p', {}, l));
  const bb = $('report-buttons');
  bb.innerHTML = '';
  for (const [label, fn] of buttons) bb.append(el('button', { type: 'button', onclick: fn }, label));
  show('report');
  setTimeout(() => speaker.say(spoken, { urgent: true }), 350);
}

// ---------- Battle ----------

const field = $('field');
const input = new Input($('screen-battle'), (a) => battle && battle.action(a));
let battleOpts = null;
let hudLast = '';

async function beginBattle(opts) {
  speaker.prime();
  battleOpts = opts;
  await engine.init();
  if (battle) battle.quit();
  $('pause-menu').hidden = true;
  show('battle');
  $('hud-wave').textContent = `${opts.label}: ${opts.wave.title}`;
  battle = new Battle({
    engine, speaker,
    wave: opts.wave,
    label: opts.label,
    upgrades: opts.upgrades,
    introduced: save.introduced,
    difficulty: save.settings.difficulty,
    onIntroduce: (type) => { save.introduced[type] = true; persist(); },
    onHud: (h) => {
      const text = h.state === 'ready'
        ? 'Ready. Tap or press F to begin.'
        : `Aiming ${h.lane}. Wall ${h.wall} percent. Enemies on the field: ${h.enemies}.`;
      if (text !== hudLast) { hudLast = text; $('hud-line').textContent = text; }
    },
    onPauseChange: (paused) => {
      $('pause-menu').hidden = !paused;
      $('pause-restart').hidden = current.mode !== 'campaign';
      if (paused) requestAnimationFrame(() => $('pause-menu').querySelector('h2').focus());
      else field.focus();
    },
    onEnd: (r) => {
      input.disable();
      battle = null;
      opts.onEnd(r);
    },
  });
  input.enable();
  field.focus();
  battle.start();
}

$('pause-resume').addEventListener('click', () => battle && battle.resume());
$('pause-restart').addEventListener('click', () => {
  if (!battle) return;
  battle.quit(); battle = null; input.disable();
  beginBattle(battleOpts);
});
$('pause-quit').addEventListener('click', () => {
  if (!battle) return;
  battle.quit(); battle = null; input.disable();
  speaker.stop();
  if (current.mode === 'endless') {
    const survived = run.wave - 1;
    if (survived > save.endlessBest) { save.endlessBest = survived; persist(); }
    run = null;
    show('endless');
  } else {
    show('campaign');
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && battle && (battle.state === 'running' || battle.state === 'ready')) battle.pause();
});

// ---------- Settings ----------

function renderSettings() {
  document.querySelectorAll('input[name="voice"]').forEach(r => { r.checked = r.value === save.settings.voice; });
  $('set-rate').value = String(save.settings.rate);
  $('set-difficulty').value = save.settings.difficulty;
  $('set-volume').value = save.settings.volume;
  $('reset-note').textContent = '';
  resetArmed = false;
}

document.querySelectorAll('input[name="voice"]').forEach(r => r.addEventListener('change', () => {
  save.settings.voice = r.value; applySettings(); persist();
}));
$('set-rate').addEventListener('change', (e) => {
  save.settings.rate = Number(e.target.value); applySettings(); persist();
  speaker.say('This is the game voice.', { urgent: true, remember: false });
});
$('set-difficulty').addEventListener('change', (e) => { save.settings.difficulty = e.target.value; persist(); });
$('set-volume').addEventListener('change', (e) => { save.settings.volume = Number(e.target.value); applySettings(); persist(); });

let resetArmed = false;
$('reset-progress').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    $('reset-note').textContent = 'Press again to erase your gold, upgrades and cleared waves.';
    $('reset-note').setAttribute('tabindex', '-1');
    $('reset-note').focus();
    return;
  }
  const settings = save.settings;
  Object.assign(save, defaultSave(), { settings });
  persist();
  resetArmed = false;
  $('reset-note').textContent = 'Campaign progress erased.';
  $('reset-note').focus();
});

// Exposed for automated testing only.
window.__ages = { save, get battle() { return battle; }, startCampaign, show };

show('title');
