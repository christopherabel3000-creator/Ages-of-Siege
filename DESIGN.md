# Ages of Siege — Design Document

An audio-first tower defense game. You man the guns atop your walls while waves of enemies try to breach your defenses. Everything you need is heard, not seen: where an enemy is, how far away, what kind it is, and how badly your wall is hurt. Between waves you spend your earnings on stronger walls, bigger weapons, and other defenses. Over the course of the campaign your fortress advances from a medieval castle to a modern base.

Built in plain HTML, CSS and JavaScript. Playable in a browser (GitHub Pages) and later wrapped as an iPhone app for the App Store, the same way as Friday to Sunday, Shardkin and Hidden Ranks.

---

## 1. Core decisions (settled)

| Topic | Decision |
|---|---|
| Genre | Tower defense, played from the top of your own wall |
| Setting | Starts as a medieval castle and slowly modernizes over time |
| Modes | Campaign and Endless |
| Wave length | About 5 minutes on average; shorter waves early on are fine, and fast players finish sooner (never more enemies for killing quickly) |
| Campaign failure | You restart the failed wave. You cannot go back to the shop to change upgrades before retrying |
| Getting unstuck | In the campaign you can replay any wave you have already cleared to earn more currency for the shop |
| Endless failure | One failed wave ends the run |
| Wall damage | Does not carry over between waves. Walls start every wave at full strength, and repairs are paid automatically out of what you earned |
| Pace | A balance of movement and strategy without becoming overwhelming (see section 6; to be tuned in playtesting) |
| Controls | Gestures on the phone (not VoiceOver gestures), keyboard on the computer |

---

## 2. How it sounds and plays

You stand on the wall facing outward. The battlefield spreads in an arc in front of you, from far left to far right, heard in 3D sound (best with headphones).

### Lanes
The battlefield is split into **five lanes**: far left, left, center, right, far right. Lanes keep aiming fair by ear. Enemies march straight down their lane toward the wall.

- Moving your aim plays a short tick placed in that lane. The tick's pitch rises from far left to far right, so you know where you are aiming even without stereo.
- Trying to aim past the edge plays a dull edge thump.

### Distance
Distance is heard through:
- **Volume:** louder as the enemy gets closer.
- **Brightness:** far sounds are muffled, close sounds are crisp.
- **Echo:** far sounds carry more echo off the hills, close sounds are dry.

An enemy that reaches the wall is right under you and starts damaging it.

### Firing
Your shot hits the **closest enemy in the lane you are aiming at**. Weapons have a reload time; firing early gives a dry click. A shot into an empty lane lands in the dirt with a soft thunk far away.

### Feedback
- Hit: an impact at the enemy's position (flesh thud or armor ring).
- Kill: a cry and a fall, plus a bright two-note chime that means "kill confirmed" (three notes for a ram), panned toward the lane of the kill. Nothing else in the game sounds like it.
- Wall hit: stone thud, with cracking getting louder as the wall weakens. On the phone app, a vibration.
- Status report on demand: where the enemies are first (count per lane), then wall strength, your aim, selected weapon and oil left.

---

## 3. Controls

One set of game actions, each tied to a gesture and a key. Both run through the same code, so the game feels the same on either.

| Action | Phone gesture | Keyboard |
|---|---|---|
| Aim one lane left | Swipe left | Left arrow |
| Aim one lane right | Swipe right | Right arrow |
| Jump straight to a lane | — | 1 to 5 |
| Fire the selected main weapon | Tap | Space |
| Fire the crossbow | — | F |
| Fire the ballista | — | B |
| Switch main weapon (crossbow / ballista) | Two-finger swipe up or down | — |
| Pour boiling oil | Hold one finger still (half a second) | O |
| Status report | Swipe up | S |
| Repeat last callout | Swipe down | R |
| Pause / resume | Two-finger tap | Escape or P |

Weapon controls were chosen by Christopher (Nov 18 2026): O pours oil, B fires the ballista, and a two-finger swipe up or down switches the main weapon on the phone. The phone's oil gesture (hold one finger still) was added to complete the set.

### Screen readers
- **Menus, shop and reports** are normal HTML with headings and buttons, fully usable with VoiceOver and JAWS.
- **The battlefield** is marked as an *application* area, so JAWS passes the arrow keys and F straight to the game.
- **iPhone app:** the battlefield will be marked as a *direct touch* area so VoiceOver passes swipes and taps straight to the game while menus keep working with VoiceOver. This needs a small piece of native code in the app wrapper.
- **Browser testing on iPhone:** websites cannot turn on direct touch, so turn VoiceOver off with the accessibility shortcut while playing a wave.
- **Callouts** (new enemy types, warnings, reports) are spoken by the game's own voice by default. A setting sends them to the screen reader instead, for players who prefer their own screen reader voice and speed.
- No repetitive spoken instructions. A new enemy type is explained once, the first time it appears, and never again.

