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
  archer: {
    name: 'archer', plural: 'archers',
    hp: 1, speed: 4.5, gold: 8,
    standoff: 55, shotInterval: 4, shotDamage: 2,
    stepInterval: 0.45, pitch: 145,
    intro: 'Archers. They stop out of reach and shoot at the wall until you hunt them down. One bolt each.',
  },
  siegeTower: {
    name: 'siege tower', plural: 'siege towers',
    hp: 40, speed: 0.9, gold: 150, wooden: true, boss: true,
    archerRange: 80, volleyInterval: 5, volleyDamage: 2,
    slamDamage: 20, boomInterval: 4, boomDamage: 6, gateBlocks: true,
    stepInterval: 1.6, pitch: 120,
    intro: 'A siege tower! Archers on top will fire at the wall as it rolls in. Forty damage to bring it down.',
    downText: 'The siege tower is down!',
  },

  // ----- Gunpowder era -----
  infantry: {
    name: 'infantryman', plural: 'infantry',
    hp: 4, speed: 4, gold: 8,
    wallDamage: 2, hackInterval: 1.0,
    stepInterval: 0.5, pitch: 130,
    intro: 'Infantry with bayonets. Tougher than foot soldiers: four damage each. A musket drops them in one shot.',
  },
  musketeers: {
    name: 'musketeer', plural: 'musketeers',
    hp: 4, speed: 3.5, gold: 10,
    standoff: 60, shotInterval: 5, shotDamage: 1.5,
    stepInterval: 0.55, pitch: 125,
    intro: 'Musketeers. They form a line out of reach and fire volleys at the wall. Four damage each.',
  },
  cavalry: {
    name: 'cavalryman', plural: 'cavalry',
    hp: 3, speed: 9, gold: 12,
    wallDamage: 1.5, hackInterval: 1.0,
    stepInterval: 0.36, pitch: 140,
    intro: 'Cavalry! Galloping hooves, very fast. Three damage each. React quickly.',
  },
  sapper: {
    name: 'sapper', plural: 'sappers',
    hp: 2, speed: 1.6, gold: 15,
    underground: true, hearRange: 40, mineDamage: 20, single: true,
    stepInterval: 0.8, pitch: 135,
    intro: 'Sappers, digging toward the wall underground. Listen for the scraping. Once they are close enough to hear clearly, any weapon can hit them. If they reach the wall, they set off a mine.',
  },
  siegeCannon: {
    name: 'siege cannon', plural: 'siege cannons',
    hp: 6, speed: 1.5, gold: 30, wooden: true, single: true,
    standoff: 95, shotInterval: 7, shotDamage: 7, shot: 'cannon',
    stepInterval: 1.4, pitch: 120,
    intro: 'A siege cannon, set up far out. It pounds the wall with heavy shots. Six damage to destroy it. Make it a priority.',
  },
  greatGun: {
    name: 'great gun', plural: 'great guns',
    hp: 30, speed: 1.2, gold: 200, wooden: true, boss: true, single: true,
    standoff: 98, shotInterval: 6, shotDamage: 10, shot: 'greatGun',
    stepInterval: 1.4, pitch: 120,
    intro: 'The grand battery! The great gun leads a line of siege cannons. Thirty damage to silence it.',
    downText: 'The great gun is silenced!',
  },
};

