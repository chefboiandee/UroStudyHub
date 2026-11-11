# Uro Crawl — roadmap for the next sessions

`games/uro-crawl.html` is a top-down roguelike dungeon crawler (one file, ~4.8k lines, ES2019, no dependencies) that
the Arcade hosts in a frame. This file is the build plan. **How to use it:** the owner tells a session
*"read UROCRAWL_ROADMAP.md and do Step N"* or *"…and do the next step"* (= the first unchecked box below).

## Progress (tick the box and add the date when a step is merged to `main`)

- [ ] **Step 1** — Staghorn becomes a mobile head-on duelist (Minotaur-style)
- [ ] **Step 2** — Giant TURP boss (BPH, three sections) + landmarks, warnings, Kegel boon
- [ ] **Step 3** — The Call Room: a walkable hub between runs (boons, unlocks, decor, jokes)
- Parked (only when asked): Muscle-Invasive Bladder Tumor boss, rename, RCC thrombus boss — see the end of this file.

## Ground rules (every step)

1. **Read first, never whole-read.** `games/uro-crawl.html` is huge. Read the newest `STATUS.md` entries ("Uro Crawl"),
   then `grep -n` for the tables you need (`WEAPONS`, `ENEMIES`, `BOONS`, `PATRONS`, `REPS`, `BOSSES`, `MODS`, `ASPECTS`,
   `META`, `showTitle`, `startRun`) and read slices. The file header comment documents the URL parameters and hooks.
2. **Old-engine safe (the Boox, Chromium ≤ ~92).** ES2019 only. Do NOT use: optional chaining `?.`, nullish `??`, `??=`,
   `replaceAll`, `Array.prototype.at`, `structuredClone`, top-level `await`, private `#fields`, `Object.hasOwn`, logical
   assignment, CSS `inset`/`aspect-ratio`/`:has()`. One file, no libraries, no network, no asset files; everything is drawn
   on canvas or in inline CSS and synthesised with Web Audio. `localStorage` only inside try/catch.
3. **Public repo.** Nothing personal, clinical or secret in any file or commit message. All human characters are
   stylised cartoon caricatures of **historical** figures or invented people; never living real people, never real
   company brands. Art stays Binding-of-Isaac grotesque-cute and **never anatomically explicit**.
4. **Keep everything working.** Existing weapons, bosses, boons, mods and the embed hook (`?embed=1`,
   `crawl:claim` / `crawl:exit` / `crawl:result`) must behave as before. Every attack is telegraphed ≥ 0.5 s.
5. **Verify headless.** `python3 -m http.server 2043` (repo root), then `node tools/uro-crawl.drive.mjs`
   (Playwright is preinstalled). Add a new numbered block to the harness for the step and keep all earlier blocks green
   (currently A–M, 196 checks). Also confirm no console errors on load. No `build.py` run is needed unless
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
- **Ground slam:** expanding ring(s) of shards to roll through.
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

**Done when:** `?boss=staghorn` is a mobile duel with all three phases; the harness block (N) covers the charge, the
wall-crash stun and tine break, the three phase transitions, and a full autoplay kill; earlier blocks still pass.

---------------------------------------------------------------------------------------------------

## Step 2 — The Giant TURP boss (BPH, three sections)

A fourth boss for a **Benign dungeon** (BPH lobes, cysts, angiomyolipoma, oncocytoma, polyps, condyloma). `?boss=bph`
(choices: `staghorn | fournier | bph`, random if absent). It is not a head-on duel: its core verb is **carving a channel
and managing risk**, and the boss is the arena. Replace the commented `giantbph` stub in `BOSSES`.

### 2a. Arena, win condition and visual progress
- Inside the prostatic urethra, drawn as an Isaac-style abstract flesh arena (never explicit). Pale pink-white lobular
  **adenoma** tissue bulges in from the walls and periodically swells (every ~10 s, telegraphed), shrinking the playable
  circle; resecting pushes it back. The lobes mostly do not chase you.
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

### 2e. Perforation system (shared, generic: the later bladder tumor boss reuses it)
Build the wall/capsule perforation system generically (segments, integrity meters, perforation events). A capsule
perforation floods the floor on that side (slows the player, shorts the Bovie), deals small player damage, and the lobe
stops progressing until the player plugs it with the **Foley balloon** or coagulates it with the Roller Ball within ~5 s;
unplugged, it keeps spawning tumor-seed/fluid hazards. If the system already exists in the file, reuse it.

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