---

## 4. The eras

The campaign has four eras of about 10 waves each, roughly 40 waves in total. Each era has its own fortress, weapons, enemies, and soundscape, and ends with a boss wave.

### Era 1 — Medieval
- **Fortress:** stone walls and a wooden gate.
- **Your weapons:** crossbow; ballista (bought in the shop: slow reload, the bolt pierces every enemy in the lane, doing 2 damage to the first and 1 to each enemy behind it (toned down Nov 18 2026 at Christopher's request, so it no longer one-shots everything), and it reloads separately from the crossbow); boiling oil (bought in the shop: 2 to 4 pots per wave, splashes every enemy at the wall in your lane for 5 damage; a pot isn't used if nobody is at the wall there).
- **Enemies:**
  - Foot soldiers: marching steps. Weak and common.
  - Knights: clanking armor, slow, take several hits.
  - Ladder crews: running steps and rattling wood. When a ladder hits the wall you have a few seconds to shoot the climbers before they get over and do heavy damage.
  - Battering ram: rumbling wheels and a chanting crew. At the gate it booms every few seconds for big damage.
  - Archers (from wave 6): stop about 55 meters out and shoot the wall every few seconds until you hunt them down.
  - Siege tower (boss, wave 10): a huge creaking tower on wheels. Archers on top fire volleys at the wall once it is in range; at the wall it drops a gangway for heavy damage and keeps attacking until destroyed. 40 hit points.
- **Soundscape:** wind over open fields, crows, distant war drums.

### Era 2 — Gunpowder
- **Fortress:** a star fort with earthen banks.
- **Your weapons:** muskets, cannons, mortars that land a shell in a lane after a delay.
- **Enemies:** musket lines that fire volleys at the wall, cavalry charges (fast), their own siege cannons that pound you from long range, sappers digging quietly underground toward the wall.
- **Boss:** a grand battery of siege guns.

### Era 3 — Industrial
- **Fortress:** a concrete bunker line.
- **Your weapons:** machine gun (hold to fire, overheats), artillery, barbed wire.
- **Enemies:** infantry waves, armored cars, early tanks, zeppelins droning overhead (aim up).
- **Boss:** a zeppelin fleet.

### Era 4 — Modern
- **Fortress:** a fortified base.
- **Your weapons:** guided missiles, an air-defense battery, minefields.
- **Enemies:** tanks, helicopters, drone swarms, jets on bombing runs.
- **Boss:** an armored column with air cover.

Enemies learned in one era are replaced by new ones in the next, so each era feels fresh. When a new era begins, the fortress is rebuilt in the new material and the shop offers that era's weapons. (Open question: how much of your previous era's upgrades and gold carry over.)

---

## 5. Structure of a wave

Waves average about 5 minutes. Early waves are shorter (around 3 minutes) and boss waves longer (around 7). Each wave follows a shape so 5 minutes never feels flat:

1. **Opening warning:** a horn from the direction the first group is coming from.
2. **Build-up:** groups arrive with clear gaps between them.
3. **Drums:** one or two moments where war drums sound in the distance, signalling the next push.
4. **Climax:** a big threat at the end, such as a ram, a tank or a bomber run.