// Your weapons. Slots: light (F), heavy (B), mortar (M).
export const WEAPONS = {
  crossbow: { slot: 'light', name: 'Crossbow', kind: 'single', speed: 80 },
  musket: { slot: 'light', name: 'Musket', kind: 'single', speed: 300, damage: 4, reload: [1.6, 1.25, 1.0] },
  ballista: { slot: 'heavy', name: 'Ballista', kind: 'pierce', speed: 60 },
  cannon: { slot: 'heavy', name: 'Cannon', kind: 'bounce', speed: 120, damage: [4, 3, 2, 1], reload: [4.5, 3.5, 2.7] },
  mortar: { slot: 'mortar', name: 'Mortar', kind: 'shell', flight: 2.5, damage: 4, radius: 12, reload: [6, 4.5] },
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
  { id: 'ballista', name: 'Ballista', costs: [120],
    desc: 'A second main weapon. Slow to reload, but its huge bolt pierces every enemy in the lane. Two damage to the first enemy, one to each enemy behind it. Fire it with B, or switch to it with a two-finger swipe up or down, then tap.' },
  { id: 'crank', name: 'Ballista crank', costs: [80, 140], requires: 'ballista',
    desc: 'Reload the ballista faster. Two levels.' },
  { id: 'oil', name: 'Boiling oil', costs: [80, 100, 140],
    desc: 'Pour boiling oil on every enemy at the wall in the lane you are aiming at. Press O, or hold one finger still on the screen. Two pots per wave, plus one more for each extra level.' },

  // ----- Gunpowder era (era 1) -----
  { id: 'musket', name: 'Musket', costs: [1500], era: 1,
    desc: 'Replaces the crossbow as your quick weapon. Four damage per shot, enough to drop infantry in one hit, but a slower reload. Fires with F.' },
  { id: 'cartridges', name: 'Paper cartridges', costs: [700, 1000], era: 1, requires: 'musket',
    desc: 'Reload the musket faster. Two levels.' },
  { id: 'cannon', name: 'Cannon', costs: [2000], era: 1,
    desc: 'Replaces the ballista as your heavy weapon. The ball bounces down the lane: four damage to the first enemy, then three, two and one to the next. Fires with B.' },
  { id: 'drill', name: 'Gun crew drill', costs: [800, 1100], era: 1, requires: 'cannon',
    desc: 'Reload the cannon faster. Two levels.' },
  { id: 'mortar', name: 'Mortar', costs: [2500], era: 1,
    desc: 'A third main weapon. Lobs a shell that lands where the closest enemy in your lane was standing, about two and a half seconds later, and blasts everything near it for four damage. Best against enemies that stand still. Fires with M, or a three-finger tap.' },
  { id: 'mortarCrew', name: 'Mortar crew', costs: [1000], era: 1, requires: 'mortar',
    desc: 'Reload the mortar faster.' },
  { id: 'ramparts', name: 'Earthen ramparts', costs: [500, 800, 1100, 1500], era: 1,
    desc: 'Each level makes the wall 25 percent stronger, on top of thicker walls. Four levels.' },
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
  clearBonusPerWave: 10,  // campaign: later waves pay a bigger clear bonus
  ballistaReload: [4.0, 3.0, 2.2],
  ballistaDamage: [2, 1],  // first enemy in the lane, then everyone behind it
  ballistaSpeed: 60,
  oilDamage: 5,
  repairCostPerPoint: 1,
  replayRate: 0.5,
};

// Campaign waves. Each event: t = seconds into the wave, lane 0-4, type, count.
// horn: blow the warning horn from that lane. drums: seconds of distant war drums.
// Medieval campaign waves (era 0). Gunpowder waves are further down.
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

// Shorthand for the later waves: g(time, lane, type, count, horn)
const g = (t, lane, type, count = 1, horn = false) => ({ t, lane, type, count, horn });
const drums = (t, secs) => ({ t, drums: secs });

