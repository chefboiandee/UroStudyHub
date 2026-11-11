# Path of Pathology (Uro Crawl) — roadmap for the next sessions

`games/uro-crawl.html` is a top-down roguelike dungeon crawler (one file, ~5.9k lines, no dependencies so far) that
the Arcade hosts in a frame. Players see the name **Path of Pathology**; the file, `window.UroCrawl`, the `crawl:*`
messages and the storage key keep the working name Uro Crawl on purpose. This file is the build plan. **How to use it:** the owner tells a session
*"read UROCRAWL_ROADMAP.md and do Step N"* or *"…and do the next step"* (= the first unchecked box below).

## Progress (tick the box and add the date when a step is merged to `main`)

- [x] **Step 1** — Staghorn becomes a mobile head-on duelist (Minotaur-style). Done 2026-11-11 (as built: the note at the end of Step 1)
- [ ] **Step 2** — Giant TURP boss (BPH, three sections) + landmarks, warnings, Kegel boon
- [ ] **Step 3** — The Call Room: a walkable hub between runs (boons, unlocks, decor, jokes)
- [ ] **Step 4** — Dungeon 5, the Peds Wing: action time-trial rooms and movement tech, the Wilms elite, the Reflux kidney-serpent boss
- [x] **The Invader** — Muscle-Invasive Bladder Tumor boss (`?boss=mibc`), the generic wall + perforation system and the
  Oncology dungeon. Done 2026-11-11, asked for directly, ahead of the numbered steps (STATUS has the details).
- Parked (only when asked): true isometric view, RCC thrombus boss — see the end of this file.

## Ground rules (every step)

1. **Read first, never whole-read.** `games/uro-crawl.html` is huge. Read the newest `STATUS.md` entries ("Uro Crawl"),
   then `grep -n` for the tables you need (`WEAPONS`, `ENEMIES`, `BOONS`, `PATRONS`, `REPS`, `BOSSES`, `MODS`, `ASPECTS`,
   `META`, `showTitle`, `startRun`) and read slices. The file header comment documents the URL parameters and hooks.
2. **Engine target: modern browsers, phone-first.** `games/` pages do not need to run on the Boox (the owner uses it for AI
   tutoring only, not games), so modern JS (`?.`, `??`, classes, ES modules), libraries and WebGL are allowed in `games/`.
   Still required: the page loads straight from Pages with no build step, runs at 60 fps on a mid-range phone with touch
   controls, and keeps `localStorage` inside try/catch. `UroStudyHub.html` itself, including the arcade tile and the frame
   host, must stay Boox-safe: put nothing heavy there. The existing game code is plain ES2019 in one file; do not refactor it
   into modules in the middle of a step: the module split is its own task after Step 3.
3. **Public repo.** Nothing personal, clinical or secret in any file or commit message. All human characters are
   stylised cartoon caricatures of **historical** figures or invented people; never living real people, never real
   company brands. Art stays Binding-of-Isaac grotesque-cute and **never anatomically explicit**. New enemies and arenas follow the
   current look: the colored family rim (`rim()` / `body()` / `RIM_W`; stones blue, microbes green, malignant red, benign
   yellow, clots violet), the family face language (`stoneFace`, `beadEyes`, `shutEyes`) and the 3/4 room (back-to-front
   draw order by feet, `drawObstacle` / `BLOCK_H`, ground shadows; collision and coordinates are untouched).
4. **Keep everything working.** Existing weapons, bosses, boons, mods and the embed hook (`?embed=1`,
   `crawl:claim` / `crawl:exit` / `crawl:result`) must behave as before. Every attack is telegraphed ≥ 0.5 s.