**No dead air (Christopher's rule, Nov 18 2026):** as soon as the field is clear, the next group arrives right away, and the rest of the wave moves up by the same amount. You never wait in silence for the next enemy. Fast players finish waves sooner, and that's fine: early waves can be short. A wave's enemies are fixed, and a player never faces more enemies for killing quickly.

A wave ends when every scheduled enemy has arrived and been killed.

---

## 6. Pace and difficulty

The goal is a balance of movement and strategy that never becomes overwhelming. Starting rules, to be tuned in playtesting:

- Early waves: no more than 2–3 threats at once.
- Later waves: up to 4–5 at once, but by then upgrades such as auto-firing towers and traps carry part of the load.
- New enemy types are introduced one at a time, alone at first, so you learn their sound before they appear in a crowd.
- Early on, the challenge is your aim. Later it shifts to your strategy: what you bought, and what you shoot first.
- Difficulty setting: Easy, Normal, Hard (changes enemy speed, toughness and damage).

---

### Difficulty ramp (built Nov 18 2026)
Waves 1 to 3 stay easy on purpose (Christopher: doable at first, then ramping up). From wave 4, each wave has a **pace** (enemy speed multiplier, 1.15 at wave 4 rising to 2.0 at wave 10) and a **crowd** (group size multiplier, 1.0 at wave 4 rising to 1.8 at wave 10). Archers arrive from wave 6. Tuned with test bots of different speeds: a quick player clears every wave, and a slow player takes heavy damage in waves 9 and 10. To be retuned from Christopher's playtests.

## 7. Economy, repairs and the shop

- Gold is earned for each kill, plus a bonus for clearing a wave.
- **Repairs:** at the end of a wave, the cost of repairing the damage taken is subtracted from your gold automatically. Walls always start the next wave at full strength. Taking damage therefore means less to spend, which ties your aim directly to your strategy.
- **Wave report** (spoken and on screen): gold earned, spent on repairs, and total to spend. Example: "Earned 240 gold, 60 spent on repairs, 180 to spend."
- **Replays (campaign only):** a wave you've already cleared can be replayed for more gold. *Proposed:* replays pay half of a first clear, so they rescue you when stuck without being the best way to win.
- **No re-shopping on a retry:** if you fail a wave, you retry it with exactly the upgrades you had.

### Upgrade categories
- **Walls:** thicker walls (more strength), reinforced gate (rams and climbers do less damage), spikes.
- **Weapons:** stronger ammunition, faster reload, new weapons as the era allows.
- **Defenses:** archer towers that fire on their own (you hear them shooting), boiling oil, trap pits, fire moats.
- **Bonuses:** scouts who call out where each group is coming from, more gold per kill.
- **Medieval shop (built):** steel bolts, faster winch (2 levels), thicker walls (3), reinforced gate, archer tower (2), scouts, ballista, ballista crank (2), boiling oil (3).
- Campaign clear bonus grows by 10 gold per wave.

---

## 8. Modes

### Campaign
- About 40 waves across four eras, with a boss at the end of each era.
- The game saves at the start of every wave.
- Failing a wave sends you back to the start of that wave, with the upgrades you had.
- Any cleared wave can be replayed for extra gold.

### Endless
- Starts in the medieval era. Every 10 waves the enemy advances an era, and you must adapt.
- Enemy waves are generated and grow harder over time.
- You still shop between waves.
- One failed wave ends the run. Score: waves survived and enemies defeated.
- Later: an online leaderboard through Firebase.

---

## 9. Sound production

- **Prototype:** all sounds are generated in code (synthesized), so there are no audio files to manage while we tune the gameplay.
- **Release:** replace them with recorded sounds from libraries whose licenses allow commercial use, plus paid packs where needed. Each sound keeps the same name in code, so swapping is simple.
- Every enemy type must be recognizable on its own and in a crowd.

---

## 10. Technical notes

- 3D sound with the browser's Web Audio engine (HRTF panning for headphones).
- The game asks iPhone to treat its audio as **playback**, so it isn't muted by the ring/silent switch.
- Audio starts from the first tap on Start, as iPhones require.
- Save data in the browser's local storage for now.
- Code layout:
  - `index.html`, `style.css`
  - `src/audio.js` — audio engine, 3D placement, echo
  - `src/sounds.js` — every sound effect
  - `src/data.js` — enemies, upgrades, campaign waves
  - `src/game.js` — game loop and rules
  - `src/input.js` — gestures and keyboard
  - `src/main.js` — menus, shop, saving

---

## 11. Milestones

1. **Medieval prototype** — lanes, 3D sound, gestures and keyboard, crossbow, foot soldiers, knights, ladder crews, battering ram, first three campaign waves, shop, repairs, replays, a basic endless mode, settings. *(Built Nov 17 2026.)*
2. **Full medieval era** — 10 waves, ballista, boiling oil, archers, siege tower boss, difficulty ramp. *(Built Nov 18 2026; tuning from playtests ongoing.)*
3. **Gunpowder era**
4. **Industrial era**
5. **Modern era**
6. **Recorded sound pass** — replace synthesized sounds.
7. **App Store** — iPhone app wrapper, direct-touch battlefield, vibration, store materials.
8. **Extras** — endless leaderboard, more difficulty options.

---

## 12. Open questions

- Pace: exact balance of action and strategy (tune by playtesting).
- How much carries over between eras (gold, upgrades).
- Should replays pay half, or some other amount?
- Charged shots and weapon switching: which gestures?