CAMPAIGN.push(
  {
    title: 'Twin Ladders', pace: 1.15, crowd: 1.0,
    events: [
      g(3, 2, 'soldier', 3, true),
      g(18, 0, 'ladder'), g(18, 4, 'ladder'),
      g(40, 1, 'knight', 2), g(45, 3, 'soldier', 3),
      g(65, 1, 'ladder', 2), g(70, 4, 'soldier', 3),
      drums(85, 10),
      g(95, 2, 'knight', 2, true), g(98, 0, 'soldier', 3), g(105, 3, 'ladder'),
      g(125, 1, 'soldier', 4), g(128, 3, 'soldier', 4),
      g(145, 2, 'ram', 1, true), g(147, 1, 'knight'), g(147, 3, 'knight'),
    ],
  },
  {
    title: 'The Iron Column', pace: 1.3, crowd: 1.1,
    events: [
      g(3, 2, 'knight', 3, true),
      g(25, 0, 'soldier', 4), g(30, 4, 'soldier', 4),
      g(50, 1, 'knight', 3), g(58, 3, 'ladder', 2),
      drums(75, 10),
      g(85, 3, 'knight', 3, true), g(88, 0, 'ladder'), g(92, 2, 'soldier', 5),
      g(115, 4, 'knight', 2), g(118, 0, 'knight', 2),
      g(140, 2, 'ram', 1, true), g(143, 1, 'knight', 2), g(146, 4, 'ladder', 2),
    ],
  },
  {
    title: 'The Pincer', pace: 1.45, crowd: 1.25,
    events: [
      g(3, 0, 'soldier', 4, true), g(3, 4, 'soldier', 4),
      g(25, 1, 'ladder', 2), g(25, 3, 'ladder', 2),
      g(50, 0, 'knight', 2), g(50, 4, 'knight', 2),
      g(40, 2, 'archer', 2),
      g(70, 2, 'soldier', 6), g(75, 1, 'archer', 2),
      drums(88, 10),
      g(100, 0, 'ladder', 2, true), g(100, 4, 'ladder', 2), g(104, 2, 'knight', 2),
      g(130, 2, 'ram', 1, true), g(132, 1, 'soldier', 4), g(132, 3, 'soldier', 4),
      g(150, 1, 'ladder'), g(150, 3, 'ladder'),
    ],
  },
  {
    title: 'Two Rams', pace: 1.6, crowd: 1.4,
    events: [
      g(3, 1, 'knight', 2, true), g(6, 3, 'knight', 2),
      g(25, 0, 'soldier', 5), g(28, 4, 'ladder', 2), g(32, 2, 'archer', 3),
      g(45, 2, 'ram', 1, true), g(50, 1, 'soldier', 4), g(55, 3, 'ladder', 2),
      drums(80, 10),
      g(90, 0, 'knight', 3, true), g(92, 4, 'knight', 3),
      g(110, 2, 'ram', 2, true), g(112, 1, 'ladder', 2), g(115, 3, 'soldier', 5),
      g(125, 0, 'archer', 2), g(125, 4, 'archer', 2),
      g(135, 2, 'knight', 3),
    ],
  },
  {
    title: 'The Long Night', pace: 1.75, crowd: 1.5,
    events: [
      g(3, 2, 'soldier', 4, true),
      g(12, 0, 'knight', 2), g(20, 4, 'ladder', 2),
      g(30, 1, 'soldier', 5), g(34, 4, 'archer', 3), g(38, 3, 'knight', 3),
      g(46, 0, 'ladder', 2), g(52, 2, 'knight', 3),
      g(60, 4, 'soldier', 5), g(66, 1, 'ladder', 2),
      g(75, 2, 'ram', 1, true), g(78, 3, 'soldier', 5),
      drums(95, 8),
      g(105, 0, 'knight', 3, true), g(108, 4, 'knight', 3),
      g(112, 1, 'archer', 3), g(118, 2, 'ladder', 3), g(126, 1, 'soldier', 6), g(130, 3, 'archer', 3),
      g(134, 3, 'ladder', 2), g(140, 0, 'soldier', 5),
      g(150, 2, 'ram', 2, true), g(152, 4, 'ladder', 2), g(156, 1, 'knight', 3),
    ],
  },
  {
    title: 'Storm of Ladders', pace: 1.9, crowd: 1.65,
    events: [
      g(3, 0, 'ladder', 2, true), g(5, 4, 'ladder', 2),
      g(22, 1, 'ladder', 3), g(26, 3, 'knight', 3),
      g(42, 2, 'ladder', 3), g(46, 0, 'soldier', 5), g(50, 3, 'archer', 3),
      g(62, 4, 'ladder', 3), g(66, 1, 'knight', 3),
      drums(82, 8),
      g(92, 0, 'ladder', 3, true), g(92, 4, 'ladder', 3),
      g(112, 2, 'ram', 1, true), g(114, 1, 'ladder', 2), g(114, 3, 'ladder', 2),
      g(125, 1, 'archer', 3), g(125, 4, 'archer', 3),
      g(135, 0, 'knight', 3), g(138, 4, 'soldier', 6), g(142, 2, 'ladder', 3),
    ],
  },
  {
    title: 'The Siege Tower', pace: 2.0, crowd: 1.8,
    events: [
      g(3, 2, 'siegeTower', 1, true),
      g(10, 0, 'soldier', 4), g(14, 4, 'soldier', 4),
      g(22, 0, 'archer', 3), g(22, 4, 'archer', 3),
      g(30, 1, 'knight', 3), g(34, 3, 'ladder', 2),
      g(50, 0, 'ladder', 2), g(54, 4, 'knight', 3),
      drums(66, 8),
      g(72, 1, 'soldier', 6, true), g(75, 3, 'soldier', 6),
      g(88, 1, 'archer', 3), g(88, 3, 'archer', 3),
      g(95, 0, 'knight', 3), g(98, 4, 'ladder', 3),
      g(115, 2, 'ram', 1, true), g(118, 1, 'ladder', 2), g(118, 3, 'knight', 3),
    ],
  },
);

