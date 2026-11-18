// Game data: lanes, enemies, upgrades, campaign waves, endless generator.

export const LANES = [
  { name: 'far left', angle: -60 },
  { name: 'left', angle: -30 },
  { name: 'center', angle: 0 },
  { name: 'right', angle: 30 },
  { name: 'far right', angle: 60 },
];

export const SPAWN_DIST = 100; // meters from the wall

export const ENEMIES = {
  soldier: {
    name: 'foot soldier', plural: 'foot soldiers',
    hp: 1, speed: 4, gold: 5,
    wallDamage: 1, hackInterval: 1.0,
    stepInterval: 0.5, pitch: 135,
    intro: 'Foot soldiers. One bolt each.',
  },
  knight: {
    name: 'knight', plural: 'knights',
    hp: 3, speed: 2.6, gold: 12, armored: true,
    wallDamage: 2.5, hackInterval: 1.0,
    stepInterval: 0.7, pitch: 105,
    intro: 'Knights. Heavy armor, three bolts each. Stronger bolts bring them down faster.',
  },
  ladder: {
    name: 'ladder crew', plural: 'ladder crews',
    hp: 2, speed: 5, gold: 10,
    climbTime: 7, climbDamage: 18, gateBlocks: true,
    stepInterval: 0.3, pitch: 150,
    intro: 'Ladder crew. When the ladder hits the wall, you have a few seconds to shoot them before they climb over. Two bolts each.',
  },
  ram: {
    name: 'battering ram', plural: 'battering rams',
    hp: 8, speed: 1.8, gold: 40, wooden: true,
    boomInterval: 3, boomDamage: 7, gateBlocks: true,
    stepInterval: 2.6, pitch: 120,
    intro: 'Battering ram, heading for the gate. Eight bolts to break it. Stop it before it reaches the wall.',
  },
};

export const UPGRADES = [
  { id: 'bolts', name: 'Steel bolts', costs: [60],
    desc: 'Every bolt does double damage. Knights fall in two hits, rams in four.' },
  { id: 'winch', name: 'Faster winch', costs: [45, 90],
    desc: 'Reload the crossbow faster. Two levels.' },
  { id: 'walls', name: 'Thicker walls', costs: [40, 70, 110],
    desc: 'Each level makes the wall 25 percent stronger. Three levels.' },
  { id: 'gate', name: 'Reinforced gate', costs: [70],
    desc: 'Rams and ladder crews do 40 percent less damage.' },
  { id: 'tower', name: 'Archer tower', costs: [90, 130],
    desc: 'An archer on the left tower shoots the closest enemy on his own. Level two adds an archer on the right tower.' },
  { id: 'scouts', name: 'Scouts', costs: [30],
    desc: 'Scouts call out what is coming and in which lane as each group comes into earshot.' },
];

export const DIFFICULTY = {
  easy: { label: 'Easy', speed: 0.8, damage: 0.6 },
  normal: { label: 'Normal', speed: 1, damage: 1 },
  hard: { label: 'Hard', speed: 1.15, damage: 1.4 },
};

export const BASE = {
  wallHP: 100,
  reload: [1.0, 0.75, 0.55],
  boltSpeed: 80,      // meters per second
  towerInterval: 5,   // seconds between archer shots
  towerRange: 85,
  clearBonus: 30,
  repairCostPerPoint: 1,
  replayRate: 0.5,
};