**Done when:** `?boss=bph&section=1|2|3` all work; harness block (O) covers the flow meter win, capsule fibers, a
perforation and its plug, the verumontanum curse and its fixes, ureteric and BNC warnings (including the cap and the
urethrotome fix), the hoser red-out and both fixes, section transitions; earlier blocks pass.

---------------------------------------------------------------------------------------------------

## Step 3 — The Call Room: a walkable hub between runs

**Goal:** a Hades-style pre-dungeon area. After the title screen the player walks around a funny, decorate-able
room, picks a starting boon, equips tools, and steps through the OR door to start a run. It gives the game its
"slowly unlock things" feeling and comic relief. The existing title/overlay flow stays as the front door.

### 3a. Scene
- A new screen (`G.screen = 'hub'`), a single-screen top-down room in the same Isaac style, same movement/touch controls
  as a run. Touch adds one big **INTERACT** button; desktop uses E or click. Walk up to a station to highlight it.
- Title screen: PLAY enters the hub; keep a QUICK START that skips it. The run summary's button returns to the hub.
  `?hub=1` boots into it. Hub music mode (slower, jazzy), no combat.
- Persist new state in `META` (merge defaults in `loadMeta`): `META.hub = { cme: 0, decor: {slot:itemId}, owned: {}, perks: {}, pin: '', met: {}, lines: {} }`.

### 3b. Currency: CME credits
A persistent currency (joke: continuing medical education) earned after each run: rooms cleared, boss kills (first
kill of each boss = big bonus), first-time bestiary discoveries, per-patron favor milestones. It is spent only in the
hub: decor, perks, optional unlocks. RVU coins stay run-only.

### 3c. Stations
| Station | What it does |
|---|---|
| **OR door "SCRUB IN"** | Starts a run. A case board beside it shows which dungeon you'll do (Stones → Staghorn, Infection → Fournier, Benign → Giant TURP; Oncology locked until built); a dungeon unlocks after its predecessor's boss is beaten. |
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
and harness block (P) covers it; earlier blocks pass.

---------------------------------------------------------------------------------------------------

## Parked: do not start unless the owner asks

### Muscle-Invasive Bladder Tumor boss ("The Invader", `?boss=mibc`, Oncology dungeon)
Reuse the perforation system from Step 2 (generic wall segments). The arena is a round, dome-shaped bladder whose
12-segment wall ring is tagged LATERAL / DOME / POSTERIOR; the tumor grows from the wall into the room and its health is
layered (urothelium, lamina propria, muscle). Phases by stage: **Ta/T1** (papillary frond turrets + CIS carpet patches on
the floor; FLUID flush, coag, BCG and mitomycin best), **T2** (burrows into the wall; muscle-layer damage ×2 but every
deep CUT/ENERGY hit fills that segment's perf meter), **T3/T4** (bursts through into the fat; fat adds; needs a charged
"radical cystectomy" cut on the exposed core). Perforation: lateral = extraperitoneal, minor (flood that side, seed adds);
dome = intraperitoneal, severe (bigger flood, stronger seed wave, big damage, 15 s boss enrage); plug with the Foley
balloon or coag within ~5 s. **Obturator jerk:** ENERGY hits on LATERAL segments yank the player's aim and raise perf risk;
Holmium/Thulium cause none; an "Obturator Block" boon removes it. Optional bladder distension from the Irrigation Hose
raises perf rates 50 %. Pre-boss rest room offers "Neoadjuvant chemo" (cisplatin: −20 % boss HP, −15 % max HP for the fight).
Win text: "Muscle present in specimen: muscle-invasive disease confirmed."

### Rename
The working title is "Uro Crawl". Candidate: **Path of Pathology** ("Pathologic" is an existing game; avoid it). If renamed,
change user-visible text only (title, logo, menus, summaries) and keep `uro-crawl.html`, `window.UroCrawl`, the
`crawl:*` messages and storage keys unchanged.

### Later ideas
RCC with IVC thrombus boss; testicular-torsion "emergency room" timed rescue room; overactive-bladder erratic elite
(Botox boon paralyses it); polycystic-kidney cyst-swarm elite; patron duo boons; gamepad support.