// ----- Gunpowder era waves -----
const GUNPOWDER = [
  {
    title: 'Smoke on the Horizon', pace: 1.0,
    events: [
      g(3, 2, 'infantry', 3, true), g(18, 1, 'infantry', 3), g(30, 3, 'infantry', 3),
      g(48, 0, 'infantry', 3), g(52, 4, 'infantry', 3),
      drums(65, 8),
      g(75, 2, 'infantry', 4, true), g(90, 1, 'infantry', 3), g(92, 3, 'infantry', 3),
      g(110, 0, 'infantry', 4), g(112, 4, 'infantry', 4),
    ],
  },
  {
    title: 'Volley Fire', pace: 1.05,
    events: [
      g(3, 2, 'musketeers', 3, true), g(20, 0, 'infantry', 3), g(25, 4, 'infantry', 3),
      g(40, 1, 'musketeers', 3), g(55, 3, 'infantry', 4),
      drums(70, 8),
      g(80, 0, 'musketeers', 3, true), g(82, 4, 'musketeers', 3), g(100, 2, 'infantry', 5),
      g(115, 1, 'infantry', 3), g(118, 3, 'infantry', 3),
    ],
  },
  {
    title: 'The Cavalry Charge', pace: 1.1,
    events: [
      g(3, 2, 'cavalry', 2, true), g(18, 0, 'infantry', 3), g(28, 4, 'cavalry', 2),
      g(40, 1, 'musketeers', 3), g(50, 3, 'cavalry', 3),
      drums(65, 8),
      g(75, 0, 'cavalry', 3, true), g(75, 4, 'cavalry', 3), g(95, 2, 'musketeers', 4),
      g(105, 1, 'infantry', 4), g(110, 3, 'cavalry', 3),
    ],
  },
  {
    title: 'Beneath the Walls', pace: 1.15,
    events: [
      g(3, 1, 'sapper', 1, true), g(10, 3, 'infantry', 3), g(25, 4, 'sapper', 1),
      g(30, 0, 'musketeers', 3), g(45, 2, 'sapper', 2), g(50, 1, 'cavalry', 2),
      drums(70, 8),
      g(80, 3, 'sapper', 2, true), g(82, 0, 'infantry', 4), g(95, 4, 'musketeers', 3),
      g(110, 1, 'sapper', 2), g(112, 2, 'cavalry', 3),
    ],
  },
  {
    title: 'The Guns Arrive', pace: 1.2,
    events: [
      g(3, 2, 'siegeCannon', 1, true), g(10, 0, 'infantry', 3), g(14, 4, 'infantry', 3),
      g(30, 1, 'musketeers', 3), g(40, 3, 'cavalry', 3),
      g(55, 0, 'siegeCannon', 1), g(58, 4, 'sapper', 1),
      drums(75, 8),
      g(85, 4, 'siegeCannon', 1, true), g(88, 2, 'infantry', 5), g(100, 1, 'cavalry', 3), g(105, 3, 'musketeers', 4),
    ],
  },
  {
    title: 'Crossfire', pace: 1.3, crowd: 1.1,
    events: [
      g(3, 0, 'musketeers', 3, true), g(3, 4, 'musketeers', 3), g(20, 2, 'infantry', 5),
      g(30, 1, 'cavalry', 3), g(34, 3, 'cavalry', 3),
      g(50, 2, 'siegeCannon', 1), g(55, 0, 'sapper', 2), g(60, 4, 'infantry', 4),
      drums(75, 8),
      g(85, 1, 'musketeers', 4, true), g(85, 3, 'musketeers', 4), g(105, 2, 'cavalry', 4),
      g(110, 0, 'siegeCannon', 1), g(115, 4, 'sapper', 2),
    ],
  },
  {
    title: 'Thunder and Hooves', pace: 1.4, crowd: 1.2,
    events: [
      g(3, 1, 'cavalry', 3, true), g(5, 3, 'cavalry', 3),
      g(20, 0, 'siegeCannon', 1), g(22, 4, 'siegeCannon', 1), g(35, 2, 'infantry', 5),
      g(45, 1, 'sapper', 2), g(50, 3, 'musketeers', 4),
      drums(68, 8),
      g(78, 0, 'cavalry', 4, true), g(80, 4, 'cavalry', 4), g(95, 2, 'musketeers', 4),
      g(100, 1, 'infantry', 5), g(110, 3, 'siegeCannon', 1), g(115, 2, 'sapper', 2),
    ],
  },
  {
    title: 'The Long Bombardment', pace: 1.5, crowd: 1.3,
    events: [
      g(3, 0, 'siegeCannon', 1, true), g(3, 4, 'siegeCannon', 1), g(12, 2, 'infantry', 5),
      g(25, 1, 'musketeers', 4), g(30, 3, 'sapper', 2), g(42, 0, 'cavalry', 4), g(50, 4, 'infantry', 5),
      g(60, 2, 'siegeCannon', 1, true),
      drums(70, 6),
      g(80, 1, 'cavalry', 4), g(84, 3, 'musketeers', 4), g(95, 0, 'sapper', 2), g(100, 4, 'sapper', 2),
      g(110, 2, 'infantry', 6), g(120, 1, 'siegeCannon', 1), g(122, 3, 'cavalry', 4),
    ],
  },
  {
    title: 'Mines and Muskets', pace: 1.5, crowd: 1.3,
    events: [
      g(3, 1, 'sapper', 2, true), g(5, 3, 'sapper', 2), g(15, 2, 'musketeers', 4),
      g(25, 0, 'infantry', 5), g(30, 4, 'cavalry', 4),
      g(45, 2, 'sapper', 3), g(50, 1, 'musketeers', 4), g(52, 3, 'musketeers', 4),
      drums(68, 6),
      g(78, 0, 'siegeCannon', 1, true), g(80, 4, 'siegeCannon', 1), g(90, 2, 'cavalry', 5),
      g(100, 1, 'sapper', 2), g(102, 3, 'infantry', 5), g(115, 0, 'musketeers', 4), g(118, 4, 'cavalry', 4),
    ],
  },
  {
    title: 'The Grand Battery', pace: 1.55, crowd: 1.4,
    events: [
      g(3, 2, 'greatGun', 1, true), g(6, 0, 'siegeCannon', 1), g(6, 4, 'siegeCannon', 1),
      g(15, 1, 'infantry', 5), g(18, 3, 'infantry', 5),
      g(35, 0, 'cavalry', 4), g(38, 4, 'cavalry', 4),
      g(50, 2, 'sapper', 2), g(55, 1, 'musketeers', 4), g(58, 3, 'musketeers', 4),
      drums(72, 6),
      g(80, 0, 'siegeCannon', 1, true), g(82, 4, 'siegeCannon', 1), g(95, 2, 'cavalry', 5),
      g(100, 1, 'sapper', 2), g(103, 3, 'sapper', 2), g(115, 0, 'infantry', 6), g(118, 4, 'musketeers', 4),
    ],
  },
];