// Campaign waves. Each event: t = seconds into the wave, lane 0-4, type, count.
// horn: blow the warning horn from that lane. drums: seconds of distant war drums.
export const CAMPAIGN = [
  {
    title: 'The First Assault',
    events: [
      { t: 3, lane: 2, type: 'soldier', count: 2, horn: true },
      { t: 20, lane: 1, type: 'soldier', count: 2 },
      { t: 36, lane: 3, type: 'soldier', count: 3 },
      { t: 56, lane: 0, type: 'soldier', count: 2 },
      { t: 61, lane: 4, type: 'soldier', count: 2 },
      { t: 80, drums: 10 },
      { t: 92, lane: 2, type: 'soldier', count: 3, horn: true },
      { t: 101, lane: 1, type: 'soldier', count: 2 },
      { t: 110, lane: 3, type: 'soldier', count: 2 },
      { t: 128, lane: 0, type: 'soldier', count: 2 },
      { t: 133, lane: 4, type: 'soldier', count: 3 },
      { t: 142, lane: 2, type: 'soldier', count: 4 },
    ],
  },
  {
    title: 'Iron and Steel',
    events: [
      { t: 3, lane: 2, type: 'knight', count: 1, horn: true },
      { t: 30, lane: 1, type: 'soldier', count: 3 },
      { t: 42, lane: 3, type: 'knight', count: 1 },
      { t: 60, lane: 0, type: 'soldier', count: 2 },
      { t: 64, lane: 4, type: 'soldier', count: 2 },
      { t: 78, lane: 2, type: 'knight', count: 2 },
      { t: 100, drums: 12 },
      { t: 115, lane: 1, type: 'knight', count: 1, horn: true },
      { t: 118, lane: 3, type: 'soldier', count: 3 },
      { t: 135, lane: 4, type: 'knight', count: 1 },
      { t: 140, lane: 0, type: 'soldier', count: 3 },
      { t: 160, lane: 2, type: 'soldier', count: 3 },
      { t: 175, lane: 1, type: 'knight', count: 2 },
      { t: 180, lane: 3, type: 'knight', count: 2 },
    ],
  },
  {
    title: 'Ladders and the Ram',
    events: [
      { t: 3, lane: 1, type: 'ladder', count: 1, horn: true },
      { t: 28, lane: 3, type: 'soldier', count: 3 },
      { t: 40, lane: 4, type: 'ladder', count: 1 },
      { t: 58, lane: 0, type: 'knight', count: 1 },
      { t: 62, lane: 2, type: 'soldier', count: 3 },
      { t: 80, lane: 3, type: 'ladder', count: 2 },
      { t: 95, lane: 1, type: 'knight', count: 2 },
      { t: 120, drums: 14 },
      { t: 138, lane: 0, type: 'ladder', count: 1, horn: true },
      { t: 142, lane: 4, type: 'soldier', count: 3 },
      { t: 160, lane: 1, type: 'soldier', count: 3 },
      { t: 165, lane: 3, type: 'knight', count: 2 },
      { t: 185, drums: 8 },
      { t: 195, lane: 2, type: 'ram', count: 1, horn: true },
      { t: 205, lane: 1, type: 'soldier', count: 2 },
      { t: 212, lane: 3, type: 'ladder', count: 1 },
      { t: 225, lane: 0, type: 'knight', count: 1 },
      { t: 228, lane: 4, type: 'soldier', count: 3 },
    ],
  },
];

// Endless: generated waves that grow harder. Medieval enemies only for now.
export function endlessWave(n) {
  const events = [];
  const groups = Math.round(7 + n * 1.5);
  const gap = Math.max(6, 15 - n * 0.6);
  let t = 3;
  const types = ['soldier'];
  if (n >= 2) types.push('knight');
  if (n >= 3) types.push('ladder');
  let lastLane = -1;
  for (let i = 0; i < groups; i++) {
    let lane;
    do { lane = Math.floor(Math.random() * 5); } while (lane === lastLane);
    lastLane = lane;
    const type = types[Math.floor(Math.random() * types.length)];
    let count;
    if (type === 'soldier') count = 2 + Math.floor(Math.random() * 2) + Math.floor(n / 4);
    else if (type === 'knight') count = 1 + Math.floor(n / 5);
    else count = 1 + Math.floor(n / 6);
    events.push({ t: Math.round(t), lane, type, count, horn: i === 0 });
    t += gap * (0.7 + Math.random() * 0.6);
    if (i === Math.floor(groups / 2)) { events.push({ t: Math.round(t), drums: 8 }); t += 14; }
  }
  if (n % 5 === 0) events.push({ t: Math.round(t + 5), lane: 2, type: 'ram', count: 1 + Math.floor(n / 10), horn: true });
  return { title: `Endless wave ${n}`, events };
}