5. **Verify headless.** `python3 -m http.server 2043` (repo root), then `node tools/uro-crawl.drive.mjs`
   (Playwright is preinstalled). Add a new lettered block to the harness for the step and keep all earlier blocks green
   (currently A–P, 261 checks: O is the Invader, P is Step 1's Staghorn duel; the steps below add blocks Q, R and S). Also confirm no console errors on load. No `build.py` run is needed unless
   `UroStudyHub.html` itself changes.
6. **Finish the step:** top `STATUS.md` entry (Done / Next steps / Open questions), tick the box above, add any new
   URL params and hooks to the file's header comment, commit, push the working branch, open the PR and merge it to
   `main` (standing instruction in `CLAUDE.md`). Do not merge broken or unfinished work. Do one step per session.

---------------------------------------------------------------------------------------------------

## Step 1 — Staghorn becomes a head-on duelist

**Why:** every boss so far is a big, mostly stationary body. The Staghorn should be the Minotaur-in-Hades fight:
mobile, readable, duelled head-on. It keeps its three phases and the forced weapon swap.

**Body and art:** Isaac-style stone stag: a hulking stone beast with a branching staghorn-calculus antler rack
(4 tines), glowing cracks, big angry eyes, a gait with squash and stretch, and a facing direction.

**Attacks (all telegraphed ≥ 0.5 s):**
- **Antler charge:** it stops, digs in (dust, glow, aim line) for 0.7 s, then charges in a straight line at high speed.
  Hits the player: heavy damage. The player rolls through it (i-frames): no damage. Hits an **arena wall**: stunned
  2.5 s, one tine cracks and breaks off with a shard burst, and the stunned boss takes +50 % damage. Wall crashes are the
  main damage window.
- **Antler sweep:** close-range wide melee arc.
- **Ground slam:** expanding ring(s) of shards to roll through. Reuse `groundSlam` / `staggerPlayer` and the quiet-camera
  rules from the Gentle Giant (a slam that misses is a thud and a ring, shake ≤ 1.5; red flash only if you were hit).
  Note the global rule that a stunned or frozen enemy does no contact damage: the wall-crash stun relies on it.
- **Spike volley:** the tines fire a fan of spikes at range, fewer as tines are lost.

**Phases (same names, same forced weapon swap):**
1. **Shell (100→66 %):** the body takes 25 % damage while ≥ 2 tines remain. Each tine is a separate target
   (~200 HP, LITHO ×1.75) and also breaks from wall crashes. Break 2 tines to expose the body fully.
2. **Infection (66→33 %):** revealed as struvite: wears a **biofilm shield** (strip with FLUID, Bovie or an antibiotic
   boon) while Proteus/E. coli swarms burst from the cracks every 5 s; it leaves a slime trail that slows the player.
   It charges less often but wall crashes drop more swarms. LITHO is reduced while shielded: strip the shield, kill
   the swarm, then break the body.
3. **Core (33→0 %):** the shell shatters into a smaller, faster glowing core runner (×1.5 from all classes). It
   chain-charges (2–3 in a row, 0.5 s telegraphs), fires spiral/ring patterns with safe gaps, wall stuns last only
   1.2 s. Death: slow-mo, shard explosion, shards pop into coins.

Target fight length 90–120 s. Keep the boss bar with 3 phase ticks and the title card. Bestiary line: "Staghorn
calculi fill the renal pelvis and calyces like antlers."

**Done when:** `?boss=staghorn` is a mobile duel with all three phases; the harness block (P) covers the charge, the
wall-crash stun and tine break, the three phase transitions, and a full autoplay kill; earlier blocks still pass.

**As built (2026-11-11):** every number is in the `STAG` table (`UroCrawl.tuning.STAG`), the script is the `stag*`
functions in §14b, the art is `drawStag` / `drawStagCore`. Where the build reads the spec one way or adds to it:
- The shell opens when **2 tines are broken** (the spec's "while ≥ 2 remain" and "break 2" disagree by one; "break 2" won).
  Tine damage stays in the tine, and brushing a tine does not hurt: the rack hits with the charge and the sweep.
- A charge that **gores** the surgeon skids to a stop: no crash, no stun. Only a dodged charge reaches the wall.
- HP is 2800 (was 1500) to land the 90-120 s target; the bot with the starting loadout takes about 70 s.
- Each phase change is a ~1.3 s roar that nothing gets through. The core's dashes are a fixed 0.46 s so 2-3 can chain;
  one that reaches a wall is the 1.2 s stun. The old phase-1 stone adds are gone: it is a duel.
- The boss body is drawn in the back-to-front pass (`def.depth`); rooted bosses still draw under everything.

---------------------------------------------------------------------------------------------------

## Step 2 — The Giant TURP boss (BPH, three sections)

A fourth boss (after the Staghorn, Fournier and the Invader) for a **Benign dungeon** (BPH lobes, cysts, angiomyolipoma, oncocytoma, polyps, condyloma). `?boss=bph`
(choices: `staghorn | fournier | mibc | bph`, random if absent). It is not a head-on duel: its core verb is **carving a channel
and managing risk**, and the boss is the arena. Replace the commented `giantbph` stub in `BOSSES`.

### 2a. Arena, win condition and visual progress
- Inside the prostatic urethra, drawn as an Isaac-style abstract flesh arena (never explicit). Pale pink-white lobular
  **adenoma** tissue bulges in from the walls and periodically swells (every ~10 s, telegraphed), shrinking the playable
  circle; resecting pushes it back. The lobes mostly do not chase you. The existing **Gentle Giant** BPH enemy (with its slam) stays a normal enemy;
  the boss's lobes can borrow its slam telegraph and `groundSlam`.
- **Win = a flow-rate meter (Qmax, ml/s)**, not a boss HP bar: draw a HUD stream that thickens as you win, plus a
  per-lobe progress ring. Win at 20 ml/s. Win screen: "Qmax 24 ml/s: flow restored. Specimen sent to pathology."
- **Capsule fibers are the progress cue.** As a lobe is resected the lobular surface is scraped away and **circular
  capsule fibers** appear as concentric pale arcs (like tree rings). Fibers visible over a lobe = that lobe is done and
  the flow meter jumps. Cutting *through* the fibers is a **capsule perforation** (see 2e).
- The **Resectoscope loop** is the signature tool (×1.5 on adenoma, visible chip effects). Button, GreenLight,
  Aquablation, Rezum and any HoLEP-style tool also work well.

### 2b. Three sections (the scope advances, like a real TURP done in stages)
Each section is its own arena shape; completing a section's progress ring advances you.
1. **Bladder neck / median lobe:** a wide, open arena with the bladder behind you. The median lobe acts as a ball
   valve: a **retention meter** rises while it plugs the outlet and the lobes swell faster; clear it by hitting the
   median lobe's flap with ENERGY or CUT. Landmark: the **ureteric orifices** (2d).
2. **Lateral lobes:** a long, narrow tube-shaped arena (wide horizontally, short vertically). Left and right lobes
   swell inward and thrust (telegraphed). **Nocturia** droplet adds rush from the ends. The main resection and the
   main capsule-fiber progress.
3. **Apex:** a tight, small arena; fewer enemies, more bleeders. Landmark: the **verumontanum** (2c).

**Transitions:** discrete, not continuous scrolling. A smooth 1.2 s slide: the scope advances, the finished section slides
behind you and stays visible as a darker cleaned strip, and the next section's walls and tissue slide in. Control
returns after the slide. A vertical HUD strip shows the urethra with three segments, a scope marker and progress rings.
Debug: `?section=1|2|3` starts at a section. Target fight length 120–150 s.

### 2c. The verumontanum: a massive, funny penalty (SPHINCTER INJURY)
The glowing verumontanum ring marks the limit. It pulses and plays a rising warning tone as the player or any
weapon hit area gets near. If damage from a CUT or ENERGY weapon (including sweep arcs and area hits) overlaps the ring
tissue:
- **Immediate:** red flash, a comedic "NOOOO" sound, damage equal to 35 % of max HP (never lethal from full health;
  leave ≥ 1 HP).
- **Incontinence curse for the rest of the run (not across runs):** every dodge roll and every damage taken leaves a
  small urine puddle at the player's position. These count as **saline puddles**: the Bovie fizzles when the player stands
  in or fires through them. Puddles fade after ~10 s. The sprite drips visibly. Win screen adds "Continence: lost."
- **Fixes:** the **Kegel Training** boon (2f) halves it; a rare, very expensive shop item **Artificial Sphincter**
  (only appears in the shop and only while the curse is active) removes it. If the curse is active the next Instrument
  Rep opens with "I've got just the thing for that" and offers the Artificial Sphincter at a discount.
- Debug hook: `UroCrawl.injureSphincter()`.

### 2d. Ureteric orifice warning (bladder-neck section)
Two glowing ureteric orifices sit at the bottom of the bladder-neck arena. Use the **same landmark-warning component as
the verumontanum** (build it once, generically: a ring that pulses red and sounds a rising tone as a CUT/ENERGY hit area
comes within ~40 px, plus a one-line banner "Ureteric orifice: stay back"). Contact causes **ureteric injury**: a smaller
penalty (15 % max HP damage, a banner, no curse).

### 2e. Perforation system (already built: reuse it)
The generic wall + perforation system shipped with the Invader (§14c in the game file): `makeWall({cx, cy, rx, ry, n, tagOf,
seedId, onPerforate, onSealed})` builds the segment ring and the round arena, `wallHit(seg, damage)` fills a segment's
integrity meter (`PERF.FILL`), a full one runs `wallPerforate` (hole, flood that slows the player and shorts the Bovie,
seed wave, damage by `PERF_KINDS[tag]`), and it is plugged within `PERF.WINDOW` by a Foley balloon held over the hole or a
cauterizing hit (`wallPlug`); unplugged it turns chronic and keeps leaking. Do not rebuild it. For the capsule: give
`makeWall` a `tagOf` for the capsule's own segment names (add rows to `PERF_KINDS` for them), a `seedId` for what leaks
(fluid hazard or adds), and an `onPerforate` that stops the lobe's progress until `onSealed` fires. The dungeon selection
table is `DUNGEONS` / `BOSS_IDS` / `rollBossId` (add the Benign dungeon and `bph` there).

### 2f. Bladder neck contracture (BNC) warning, and the hoser
- **Scarring meter at the bladder neck:** ENERGY hits (cautery/coag: Bovie, Roller Ball, Button, GreenLight, HIFU) that land
  on the bladder-neck ring add scar; lasers add ×0.3; cold CUT adds none. At 50 % show a yellow banner "Heavy cautery at the
  bladder neck: contracture risk" and a pulsing ring; at 80 % a red warning with a tick sound. At 100 %: **BNC**: a scar ring forms and caps the flow meter at 60 % until
  it is cut (one Urethrotome pass, or ~3 Scalpel hits: bladder-neck incision is the real treatment). A bleeder at the
  neck forces cautery, so over-coagulating is the trap: coagulate precisely (hold 1.5 s), do not spam.
- **The hoser (random arterial bleeder):** while resecting, a spurter randomly opens on a cut surface (more likely near
  the capsule), telegraphed by a pulse thump 0.7 s before. Once open it sprays: the screen reddens and the player's
  visible radius shrinks to ~120 px (red fog hides lobes and enemies) until fixed. Fix: coagulate it with ENERGY for
  ~1.5 s, or flush it with the Irrigation Hose (clears the view for 6 s but does not stop it). The Nitze cold-light boon
  enlarges the visible radius. One spurter at a time.

### 2g. Boons
- **Kegel Training** (add to the Foley patron's pool): halves the leak frequency and puddle lifetime if the curse is
  active, and before any injury it shrinks the verumontanum trigger radius by 20 %.
- **Finasteride:** lobes start 30 % smaller and swell 20 % slower. **Tamsulosin** (existing) also slows the swelling pulses.
- Optional: **TUR syndrome**: holding the Irrigation Hose > ~6 s total in a row reverses the player's controls for 4 s.

**Done when:** `?boss=bph&section=1|2|3` all work; harness block (Q) covers the flow meter win, capsule fibers, a
perforation and its plug, the verumontanum curse and its fixes, ureteric and BNC warnings (including the cap and the
urethrotome fix), the hoser red-out and both fixes, section transitions; earlier blocks pass.

---------------------------------------------------------------------------------------------------

## Step 3 — The Call Room: a walkable hub between runs

**Goal:** a Hades-style pre-dungeon area. After the title screen the player walks around a funny, decorate-able
room, picks a starting boon, equips tools, and steps through the OR door to start a run. It gives the game its
"slowly unlock things" feeling and comic relief. The existing title/overlay flow stays as the front door.

### 3a. Scene
- A new screen (`G.screen = 'hub'`), a single-screen top-down room in the same Isaac style, same movement/touch controls
  as a run, drawn with the 3/4 renderer and the new surgeon (`drawPlayer`). Touch adds one big **INTERACT** button; desktop uses E or click. Walk up to a station to highlight it.
- Title screen (now branded Path of Pathology): PLAY enters the hub; keep a QUICK START that skips it. The run summary's button returns to the hub.
  `?hub=1` boots into it. Hub music mode (slower, jazzy), no combat.
- Persist new state in `META` (merge defaults in `loadMeta`): `META.hub = { cme: 0, decor: {slot:itemId}, owned: {}, perks: {}, pin: '', met: {}, lines: {} }`.

### 3b. Currency: CME credits
A persistent currency (joke: continuing medical education) earned after each run: rooms cleared, boss kills (first
kill of each boss = big bonus), first-time bestiary discoveries, per-patron favor milestones. It is spent only in the
hub: decor, perks, optional unlocks. RVU coins stay run-only.

### 3c. Stations
| Station | What it does |
|---|---|
| **OR door "SCRUB IN"** | Starts a run. A case board beside it shows which dungeon you'll do (Stones → Staghorn, Infection → Fournier, Benign → Giant TURP; Oncology → Invader; Peds locked until built); a dungeon unlocks after its predecessor's boss is beaten. |
| **Instrument locker** | Pick your 2 starting weapons and their aspects (reuse the aspects screen). Shelves fill in visually as residency level (PGY) unlocks tools; locked tools show as silhouettes with their requirement. |
| **Pharmacy cart** | The pre-run boon pick: choose 1 of 3 common starter boons drawn from patrons you've met. |
| **Lanyard pins (keepsakes)** | Each patron met gives a pin; equip one per run for a small perk that levels up (3 levels) with use. |
| **Whiteboard: Resident Perks** | The meta upgrades (Hades' Mirror): e.g. +10 max HP, +25 starting RVUs, a free reroll, +5 % swap speed. Bought with CME, small steps. |
| **Chart rack** | The bestiary. |
| **Trophy wall** | Boss kills, best run, framed patron portraits that appear as you meet them. |
| **Coffee machine** | Comic relief plus a tiny buff for room 1; upgrades with decor (decaf is a trap). |
| **Pager / scrub cabinet** | Cosmetic scrub colors. |
| **Decor catalog desk** | Buy decor with CME; items go into fixed slots (wall, floor, desk, window, corner). Items: a ficus named Greg, a fish tank with fish in tiny scrubs, fake diplomas, a motivational "Hang in there" poster, a "Wet Floor" sign, a plush kidney, a paperweight collection that grows as stone types are killed, framed patron portraits. |
| **Rep table** | The four reps loiter and pitch comedy lines; a pen jar fills with the free pens collected in runs. |

### 3d. NPCs and humour
Small cast, each with ≥ 8 lines that rotate and never repeat back-to-back: the four reps (existing caricatures), a
weary **attending** who hands out the case and mutters about residents, and a **janitor** who knows everything and gives
hints. Voice: dry, observational, medical-workplace humour. No real people, no real brands.

### 3e. Constraints
Run at 60 fps on a phone; reuse the existing character/caricature drawing and overlay UI; no new assets. All persistence in try/catch.
Add debug hooks `UroCrawl.hub.addCme(n)`, `.buy(id)`, `.enter()`, `.state` and a `?cme=N` parameter.

**Done when:** the hub is reachable from the title and from the summary, every station works with touch and keyboard,
a run started from the hub uses the picked weapons/aspects/starter boon/pin/perks, CME is earned and spent, decor persists,
and harness block (R) covers it; earlier blocks pass.

---------------------------------------------------------------------------------------------------

## Step 4 — Dungeon 5: The Peds Wing

Do this after Step 3 (the hub's case board unlocks it). It is a **bright, toy-box dungeon** to contrast with the four dark
clinical ones, with one new boss, one elite and a set of action time-trial rooms. Prerequisites: the hub, the generic wall + perforation system that shipped with the Invader (§14c: `makeWall`, `wallHit`,
`wallPlug`), Step 2's landmark warning pulse, and the existing weapons, boons and enemy-family system.

### 4a. Content rules for this dungeon (important)
- **No children are drawn.** The patient is unseen inside the arena, like every other dungeon; the joke is the setting.
- **No pediatric genital or pelvic anatomy is drawn, even cartoonishly.** Conditions defined by genital or pelvic appearance
  (hypospadias, exstrophy, cloaca, urethral prolapse, a torsed testis as a body) are NOT made into creatures. Torsion appears
  only as the abstract timed rescue room in 4e. Likewise do not draw birth defects as creatures (VACTRL, myelomeningocele
  sacs): that reads as mocking affected people. Teach those through mechanics, bestiary text and boons instead
  (neurogenic bladder as a pressure-managed elite, a "workup" lore line for VACTRL).
- Same family rim colours and face language as everything else. Historical-figure patrons only.

### 4b. Look and tone
Pastel nursery palette (still readable against the enemy rim colours), toy-block pillars, stuffed-animal and crayon-mural
props, a sticker-chart HUD. Arena obstacles are blocks and toy-box walls. Peds-sized instruments: while in this dungeon every
weapon has −15 % range and +20 % weak-point damage (a "pediatric scope" modifier shown on the HUD), and arenas are ~15 % tighter.

### 4c. Dungeon mechanics and boons
- **Par times and medals** (replaces a plain clock): every room in this dungeon shows a calm par timer. Beat it for a
  bronze / silver / gold medal (the same idea as Stone Squadron's medals) and bonus RVUs; a slow clear only loses the bonus,
  never punishes. Medals earn **stickers** for a sticker book shown in the hub, plus CME credits (Step 3).
- **Boons** (new patron pool: **Wilms**, Max Wilms, historical caricature; Young also gives the valve boons): Vincristine /
  Dactinomycin ("VA": +40 % vs Wilms and rhabdomyosarcoma), VAC (adds cyclophosphamide: +25 % more vs rhabdomyosarcoma),
  Polyethylene glycol (clears BBD blobs faster), Timed Voiding (slows water enemies), Biofeedback, DDAVP (slows
  nocturnal water balloons), Oxybutynin (calms spasm bladders), Clean Intermittent Catheterization (drains pressure meters
  instantly, once a room), Continuous Antibiotic Prophylaxis (halves infection adds), Teddy Bear (absorbs one hit),
  Lollipop (heal pickup), Sticker Chart (small coin bonus per cleared room).
- **Bulking needle** (a fight-only carried tool, NOT a weapon; generic name, no brand): see 4f. It cannot damage anything.
- **Hook valve ablation**: PUV gates (below) are cut with CUT or ENERGY; the Urethrotome is ×1.5 on them.

### 4d. Enemies (spitball list, with animation difficulty; build the easy ones first)
| Enemy | Family | Behaviour | Ease |
|---|---|---|---|
| **Hydronephrotic Kidney** (SFU grade 1–4) | BENIGN | A water-balloon kidney whose size and HP are its grade; swells with pressure over time. **Decompress, don't pop**: a Stent Turret hit, a Foley or CIC lowers pressure safely (coins, no hazard); popping floods the floor. Antenatal-ultrasound gag: some rooms render a grayscale ultrasound fan that reveals them | easy |
| **BBD Blob** (bowel-bladder dysfunction) | BENIGN | Slow, tanky, presses nearby enemies together and slows the player in its radius; PEG and Timed Voiding boons shred it. Name it "BBD" in the bestiary, expand the acronym in the fact line | easy |
| **Wilms Tumor** (elite) | MALIGNANT | A big fruit-like lump, 450 HP; periodically rolls then slams (reuse `groundSlam`), sheds small "nephroblast" adds. Chemo-sensitive: VA boons are ×1.4. Fact: the most common kidney cancer in children | easy-medium |
| **Pelvic Rhabdomyosarcoma ("Botryoid")** | MALIGNANT | A cluster of grapes (circles on a stalk) that fires seeds in fans and splits when hit; VAC boons strong | easy |
| **PUV Gates** (posterior urethral valves) | CLOT-like obstacle | Swinging leaflet gates in corridors that open and shut on a rhythm and trap enemies; cut them with CUT/ENERGY (Urethrotome ×1.5) | easy |
| **Spasm Bladder** (neurogenic bladder; elite) | BENIGN | A pressure-meter elite: random high-pressure spasm bursts; if its pressure bar fills, it refluxes a fluid wave into the room. Oxybutynin calms it, CIC drains it | medium |
| **Nocturnal Water Balloons** | BENIGN | Harmless-looking balloons that burst into puddles; DDAVP and Timed Voiding slow them. Keep the joke on the bladder, never the child | easy |
| **Infant UTI swarm** | MICROBE | E. coli swarm variants with a fever-glow; Continuous Antibiotic Prophylaxis halves them | easy (reuse) |
Not recommended as enemies (see 4a): hypospadias, exstrophy, cloaca, urethral prolapse, VACTRL, myelomeningocele, torsed testis.

### 4e. Trial rooms: action time trials (about half of this dungeon's rooms; the rest are fights)
The Peds Wing is mostly about **skill and speed, not just killing**: toy-box obstacle courses and drills that teach movement
and aim. Each trial has a par time (4c medals), a personal-best record, no deaths (a failed attempt just restarts the room
after the timer), and replays from the hub's Sim Lab (4g). They are drills, never framed around a patient.
| Trial | What you do | What it teaches |
|---|---|---|
| **Valve Run** | Cross a corridor of PUV gates that swing open and shut on a rhythm (cut one to slow it) | roll i-frames and timing |
| **Tide Dash** | An auto-advancing wall of fluid chases you through a winding course; collect bonus tokens on the way | sprinting lines, tight turns |
| **Aim Gallery** | Moving, popping and orbiting targets (balloons, clay "stones") in waves with your own loadout | tracking with beams, leading projectiles, charge timing |
| **Catheter Course** | Steer through a narrow winding tube; touching the wall costs time | precision movement |
| **Pop-Off** | A row of hydronephrotic balloons fill at different rates: decompress each before it pops | target priority, quick aim |
| **Torsion Emergency Room** | An abstract twisted rope-knot spins in the middle; a viability ring drains over 60 s (the real window is ~6 hours: "time is tissue"). Rotate your aim opposite to the twist through two full turns (touch: a circular drag). Success: coins, a "SAVED!" banner, a bestiary fact; timeout: no reward and a plain, joke-free fact line. The knot must not resemble anatomy | aim control under a clock |

**Movement tech (learned in trials, kept for every dungeon, stored in `META.tech`):** the first completion of a trial teaches
its technique with a short on-screen prompt; Gold adds a small mastery badge.
- **Perfect Roll** (Valve Run): rolling in the last 0.15 s before a telegraphed hit lands refunds the roll cooldown and gives
  +25 % move speed for 1 s.
- **Roll Cancel** (Catheter Course): a roll cancels weapon recovery frames, which makes slow tools such as the Loop sweep and
  ESWL charge flow better.
- **Slide** (Tide Dash): hold a direction through the roll for a short, fast slide.
- **Flick Shot** (Aim Gallery): a quick tap-aim after a roll gets a brief aim-assist snap on the nearest target.
These are skill refunds, not raw power: keep the numbers small and show them on the pause screen's tech list.
Rooms that are fights use the elite and enemy list in 4d; keep them the minority.

### 4f. Boss: REFLUX, the kidney serpent (`?boss=reflux`)
The second **mobile** boss, and a free-swimming one. **Design reference (inspiration only, copy nothing): the long, looping
sea serpent of Metroid Fusion and the hole-hiding snake of Super Metroid**: a long body you must read, a vulnerable head,
patterns that loop around the arena, and a hide-and-pop rhythm.
- **Body:** a **kidney for a head** (a bean shape with calyx "eyes" and the renal pelvis as its maw) trailing a **long ureter
  tail** (10-12 segments). The tail carries a visible **peristaltic wave**: lumps of motion travelling down it, which is both
  the look and the hit zone (only the lump segment of the tail is dangerous at a given moment, so you can read where to
  squeeze past). Isaac-style, grotesque-cute, abstract, never anatomical.
- **Moves (Fusion-style loops):** it swims big sine and figure-eight loops across the arena with a rippled path preview
  (0.7 s of ripples) before each pass. **Head is the weak point (×2); the tail is a contact hazard and takes ×0.4.**
- **Ports (Super-Metroid-style hide-and-pop):** 3-4 glowing orifice ports on the arena wall. Between loops it **dives into a
  port** (gurgle and a bulge 0.7 s before it re-emerges) and pops out of another, spitting a 3-fan of fluid pellets.
  Every dive/return creates a **backwash**: a ripple that pushes the player along the floor and chips HP (the reflux/"tide").
  Toy blocks act as breakwaters; a roll through avoids it.
- **The verb: plug the ports, by carrying a needle (a mechanic unique to this fight).** Like a real Deflux injection, you
  do not hit the hole: you inject **around** it.
  - **The needle is a carried object, not a weapon.** A toy-box **tray** at the arena edge holds up to 2 needles and refills one
    every ~15 s. Walk onto a needle to pick it up. While carrying: you cannot attack or use any weapon, move at 85 %, can still
    roll, and the HUD swaps the weapon bar for a needle icon. The needle can never hurt the serpent.
  - **Drop it on purpose** with the alt/drop button to get your weapons back (the needle stays on the floor and can be picked up
    again). **Getting hit, or a backwash washing over you, also drops it**: it skids away along the floor, and the backwash
    and the serpent's tail can shove it, so you may have to chase it or take a fresh one from the tray.
  - **Injecting:** stand within ~60 px of a port and hold fire. Four **injection points** appear in a ring around the
    orifice; aim at each in turn (about 0.4 s each, ~1.6 s total; on touch the auto-aim snaps to the next point). Complete
    the ring and a **gel "volcano" mound** closes the hole to a slit: that port is plugged for ~15 s, or until a slam knocks
    it out. Missing a point or being interrupted leaves a weaker, shorter plug and uses the needle up.
  - A serpent can only dive into unplugged ports: plugging reduces its hiding places and backwash, and with all ports plugged it is
    stranded and **forced to swim in the open with its head exposed** for a long vulnerable window. The loop is: grab a needle,
    survive the loops and backwash while defenceless, plug a port, drop the needle, fight, repeat.
- **Phases follow the VUR grades:** I-II (a short straight serpent, light backwash), III (it coils, adds loops and an E. coli
  "pyelonephritis" swarm on every backwash), IV-V (tortuous, blunted-calyx look: big overlapping loops, double backwash, and
  the real fix appears as a one-time "Antireflux Tunnel" capstone cut on its head for CUT weapons).
- **Counters:** Continuous Antibiotic Prophylaxis halves the swarm adds; any FLUID tool pushes backwash away; the Foley
  balloon can plug a port once for free. The movement tech (4e) pays off here: Perfect Roll the backwash, Slide under loops.
- Win text: "Reflux resolved. Follow-up cystogram scheduled." Fight length 120-150 s, every attack telegraphed ≥ 0.5 s.
  Add `?boss=reflux` to the boss parameter list. Reuse the Enterococcus chain code for the segmented body; build the
  peristaltic wave as a travelling phase offset along the chain.

### 4g. Hub tie-ins (Step 3)
Peds-wing decor in the Call Room catalog (stickers, a mural, a toy box), a **sticker book** that fills with medal stickers, a
friendly **child-life specialist** NPC with ≥ 8 lines who gives the Sticker Chart pin keepsake, a Wilms portrait on the trophy
wall once met, and a **Sim Lab** station where every trial can be replayed on its own with personal bests and the medal
ladder (so movement and aim can be practised without a run). The Peds dungeon unlocks after the first four bosses
(Staghorn, Fournier, the Giant TURP and the Invader).

**Done when:** `?dungeon=peds` (or the hub's case board) runs the Peds Wing end to end with the reflux boss; harness block (S)
covers the pediatric-scope modifier, the par-time medals and sticker book, each trial's success, fail-restart and best-time
record, the movement tech unlocks and their effects (Perfect Roll refund, Roll Cancel, Slide, Flick Shot), the elite, the gates,
hydronephrosis decompression vs popping, the serpent's loops, port dive/pop, backwash and breakwaters, needle pick-up, carry limits, drop and loss to backwash, the injection ring, port
plugging and the vulnerable window, the three phases, the Sim Lab replay, and the new boons; earlier blocks pass.

---------------------------------------------------------------------------------------------------

## Parked: do not start unless the owner asks

### True isometric view
Not done on purpose (see the 2026-11-11 STATUS entry: it wastes the corners of a landscape phone, shrinks everything,
turns round telegraphs into ellipses and fights a thumbstick). The 3/4 depth pass already ships. If still wanted,
prototype the 45-degree diamond in `prototypes/` first. Name alternatives floated: Diabladder, Styx & Stones.

### Later ideas
RCC with IVC thrombus boss; testicular-torsion "emergency room" timed rescue room; overactive-bladder erratic elite
(Botox boon paralyses it); polycystic-kidney cyst-swarm elite; patron duo boons; gamepad support.