// Each era is its own page in the campaign. Clear bonus counts waves across all eras.
export const ERAS = [
  { id: 'medieval', name: 'Medieval era', blurb: 'Stone walls, crossbows and battering rams.', waves: CAMPAIGN },
  { id: 'gunpowder', name: 'Gunpowder era', blurb: 'A star fort, muskets and cannon fire. Its weapons must be bought in the shop.', waves: GUNPOWDER },
];

// Endless: generated waves that grow harder. Medieval enemies only for now.
export function endlessWave(n) {
  if (n > 10) return endlessGunpowder(n);
  const events = [];
  const groups = Math.round(7 + n * 1.5);
  const gap = Math.max(6, 15 - n * 0.6);
  let t = 3;
  const types = ['soldier'];
  if (n >= 2) types.push('knight');
  if (n >= 3) types.push('ladder');
  if (n >= 6) types.push('archer');
  let lastLane = -1;
  for (let i = 0; i < groups; i++) {
    let lane;
    do { lane = Math.floor(Math.random() * 5); } while (lane === lastLane);
    lastLane = lane;
    const type = types[Math.floor(Math.random() * types.length)];
    let count;
    if (type === 'soldier') count = 2 + Math.floor(Math.random() * 2) + Math.floor(n / 4);
    else if (type === 'archer') count = 2 + Math.floor(n / 6);
    else if (type === 'knight') count = 1 + Math.floor(n / 5);
    else count = 1 + Math.floor(n / 6);
    events.push({ t: Math.round(t), lane, type, count, horn: i === 0 });
    t += gap * (0.7 + Math.random() * 0.6);
    if (i === Math.floor(groups / 2)) { events.push({ t: Math.round(t), drums: 8 }); t += 14; }
  }
  if (n % 10 === 0) events.push({ t: 3, lane: 2, type: 'siegeTower', count: 1 });
  if (n % 5 === 0) events.push({ t: Math.round(t + 5), lane: 2, type: 'ram', count: 1 + Math.floor(n / 10), horn: true });
  return { title: `Endless wave ${n}`, events, pace: Math.min(1.6, 1 + 0.04 * n), era: 0 };
}

function endlessGunpowder(n) {
  const k = n - 10; // waves into the gunpowder era
  const events = [];
  const groups = Math.round(8 + k * 1.5);
  const gap = Math.max(6, 14 - k * 0.6);
  const types = ['infantry', 'musketeers', 'cavalry'];
  if (k >= 2) types.push('sapper');
  if (k >= 3) types.push('siegeCannon');
  let t = 3, lastLane = -1;
  for (let i = 0; i < groups; i++) {
    let lane;
    do { lane = Math.floor(Math.random() * 5); } while (lane === lastLane);
    lastLane = lane;
    const type = types[Math.floor(Math.random() * types.length)];
    let count;
    if (type === 'siegeCannon') count = 1;
    else if (type === 'sapper') count = 1 + Math.floor(k / 5);
    else count = 2 + Math.floor(Math.random() * 2) + Math.floor(k / 4);
    events.push({ t: Math.round(t), lane, type, count, horn: i === 0 });
    t += gap * (0.7 + Math.random() * 0.6);
    if (i === Math.floor(groups / 2)) { events.push({ t: Math.round(t), drums: 8 }); t += 12; }
  }
  if (n % 10 === 0) events.push({ t: 3, lane: 2, type: 'greatGun', count: 1 });
  return { title: `Endless wave ${n}`, events, pace: Math.min(2, 1.2 + 0.05 * k), era: 1 };
}
